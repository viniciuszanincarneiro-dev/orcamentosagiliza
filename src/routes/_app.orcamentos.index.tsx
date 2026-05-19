import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, FilePlus2, FileText, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
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
  const navigate = useNavigate();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["orcamentos-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero, requerente_nome, imovel_municipio, valor_total, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtrados = (data ?? []).filter((o) => {
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
      const { id: _id, numero: _n, created_at: _c, updated_at: _u, created_by: _b, ...rest } = orig as Record<string, unknown>;
      const { data: novo, error: insErr } = await supabase
        .from("orcamentos")
        .insert({ ...(rest as object), numero: numero as string, status: "rascunho" })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground mt-1">Todos os orçamentos gerados.</p>
        </div>
        <Button asChild>
          <Link to="/orcamentos/novo"><FilePlus2 className="h-4 w-4 mr-2" />Novo</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <CardTitle>Orçamentos</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, requerente, município…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 w-80 max-w-full"
              />
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
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                      <TableCell className="font-medium">
                        <Link to="/orcamentos/$id" params={{ id: o.id }} className="hover:underline">
                          {o.requerente_nome}
                        </Link>
                      </TableCell>
                      <TableCell>{o.imovel_municipio ?? "—"}</TableCell>
                      <TableCell>{formatDate(o.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "finalizado" ? "default" : "secondary"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatBRL(o.valor_total)}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
