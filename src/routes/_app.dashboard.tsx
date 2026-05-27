import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, FileText, Clock, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate } from "@/lib/format";
import { calcularLucro, calcularRepasse, type ItemLike } from "@/lib/lucro";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 60_000,
    queryFn: async () => {
      // Conta linhas no servidor sem trazer dados; soma apenas valores via select leve
      const [totalRes, finalRes, rascRes, valoresRes] = await Promise.all([
        supabase.from("orcamentos").select("*", { count: "exact", head: true }),
        supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "finalizado"),
        supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "rascunho"),
        supabase.from("orcamentos").select("valor_total, itens"),
      ]);
      if (totalRes.error) throw totalRes.error;
      if (valoresRes.error) throw valoresRes.error;
      let valorTotal = 0;
      let lucroBruto = 0;
      let repasses = 0;
      for (const o of valoresRes.data ?? []) {
        valorTotal += Number(o.valor_total ?? 0);
        const itens = (o.itens as ItemLike[] | null) ?? [];
        lucroBruto += calcularLucro(itens);
        repasses += calcularRepasse(itens);
      }
      return {
        total: totalRes.count ?? 0,
        finalizados: finalRes.count ?? 0,
        rascunhos: rascRes.count ?? 0,
        valorTotal,
        lucroBruto: Math.round(lucroBruto * 100) / 100,
        repasses: Math.round(repasses * 100) / 100,
      };
    },
  });

  const { data: recentes } = useQuery({
    queryKey: ["orcamentos-recentes"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero, requerente_nome, valor_total, status, created_at")
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
        <StatCard title="Valor Acumulado" value={formatBRL(stats?.valorTotal ?? 0)} icon={DollarSign} color="text-primary" />
      </div>

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
          {!recentes || recentes.length === 0 ? (
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

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: typeof FileText; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          </div>
          <div className={`p-2 rounded-md bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
