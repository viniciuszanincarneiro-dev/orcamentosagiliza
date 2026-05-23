import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, Loader2, Pencil, RefreshCw, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_app/valores")({
  component: ValoresPage,
});

type ValorRow = {
  id: string; categoria: string; chave: string; descricao: string; valor: number; ordem: number;
};

const VALORES_CACHE_KEY = "agiliza:tabela-valores:v1";

function getCachedValores(): ValorRow[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const cached = window.localStorage.getItem(VALORES_CACHE_KEY);
    return cached ? (JSON.parse(cached) as ValorRow[]) : undefined;
  } catch {
    return undefined;
  }
}

function cacheValores(rows: ValorRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VALORES_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Cache é apenas uma melhoria de carregamento; se falhar, a tabela segue funcionando.
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("A tabela demorou para responder. Tente recarregar.")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const labels: Record<string, { title: string; desc: string }> = {
  config: {
    title: "Configurações de cálculo",
    desc: "Parâmetros internos que afetam o cálculo automático (ex.: fator de ajuste do Registro de Imóveis).",
  },
  servico_base: {
    title: "Serviços base",
    desc: "Itens fixos incluídos nos orçamentos (certidões, atualizações cadastrais, etc.).",
  },
  geo_hectare: {
    title: "Georreferenciamento por faixa de hectare",
    desc: "Valores aplicados automaticamente ao calcular o levantamento topográfico de acordo com a área do imóvel.",
  },
  valor_municipio: {
    title: "Valor por hectare por município",
    desc: "Referência usada para avaliar o imóvel quando não há valor declarado.",
  },
};

const ORDEM_CATEGORIAS = ["servico_base", "geo_hectare", "valor_municipio", "config"];

function ValoresPage() {
  const [showSlowHint, setShowSlowHint] = useState(false);
  const cachedValores = getCachedValores();
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["tabela-valores"],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("tabela_valores")
          .select("*")
          .order("categoria", { ascending: true })
          .order("ordem", { ascending: true }),
        10_000,
      );
      if (error) throw error;
      const rows = (data ?? []) as ValorRow[];
      cacheValores(rows);
      return rows;
    },
    initialData: cachedValores,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!isLoading) {
      setShowSlowHint(false);
      return;
    }
    const id = window.setTimeout(() => setShowSlowHint(true), 4_000);
    return () => window.clearTimeout(id);
  }, [isLoading]);

  const grupos: Record<string, ValorRow[]> = {};
  for (const v of data ?? []) (grupos[v.categoria] ||= []).push(v);
  const categoriasOrdenadas = [
    ...ORDEM_CATEGORIAS.filter((c) => grupos[c]),
    ...Object.keys(grupos).filter((c) => !ORDEM_CATEGORIAS.includes(c)),
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tabela de Valores</h1>
            <p className="text-muted-foreground mt-1">
              Configure os valores padrão usados no cálculo automático dos orçamentos. Esses valores podem ser
              ajustados individualmente em cada orçamento para aplicar descontos negociados.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
        </div>
      </div>

      {showSlowHint && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Carregando tabela</AlertTitle>
          <AlertDescription>
            A conexão está demorando mais que o normal. Se não carregar em instantes, use o botão Recarregar.
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar a tabela de valores</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error instanceof Error ? error.message : "Verifique sua sessão e tente novamente."}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && !data ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-96 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categoriasOrdenadas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum valor cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        categoriasOrdenadas.map((cat) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle>{labels[cat]?.title ?? cat}</CardTitle>
              {labels[cat]?.desc && <CardDescription>{labels[cat].desc}</CardDescription>}
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
                  {grupos[cat].map((r) => <LinhaValor key={r.id} row={r} onSaved={() => refetch()} />)}
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
