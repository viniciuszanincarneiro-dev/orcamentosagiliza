import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

import { EMPRESA, TIPO_TITULOS, servicoTemITBI, servicoTemITCMD } from "./empresa";
import { getModeloServico } from "./modelos-servico";

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

  function writeParagraph(text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number]; align?: "left" | "center" | "right" | "justify"; gap?: number; keepTogether?: boolean; indent?: boolean } = {}) {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? PRETO));
    // Recuo de primeira linha de parágrafo (padrão para texto corrido alinhado à esquerda)
    const indent = opts.indent ?? (opts.align === undefined || opts.align === "left");
    const indentW = indent ? 24 : 0;
    const firstW = usableW - indentW;
    // Quebra preservando \n explícitos e aplicando indent só na primeira linha
    const paragraphs = text.split("\n");
    const lineH = size + 3;
    const align = opts.align ?? "left";

    // Pré-calcula linhas totais para keepTogether
    const allLines: { text: string; x: number; first: boolean }[] = [];
    paragraphs.forEach((para) => {
      if (!para.trim()) { allLines.push({ text: "", x: M, first: true }); return; }
      const firstLines = doc.splitTextToSize(para, firstW) as string[];
      // Primeira linha cabe em firstW; se sobrar texto, re-quebra o resto em usableW
      if (firstLines.length === 0) return;
      allLines.push({ text: firstLines[0], x: M + indentW, first: true });
      if (firstLines.length > 1) {
        const rest = firstLines.slice(1).join(" ");
        const restLines = doc.splitTextToSize(rest, usableW) as string[];
        restLines.forEach((ln) => allLines.push({ text: ln, x: M, first: false }));
      }
    });

    const keepTogether = opts.keepTogether ?? true;
    if (keepTogether) {
      const totalH = allLines.length * lineH;
      if (totalH <= (BOTTOM - TOP) && y + totalH > BOTTOM) {
        doc.addPage();
        addHeader();
        y = TOP;
      }
    }

    for (const ln of allLines) {
      ensureSpace(lineH);
      if (align === "center") {
        doc.text(ln.text, W / 2, y, { align: "center" });
      } else if (align === "right") {
        doc.text(ln.text, W - M, y, { align: "right" });
      } else {
        doc.text(ln.text, ln.x, y);
      }
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
    const modelo = getModeloServico(tipoB);
    writeSectionTitle(modelo.titulo);
    if (modelo.descricao) writeParagraph(modelo.descricao, { gap: 10 });
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

  // ============ DESCRIÇÃO DOS SERVIÇOS (metodologia / escopo) ============
  writeSectionTitle("DESCRIÇÃO DOS SERVIÇOS");
  blocos.forEach((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const modelo = getModeloServico(tipoB);
    if (blocos.length > 1) {
      writeParagraph(`${bi + 1}. ${modelo.titulo}`, { bold: true, gap: 2, align: "left" });
    }
    const metod = (modelo.metodologia ?? "").replace(/^\s*DESCRIÇÃO DOS SERVIÇOS:\s*\n+/i, "");
    if (metod) writeParagraph(metod, { gap: 6 });
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
    const aliq = Number(orc.itbi_aliquota ?? 0) || 0;
    const baseITBI = baseProporcional || Number(orc.itbi_valor_declarado ?? 0) || Number(orc.imovel_valor_avaliado ?? 0) || 0;
    if (baseITBI > 0) writeParagraph(`Base de cálculo: ${formatBRL(baseITBI)}`, { gap: 2, align: "left" });
    if (aliq > 0) writeParagraph(`Alíquota: ${aliq.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%`, { gap: 2, align: "left" });
    if (baseITBI > 0 && aliq > 0) {
      writeParagraph(`Cálculo: ${formatBRL(baseITBI)} × ${aliq.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}% = ${formatBRL(itbiValor)}`, { gap: 2, align: "left" });
    }
    writeParagraph(`Valor do ITBI: ${formatBRL(itbiValor)}`, { bold: true, gap: 8, align: "left" });
  }

  // ============ Pré-cálculo do ITCMD (100% manual) ============
  const temITCMD = blocos.some((b) => servicoTemITCMD(b.tipo_servico));
  const itcmdValor = temITCMD ? Number(orc.itcmd_estimado ?? 0) || 0 : 0;
  const mostraITCMD = temITCMD;

  if (mostraITCMD) {
    writeSectionTitle("ITCMD");
    writeParagraph(
      "O ITCMD (Imposto de Transmissão Causa Mortis e Doação) não é calculado pelo sistema. O valor informado abaixo foi fornecido pelo órgão fazendário competente e está incluso no total do orçamento.",
      { gap: 4 },
    );
    writeParagraph(`Valor do ITCMD: ${formatBRL(itcmdValor)}`, { bold: true, gap: 8, align: "left" });
  }

  // ============ DOS VALORES — TABELA FINANCEIRA ÚNICA ============
  // Cabeçalho + linhas de serviços + ITBI (quando aplicável) + TOTAL
  // são renderizados como uma ÚNICA tabela que permanece sempre na mesma página.
  // (título "DOS VALORES" é escrito depois da verificação de quebra de página)

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

  if (mostraITCMD) {
    tabelaBody.push([
      { content: "ITCMD", styles: { fontStyle: "bold", fillColor: VERDE_CLARO, textColor: PRETO } },
      { content: formatBRL(itcmdValor), styles: { fontStyle: "bold", fillColor: VERDE_CLARO, textColor: PRETO, halign: "right" } },
    ]);
  }

  tabelaBody.push([
    { content: "VALOR TOTAL DO ORÇAMENTO", styles: { fontStyle: "bold", fillColor: CINZA_TAB, textColor: [255, 255, 255], fontSize: 11 } },
    { content: formatBRL(orc.valor_total), styles: { fontStyle: "bold", fillColor: CINZA_TAB, textColor: [255, 255, 255], halign: "right", fontSize: 11 } },
  ]);

  // Tabela financeira: deve permanecer SEMPRE inteira na mesma página.
  // Estimamos a altura total (cabeçalho da seção + header da tabela + linhas)
  // e, se não couber no espaço restante da página, forçamos quebra ANTES de
  // iniciar a tabela — assim nenhuma linha (ITBI/ITCMD/TOTAL) é separada.
  const linhaH = 26; // altura estimada por linha (fontSize 10 + padding)
  const alturaTitulo = 24;
  const alturaTabela = (tabelaBody.length + 1) * linhaH + 6 + alturaTitulo;
  if (y + alturaTabela > BOTTOM) {
    doc.addPage();
    addHeader();
    y = TOP;
  }
  writeSectionTitle("DOS VALORES");

  autoTable(doc, {
    startY: y,
    head: [[
      { content: "SERVIÇO", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold" } },
      { content: "VALOR", styles: { fillColor: VERDE_CLARO, textColor: PRETO, fontStyle: "bold", halign: "right" } },
    ]],
    body: tabelaBody,
    theme: "grid",
    margin: { left: M, right: M, top: HEADER_H + 18, bottom: FOOTER_H + 14 },
    showHead: "everyPage",
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 5, textColor: PRETO, lineColor: [180, 180, 180], lineWidth: 0.4, overflow: "linebreak", valign: "middle" },
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
  doc.text("AGILIZA ASSESSORIA EM DOCUMENTOS", W / 2, y, { align: "center" });
  y += 12;
  doc.text("E TOPOGRAFIA", W / 2, y, { align: "center" });
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Everton de Oliveira Meyer Ltda", W / 2, y, { align: "center" });
  y += 11;
  doc.text("CNPJ 36.172.008/0001-82", W / 2, y, { align: "center" });
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
