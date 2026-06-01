import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Download } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportarCSV, timestampNome } from "@/lib/export-dados";
import { registrarLog } from "@/lib/activity-log";

export const Route = createFileRoute("/_app/logs")({
  component: LogsPage,
});

const ACAO_LABEL: Record<string, string> = {
  criar: "Criação",
  editar: "Edição",
  excluir: "Exclusão",
  restaurar: "Restauração",
  excluir_definitivo: "Exclusão definitiva",
  duplicar: "Duplicação",
  alterar_valores: "Alteração de valores",
  login: "Login",
  logout: "Logout",
  exportar: "Exportação",
};

const ACAO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  criar: "default",
  editar: "secondary",
  excluir: "destructive",
  excluir_definitivo: "destructive",
  restaurar: "outline",
  duplicar: "outline",
  alterar_valores: "secondary",
  login: "outline",
  logout: "outline",
  exportar: "outline",
};

function fmtDataHora(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("pt-BR");
}

function LogsPage() {
  const [filtro, setFiltro] = useState<string>("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtrados = (data ?? []).filter((l) => filtro === "todos" || l.acao === filtro);

  async function exportar() {
    exportarCSV(`logs-${timestampNome()}`, filtrados.map((l) => ({
      data: l.created_at,
      usuario: l.user_email ?? "",
      acao: l.acao,
      entidade: l.entidade ?? "",
      entidade_id: l.entidade_id ?? "",
      descricao: l.descricao ?? "",
    })));
    await registrarLog({ acao: "exportar", entidade: "activity_logs", descricao: "Exportação de logs" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Ações</h1>
          <p className="text-muted-foreground mt-1">Últimas 500 ações registradas no sistema.</p>
        </div>
        <Button variant="outline" onClick={exportar}>
          <Download className="h-4 w-4 mr-2" />Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <CardTitle>Ações</CardTitle>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="border rounded-md text-sm px-3 h-9 bg-background"
            >
              <option value="todos">Todas as ações</option>
              {Object.entries(ACAO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Nenhuma ação registrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm tabular-nums">{fmtDataHora(l.created_at)}</TableCell>
                      <TableCell className="text-sm">{l.user_email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ACAO_VARIANT[l.acao] ?? "secondary"}>
                          {ACAO_LABEL[l.acao] ?? l.acao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{l.descricao ?? "—"}</TableCell>
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
