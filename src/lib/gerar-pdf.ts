import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

import { EMPRESA, TIPO_TITULOS, DESCRICAO_PADRAO, METODOLOGIA_SERVICO, servicoTemITBI } from "./empresa";
import type { OrcamentoData } from "./orcamento-types";
import type { Escritorio } from "@/hooks/use-profile";
import { formatBRL, formatDateLong, formatNumberBR } from "./format";
import logoUrl from "@/assets/agiliza-logo.png";

type EscritorioInfo = {
  razao: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  endereco: string;
};

function escritorioFallback(): EscritorioInfo {
  return {
    razao: EMPRESA.razao,
    cnpj: EMPRESA.cnpj,
    email: EMPRESA.email,
    telefone: "(49) 99990-9954",
    cidade: "São Miguel do Oeste/SC",
    endereco: "Rua Marcilio Dias, nº 1539, Centro, São Miguel do Oeste/SC",
  };
}
function toInfo(e?: Escritorio | null): EscritorioInfo {
  if (!e) return escritorioFallback();
  return {
    razao: e.razao_social,
    cnpj: e.cnpj,
    email: e.email,
    telefone: e.telefone,
    cidade: e.cidade,
    endereco: e.endereco,
  };
}

// Cores
const PRETO: [number, number, number] = [0, 0, 0];
const CINZA: [number, number, number] = [90, 90, 90];
// Cores aplicadas SOMENTE ao documento final (PDF): bordô/vinho escuro.
// Não confundir com o tema do sistema (que continua com sua paleta própria).
const VERDE: [number, number, number] = [114, 28, 36];          // bordô principal
const VERDE_CLARO: [number, number, number] = [248, 232, 234];  // fundo claro de cabeçalho de coluna
const CINZA_TAB: [number, number, number] = [114, 28, 36];      // faixa de cabeçalho de tabela

// Serviços que exigem georreferenciamento (renderiza o bloco legal no PDF).
// Apenas serviços que efetivamente envolvem georreferenciamento — NÃO incluir
// todos os serviços rurais, apenas os que realmente exigem o procedimento.
const TIPOS_RURAIS = new Set([
  "retificacao_geo",
  "desmembramento_incra",
]);

let _logoCache: string | undefined;
async function loadLogoBase64(): Promise<string> {
  if (_logoCache) return _logoCache;
  const res = await fetch(logoUrl);
  const blob = await res.blob();
  _logoCache = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return _logoCache;
}

function valorPorExtenso(v: number): string {
  try {
    const reais = Math.floor(v);
    const centavos = Math.round((v - reais) * 100);
    return `${formatBRL(v)}${centavos || reais ? "" : ""}`;
  } catch { return formatBRL(v); }
}

export async function gerarOrcamentoPDF(orc: OrcamentoData, escritorio?: Escritorio | null, todosEscritorios?: Escritorio[]): Promise<Blob> {
  const esc = toInfo(escritorio);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  // Margens generosas para garantir aparência profissional e impressão
  const M = 56;
  const logo = await loadLogoBase64();

  const ano = new Date().getFullYear();
  const numeroLabel = orc.numero ? `${orc.numero}/${ano}` : `—/${ano}`;
  const titulo = TIPO_TITULOS[orc.tipo_servico] ?? "PRESTAÇÃO DE SERVIÇOS";

  // ============ HEADER & FOOTER ============
  const HEADER_H = 70;
  // Rodapé institucional fixo, presente em TODAS as páginas, com a lista
  // de unidades da Agiliza em duas colunas.
  const UNIDADES_FIXAS: Array<{ cidade: string; endereco: string; telefone: string; email: string }> = [
    { cidade: "São Miguel do Oeste - SC", endereco: "Rua Marcilio Dias, 1539 - Centro, São Miguel do Oeste - SC", telefone: "(49) 3197-8160 / (49) 99990-9954 / (49) 99933-2552", email: "agiliza.smo@gmail.com" },
    { cidade: "Maravilha - SC", endereco: "Avenida Anita Garibaldi, 340 - Centro, Maravilha - SC", telefone: "(49) 99154-1854", email: "agiliza.mh@gmail.com" },
    { cidade: "Anchieta - SC", endereco: "Av. Anchieta, 330, Sala 01, Centro, 89970-000, Anchieta - SC", telefone: "(49) 9 9911-7869", email: "agiliza.anchieta@gmail.com" },
    { cidade: "Paraíso - SC", endereco: "Rua Guilherme Schmidt, 834 - Centro, Paraíso - SC", telefone: "(49) 99188-5181", email: "agiliza.paraiso@gmail.com" },
    { cidade: "Dionísio Cerqueira - SC", endereco: "Avenida Washington Luis, 646 - Centro, Dionísio Cerqueira - SC", telefone: "(49) 99192-2081", email: "agiliza.dc@gmail.com" },
  ];
  // 5 unidades em 2 colunas → 3 linhas. Cada bloco: cidade + 3 linhas de dados.
  const FOOTER_H = 105;


  const addHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...VERDE);
    doc.text("AGILIZA ASSESSORIA EM DOCUMENTOS | TOPOGRAFIA | AMBIENTAL", W / 2, 30, { align: "center" });
    try { doc.addImage(logo, "PNG", M, 38, 90, 30); } catch { /* noop */ }
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.7);
    doc.line(M, HEADER_H, W - M, HEADER_H);
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    const yTop = H - FOOTER_H;
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.5);
    doc.line(M, yTop, W - M, yTop);

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...VERDE);
    doc.text("Nossas unidades", M, yTop + 10);

    // Grade 2 colunas
    const colGap = 14;
    const colW = (W - 2 * M - colGap) / 2;
    const lineH = 7.5;
    const blockGap = 3;
    const startY = yTop + 18;

    const drawUnidade = (u: typeof UNIDADES_FIXAS[number], x: number, yStart: number): number => {
      let cy = yStart;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...VERDE);
      doc.text(u.cidade, x, cy);
      cy += lineH;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.3);
      doc.setTextColor(...CINZA);
      const drawField = (label: string, value: string) => {
        const text = `${label}${value}`;
        const lines = doc.splitTextToSize(text, colW) as string[];
        lines.forEach((ln) => { doc.text(ln, x, cy); cy += lineH - 1; });
      };
      drawField("End.: ", u.endereco);
      drawField("Tel.: ", u.telefone);
      drawField("E-mail: ", u.email);
      return cy + blockGap;
    };

    let leftY = startY;
    let rightY = startY;
    UNIDADES_FIXAS.forEach((u, idx) => {
      const isLeft = idx % 2 === 0;
      if (isLeft) {
        leftY = drawUnidade(u, M, leftY);
      } else {
        rightY = drawUnidade(u, M + colW + colGap, rightY);
      }
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...CINZA);
    doc.text(`Página ${pageNum} de ${totalPages}`, W - M, H - 14, { align: "right" });
  };


  // ============ helpers de cursor com quebra automática ============
  let y = HEADER_H + 18;
  const TOP = HEADER_H + 18;
  const BOTTOM = H - FOOTER_H - 14;
  const usableW = W - 2 * M;

  function ensureSpace(needed: number) {
    if (y + needed > BOTTOM) {
      doc.addPage();
      addHeader();
      y = TOP;
    }
  }

  function writeParagraph(text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number]; align?: "left" | "center" | "right" | "justify"; gap?: number; keepTogether?: boolean } = {}) {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? PRETO));
    const lines = doc.splitTextToSize(text, usableW) as string[];
    const lineH = size + 3;
    const align = opts.align ?? "justify";
    const keepTogether = opts.keepTogether ?? true;
    if (keepTogether) {
      const totalH = lines.length * lineH;
      if (totalH <= (BOTTOM - TOP) && y + totalH > BOTTOM) {
        doc.addPage();
        addHeader();
        y = TOP;
      }
    }
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      ensureSpace(lineH);
      const isLast = i === lines.length - 1;
      if (align === "justify" && !isLast) {
        const words = ln.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          const naturalW = words.reduce((a, w) => a + doc.getTextWidth(w), 0);
          const gap = (usableW - naturalW) / (words.length - 1);
          // Evita gaps absurdos quando a linha é muito curta
          if (gap >= 0 && gap < size * 1.2) {
            let x = M;
            for (let j = 0; j < words.length; j++) {
              doc.text(words[j], x, y);
              x += doc.getTextWidth(words[j]) + gap;
            }
            y += lineH;
            continue;
          }
        }
      }
      const x = align === "center" ? W / 2 : align === "right" ? W - M : M;
      const drawAlign = align === "justify" ? "left" : align;
      doc.text(ln, x, y, { align: drawAlign as "left" | "center" | "right", maxWidth: usableW });
      y += lineH;
    }
    y += opts.gap ?? 4;
  }

  function writeSectionTitle(text: string) {
    // Reserva espaço para o título + ao menos 2 linhas seguintes (evita órfão no fim da página)
    ensureSpace(22 + 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...VERDE);
    doc.text(text, M, y);
    y += 14;
  }

  // ============ PÁGINA 1 — CAPA ============
  addHeader();
  y = TOP;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE);
  doc.text(`ORÇAMENTO Nº ${numeroLabel}`, W / 2, y, { align: "center" });
  // sublinhado
  const tw = doc.getTextWidth(`ORÇAMENTO Nº ${numeroLabel}`);
  doc.setLineWidth(0.6);
  doc.line(W / 2 - tw / 2, y + 2, W / 2 + tw / 2, y + 2);
  y += 24;

  // Normaliza blocos de serviço (multisserviço). Cada bloco = serviço completo.
  const blocos = (Array.isArray(orc.servicos) && orc.servicos.length > 0)
    ? orc.servicos
    : [{ id: "legacy", tipo_servico: orc.tipo_servico, itens: orc.itens, observacoes: undefined, subtotal: orc.valor_total }];
  const anyRural = blocos.some((b) => TIPOS_RURAIS.has(b.tipo_servico));

  // Subtítulo (título do serviço — ou rótulo "MULTISSERVIÇO" quando >1 bloco)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (blocos.length === 1) {
    const tituloLines = doc.splitTextToSize(titulo, usableW) as string[];
    tituloLines.forEach((ln) => { doc.text(ln, W / 2, y, { align: "center" }); y += 14; });
    y += 10;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...VERDE);
    doc.text("Serviços realizados:", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PRETO);
    blocos.forEach((b) => {
      const t = TIPO_TITULOS[b.tipo_servico] ?? "Prestação de serviços";
      ensureSpace(13);
      doc.text(`• ${t}`, M + 8, y);
      y += 13;
    });
    y += 8;
  }

  // Interessado
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const interessado = `Interessado: ${orc.requerente_nome}${orc.requerente_cpf_cnpj ? ` — ${orc.requerente_cpf_cnpj}` : ""}`;
  writeParagraph(interessado, { gap: 10, align: "left" });

  // Prestadora
  const prestadora = `PRESTADORA DE SERVIÇO: ${esc.razao}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${esc.cnpj}, com sede em ${esc.endereco}, com endereço eletrônico: ${esc.email}, contato telefônico: ${esc.telefone}.`;
  {
    const label = "PRESTADORA DE SERVIÇO: ";
    const rest = prestadora.slice(label.length);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const labelW = doc.getTextWidth(label);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    const restLines = doc.splitTextToSize(rest, usableW - labelW) as string[];
    restLines.forEach((ln, idx) => {
      ensureSpace(13);
      doc.text(ln, idx === 0 ? M + labelW : M, y);
      y += 13;
    });
    y += 6;
  }
  // Unidade responsável pelo orçamento
  {
    const label = "UNIDADE RESPONSÁVEL: ";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const labelW = doc.getTextWidth(label);
    ensureSpace(13);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(esc.cidade, M + labelW, y);
    y += 18;
  }


  // ============ BLOCOS EXPLICATIVOS DOS SERVIÇOS ============
  // Cada serviço apresenta título próprio + texto explicativo/metodologia completa.
  blocos.forEach((bloco) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    const metod = METODOLOGIA_SERVICO[tipoB] ?? "";
    const desc = DESCRICAO_PADRAO[tipoB] ?? "";
    writeSectionTitle(tituloB);
    if (metod) writeParagraph(metod, { gap: 6 });
    if (desc) writeParagraph(desc, { gap: 10 });
  });

  // (Bloco legal de GEORREFERENCIAMENTO removido — mantido apenas na fundamentação do serviço)

  // ============ OBJETO DO ORÇAMENTO ============
  writeSectionTitle("OBJETO DO ORÇAMENTO");
  const objetoServicos = blocos.length === 1
    ? (TIPO_TITULOS[blocos[0].tipo_servico] ?? "prestação de serviços").toLowerCase()
    : blocos.map((b) => (TIPO_TITULOS[b.tipo_servico] ?? "prestação de serviços").toLowerCase()).join("; ");
  writeParagraph(
    `O presente orçamento refere-se à prestação dos seguintes serviços: ${objetoServicos}${anyRural ? ", com certificação junto ao INCRA quando aplicável," : ""} sobre o imóvel a seguir descrito:`,
    { gap: 6 }
  );

  // IMÓVEL — descrição numerada
  const partes: string[] = [];
  if (orc.imovel_area_m2) {
    partes.push(`com área de ${formatNumberBR(orc.imovel_area_m2)} m² (${formatNumberBR(orc.imovel_area_m2 / 10000, 4)} ha)`);
  }
  if (orc.imovel_localizacao) partes.push(`localizado ${orc.imovel_localizacao}`);
  if (orc.imovel_municipio) partes.push(`no município de ${orc.imovel_municipio}`);
  if (orc.imovel_matricula) partes.push(`matriculado no Ofício de Registro de Imóveis sob o nº ${orc.imovel_matricula}`);
  if (orc.imovel_valor_avaliado) partes.push(`imóvel avaliado em ${valorPorExtenso(orc.imovel_valor_avaliado)}`);

  const descImovel = `1. IMÓVEL: ${orc.imovel_descricao ? orc.imovel_descricao + ". " : ""}${partes.join(", ")}.`;
  {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const label = "1. IMÓVEL: ";
    const labelW = doc.getTextWidth(label);
    ensureSpace(14);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    const restoTexto = descImovel.slice(label.length);
    const lns = doc.splitTextToSize(restoTexto, usableW - labelW) as string[];
    lns.forEach((ln, idx) => {
      ensureSpace(13);
      doc.text(ln, idx === 0 ? M + labelW : M, y);
      y += 13;
    });
    y += 8;
  }

  // Proprietários
  if (orc.proprietarios?.length) {
    writeSectionTitle("PROPRIETÁRIOS");
    orc.proprietarios.forEach((p) => {
      writeParagraph(`• ${p.nome}${p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ""}`, { gap: 2, align: "left" });
    });
    y += 4;
  }

  // ============ DESCRIÇÃO DOS SERVIÇOS (resumo do escopo) ============
  writeSectionTitle("DESCRIÇÃO DOS SERVIÇOS");
  blocos.forEach((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    const desc = DESCRICAO_PADRAO[tipoB] ?? "";
    writeParagraph(`${bi + 1}. ${tituloB}`, { bold: true, gap: 2, align: "left" });
    if (desc) writeParagraph(desc, { gap: 6 });
    if (bloco.observacoes?.trim()) writeParagraph(`Observações: ${bloco.observacoes.trim()}`, { gap: 6 });
  });

  // ============ Pré-cálculo do ITBI (100% manual) ============
  const temITBI = blocos.some((b) => servicoTemITBI(b.tipo_servico));
  const itbiValor = temITBI ? Number(orc.itbi_estimado ?? 0) || 0 : 0;
  const baseProporcional = temITBI ? Number(orc.itbi_base_calculo ?? 0) || 0 : 0;
  const areaTotal = Number(orc.imovel_area_m2 ?? 0) || 0;
  const areaTrans = Number(orc.itbi_area_transmitida ?? 0) || 0;
  const fracaoInf = Number(orc.itbi_fracao_ideal ?? 0) || 0;
  const mostraITBI = temITBI;

  if (mostraITBI) {
    const usarContrato = !!orc.itbi_usar_contrato && Number(orc.itbi_valor_contrato ?? 0) > 0;
    const percent = areaTrans > 0 && areaTotal > 0
      ? (areaTrans / areaTotal) * 100
      : (fracaoInf > 0 ? fracaoInf : 100);
    const valorCheio = Number(orc.imovel_valor_avaliado ?? 0) || 0;
    const transmissaoParcial = usarContrato || (percent > 0 && percent < 100);

    if (transmissaoParcial) {
      writeSectionTitle("BASE PROPORCIONAL — TRANSMISSÃO PARCIAL");
      if (areaTotal > 0) writeParagraph(`Área total do imóvel: ${formatNumberBR(areaTotal)} m²`, { gap: 2, align: "left" });
      if (areaTrans > 0) writeParagraph(`Área transmitida: ${formatNumberBR(areaTrans)} m²`, { gap: 2, align: "left" });
      writeParagraph(`Percentual transmitido: ${percent.toFixed(2)}%`, { gap: 2, align: "left" });
      if (valorCheio > 0) writeParagraph(`Valor total do imóvel: ${formatBRL(valorCheio)}`, { gap: 2, align: "left" });
      if (usarContrato) writeParagraph(`Valor do contrato: ${formatBRL(Number(orc.itbi_valor_contrato ?? 0))}`, { gap: 2, align: "left" });
      writeParagraph(`Valor base considerado: ${formatBRL(baseProporcional || valorCheio)}`, { bold: true, gap: 2, align: "left" });
      writeParagraph(
        "Esta base proporcional é utilizada como referência para Registro de Imóveis, Tabelionato e demais emolumentos vinculados ao valor do imóvel. O ITBI é informado manualmente.",
        { gap: 8 },
      );
    }

    writeSectionTitle("ITBI");
    if (orc.itbi_municipio) writeParagraph(`Município: ${orc.itbi_municipio}`, { gap: 2, align: "left" });
    writeParagraph(`Valor do ITBI: ${formatBRL(itbiValor)}`, { bold: true, gap: 8, align: "left" });
  }

  // ============ DOS VALORES — TABELA FINANCEIRA ÚNICA ============
  // Cabeçalho + linhas de serviços + ITBI (quando aplicável) + TOTAL
  // são renderizados como uma ÚNICA tabela que permanece sempre na mesma página.
  writeSectionTitle("DOS VALORES");

  const tabelaBody: RowInput[] = [];
  blocos.forEach((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    if (blocos.length > 1) {
      tabelaBody.push([
        {
          content: `${bi + 1}. ${tituloB}`,
          colSpan: 2,
          styles: { fillColor: CINZA_TAB, textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
        },
      ] as RowInput);
    }
    bloco.itens.forEach((i) => {
      tabelaBody.push([i.descricao, formatBRL(i.valor)]);
    });
  });

  if (mostraITBI) {
    tabelaBody.push([
      { content: "ITBI", styles: { fontStyle: "bold", fillColor: VERDE_CLARO, textColor: PRETO } },
      { content: formatBRL(itbiValor), styles: { fontStyle: "bold", fillColor: VERDE_CLARO, textColor: PRETO, halign: "right" } },
    ]);
  }

  tabelaBody.push([
    { content: "VALOR TOTAL DO ORÇAMENTO", styles: { fontStyle: "bold", fillColor: CINZA_TAB, textColor: [255, 255, 255], fontSize: 11 } },
    { content: formatBRL(orc.valor_total), styles: { fontStyle: "bold", fillColor: CINZA_TAB, textColor: [255, 255, 255], halign: "right", fontSize: 11 } },
  ]);

  // Tabela financeira deve caber INTEIRA (cabeçalho + linhas + total) em uma
  // única página. Calculamos o espaço disponível e ajustamos fonte/padding
  // para garantir que nunca quebre entre páginas.
  const rowsCount = tabelaBody.length + 1; // +1 cabeçalho
  let available = BOTTOM - y;
  const minNeededForObs = 90; // reserva mínima para observações abaixo
  // Se não cabe nada razoável, vai para próxima página
  if (available < 140) {
    doc.addPage();
    addHeader();
    y = TOP;
    available = BOTTOM - y;
  }
  const espacoTabela = Math.max(140, available - minNeededForObs);
  // Calcula altura por linha que cabe; estilos básicos com fallback compactado
  const alturaPorLinhaIdeal = 24;
  const alturaPorLinhaMin = 14;
  const alturaPorLinha = Math.max(
    alturaPorLinhaMin,
    Math.min(alturaPorLinhaIdeal, Math.floor(espacoTabela / rowsCount))
  );
  // Mapeia altura→fonte/padding
  let fontSize = 10;
  let cellPadding = 5;
  if (alturaPorLinha < 22) { fontSize = 9; cellPadding = 4; }
  if (alturaPorLinha < 18) { fontSize = 8; cellPadding = 3; }
  if (alturaPorLinha < 15) { fontSize = 7.5; cellPadding = 2; }

  autoTable(doc, {
    startY: y,
    head: [[
      { content: "SERVIÇO", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold" } },
      { content: "VALOR", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold", halign: "right" } },
    ]],
    body: tabelaBody,
    theme: "grid",
    margin: { left: M, right: M, top: HEADER_H + 18, bottom: FOOTER_H + 14 },
    showHead: "firstPage",
    rowPageBreak: "avoid",
    pageBreak: "avoid",
    styles: { font: "helvetica", fontSize, cellPadding, textColor: PRETO, lineColor: [180, 180, 180], lineWidth: 0.4, overflow: "linebreak", valign: "middle" },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 120 } },
    tableWidth: "auto",
    didDrawPage: (d) => { if (d.pageNumber > 1) addHeader(); },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;


  // OBSERVAÇÕES
  ensureSpace(80);
  writeSectionTitle("Observações:");
  const obs = [
    "1. Os valores podem sofrer alterações em virtude da tabela de emolumentos do respectivo Cartório de Registro de Imóveis;",
    "2. Em casos de notificação extrajudicial haverá acréscimo de valor de acordo com a notificação extrajudicial, de acordo com o artigo 213, §2º da Lei de Registros Públicos (6.015/76);",
    "3. Forma de Pagamento: a combinar;",
    "4. Orçamento válido por 30 dias.",
  ];
  if (orc.observacoes) obs.push(`5. ${orc.observacoes}`);
  obs.forEach((o) => writeParagraph(o, { gap: 2 }));
  y += 8;

  writeParagraph(
    "Agradecemos pela oportunidade de apresentar nossa proposta. Estamos confiantes de que podemos atender às suas necessidades com qualidade e eficiência!",
    { gap: 16 }
  );

  // Cidade/data + assinatura manual — todo o bloco deve caber junto na mesma página
  const dateGap = 70;
  const lineW = 280;
  const blocoAssinaturaH = 13 + dateGap + 12 + 4 * 12 + 10;
  if (y + blocoAssinaturaH > BOTTOM) {
    doc.addPage();
    addHeader();
    y = TOP;
  }

  writeParagraph(`${esc.cidade}, ${formatDateLong(new Date())}.`, { gap: dateGap, align: "left" });

  // Linha horizontal para assinatura manual (em aberto)
  const lineX = (W - lineW) / 2;
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.6);
  doc.line(lineX, y, lineX + lineW, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRETO);
  doc.text("Everton de Oliveira Meyer", W / 2, y, { align: "center" });
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Técnico em Agrimensura", W / 2, y, { align: "center" });
  y += 11;
  doc.text("CRT – 0406853290-7", W / 2, y, { align: "center" });
  y += 11;
  doc.text("Código INCRA: XAFW", W / 2, y, { align: "center" });
  y += 10;

  // (A lista de unidades agora é renderizada no rodapé fixo de TODAS as páginas.)



  // Footers em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }


  return doc.output("blob");
}
