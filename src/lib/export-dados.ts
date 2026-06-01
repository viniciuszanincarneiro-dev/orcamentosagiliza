// Helpers para exportação manual de dados (CSV/JSON)

function baixarArquivo(nome: string, conteudo: string, mime: string) {
  const blob = new Blob([conteudo], { type: mime + ";charset=utf-8" });
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
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportarJSON(nome: string, dados: unknown) {
  baixarArquivo(`${nome}.json`, JSON.stringify(dados, null, 2), "application/json");
}

export function exportarCSV(nome: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) {
    baixarArquivo(`${nome}.csv`, "", "text/csv");
    return;
  }
  const cols = Array.from(
    linhas.reduce<Set<string>>((acc, l) => {
      Object.keys(l).forEach((k) => acc.add(k));
      return acc;
    }, new Set())
  );
  const header = cols.join(";");
  const body = linhas.map((l) => cols.map((c) => escapeCSV(l[c])).join(";")).join("\n");
  baixarArquivo(`${nome}.csv`, header + "\n" + body, "text/csv");
}

export function timestampNome() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
