import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell,
  WidthType, ImageRun,
} from "docx";

import { EMPRESA, TIPO_TITULOS, DESCRICAO_PADRAO } from "./empresa";
import type { OrcamentoData } from "./orcamento-types";
import { formatBRL, formatDateLong, formatNumberBR } from "./format";
import logoUrl from "@/assets/agiliza-logo.png";

const PRETO = "000000";
const CINZA = "5A5A5A";
const CINZA_TAB = "464646";
const CINZA_CLARO = "E6E6E6";

const TIPOS_RURAIS = new Set([
  "retificacao_geo",
  "georreferenciamento",
  "desmembramento",
  "remembramento",
  "usucapiao_extrajudicial",
  "levantamento_topografico",
]);

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
      size: opts.size ?? 20,
      font: "Calibri",
    })],
  });
}

function cell(text: string, opts: { bold?: boolean; bg?: string; color?: string; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    shading: opts.bg ? { fill: opts.bg, color: "auto", type: "clear" } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, color: opts.color ?? PRETO, size: 20, font: "Calibri" })],
    })],
  });
}

export async function gerarOrcamentoDOCX(orc: OrcamentoData): Promise<Blob> {
  const titulo = TIPO_TITULOS[orc.tipo_servico] ?? "PRESTAÇÃO DE SERVIÇOS";
  const isRural = TIPOS_RURAIS.has(orc.tipo_servico);
  const ano = new Date().getFullYear();
  const numero = orc.numero ? `${orc.numero}/${ano}` : `—/${ano}`;
  const logo = await logoBytes();

  const partes: string[] = [];
  if (orc.imovel_area_m2) partes.push(`com área de ${formatNumberBR(orc.imovel_area_m2)} m² (${formatNumberBR(orc.imovel_area_m2 / 10000, 4)} ha)`);
  if (orc.imovel_localizacao) partes.push(`localizado ${orc.imovel_localizacao}`);
  if (orc.imovel_municipio) partes.push(`no município de ${orc.imovel_municipio}`);
  if (orc.imovel_matricula) partes.push(`matriculado no Ofício de Registro de Imóveis sob o nº ${orc.imovel_matricula}`);
  if (orc.imovel_valor_avaliado) partes.push(`imóvel avaliado em ${formatBRL(orc.imovel_valor_avaliado)}`);

  const areaTitulo = orc.imovel_area_m2
    ? `${isRural ? "GEORREFERENCIAMENTO" : "SERVIÇOS"} – Área de ${formatNumberBR(orc.imovel_area_m2)} m²`
    : "SERVIÇOS";

  // Lista de blocos: usa servicos se presente, senão um bloco legado.
  const blocos = (Array.isArray(orc.servicos) && orc.servicos.length > 0)
    ? orc.servicos
    : [{ id: "legacy", tipo_servico: orc.tipo_servico, itens: orc.itens, observacoes: undefined as string | undefined, subtotal: orc.valor_total }];

  const tabelasServicos = blocos.flatMap((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    const isRuralB = TIPOS_RURAIS.has(tipoB);
    const subtotal = bloco.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const areaTitB = orc.imovel_area_m2 && (isRuralB || bi === 0)
      ? `${isRuralB ? "GEORREFERENCIAMENTO" : "SERVIÇOS"} – Área de ${formatNumberBR(orc.imovel_area_m2)} m²`
      : "SERVIÇOS";
    const prefixo = blocos.length > 1 ? `SERVIÇO ${bi + 1} — ` : "";
    const descTxtB = DESCRICAO_PADRAO[tipoB] ?? "";
    const tabelaB = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [
          new TableCell({
            columnSpan: 2,
            shading: { fill: CINZA_TAB, color: "auto", type: "clear" },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: areaTitB, bold: true, color: "FFFFFF", size: 22, font: "Calibri" })] })],
          }),
        ]}),
        new TableRow({ tableHeader: true, children: [
          cell("SERVIÇOS:", { bold: true, bg: CINZA_CLARO }),
          cell("VALORES:", { bold: true, bg: CINZA_CLARO, align: AlignmentType.RIGHT }),
        ]}),
        ...bloco.itens.map((i) => new TableRow({
          children: [cell(i.descricao), cell(formatBRL(i.valor), { align: AlignmentType.RIGHT })],
        })),
        new TableRow({ children: [
          cell("SUBTOTAL:", { bold: true, bg: CINZA_CLARO }),
          cell(formatBRL(subtotal), { bold: true, bg: CINZA_CLARO, align: AlignmentType.RIGHT }),
        ]}),
      ],
    });
    const blocoParagraphs: (Paragraph | Table)[] = [
      P({ text: `${prefixo}${tituloB}`, bold: true, size: 22 }),
    ];
    if (descTxtB) blocoParagraphs.push(P({ text: descTxtB, spacing: 160 }));
    if (bloco.observacoes?.trim()) blocoParagraphs.push(P({ text: `Observações: ${bloco.observacoes.trim()}`, spacing: 120 }));
    blocoParagraphs.push(tabelaB, P({ text: "", spacing: 120 }));
    return blocoParagraphs;
  });


  const tabelaTotal = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      cell("VALOR TOTAL DO ORÇAMENTO:", { bold: true, bg: CINZA_TAB, color: "FFFFFF" }),
      cell(formatBRL(orc.valor_total), { bold: true, bg: CINZA_TAB, color: "FFFFFF", align: AlignmentType.RIGHT }),
    ]})],
  });

  const tabelaAdicional = isRural ? new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      cell("ADICIONAL – MARCO DE CONCRETO", { bold: true }),
      cell("R$ 50,00/unidade", { bold: true, align: AlignmentType.RIGHT }),
    ]})],
  }) : null;

  const blocoLegal = isRural ? [
    P({ text: "GEORREFERENCIAMENTO", bold: true, size: 22 }),
    P({ text: "A Lei nº 10.267/2001, a qual foi regulamentada pelo Decreto nº 4.449/2002, demonstra algumas alterações e determina que sejam cumpridas. Estas alterações estão relacionadas ao cadastramento de imóveis rurais, tornando obrigatório o georreferenciamento, o qual deverá conter as coordenadas dos vértices definidores dos limites dos imóveis rurais, com precisão posicional, nos casos de desmembramento, remembramento ou mudança de titularidade entre outras modalidades. Tais exigências representam uma mudança paradigmática nas formas de levantamento e cadastro imobiliário até então vigentes no Brasil." }),
    P({ text: "Todos os imóveis rurais possuem a obrigatoriedade em fazer o georreferenciamento até 20 de novembro de 2025, prazo esse definido no Decreto 4.449/02, alterado pelo decreto 9.311/18." }),
    P({ text: "• Vigente para imóveis acima de 100 hectares;" }),
    P({ text: "• 20/11/2023 para os imóveis com área superior a 25 hectares;" }),
    P({ text: "• 20/11/2025 para os imóveis com área inferior a 25 hectares.", spacing: 200 }),
  ] : [];

  const proprietariosBlock = orc.proprietarios?.length ? [
    P({ text: "PROPRIETÁRIOS", bold: true, size: 22 }),
    ...orc.proprietarios.map((p) => P({ text: `• ${p.nome}${p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ""}` })),
  ] : [];

  const unidadesFooter = EMPRESA.unidades.map((u) => P({
    runs: [
      new TextRun({ text: `${u.cidade}`, bold: true, font: "Calibri", size: 15 }),
      new TextRun({ text: ` - ${u.endereco} · ${u.telefones} · ${u.email}`, font: "Calibri", size: 15, color: CINZA }),
    ],
    spacing: 40,
  }));

  const doc = new Document({
    creator: "AGILIZA",
    title: `Orçamento ${orc.numero ?? ""}`,
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "AGILIZA ASSESSORIA EM DOCUMENTOS | TOPOGRAFIA | AMBIENTAL", bold: true, font: "Calibri", size: 18 })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new ImageRun({ data: logo, transformation: { width: 130, height: 44 }, type: "png" })],
          spacing: { after: 200 },
        }),

        // Título principal
        P({ text: `ORÇAMENTO Nº ${numero}`, bold: true, size: 26, align: AlignmentType.CENTER, spacing: 120 }),
        P({ text: titulo, bold: true, size: 22, align: AlignmentType.CENTER, spacing: 200 }),

        // Interessado
        P({ text: `Interessado: ${orc.requerente_nome}${orc.requerente_cpf_cnpj ? ` — ${orc.requerente_cpf_cnpj}` : ""}`, spacing: 200 }),

        // Prestadora
        P({ runs: [
          new TextRun({ text: "PRESTADORA DE SERVIÇO: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: `${EMPRESA.razao}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${EMPRESA.cnpj}, com sede na Rua Marcilio Dias, nº 1539, Centro, São Miguel do Oeste/SC, com endereço eletrônico: ${EMPRESA.email}, contato telefônico: (49) 99990-9954.`, font: "Calibri", size: 20 }),
        ], spacing: 200 }),

        // GEORREFERENCIAMENTO (legal)
        ...blocoLegal,

        // OBJETO
        P({ text: "OBJETO DO ORÇAMENTO", bold: true, size: 22 }),
        P({ text: `O presente orçamento refere-se à prestação de serviço de ${titulo.toLowerCase()}${isRural ? ", com certificação junto ao INCRA quando aplicável," : ""} do imóvel a seguir descrito:`, spacing: 120 }),
        P({ runs: [
          new TextRun({ text: "1. IMÓVEL: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: `${orc.imovel_descricao ? orc.imovel_descricao + ". " : ""}${partes.join(", ")}.`, font: "Calibri", size: 20 }),
        ], spacing: 200 }),

        ...proprietariosBlock,

        // DESCRIÇÃO DOS SERVIÇOS
        P({ text: "DESCRIÇÃO DOS SERVIÇOS:", bold: true, size: 22 }),
        P({ text: DESCRICAO_PADRAO[orc.tipo_servico] ?? "", spacing: 240 }),

        // DOS VALORES
        P({ text: "DOS VALORES:", bold: true, size: 22 }),
        ...tabelasServicos,
        P({ text: "", spacing: 100 }),
        tabelaTotal,
        P({ text: "", spacing: 100 }),
        ...(tabelaAdicional ? [tabelaAdicional, P({ text: "", spacing: 120 })] : []),

        // Observações
        P({ text: "Observações:", bold: true, size: 22, spacing: 120 }),
        P({ text: "1. Os valores podem sofrer alterações em virtude da tabela de emolumentos do respectivo Cartório de Registro de Imóveis;" }),
        P({ text: "2. Em casos de notificação extrajudicial haverá acréscimo de valor de acordo com a notificação extrajudicial, de acordo com o artigo 213, §2º da Lei de Registros Públicos (6.015/76);" }),
        P({ text: "3. Forma de Pagamento: a combinar;" }),
        P({ text: "4. Orçamento válido por 30 dias." }),
        ...(orc.observacoes ? [P({ text: `5. ${orc.observacoes}` })] : []),

        P({ text: "", spacing: 200 }),
        P({ text: "Agradecemos pela oportunidade de apresentar nossa proposta. Estamos confiantes de que podemos atender às suas necessidades com qualidade e eficiência!", spacing: 320 }),
        P({ text: `São Miguel do Oeste/SC, ${formatDateLong(new Date())}.`, spacing: 600 }),

        // Assinatura
        P({ text: `Assinado de forma digital por ${EMPRESA.razaoLegal.toUpperCase()}:${EMPRESA.cnpj.replace(/\D/g, "")}`, color: CINZA, size: 16, align: AlignmentType.CENTER }),
        P({ text: `Dados: ${new Date().toLocaleString("pt-BR")} -03'00'`, color: CINZA, size: 16, align: AlignmentType.CENTER, spacing: 200 }),
        P({ text: EMPRESA.razao, bold: true, align: AlignmentType.CENTER }),
        P({ text: EMPRESA.razaoLegal, align: AlignmentType.CENTER }),
        P({ text: `CNPJ ${EMPRESA.cnpj}`, align: AlignmentType.CENTER, spacing: 400 }),

        // Rodapé com unidades
        P({ text: "—".repeat(40), color: "C8C8CC", align: AlignmentType.CENTER, size: 14 }),
        ...unidadesFooter,
      ],
    }],
  });

  return Packer.toBlob(doc);
}
