// Helpers para exportação manual de dados (CSV/JSON)
// CSV usa BOM UTF-8 + delimitador ";" + quebra CRLF para abrir corretamente
// no Excel, Google Sheets e LibreOffice sem ajustes manuais.

function baixarArquivo(nome: string, conteudo: string, mime: string, comBOM = false) {
  const partes = comBOM ? ["\uFEFF", conteudo] : [conteudo];
  const blob = new Blob(partes, { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCSV(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // Sempre aspear para máxima compatibilidade entre planilhas
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportarJSON(nome: string, dados: unknown) {
  baixarArquivo(`${nome}.json`, JSON.stringify(dados, null, 2), "application/json");
}

export function exportarCSV(
  nome: string,
  linhas: Record<string, unknown>[],
  cabecalhos?: Record<string, string>,
) {
  if (!linhas.length) {
    baixarArquivo(`${nome}.csv`, "", "text/csv", true);
    return;
  }
  const cols = cabecalhos
    ? Object.keys(cabecalhos)
    : Array.from(
        linhas.reduce<Set<string>>((acc, l) => {
          Object.keys(l).forEach((k) => acc.add(k));
          return acc;
        }, new Set()),
      );
  const header = cols.map((c) => escapeCSV(cabecalhos?.[c] ?? c)).join(";");
  const body = linhas.map((l) => cols.map((c) => escapeCSV(l[c])).join(";")).join("\r\n");
  baixarArquivo(`${nome}.csv`, header + "\r\n" + body, "text/csv", true);
}

export function timestampNome() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
