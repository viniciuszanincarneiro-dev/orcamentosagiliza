/**
 * Tabela de Emolumentos do Tabelionato de Notas — SC 2026
 * Anexo I — Escrituras com valor econômico (Total = ISS + FRJ + Tabela).
 */
type Faixa = { ate: number; total: number };

const FAIXAS_TABELIONATO: Faixa[] = [
  { ate: 13786.58, total: 214.07 },
  { ate: 20679.87, total: 246.86 },
  { ate: 28951.83, total: 350.47 },
  { ate: 35845.12, total: 457.49 },
  { ate: 44117.08, total: 571.45 },
  { ate: 53767.69, total: 688.86 },
  { ate: 62039.64, total: 811.44 },
  { ate: 71690.25, total: 937.45 },
  { ate: 79962.21, total: 1068.68 },
  { ate: 90991.48, total: 1205.09 },
  { ate: 100642.09, total: 1348.40 },
  { ate: 111671.36, total: 1495.12 },
  { ate: 122700.64, total: 1648.79 },
  { ate: 133729.90, total: 1807.62 },
  { ate: 146137.83, total: 1971.64 },
  { ate: 158545.76, total: 2094.22 },
  { ate: 170953.69, total: 2216.80 },
  { ate: 184740.27, total: 2335.93 },
  { ate: 198526.88, total: 2453.34 },
  { ate: 212313.47, total: 2568.99 },
  { ate: 226100.05, total: 2682.95 },
  { ate: 276100.05, total: 2745.56 },
  { ate: 326100.05, total: 2808.18 },
  { ate: 376100.05, total: 2870.79 },
  { ate: 426100.05, total: 2933.41 },
  { ate: 476100.05, total: 2996.02 },
  { ate: 526100.05, total: 3058.64 },
  // Acima: acréscimo progressivo de R$ 62,61 a cada R$ 50.000
];

/** Calcula o emolumento do Tabelionato de Notas (Escritura com valor). */
export function calcularTabelionato(valorImovel: number): number {
  const v = !valorImovel || valorImovel <= 0 ? 0 : valorImovel;
  if (v <= 0) return FAIXAS_TABELIONATO[0].total;
  const idx = FAIXAS_TABELIONATO.findIndex((f) => v <= f.ate);
  if (idx >= 0) return FAIXAS_TABELIONATO[idx].total;
  const ultima = FAIXAS_TABELIONATO[FAIXAS_TABELIONATO.length - 1];
  const excedente = Math.ceil((v - ultima.ate) / 50000);
  return Math.round((ultima.total + excedente * 62.61) * 100) / 100;
}
