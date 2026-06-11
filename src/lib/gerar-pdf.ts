import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { EMPRESA, TIPO_TITULOS, DESCRICAO_PADRAO, METODOLOGIA_SERVICO } from "./empresa";
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

const TIPOS_RURAIS = new Set([
  "retificacao_geo",
  "georreferenciamento",
  "desmembramento",
  "desmembramento_incra",
  "remembramento",
  "estremacao",
  "divisao_amigavel",
  "usucapiao_extrajudicial",
  "levantamento_topografico",
  "levantamento_planialtimetrico",
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

export async function gerarOrcamentoPDF(orc: OrcamentoData, escritorio?: Escritorio | null): Promise<Blob> {
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
  const FOOTER_H = 110;

  const addHeader = () => {
    // Faixa de texto de identificação
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...VERDE);
    doc.text("AGILIZA ASSESSORIA EM DOCUMENTOS | TOPOGRAFIA | AMBIENTAL", W / 2, 30, { align: "center" });
    // Logo discreto à esquerda
    try { doc.addImage(logo, "PNG", M, 38, 90, 30); } catch { /* noop */ }
    // Linha
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.7);
    doc.line(M, HEADER_H, W - M, HEADER_H);
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    const y = H - FOOTER_H;
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    doc.setFontSize(8);
    let cy = y + 14;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE);
    doc.text(esc.cidade, M, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CINZA);
    doc.text(` - ${esc.endereco}`, M + doc.getTextWidth(esc.cidade), cy);
    cy += 11;
    doc.text(`${esc.telefone}   ${esc.email}`, M, cy);
    cy += 11;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE);
    doc.text(esc.razao, M, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CINZA);
    doc.text(` · CNPJ ${esc.cnpj}`, M + doc.getTextWidth(esc.razao), cy);
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(`${pageNum} / ${totalPages}`, W - M, H - 18, { align: "right" });
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
    // Mantém parágrafo inteiro junto: se não couber, quebra página antes de iniciar.
    const keepTogether = opts.keepTogether ?? true;
    if (keepTogether) {
      const totalH = lines.length * lineH;
      if (totalH <= (BOTTOM - TOP) && y + totalH > BOTTOM) {
        doc.addPage();
        addHeader();
        y = TOP;
      }
    }
    for (const ln of lines) {
      ensureSpace(lineH);
      const x = opts.align === "center" ? W / 2 : opts.align === "right" ? W - M : M;
      doc.text(ln, x, y, { align: opts.align === "justify" ? "left" : (opts.align ?? "left") as "left" | "center" | "right", maxWidth: usableW });
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
  } else {
    doc.text("ORÇAMENTO MULTISSERVIÇO", W / 2, y, { align: "center" });
    y += 14;
  }
  y += 10;

  // Interessado
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const interessado = `Interessado: ${orc.requerente_nome}${orc.requerente_cpf_cnpj ? ` — ${orc.requerente_cpf_cnpj}` : ""}`;
  writeParagraph(interessado, { gap: 10 });

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
    y += 12;
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

  // GEORREFERENCIAMENTO (texto legal) — se houver pelo menos um serviço rural
  if (anyRural) {
    writeSectionTitle("GEORREFERENCIAMENTO");
    writeParagraph(
      "A Lei nº 10.267/2001, a qual foi regulamentada pelo Decreto nº 4.449/2002, demonstra algumas alterações e determina que sejam cumpridas. Estas alterações estão relacionadas ao cadastramento de imóveis rurais, tornando obrigatório o georreferenciamento, o qual deverá conter as coordenadas dos vértices definidores dos limites dos imóveis rurais, com precisão posicional, nos casos de desmembramento, remembramento ou mudança de titularidade entre outras modalidades. Tais exigências representam uma mudança paradigmática nas formas de levantamento e cadastro imobiliário até então vigentes no Brasil.",
      { gap: 6 }
    );
    writeParagraph(
      "Todos os imóveis rurais possuem a obrigatoriedade em fazer o georreferenciamento até 20 de novembro de 2025, prazo esse definido no Decreto 4.449/02, alterado pelo decreto 9.311/18.",
      { gap: 6 }
    );
    writeParagraph("• Vigente para imóveis acima de 100 hectares;", { gap: 2 });
    writeParagraph("• 20/11/2023 para os imóveis com área superior a 25 hectares;", { gap: 2 });
    writeParagraph("• 20/11/2025 para os imóveis com área inferior a 25 hectares.", { gap: 10 });
  }

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
      writeParagraph(`• ${p.nome}${p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ""}`, { gap: 2 });
    });
    y += 4;
  }

  // ============ DESCRIÇÃO DOS SERVIÇOS (resumo do escopo) ============
  writeSectionTitle("DESCRIÇÃO DOS SERVIÇOS");
  blocos.forEach((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    const desc = DESCRICAO_PADRAO[tipoB] ?? "";
    writeParagraph(`${bi + 1}. ${tituloB}`, { bold: true, gap: 2 });
    if (desc) writeParagraph(desc, { gap: 6 });
    if (bloco.observacoes?.trim()) writeParagraph(`Observações: ${bloco.observacoes.trim()}`, { gap: 6 });
  });

  // ============ DOS VALORES — uma tabela por serviço ============
  writeSectionTitle("DOS VALORES");

  blocos.forEach((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    const subtotal = bloco.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const cabecalho = blocos.length > 1 ? `${bi + 1}. ${tituloB}` : tituloB;

    ensureSpace(60);
    autoTable(doc, {
      startY: y,
      head: [
        [{ content: cabecalho, colSpan: 2, styles: { halign: "center", fillColor: CINZA_TAB, textColor: [255, 255, 255], fontStyle: "bold" } }],
        [
          { content: "SERVIÇOS:", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold" } },
          { content: "VALORES:", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold", halign: "right" } },
        ],
      ],
      body: bloco.itens.map((i) => [i.descricao, formatBRL(i.valor)]),
      foot: [[
        { content: "SUBTOTAL:", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold" } },
        { content: formatBRL(subtotal), styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold", halign: "right" } },
      ]],
      theme: "grid",
      margin: { left: M, right: M, top: HEADER_H + 18, bottom: FOOTER_H + 14 },
      showHead: "everyPage",
      rowPageBreak: "avoid",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6, textColor: PRETO, lineColor: [180, 180, 180], lineWidth: 0.4, overflow: "linebreak", valign: "middle" },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 120 } },
      tableWidth: "auto",
      didDrawPage: (d) => { if (d.pageNumber > 1) addHeader(); },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  });

  // VALOR TOTAL DO ORÇAMENTO
  ensureSpace(36);
  autoTable(doc, {
    startY: y,
    body: [[
      { content: "VALOR TOTAL DO ORÇAMENTO:", styles: { fontStyle: "bold", fillColor: CINZA_TAB, textColor: [255, 255, 255] } },
      { content: formatBRL(orc.valor_total), styles: { fontStyle: "bold", fillColor: CINZA_TAB, textColor: [255, 255, 255], halign: "right" } },
    ]],
    theme: "grid",
    margin: { left: M, right: M, top: HEADER_H + 18, bottom: FOOTER_H + 14 },
    rowPageBreak: "avoid",
    styles: { font: "helvetica", fontSize: 11, cellPadding: 7, lineColor: [180, 180, 180], lineWidth: 0.4, overflow: "linebreak", valign: "middle" },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 120 } },
    tableWidth: "auto",
    didDrawPage: (d) => { if (d.pageNumber > 1) addHeader(); },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;


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

  // Cidade/data + assinatura — todo o bloco deve caber junto na mesma página
  const dateLineH = 13;
  const dateGap = 30;
  const boxW = 360;
  const boxH = 70;
  const blocoAssinaturaH = dateLineH + dateGap + boxH + 20;
  if (y + blocoAssinaturaH > BOTTOM) {
    doc.addPage();
    addHeader();
    y = TOP;
  }

  writeParagraph(`${esc.cidade}, ${formatDateLong(new Date())}.`, { gap: dateGap });

  // Caixa única para assinatura digital oficial (sem duplicação de nome/CNPJ abaixo)
  const boxX = (W - boxW) / 2;
  const boxY = y;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CINZA);
  doc.text(
    `Assinado de forma digital por ${esc.razao.toUpperCase()}:${esc.cnpj.replace(/\D/g, "")}`,
    W / 2, boxY + boxH / 2 - 4, { align: "center", maxWidth: boxW - 16 }
  );
  doc.text(
    `Dados: ${new Date().toLocaleString("pt-BR")} -03'00'`,
    W / 2, boxY + boxH / 2 + 10, { align: "center" }
  );
  y = boxY + boxH + 14;

  // Footers em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc.output("blob");
}
