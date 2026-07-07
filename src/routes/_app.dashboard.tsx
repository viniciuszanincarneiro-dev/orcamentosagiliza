import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, FileText, Clock, CheckCircle2, DollarSign, TrendingUp, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

type DashboardStats = {
  total: number;
  finalizados: number;
  rascunhos: number;
  valor_total: number;
  lucro_bruto: number;
  repasses: number;
};

function DashboardPage() {
  // Agregação inteira no servidor via RPC — 1 request em vez de 4, sem trazer JSONB pesado.
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats-v2"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_stats");
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
      if (!row) return { total: 0, finalizados: 0, rascunhos: 0, valor_total: 0, lucro_bruto: 0, repasses: 0 } as DashboardStats;
      return {
        total: Number(row.total ?? 0),
        finalizados: Number(row.finalizados ?? 0),
        rascunhos: Number(row.rascunhos ?? 0),
        valor_total: Number(row.valor_total ?? 0),
        lucro_bruto: Number(row.lucro_bruto ?? 0),
        repasses: Number(row.repasses ?? 0),
      } as DashboardStats;
    },
  });

  // Consulta leve (só 5 linhas, colunas específicas) — resolve independente das agregações.
  const { data: recentes, isLoading: recLoading } = useQuery({
    queryKey: ["orcamentos-recentes"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero, requerente_nome, valor_total, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });


  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos orçamentos da AGILIZA.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/orcamentos/novo">
            <FilePlus2 className="h-4 w-4 mr-2" /> Novo Orçamento
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={stats?.total ?? 0} icon={FileText} color="text-foreground" />
        <StatCard title="Finalizados" value={stats?.finalizados ?? 0} icon={CheckCircle2} color="text-primary" />
        <StatCard title="Rascunhos" value={stats?.rascunhos ?? 0} icon={Clock} color="text-destructive" />
        <StatCard title="Valor Acumulado" value={formatBRL(stats?.valor_total ?? 0)} icon={DollarSign} color="text-primary" loading={statsLoading} />
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Lucro Bruto AGILIZA
              </CardTitle>
              <CardDescription>
                Total apenas dos serviços prestados (campo, assessoria, CCIR/ITR/CAR). Não inclui
                repasses a cartório (RI e certidões).
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/financeiro">Ver mês a mês</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Lucro bruto acumulado</p>
              <p className="text-3xl font-bold tabular-nums text-primary mt-1">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary/60" /> : formatBRL(stats?.lucro_bruto ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Repasses a cartório</p>
              <p className="text-2xl font-semibold tabular-nums text-muted-foreground mt-1">
                {statsLoading ? "—" : formatBRL(stats?.repasses ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento total</p>
              <p className="text-2xl font-semibold tabular-nums mt-1">
                {statsLoading ? "—" : formatBRL(stats?.valor_total ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <CardTitle>Orçamentos recentes</CardTitle>
              <CardDescription>Últimos 5 orçamentos criados.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orcamentos">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recLoading ? (
            <p className="text-center py-10 text-muted-foreground text-sm">Carregando…</p>
          ) : !recentes || recentes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Nenhum orçamento criado ainda.
            </div>
          ) : (
            <div className="divide-y">
              {recentes.map((o) => (
                <Link
                  key={o.id}
                  to="/orcamentos/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-muted/40 px-2 -mx-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{o.numero}</span>
                      <Badge variant={o.status === "finalizado" ? "default" : "secondary"} className="text-[10px]">
                        {o.status}
                      </Badge>
                    </div>
                    <p className="font-medium truncate">{o.requerente_nome}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                  </div>
                  <p className="font-semibold tabular-nums whitespace-nowrap">{formatBRL(o.valor_total)}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, loading }: { title: string; value: string | number; icon: typeof FileText; color: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{loading ? "…" : value}</p>
          </div>
          <div className={`p-2 rounded-md bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

