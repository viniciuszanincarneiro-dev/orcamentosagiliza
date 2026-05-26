import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Copy, FilePlus2, FileText, MessageCircle, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { diasDesde, formatBRL, formatDate, whatsappLink } from "@/lib/format";
import { STATUS_ORCAMENTO, STATUS_VARIANTS } from "@/lib/empresa";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/orcamentos/")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const navigate = useNavigate();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["orcamentos-lista"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero, requerente_nome, cliente_whatsapp, cliente_telefone, imovel_municipio, valor_total, status, created_at, data_envio, ultimo_contato, validade_dias")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtrados = (data ?? []).filter((o) => {
    if (filtroStatus !== "todos" && o.status !== filtroStatus) return false;
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      o.numero?.toLowerCase().includes(q) ||
      o.requerente_nome?.toLowerCase().includes(q) ||
      o.imovel_municipio?.toLowerCase().includes(q)
    );
  });

  async function excluir(id: string) {
    const { error } = await supabase.from("orcamentos").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Orçamento excluído");
    refetch();
  }

  async function duplicar(id: string) {
    try {
      const { data: orig, error } = await supabase.from("orcamentos").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: numero, error: numErr } = await supabase.rpc("gen_orcamento_numero");
      if (numErr) throw numErr;
      const { id: _id, numero: _n, created_at: _c, updated_at: _u, created_by: _b, data_envio: _de, ultimo_contato: _uc, ...rest } = orig as Record<string, unknown>;
      const insertPayload = { ...rest, numero: numero as string, status: "rascunho", data_envio: null, ultimo_contato: null } as never;
      const { data: novo, error: insErr } = await supabase
        .from("orcamentos")
        .insert(insertPayload)
        .select()
        .single();
      if (insErr) throw insErr;
      toast.success(`Orçamento duplicado: ${(novo as { numero: string }).numero}`);
      navigate({ to: "/orcamentos/$id", params: { id: (novo as { id: string }).id } });
    } catch (e) {
      toast.error("Erro ao duplicar", { description: (e as Error).message });
    }
  }

  function statusLabel(s: string) {
    return STATUS_ORCAMENTO.find((x) => x.value === s)?.label ?? s;
  }

  function abrirWhatsapp(numero: string, nome: string, telefone?: string | null, whatsapp?: string | null) {
    const tel = whatsapp || telefone;
    const link = whatsappLink(tel, `Olá ${nome}, tudo bem? Aqui é da AGILIZA, sobre o orçamento ${numero}.`);
    if (!link) {
      toast.error("Cliente sem telefone/WhatsApp cadastrado");
      return;
    }
    window.open(link, "_blank", "noopener");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground mt-1">Todos os orçamentos gerados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/follow-up"><AlertTriangle className="h-4 w-4 mr-2" />Follow-up</Link>
          </Button>
          <Button asChild>
            <Link to="/orcamentos/novo"><FilePlus2 className="h-4 w-4 mr-2" />Novo</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <CardTitle>Orçamentos</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="border rounded-md text-sm px-3 h-9 bg-background"
              >
                <option value="todos">Todos os status</option>
                {STATUS_ORCAMENTO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 w-72 max-w-full"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Nenhum orçamento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Requerente</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Último contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((o) => {
                    const diasContato = diasDesde(o.ultimo_contato ?? o.data_envio);
                    const diasEnvio = diasDesde(o.data_envio);
                    const validade = o.validade_dias ?? 30;
                    const ativo = ["enviado", "aguardando", "em_andamento"].includes(o.status);
                    const vencido = ativo && diasEnvio !== null && diasEnvio > validade;
                    const vencendo = ativo && !vencido && diasEnvio !== null && diasEnvio >= validade - 5;
                    const semContato = ativo && diasContato !== null && diasContato >= 7;
                    const alerta = vencido || vencendo || semContato;
                    return (
                      <TableRow key={o.id} className={alerta ? "bg-destructive/5" : undefined}>
                        <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                        <TableCell className="font-medium">
                          <Link to="/orcamentos/$id" params={{ id: o.id }} className="hover:underline">
                            {o.requerente_nome}
                          </Link>
                          {alerta ? (
                            <span title={vencido ? "Vencido" : vencendo ? "Vencendo" : "Sem retorno"} className="inline-flex ml-2 align-middle">
                              <AlertTriangle className={`h-3.5 w-3.5 ${vencido ? "text-destructive" : "text-amber-500"}`} />
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{o.imovel_municipio ?? "—"}</TableCell>
                        <TableCell className="text-sm">{formatDate(o.data_envio)}</TableCell>
                        <TableCell className="text-sm">
                          {diasContato === null ? "—" : diasContato === 0 ? "hoje" : `há ${diasContato}d`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[o.status] ?? "secondary"}>
                            {statusLabel(o.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{formatBRL(o.valor_total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirWhatsapp(o.numero, o.requerente_nome, o.cliente_telefone, o.cliente_whatsapp)}
                              title="Chamar no WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => duplicar(o.id)} title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O orçamento <b>{o.numero}</b> será removido.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => excluir(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
