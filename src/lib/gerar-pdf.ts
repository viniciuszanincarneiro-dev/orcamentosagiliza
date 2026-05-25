import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { EMPRESA, TIPO_TITULOS, DESCRICAO_PADRAO } from "./empresa";
import type { OrcamentoData } from "./orcamento-types";
import { formatBRL, formatDateLong, formatNumberBR } from "./format";
import logoUrl from "@/assets/agiliza-logo.png";

// Cores da marca
const VERDE: [number, number, number] = [52, 168, 83];
const VERMELHO: [number, number, number] = [220, 53, 47];
const PRETO: [number, number, number] = [25, 25, 28];
const CINZA: [number, number, number] = [110, 110, 115];

async function loadLogoBase64(): Promise<string> {
  const res = await fetch(logoUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function gerarOrcamentoPDF(orc: OrcamentoData): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const logo = await loadLogoBase64();

  const numeroLabel = orc.numero ?? "—";
  const titulo = TIPO_TITULOS[orc.tipo_servico] ?? "PRESTAÇÃO DE SERVIÇOS";

  const addHeader = () => {
    doc.addImage(logo, "PNG", M, 30, 140, 50);
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text(`Orçamento Nº ${numeroLabel}`, W - M, 45, { align: "right" });
    doc.text(formatDateLong(new Date()), W - M, 58, { align: "right" });
    // Linha verde
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(2);
    doc.line(M, 90, W - M, 90);
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    const y = H - 70;
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    let cy = y + 10;
    EMPRESA.unidades.forEach((u) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PRETO);
      doc.text(u.cidade, M, cy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...CINZA);
      doc.text(`${u.endereco} · ${u.telefones} · ${u.email}`, M + 90, cy);
      cy += 9;
    });
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(`${pageNum} / ${totalPages}`, W - M, H - 20, { align: "right" });
  };

  // ===== PÁGINA 1 =====
  addHeader();
  let y = 120;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text("ORÇAMENTO", W / 2, y, { align: "center" });
  y += 22;

  doc.setFontSize(11);
  doc.setTextColor(...VERMELHO);
  const tituloLines = doc.splitTextToSize(titulo, W - 2 * M);
  doc.text(tituloLines, W / 2, y, { align: "center" });
  y += tituloLines.length * 14 + 18;

  // Bloco requerente
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text("REQUERENTE:", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(orc.requerente_nome + (orc.requerente_cpf_cnpj ? ` — ${orc.requerente_cpf_cnpj}` : ""), M + 90, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.text("PRESTADORA:", M, y);
  doc.setFont("helvetica", "normal");
  const prest = `${EMPRESA.razao}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${EMPRESA.cnpj}, com sede na Rua Marcilio Dias, nº 1539, Centro, São Miguel do Oeste/SC. E-mail: ${EMPRESA.email} · Telefone: (49) 99990-9954.`;
  const prestLines = doc.splitTextToSize(prest, W - 2 * M - 90);
  doc.text(prestLines, M + 90, y);
  y += prestLines.length * 12 + 14;

  // Objeto
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...VERDE);
  doc.text("OBJETO DO ORÇAMENTO", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PRETO);

  const partes: string[] = [];
  if (orc.imovel_area_m2) partes.push(`com área de ${formatNumberBR(orc.imovel_area_m2)} m² (${formatNumberBR(orc.imovel_area_m2 / 10000, 4)} ha)`);
  if (orc.imovel_municipio) partes.push(`município de ${orc.imovel_municipio}`);
  if (orc.imovel_matricula) partes.push(`matrícula nº ${orc.imovel_matricula}`);
  if (orc.imovel_valor_avaliado) partes.push(`imóvel avaliado em ${formatBRL(orc.imovel_valor_avaliado)}`);
  const objText = `O presente orçamento refere-se à prestação de serviço de ${titulo.toLowerCase()}, referente ao imóvel ${partes.join(", ")}.`;
  const objLines = doc.splitTextToSize(objText, W - 2 * M);
  doc.text(objLines, M, y);
  y += objLines.length * 12 + 14;

  // Proprietários
  if (orc.proprietarios?.length) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE);
    doc.text("PROPRIETÁRIOS", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PRETO);
    orc.proprietarios.forEach((p) => {
      doc.text(`• ${p.nome}${p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ""}`, M + 6, y);
      y += 12;
    });
    y += 4;
  }

  // Descrição
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("DESCRIÇÃO DOS SERVIÇOS", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PRETO);
  const descText = DESCRICAO_PADRAO[orc.tipo_servico] ?? "";
  const descLines = doc.splitTextToSize(descText, W - 2 * M);
  doc.text(descLines, M, y);
  y += descLines.length * 12 + 16;

  // Tabela de valores
  autoTable(doc, {
    startY: y,
    head: [["SERVIÇOS", "VALORES"]],
    body: orc.itens.map((i) => [i.descricao, formatBRL(i.valor)]),
    foot: [["VALOR TOTAL", formatBRL(orc.valor_total)]],
    theme: "grid",
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 8, textColor: PRETO },
    headStyles: { fillColor: PRETO, textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
    footStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 11 },
    columnStyles: { 1: { halign: "right", cellWidth: 130 } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  // Garante espaço mínimo para Observações; senão nova página
  const OBS_MIN_HEIGHT = 180;
  if (y > H - 70 - OBS_MIN_HEIGHT) {
    doc.addPage();
    addHeader();
    y = 120;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.setFontSize(11);
  doc.text("OBSERVAÇÕES", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PRETO);
  doc.setFontSize(10);

  const obs = [
    "1. Os valores podem sofrer alterações em virtude da tabela de emolumentos do respectivo Cartório de Registro de Imóveis;",
    "2. Em casos de notificação extrajudicial haverá acréscimo de valor de acordo com a notificação extrajudicial, conforme art. 213, §2º da Lei de Registros Públicos (6.015/76);",
    "3. Forma de Pagamento: a combinar;",
    "4. Orçamento válido por 30 dias.",
  ];
  if (orc.observacoes) obs.push(`5. ${orc.observacoes}`);
  obs.forEach((o) => {
    const lns = doc.splitTextToSize(o, W - 2 * M);
    doc.text(lns, M, y);
    y += lns.length * 12 + 4;
  });

  y += 14;
  const agradec = "Agradecemos pela oportunidade de apresentar nossa proposta. Estamos confiantes de que podemos atender às suas necessidades com qualidade e eficiência!";
  const agradecLines = doc.splitTextToSize(agradec, W - 2 * M);
  doc.text(agradecLines, M, y);
  y += agradecLines.length * 12 + 20;

  // --- BLOCO DE ASSINATURA (com espaço garantido p/ assinatura digital) ---
  const SIGN_BLOCK_HEIGHT = 260;
  if (y > H - 70 - SIGN_BLOCK_HEIGHT) {
    doc.addPage();
    addHeader();
    y = 130;
  } else {
    y += 20;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PRETO);
  doc.text(`São Miguel do Oeste/SC, ${formatDateLong(new Date())}.`, M, y);
  y += 40;

  // Caixa reservada para assinatura digital
  const boxW = 320;
  const boxH = 90;
  const boxX = (W - boxW) / 2;
  const boxY = y;
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4);
  doc.setFontSize(8);
  doc.setTextColor(...CINZA);
  doc.text("Espaço reservado para assinatura digital", W / 2, boxY + boxH / 2 + 3, { align: "center" });

  y = boxY + boxH + 18;

  // Linha + identificação abaixo da caixa (sem sobreposição)
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.7);
  doc.line(W / 2 - 140, y, W / 2 + 140, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRETO);
  doc.text(EMPRESA.razao, W / 2, y, { align: "center" });
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text(`${EMPRESA.razaoLegal} — CNPJ ${EMPRESA.cnpj}`, W / 2, y, { align: "center" });

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc.output("blob");
}
