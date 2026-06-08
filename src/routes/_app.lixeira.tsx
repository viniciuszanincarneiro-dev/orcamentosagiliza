import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2, RotateCcw, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import { registrarLog } from "@/lib/activity-log";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/lixeira")({
  component: LixeiraPage,
});

function LixeiraPage() {
  const [pendente, setPendente] = useState<string | null>(null);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["orcamentos-lixeira"],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero, requerente_nome, imovel_municipio, valor_total, status, created_at, deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function restaurar(id: string, numero: string) {
    if (pendente) return;
    setPendente(id);
    const { error } = await supabase.from("orcamentos").update({ deleted_at: null } as never).eq("id", id);
    setPendente(null);
    if (error) return toast.error("Erro ao restaurar", { description: error.message });
    await registrarLog({ acao: "restaurar", entidade: "orcamento", entidade_id: id, numero, descricao: `Restaurou orçamento ${numero}` });
    toast.success("Orçamento restaurado");
    refetch();
  }

  async function excluirDefinitivo(id: string, numero: string) {
    if (pendente) return;
    setPendente(id);
    const { error } = await supabase.from("orcamentos").delete().eq("id", id);
    setPendente(null);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    await registrarLog({ acao: "excluir_definitivo", entidade: "orcamento", entidade_id: id, descricao: `Orçamento ${numero} excluído definitivamente` });
    toast.success("Excluído definitivamente");
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lixeira</h1>
          <p className="text-muted-foreground mt-1">Orçamentos excluídos. Restaure ou apague definitivamente.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/orcamentos"><ArrowLeft className="h-4 w-4 mr-2" />Voltar ao histórico</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Itens excluídos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Carregando…</p>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Lixeira vazia.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Requerente</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>Excluído em</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-40 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                      <TableCell className="font-medium">{o.requerente_nome}</TableCell>
                      <TableCell>{o.imovel_municipio ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(o.deleted_at)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(o.valor_total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restaurar(o.id, o.numero)}
                            disabled={pendente === o.id}
                            title="Restaurar"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />Restaurar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={pendente === o.id}
                                className="text-destructive hover:text-destructive"
                                title="Excluir definitivamente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação <b>não pode ser desfeita</b>. O orçamento <b>{o.numero}</b> será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => excluirDefinitivo(o.id, o.numero)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir definitivamente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
