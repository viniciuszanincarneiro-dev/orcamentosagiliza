/**
 * Tabela de Emolumentos do Registro de Imóveis - SC 2026
 * LC nº 755/2019, alterada pela LC nº 846/2023
 * Item 2.2 — Registro com valor econômico (Total já incluindo FRJ + ISS).
 *
 * Usado também para Retificação de maior complexidade (item 4.1), que
 * segue as mesmas faixas do item 2.2.
 */
type Faixa = { ate: number; total: number };

const FAIXAS_REGISTRO_IMOVEIS: Faixa[] = [
  { ate: 13786.59, total: 207.75 },
  { ate: 20679.87, total: 235.94 },
  { ate: 28951.83, total: 336.32 },
  { ate: 35845.12, total: 438.45 },
  { ate: 44117.08, total: 547.64 },
  { ate: 53767.69, total: 660.32 },
  { ate: 62039.64, total: 776.56 },
  { ate: 71690.25, total: 898.07 },
  { ate: 79962.21, total: 1024.85 },
  { ate: 90991.48, total: 1155.16 },
  { ate: 100642.09, total: 1290.76 },
  { ate: 111671.36, total: 1433.41 },
  { ate: 122700.64, total: 1561.94 },
  { ate: 133729.90, total: 1692.26 },
  { ate: 146137.83, total: 1826.10 },
  { ate: 158545.76, total: 1961.70 },
  { ate: 170953.69, total: 2099.04 },
  { ate: 184740.27, total: 2238.15 },
  { ate: 198526.88, total: 2380.79 },
  { ate: 212313.47, total: 2525.19 },
  { ate: 226100.05, total: 2671.35 },
  { ate: 276100.05, total: 2735.22 },
  { ate: 326100.05, total: 2799.08 },
  { ate: 376100.05, total: 2862.95 },
  { ate: 426100.05, total: 2926.81 },
  { ate: 476100.05, total: 2990.68 },
  { ate: 526100.05, total: 3054.54 },
  // Faixa progressiva acima de 526.100,05 — aumenta ~R$ 63,87 a cada 50k
];

/**
 * Calcula o valor de Registro de Imóveis baseado no valor do imóvel.
 * Para valores acima da última faixa tabelada, aplica progressão.
 */
export function calcularRegistroImoveis(valorImovel: number): number {
  return explicarRegistroImoveis(valorImovel).valor;
}

export type ExplicacaoRI = {
  valor: number;
  faixaAte: number;
  faixaIndex: number;
  progressivo: boolean;
  excedente?: number;
  descricao: string;
  alerta?: "alto" | "muito_alto";
};

/**
 * Retorna o valor do RI + explicação de como foi calculado.
 * A tabela LC 755/2019 (item 2.2) já inclui FRJ + ISS — NÃO somar separado.
 * Inclui alerta heurístico quando o RI calculado parece destoar do valor
 * declarado do imóvel (acima de 5% ou 8% do valor do imóvel).
 */
export function explicarRegistroImoveis(valorImovel: number): ExplicacaoRI {
  const v = !valorImovel || valorImovel <= 0 ? 0 : valorImovel;
  let valor = FAIXAS_REGISTRO_IMOVEIS[0].total;
  let faixaAte = FAIXAS_REGISTRO_IMOVEIS[0].ate;
  let faixaIndex = 0;
  let progressivo = false;
  let excedente: number | undefined;

  if (v > 0) {
    const idx = FAIXAS_REGISTRO_IMOVEIS.findIndex((f) => v <= f.ate);
    if (idx >= 0) {
      valor = FAIXAS_REGISTRO_IMOVEIS[idx].total;
      faixaAte = FAIXAS_REGISTRO_IMOVEIS[idx].ate;
      faixaIndex = idx;
    } else {
      const ultima = FAIXAS_REGISTRO_IMOVEIS[FAIXAS_REGISTRO_IMOVEIS.length - 1];
      excedente = Math.ceil((v - ultima.ate) / 50000);
      valor = ultima.total + excedente * 63.87;
      faixaAte = ultima.ate;
      faixaIndex = -1;
      progressivo = true;
    }
  }

  valor = Math.round(valor * 100) / 100;

  let alerta: ExplicacaoRI["alerta"];
  if (v > 0) {
    const pct = valor / v;
    if (pct >= 0.08) alerta = "muito_alto";
    else if (pct >= 0.05) alerta = "alto";
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const descricao = progressivo
    ? `Tabela LC 755/2019 (item 2.2) — faixa progressiva acima de R$ ${fmt(faixaAte)}: acréscimo de R$ 63,87 a cada R$ 50.000 (${excedente} acréscimo${(excedente ?? 0) > 1 ? "s" : ""}). Valor já inclui FRJ + ISS.`
    : `Tabela LC 755/2019 (item 2.2) — faixa ${faixaIndex + 1}: imóveis até R$ ${fmt(faixaAte)}. Valor já inclui FRJ + ISS.`;

  return { valor, faixaAte, faixaIndex, progressivo, excedente, descricao, alerta };
}

/** Faixas de georreferenciamento por hectare (valores padrão). */
export function calcularGeoPorHectare(hectares: number, faixas: { ate_5ha: number; ate_10ha: number; ate_25ha: number }): number {
  if (hectares <= 5) return faixas.ate_5ha;
  if (hectares <= 10) return faixas.ate_10ha;
  if (hectares <= 25) return faixas.ate_25ha;
  // Acima de 25 ha: extrapola proporcionalmente a partir da última faixa
  const extras = Math.ceil((hectares - 25) / 5);
  return faixas.ate_25ha + extras * (faixas.ate_25ha - faixas.ate_10ha) / 3;
}

export function m2ParaHectares(m2: number): number {
  return m2 / 10000;
}
