import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Receipt,
  FileText,
  CheckCircle2,
  Building2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/format";
import { calcularLucro, calcularRepasse, type ItemLike } from "@/lib/lucro";
import { TIPOS_SERVICO, STATUS_ORCAMENTO } from "@/lib/empresa";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_app/financeiro")({
  component: FinanceiroPage,
});

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type OrcamentoRow = {
  id: string;
  created_at: string;
  status: string;
  tipo_servico: string;
  escritorio_id: string | null;
  valor_total: number | null;
  itens: ItemLike[] | null;
};

type LinhaMes = {
  chave: string; // YYYY-MM
  ano: number;
  mes: number; // 0-11
  label: string;
  curto: string;
  qtd: number;
  aprovados: number;
  finalizados: number;
  bruto: number; // faturamento (valor_total)
  liquido: number; // lucro líquido (serviços AGILIZA)
  despesas: number; // repasses/cartório
};

function FinanceiroPage() {
  const { isAdmin, escritorio: meuEscritorio, escritorios } = useProfile();
  const [periodo, setPeriodo] = useState<string>("12");
  const [tipo, setTipo] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  // Para não-admins, força o próprio escritório
  const [escritorioSel, setEscritorioSel] = useState<string>("all");
  const escritorioEfetivo = isAdmin ? escritorioSel : (meuEscritorio?.id ?? "all");

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["financeiro-orcamentos"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, created_at, status, tipo_servico, escritorio_id, valor_total, itens")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrcamentoRow[];
    },
  });

  const escritoriosMap = useMemo(
    () => new Map(escritorios.map((e) => [e.id, e.nome])),
    [escritorios],
  );

  const filtrados = useMemo(() => {
    if (!orcamentos) return [];
    const agora = new Date();
    let limite: Date | null = null;
    if (periodo !== "all") {
      const n = Number(periodo);
      limite = new Date(agora.getFullYear(), agora.getMonth() - (n - 1), 1);
    }
    return orcamentos.filter((o) => {
      if (limite && new Date(o.created_at) < limite) return false;
      if (tipo !== "all" && o.tipo_servico !== tipo) return false;
      if (status !== "all" && o.status !== status) return false;
      if (escritorioEfetivo !== "all" && o.escritorio_id !== escritorioEfetivo) return false;
      return true;
    });
  }, [orcamentos, periodo, tipo, status, escritorioEfetivo]);

  // Breakdown por escritório (apenas admin vê todos)
  const porEscritorio = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; bruto: number; liquido: number; despesas: number }>();
    for (const o of filtrados) {
      const k = o.escritorio_id ?? "sem";
      const nome = o.escritorio_id ? (escritoriosMap.get(o.escritorio_id) ?? "—") : "Sem escritório";
      const itens = o.itens ?? [];
      const liq = calcularLucro(itens);
      const desp = calcularRepasse(itens);
      const bruto = Number(o.valor_total ?? 0);
      const at = map.get(k);
      if (at) { at.qtd += 1; at.bruto += bruto; at.liquido += liq; at.despesas += desp; }
      else map.set(k, { nome, qtd: 1, bruto, liquido: liq, despesas: desp });
    }
    return Array.from(map.values()).sort((a, b) => b.bruto - a.bruto);
  }, [filtrados, escritoriosMap]);


  const { linhas, totais } = useMemo(() => {
    const map = new Map<string, LinhaMes>();
    let tBruto = 0, tLiquido = 0, tDespesas = 0;
    let tQtd = 0, tAprov = 0, tFinal = 0;
    for (const o of filtrados) {
      const d = new Date(o.created_at);
      const ano = d.getFullYear();
      const mes = d.getMonth();
      const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
      const itens = o.itens ?? [];
      const liq = calcularLucro(itens);
      const desp = calcularRepasse(itens);
      const bruto = Number(o.valor_total ?? 0);
      const aprov = o.status === "aprovado" ? 1 : 0;
      const fin = o.status === "finalizado" ? 1 : 0;
      tBruto += bruto; tLiquido += liq; tDespesas += desp;
      tQtd += 1; tAprov += aprov; tFinal += fin;
      const at = map.get(chave);
      if (at) {
        at.qtd += 1; at.aprovados += aprov; at.finalizados += fin;
        at.bruto += bruto; at.liquido += liq; at.despesas += desp;
      } else {
        map.set(chave, {
          chave, ano, mes,
          label: `${MESES_PT[mes]}/${ano}`,
          curto: `${MESES_CURTO[mes]}/${String(ano).slice(2)}`,
          qtd: 1, aprovados: aprov, finalizados: fin,
          bruto, liquido: liq, despesas: desp,
        });
      }
    }
    const linhas = Array.from(map.values()).sort((a, b) => b.chave.localeCompare(a.chave));
    return {
      linhas,
      totais: {
        bruto: round(tBruto),
        liquido: round(tLiquido),
        despesas: round(tDespesas),
        qtd: tQtd,
        aprovados: tAprov,
        finalizados: tFinal,
        mediaMensal: linhas.length ? round(tLiquido / linhas.length) : 0,
      },
    };
  }, [filtrados]);

  const chartData = useMemo(() => [...linhas].reverse().map((l) => ({
    mes: l.curto,
    Faturamento: round(l.bruto),
    Líquido: round(l.liquido),
    Orçamentos: l.qtd,
  })), [linhas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Controle Financeiro</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhamento mensal do escritório: faturamento, lucro líquido e
          repasses a cartório.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Escritório</Label>
            {isAdmin ? (
              <Select value={escritorioSel} onValueChange={setEscritorioSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os escritórios</SelectItem>
                  {escritorios.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="px-3 py-2 rounded-md border bg-muted text-sm">
                {meuEscritorio?.nome ?? "—"}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo de serviço</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TIPOS_SERVICO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_ORCAMENTO.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visão consolidada por escritório (admin) */}
      {isAdmin && escritorioSel === "all" && porEscritorio.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Visão por escritório
            </CardTitle>
            <CardDescription>Indicadores individualizados por unidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escritório</TableHead>
                    <TableHead className="text-center">Orçamentos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Custas externas</TableHead>
                    <TableHead className="text-right">Líquido Agiliza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porEscritorio.map((p) => (
                    <TableRow key={p.nome}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-center tabular-nums">{p.qtd}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(p.bruto)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(p.despesas)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-primary">{formatBRL(p.liquido)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}


      {/* Cards de totais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Lucro líquido" value={formatBRL(totais.liquido)} icon={TrendingUp} highlight />
        <KpiCard label="Faturamento bruto" value={formatBRL(totais.bruto)} icon={DollarSign} />
        <KpiCard label="Repasses / cartório" value={formatBRL(totais.despesas)} icon={Receipt} muted />
        <KpiCard label="Média mensal (líquido)" value={formatBRL(totais.mediaMensal)} icon={Calendar} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Orçamentos" value={totais.qtd} icon={FileText} />
        <KpiCard label="Aprovados" value={totais.aprovados} icon={CheckCircle2} />
        <KpiCard label="Finalizados" value={totais.finalizados} icon={CheckCircle2} highlight />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento × Lucro líquido</CardTitle>
            <CardDescription>Por mês, no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyMini />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="Faturamento" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Líquido" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantidade de orçamentos</CardTitle>
            <CardDescription>Volume mensal.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyMini />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="Orçamentos" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento mês a mês</CardTitle>
          <CardDescription>
            Aplica os filtros acima. Lucro líquido considera apenas serviços
            executados pelo escritório; despesas são repasses (RI, certidões).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : linhas.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              Nenhum orçamento no período / filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Orç.</TableHead>
                    <TableHead className="text-center">Aprov.</TableHead>
                    <TableHead className="text-center">Final.</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Lucro líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.chave}>
                      <TableCell className="font-medium whitespace-nowrap">{l.label}</TableCell>
                      <TableCell className="text-center tabular-nums">{l.qtd}</TableCell>
                      <TableCell className="text-center tabular-nums">{l.aprovados}</TableCell>
                      <TableCell className="text-center tabular-nums">{l.finalizados}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(l.bruto)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(l.despesas)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-primary">{formatBRL(l.liquido)}</TableCell>
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

function KpiCard({
  label, value, icon: Icon, highlight, muted,
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 truncate ${highlight ? "text-primary" : muted ? "text-muted-foreground" : ""}`}>
              {value}
            </p>
          </div>
          <div className={`p-2 rounded-md ${highlight ? "bg-primary/10 text-primary" : "bg-muted"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMini() {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
      Sem dados no período.
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function round(v: number) {
  return Math.round(v * 100) / 100;
}
function compact(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}
