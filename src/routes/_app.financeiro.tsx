import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Calendar } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/format";
import { calcularLucro, type ItemLike } from "@/lib/lucro";

export const Route = createFileRoute("/_app/financeiro")({
  component: FinanceiroPage,
});

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type LinhaMes = {
  chave: string; // YYYY-MM
  ano: number;
  mes: number; // 0-11
  lucro: number;
  qtd: number;
};

function FinanceiroPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["financeiro-mensal"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("created_at, itens, status")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const map = new Map<string, LinhaMes>();
      let totalLucro = 0;
      for (const o of data ?? []) {
        // Considera apenas orçamentos finalizados para controle financeiro real
        if (o.status !== "finalizado") continue;
        const d = new Date(o.created_at);
        const ano = d.getFullYear();
        const mes = d.getMonth();
        const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
        const lucro = calcularLucro((o.itens as ItemLike[] | null) ?? []);
        totalLucro += lucro;
        const atual = map.get(chave);
        if (atual) {
          atual.lucro += lucro;
          atual.qtd += 1;
        } else {
          map.set(chave, { chave, ano, mes, lucro, qtd: 1 });
        }
      }
      const linhas = Array.from(map.values()).sort((a, b) =>
        b.chave.localeCompare(a.chave),
      );
      const mediaMensal = linhas.length ? totalLucro / linhas.length : 0;
      return { linhas, totalLucro: Math.round(totalLucro * 100) / 100, mediaMensal };
    },
  });

  const linhas = data?.linhas ?? [];
  const maxLucro = Math.max(1, ...linhas.map((l) => l.lucro));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Controle Financeiro</h1>
        <p className="text-muted-foreground mt-1">
          Lucro líquido AGILIZA por mês — apenas serviços executados (campo, assessoria,
          CCIR/ITR/CAR). Repasses a cartório (RI e certidões) já estão descontados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Lucro total acumulado</p>
                <p className="text-2xl font-bold tabular-nums text-primary mt-1">
                  {formatBRL(data?.totalLucro ?? 0)}
                </p>
              </div>
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Média mensal</p>
                <p className="text-2xl font-bold tabular-nums mt-1">
                  {formatBRL(data?.mediaMensal ?? 0)}
                </p>
              </div>
              <div className="p-2 rounded-md bg-muted">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Meses com movimento</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{linhas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lucro mês a mês</CardTitle>
          <CardDescription>
            Considera somente orçamentos com status <strong>finalizado</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : linhas.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              Nenhum orçamento finalizado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Serviços finalizados</TableHead>
                  <TableHead>Distribuição</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const pct = Math.round((l.lucro / maxLucro) * 100);
                  return (
                    <TableRow key={l.chave}>
                      <TableCell className="font-medium">
                        {MESES_PT[l.mes]} / {l.ano}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{l.qtd}</TableCell>
                      <TableCell>
                        <div className="h-2 rounded-full bg-muted overflow-hidden w-full max-w-xs">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-primary">
                        {formatBRL(l.lucro)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
