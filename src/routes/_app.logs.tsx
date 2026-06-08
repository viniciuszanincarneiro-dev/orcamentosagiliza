import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/logs")({
  component: LogsPage,
});

// Apenas eventos importantes — eventos técnicos são filtrados da visualização.
const ACAO_LABEL: Record<string, string> = {
  login: "Entrou no sistema",
  logout: "Saiu do sistema",
  criar: "Criou orçamento",
  editar: "Editou orçamento",
  excluir: "Excluiu orçamento",
  restaurar: "Restaurou orçamento",
  excluir_definitivo: "Excluiu definitivamente",
  duplicar: "Duplicou orçamento",
  gerar_pdf: "Gerou PDF",
  gerar_docx: "Gerou DOCX",
  editar_valores: "Alterou tabela de valores",
  alterar_valores: "Alterou tabela de valores",
};

const ACAO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  login: "outline",
  logout: "outline",
  criar: "default",
  editar: "secondary",
  excluir: "destructive",
  excluir_definitivo: "destructive",
  restaurar: "outline",
  duplicar: "outline",
  gerar_pdf: "secondary",
  gerar_docx: "secondary",
  editar_valores: "secondary",
  alterar_valores: "secondary",
};

// Opções do filtro de tipo de ação (agrupadas por evento de domínio).
const ACAO_FILTROS: { value: string; label: string; match: string[] }[] = [
  { value: "todos", label: "Todas as ações", match: [] },
  { value: "login", label: "Login / Logout", match: ["login", "logout"] },
  { value: "criar", label: "Criação de orçamento", match: ["criar"] },
  { value: "editar", label: "Edição de orçamento", match: ["editar"] },
  { value: "excluir", label: "Exclusão / Recuperação", match: ["excluir", "excluir_definitivo", "restaurar"] },
  { value: "pdf", label: "Geração de PDF/DOCX", match: ["gerar_pdf", "gerar_docx"] },
  { value: "valores", label: "Tabela de valores", match: ["editar_valores", "alterar_valores"] },
];

const PERIODOS = [
  { value: "todos", label: "Todo o período" },
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtData(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
function fmtHora(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

type LogRow = {
  id: string;
  created_at: string | null;
  user_email: string | null;
  acao: string;
  entidade: string | null;
  metadata: unknown;
  descricao: string | null;
};

function extrairNumero(l: LogRow): string {
  const meta = (l.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.numero === "string" && meta.numero) return meta.numero;
  // fallback: tentar achar ORC-AAAA-#### na descrição
  const m = (l.descricao ?? "").match(/ORC-\d{4}-\d+/);
  return m?.[0] ?? "—";
}

function LogsPage() {
  const [filtroAcao, setFiltroAcao] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, created_at, user_email, acao, entidade, metadata, descricao")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const acoesPermitidas = useMemo(() => new Set(Object.keys(ACAO_LABEL)), []);

  const filtrados = useMemo(() => {
    const base = (data ?? []).filter((l) => acoesPermitidas.has(l.acao));
    const grp = ACAO_FILTROS.find((g) => g.value === filtroAcao);
    const matchAcao = !grp || grp.match.length === 0 ? null : new Set(grp.match);
    const usuario = filtroUsuario.trim().toLowerCase();

    let limite: number | null = null;
    const agora = Date.now();
    if (filtroPeriodo === "hoje") {
      const h = new Date(); h.setHours(0, 0, 0, 0); limite = h.getTime();
    } else if (filtroPeriodo === "7d") limite = agora - 7 * 86400_000;
    else if (filtroPeriodo === "30d") limite = agora - 30 * 86400_000;

    return base.filter((l) => {
      if (matchAcao && !matchAcao.has(l.acao)) return false;
      if (usuario && !(l.user_email ?? "").toLowerCase().includes(usuario)) return false;
      if (limite && l.created_at && new Date(l.created_at).getTime() < limite) return false;
      return true;
    });
  }, [data, filtroAcao, filtroPeriodo, filtroUsuario, acoesPermitidas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Ações</h1>
        <p className="text-muted-foreground mt-1">
          Registro simples das ações realizadas no sistema. Use para identificar alterações e localizar orçamentos.
        </p>
      </div>


      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Ações registradas</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="border rounded-md text-sm px-3 h-9 bg-background"
              >
                {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select
                value={filtroAcao}
                onChange={(e) => setFiltroAcao(e.target.value)}
                className="border rounded-md text-sm px-3 h-9 bg-background"
              >
                {ACAO_FILTROS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  placeholder="Filtrar por usuário"
                  className="h-9 pl-8 w-56"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Nenhuma ação registrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Data / Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead className="w-44">Orçamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((l) => {
                    const d = l.created_at ? new Date(l.created_at) : null;
                    const numero = extrairNumero(l);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">
                          {d ? (
                            <>
                              <div>{fmtData(d)}</div>
                              <div className="text-muted-foreground text-xs">{fmtHora(d)}</div>
                            </>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{l.user_email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={ACAO_VARIANT[l.acao] ?? "secondary"}>
                            {ACAO_LABEL[l.acao] ?? l.acao}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{numero}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
