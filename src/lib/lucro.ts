/**
 * Cálculo de lucro bruto da AGILIZA.
 *
 * Definição (alinhada ao escritório):
 *   Lucro = valor do serviço que executamos diretamente.
 *   NÃO é lucro: repasses a cartório / taxas de terceiros
 *     - Registro de Imóveis
 *     - Certidões, negativas e assinaturas
 *
 *   É lucro (entre outros):
 *     - Levantamento topográfico / trabalho a campo
 *     - Serviço prestado / assessoria documental
 *     - Atualização CCIR, ITR, CAR (rural)
 */

export type ItemLike = { descricao?: string | null; valor?: number | string | null };

const PASSTHROUGH_PATTERNS = [
  /registro\s+de?\s*im[oó]veis/i,
  /\bri\b/i,
  /certid/i,
  /negativ/i,
  /emolument/i,
  /cart[oó]rio/i,
];

export function isPassthrough(descricao?: string | null): boolean {
  if (!descricao) return false;
  return PASSTHROUGH_PATTERNS.some((rx) => rx.test(descricao));
}

/**
 * Achata itens de um orçamento (suporta multisserviço).
 * Se `servicos` estiver presente e não-vazio, usa os itens de cada bloco.
 * Caso contrário, retorna `itens` como estão.
 */
export function flattenItens(orc: {
  itens?: ItemLike[] | null;
  servicos?: { itens?: ItemLike[] | null }[] | null;
} | null | undefined): ItemLike[] {
  if (!orc) return [];
  if (Array.isArray(orc.servicos) && orc.servicos.length > 0) {
    const out: ItemLike[] = [];
    for (const s of orc.servicos) if (Array.isArray(s?.itens)) out.push(...s.itens);
    return out;
  }
  return Array.isArray(orc.itens) ? orc.itens : [];
}

export function calcularLucro(itens: ItemLike[] | null | undefined): number {
  if (!Array.isArray(itens)) return 0;
  let lucro = 0;
  for (const it of itens) {
    const v = Number(it?.valor ?? 0);
    if (!Number.isFinite(v)) continue;
    if (isPassthrough(it?.descricao)) continue;
    lucro += v;
  }
  return Math.round(lucro * 100) / 100;
}

export function calcularRepasse(itens: ItemLike[] | null | undefined): number {
  if (!Array.isArray(itens)) return 0;
  let total = 0;
  for (const it of itens) {
    const v = Number(it?.valor ?? 0);
    if (!Number.isFinite(v)) continue;
    if (isPassthrough(it?.descricao)) total += v;
  }
  return Math.round(total * 100) / 100;
}
