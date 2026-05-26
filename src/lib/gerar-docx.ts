import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, HeadingLevel, ImageRun,
} from "docx";

import { EMPRESA, TIPO_TITULOS, DESCRICAO_PADRAO } from "./empresa";
import type { OrcamentoData } from "./orcamento-types";
import { formatBRL, formatDateLong, formatNumberBR } from "./format";
import logoUrl from "@/assets/agiliza-logo.png";

const VERDE = "2EA84E";
const VERMELHO = "DC352F";
const PRETO = "19191C";

let _logoBytesCache: Uint8Array | undefined;
async function logoBytes(): Promise<Uint8Array> {
  if (_logoBytesCache) return _logoBytesCache;
  const res = await fetch(logoUrl);
  const buf = await res.arrayBuffer();
  _logoBytesCache = new Uint8Array(buf);
  return _logoBytesCache;
}

function P(opts: { text?: string; bold?: boolean; color?: string; size?: number; align?: typeof AlignmentType[keyof typeof AlignmentType]; spacing?: number; runs?: TextRun[] }): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 100 },
    children: opts.runs ?? [new TextRun({
      text: opts.text ?? "",
      bold: opts.bold,
      color: opts.color,
      size: opts.size ?? 22, // half-points (11pt)
      font: "Calibri",
    })],
  });
}

function cell(text: string, opts: { bold?: boolean; bg?: string; color?: string; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    shading: opts.bg ? { fill: opts.bg, color: "auto", type: "clear" } : undefined,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, color: opts.color ?? "000000", size: 22, font: "Calibri" })],
    })],
  });
}

export async function gerarOrcamentoDOCX(orc: OrcamentoData): Promise<Blob> {
  const titulo = TIPO_TITULOS[orc.tipo_servico] ?? "PRESTAÇÃO DE SERVIÇOS";
  const logo = await logoBytes();

  const partes: string[] = [];
  if (orc.imovel_area_m2) partes.push(`com área de ${formatNumberBR(orc.imovel_area_m2)} m² (${formatNumberBR(orc.imovel_area_m2 / 10000, 4)} ha)`);
  if (orc.imovel_municipio) partes.push(`município de ${orc.imovel_municipio}`);
  if (orc.imovel_matricula) partes.push(`matrícula nº ${orc.imovel_matricula}`);
  if (orc.imovel_valor_avaliado) partes.push(`imóvel avaliado em ${formatBRL(orc.imovel_valor_avaliado)}`);

  const itensTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("SERVIÇOS", { bold: true, bg: PRETO, color: "FFFFFF" }),
          cell("VALORES", { bold: true, bg: PRETO, color: "FFFFFF", align: AlignmentType.RIGHT }),
        ],
      }),
      ...orc.itens.map((i) => new TableRow({
        children: [cell(i.descricao), cell(formatBRL(i.valor), { align: AlignmentType.RIGHT })],
      })),
      new TableRow({
        children: [
          cell("VALOR TOTAL", { bold: true, bg: VERDE, color: "FFFFFF" }),
          cell(formatBRL(orc.valor_total), { bold: true, bg: VERDE, color: "FFFFFF", align: AlignmentType.RIGHT }),
        ],
      }),
    ],
  });

  const proprietariosBlock = orc.proprietarios?.length ? [
    P({ text: "PROPRIETÁRIOS", bold: true, color: VERDE, size: 24 }),
    ...orc.proprietarios.map((p) => P({ text: `• ${p.nome}${p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ""}` })),
  ] : [];

  const doc = new Document({
    creator: "AGILIZA",
    title: `Orçamento ${orc.numero ?? ""}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new ImageRun({ data: logo, transformation: { width: 160, height: 60 }, type: "png" })],
        }),
        P({ text: `Orçamento Nº ${orc.numero ?? "—"}  ·  ${formatDateLong(new Date())}`, color: "6E6E73", size: 18, align: AlignmentType.RIGHT, spacing: 200 }),

        P({ text: "ORÇAMENTO", bold: true, size: 36, align: AlignmentType.CENTER, spacing: 120 }),
        P({ text: titulo, bold: true, color: VERMELHO, size: 24, align: AlignmentType.CENTER, spacing: 240 }),

        P({ runs: [
          new TextRun({ text: "REQUERENTE: ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: orc.requerente_nome + (orc.requerente_cpf_cnpj ? ` — ${orc.requerente_cpf_cnpj}` : ""), font: "Calibri", size: 22 }),
        ]}),
        P({ runs: [
          new TextRun({ text: "PRESTADORA: ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: `${EMPRESA.razao}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${EMPRESA.cnpj}, com sede na Rua Marcilio Dias, nº 1539, Centro, São Miguel do Oeste/SC. E-mail: ${EMPRESA.email}.`, font: "Calibri", size: 22 }),
        ], spacing: 240 }),

        P({ text: "OBJETO DO ORÇAMENTO", bold: true, color: VERDE, size: 24 }),
        P({ text: `O presente orçamento refere-se à prestação de serviço de ${titulo.toLowerCase()}, referente ao imóvel: ${partes.join(", ")}.`, spacing: 200 }),

        ...proprietariosBlock,

        P({ text: "DESCRIÇÃO DOS SERVIÇOS", bold: true, color: VERDE, size: 24 }),
        P({ text: DESCRICAO_PADRAO[orc.tipo_servico] ?? "", spacing: 240 }),

        P({ text: "DOS VALORES", bold: true, color: VERDE, size: 24 }),
        itensTable,
        P({ text: "", spacing: 120 }),

        P({ text: "OBSERVAÇÕES", bold: true, color: VERDE, size: 24, spacing: 120 }),
        P({ text: "1. Os valores podem sofrer alterações em virtude da tabela de emolumentos do respectivo Cartório de Registro de Imóveis;" }),
        P({ text: "2. Em casos de notificação extrajudicial haverá acréscimo de valor, conforme art. 213, §2º da Lei 6.015/76;" }),
        P({ text: "3. Forma de Pagamento: a combinar;" }),
        P({ text: "4. Orçamento válido por 30 dias." }),
        ...(orc.observacoes ? [P({ text: `5. ${orc.observacoes}` })] : []),

        P({ text: "", spacing: 240 }),
        P({ text: "Agradecemos pela oportunidade de apresentar nossa proposta. Estamos confiantes de que podemos atender às suas necessidades com qualidade e eficiência!", spacing: 320 }),
        P({ text: `São Miguel do Oeste/SC, ${formatDateLong(new Date())}.`, spacing: 600 }),

        P({ text: "_______________________________________", align: AlignmentType.CENTER }),
        P({ text: EMPRESA.razao, bold: true, align: AlignmentType.CENTER }),
        P({ text: `${EMPRESA.razaoLegal} — CNPJ ${EMPRESA.cnpj}`, align: AlignmentType.CENTER, spacing: 400 }),

        P({ text: "—".repeat(40), color: "C8C8CC", align: AlignmentType.CENTER, size: 18 }),
        ...EMPRESA.unidades.map((u) => P({
          runs: [
            new TextRun({ text: `${u.cidade}: `, bold: true, font: "Calibri", size: 16 }),
            new TextRun({ text: `${u.endereco} · ${u.telefones} · ${u.email}`, font: "Calibri", size: 16, color: "6E6E73" }),
          ],
        })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
