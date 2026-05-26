import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, MessageCircle, PhoneOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { diasDesde, formatBRL, formatDate, whatsappLink } from "@/lib/format";
import { STATUS_ORCAMENTO, STATUS_VARIANTS } from "@/lib/empresa";

export const Route = createFileRoute("/_app/follow-up")({
  component: FollowUpPage,
});

type Row = {
  id: string;
  numero: string;
  requerente_nome: string;
  cliente_telefone: string | null;
  cliente_whatsapp: string | null;
  imovel_municipio: string | null;
  valor_total: number;
  status: string;
  data_envio: string | null;
  ultimo_contato: string | null;
  validade_dias: number | null;
};

function statusLabel(s: string) {
  return STATUS_ORCAMENTO.find((x) => x.value === s)?.label ?? s;
}

function abrirWhatsapp(o: Row) {
  const link = whatsappLink(
    o.cliente_whatsapp || o.cliente_telefone,
    `Olá ${o.requerente_nome}, tudo bem? Aqui é da AGILIZA, passando para saber sobre o orçamento ${o.numero}.`
  );
  if (!link) {
    toast.error("Cliente sem telefone/WhatsApp cadastrado");
    return;
  }
  window.open(link, "_blank", "noopener");
}

function FollowUpPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["follow-up"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero, requerente_nome, cliente_telefone, cliente_whatsapp, imovel_municipio, valor_total, status, data_envio, ultimo_contato, validade_dias")
        .in("status", ["enviado", "aguardando", "em_andamento"])
        .order("data_envio", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = data ?? [];

  const semRetorno = rows.filter((o) => {
    const d = diasDesde(o.ultimo_contato ?? o.data_envio);
    return d !== null && d >= 7;
  });

  const vencendo = rows.filter((o) => {
    const d = diasDesde(o.data_envio);
    const v = o.validade_dias ?? 30;
    return d !== null && d >= v - 5 && d <= v;
  });

  const vencidos = rows.filter((o) => {
    const d = diasDesde(o.data_envio);
    const v = o.validade_dias ?? 30;
    return d !== null && d > v;
  });

  const aguardando = rows.filter((o) => o.status === "aguardando" || !o.data_envio);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Follow-up comercial</h1>
        <p className="text-muted-foreground mt-1">Orçamentos que precisam de atenção.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Sem retorno" value={semRetorno.length} icon={PhoneOff} tone="amber" />
        <Kpi title="Vencendo" value={vencendo.length} icon={Clock} tone="amber" />
        <Kpi title="Vencidos" value={vencidos.length} icon={AlertTriangle} tone="red" />
        <Kpi title="Aguardando contato" value={aguardando.length} icon={MessageCircle} tone="blue" />
      </div>

      {isLoading ? (
        <p className="text-center py-10 text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <Bloco
            titulo="Vencidos"
            descricao="Orçamentos cujo prazo de validade já passou."
            rows={vencidos}
            tone="red"
            mostrarDias
          />
          <Bloco
            titulo="Vencendo"
            descricao="Faltam até 5 dias para o prazo de validade expirar."
            rows={vencendo}
            tone="amber"
            mostrarDias
          />
          <Bloco
            titulo="Sem retorno (7+ dias)"
            descricao="Clientes que não recebem contato há mais de uma semana."
            rows={semRetorno}
            tone="amber"
          />
          <Bloco
            titulo="Aguardando primeiro contato"
            descricao="Orçamentos ainda não enviados ou marcados como aguardando."
            rows={aguardando}
            tone="blue"
          />
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, icon: Icon, tone }: { title: string; value: number; icon: typeof Clock; tone: "red" | "amber" | "blue" }) {
  const colors = {
    red: "text-destructive bg-destructive/10",
    amber: "text-amber-600 bg-amber-500/10",
    blue: "text-primary bg-primary/10",
  }[tone];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          </div>
          <div className={`p-2 rounded-md ${colors}`}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function Bloco({ titulo, descricao, rows, tone, mostrarDias }: { titulo: string; descricao: string; rows: Row[]; tone: "red" | "amber" | "blue"; mostrarDias?: boolean }) {
  const border = { red: "border-destructive/40", amber: "border-amber-500/40", blue: "border-primary/30" }[tone];
  return (
    <Card className={border}>
      <CardHeader>
        <CardTitle className="text-lg">{titulo} <span className="text-muted-foreground font-normal">({rows.length})</span></CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tudo certo por aqui.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Envio</TableHead>
                  <TableHead>Últ. contato</TableHead>
                  {mostrarDias ? <TableHead>Dias</TableHead> : null}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20 text-right">WhatsApp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => {
                  const d = diasDesde(o.data_envio);
                  const dc = diasDesde(o.ultimo_contato ?? o.data_envio);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        <Link to="/orcamentos/$id" params={{ id: o.id }} className="hover:underline">{o.numero}</Link>
                      </TableCell>
                      <TableCell className="font-medium">{o.requerente_nome}</TableCell>
                      <TableCell>{o.imovel_municipio ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(o.data_envio)}</TableCell>
                      <TableCell className="text-sm">{dc === null ? "—" : dc === 0 ? "hoje" : `há ${dc}d`}</TableCell>
                      {mostrarDias ? (
                        <TableCell className="text-sm tabular-nums">{d === null ? "—" : `${d}d`}</TableCell>
                      ) : null}
                      <TableCell><Badge variant={STATUS_VARIANTS[o.status] ?? "secondary"}>{statusLabel(o.status)}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatBRL(o.valor_total)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirWhatsapp(o)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> Chamar
                        </Button>
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
  );
}
