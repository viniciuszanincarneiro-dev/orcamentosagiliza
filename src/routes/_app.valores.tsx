import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_app/valores")({
  component: ValoresPage,
});

type ValorRow = {
  id: string; categoria: string; chave: string; descricao: string; valor: number; ordem: number;
};

const labels: Record<string, { title: string; desc: string }> = {
  geo_hectare: {
    title: "Georreferenciamento por faixa de hectare",
    desc: "Valores aplicados automaticamente ao calcular o levantamento topográfico de acordo com a área do imóvel.",
  },
  valor_municipio: {
    title: "Valor por hectare por município",
    desc: "Referência usada para avaliar o imóvel quando não há valor declarado.",
  },
  servico_base: {
    title: "Serviços base",
    desc: "Itens fixos incluídos nos orçamentos (certidões, atualizações cadastrais, etc.).",
  },
};

function ValoresPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tabela-valores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_valores")
        .select("*")
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ValorRow[];
    },
  });

  const grupos: Record<string, ValorRow[]> = {};
  for (const v of data ?? []) (grupos[v.categoria] ||= []).push(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tabela de Valores</h1>
        <p className="text-muted-foreground mt-1">
          Configure os valores padrão usados no cálculo automático dos orçamentos. Esses valores podem ser
          ajustados individualmente em cada orçamento para aplicar descontos negociados.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        Object.entries(grupos).map(([cat, rows]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle>{labels[cat]?.title ?? cat}</CardTitle>
              <CardDescription>{labels[cat]?.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right w-48">Valor</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => <LinhaValor key={r.id} row={r} onSaved={() => refetch()} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function LinhaValor({ row, onSaved }: { row: ValorRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [valor, setValor] = useState(String(row.valor));

  const mut = useMutation({
    mutationFn: async () => {
      const n = Number(valor.replace(",", "."));
      if (!isFinite(n)) throw new Error("Valor inválido");
      const { error } = await supabase.from("tabela_valores").update({ valor: n }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Valor atualizado"); setEditing(false); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <TableRow>
      <TableCell className="font-medium">{row.descricao}</TableCell>
      <TableCell className="text-right tabular-nums">
        {editing ? (
          <Input
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="text-right"
          />
        ) : (
          <span className="font-semibold">{formatBRL(row.valor)}</span>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setValor(String(row.valor)); }}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
