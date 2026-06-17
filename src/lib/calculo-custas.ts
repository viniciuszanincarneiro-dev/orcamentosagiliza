/**
 * Módulo de cálculo de custas externas.
 *
 * Prioridade SEMPRE nesta ordem:
 *   1. Valor cadastrado em tabela
 *   2. Cálculo automático (alíquota / faixa)
 *   3. Edição manual pelo usuário
 *
 * Nunca inventar valor: quando nada se aplica, retorna null.
 */

export type FaixaAliquota = {
  faixa_min: number;
  faixa_max: number | null;
  aliquota: number; // percentual (ex.: 2 = 2%)
};

export type FaixaValor = {
  faixa_min: number;
  faixa_max: number | null;
  valor: number;
};

/** ITBI = valor_declarado * alíquota / 100. Alíquota pode vir do município. */
export function calcularITBI(valorDeclarado: number, aliquota: number): number {
  if (!Number.isFinite(valorDeclarado) || valorDeclarado <= 0) return 0;
  if (!Number.isFinite(aliquota) || aliquota <= 0) return 0;
  return Math.round(valorDeclarado * aliquota) / 100;
}

/** ITCMD: busca alíquota por faixa cadastrada e aplica sobre o valor base. */
export function calcularITCMD(
  valorBase: number,
  faixas: FaixaAliquota[],
  aliquotaManual?: number | null,
): { aliquota: number; valor: number; origem: "manual" | "tabela" | "indefinido" } {
  if (!Number.isFinite(valorBase) || valorBase <= 0) {
    return { aliquota: 0, valor: 0, origem: "indefinido" };
  }
  if (aliquotaManual != null && Number.isFinite(aliquotaManual) && aliquotaManual > 0) {
    return {
      aliquota: aliquotaManual,
      valor: Math.round(valorBase * aliquotaManual) / 100,
      origem: "manual",
    };
  }
  const faixa = faixas.find(
    (f) => valorBase >= f.faixa_min && (f.faixa_max == null || valorBase <= f.faixa_max),
  );
  if (!faixa) return { aliquota: 0, valor: 0, origem: "indefinido" };
  return {
    aliquota: faixa.aliquota,
    valor: Math.round(valorBase * faixa.aliquota) / 100,
    origem: "tabela",
  };
}

/** Tabelionato / Registro: busca valor por faixa. Retorna null se não houver tabela. */
export function buscarValorPorFaixa(valor: number, faixas: FaixaValor[]): number | null {
  if (!Number.isFinite(valor) || valor < 0) return null;
  const faixa = faixas.find(
    (f) => valor >= f.faixa_min && (f.faixa_max == null || valor <= f.faixa_max),
  );
  return faixa ? Number(faixa.valor) : null;
}
