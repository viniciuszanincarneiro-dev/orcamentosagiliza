import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell,
  WidthType, ImageRun,
} from "docx";

function splitIncisos(text: string): string[] {
  if (!text) return [];
  const regex = /(\([ivxIVX]{1,5}|[a-zA-Z]\)\s+)/g;
  const tokens = text.split(regex);
  const result: string[] = [];
  let current = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.match(/^\([ivxIVX]{1,5}|[a-zA-Z]\)\s+$/)) {
      if (current.trim()) result.push(current.trim());
      current = token;
    } else {
      current += token;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}


import { EMPRESA, TIPO_TITULOS } from "./empresa";
import { getModeloServico } from "./modelos-servico";

import type { OrcamentoData } from "./orcamento-types";
import type { Escritorio } from "@/hooks/use-profile";
import { formatBRL, formatDateLong, formatNumberBR } from "./format";
import logoUrl from "@/assets/agiliza-logo.png";

type EscritorioInfo = {
  razao: string; cnpj: string; email: string; telefone: string; cidade: string; endereco: string;
};
function toInfo(e?: Escritorio | null): EscritorioInfo {
  if (!e) return {
    razao: EMPRESA.razao, cnpj: EMPRESA.cnpj, email: EMPRESA.email,
    telefone: "(49) 99990-9954", cidade: "São Miguel do Oeste/SC",
    endereco: "Rua Marcilio Dias, nº 1539, Centro, São Miguel do Oeste/SC",
  };
  return {
    razao: e.razao_social, cnpj: e.cnpj, email: e.email,
    telefone: e.telefone, cidade: e.cidade, endereco: e.endereco,
  };
}

const PRETO = "000000";
const CINZA = "5A5A5A";
// Cores aplicadas SOMENTE ao documento final (DOCX): bordô/vinho escuro.
const CINZA_TAB = "721C24";   // faixa de cabeçalho da tabela (bordô)
const CINZA_CLARO = "F8E8EA"; // fundo claro de coluna (bordô bem claro)

// Serviços que exigem georreferenciamento (renderiza o bloco legal no DOCX).
// Apenas serviços que efetivamente envolvem georreferenciamento.
const TIPOS_RURAIS = new Set([
  "retificacao_geo",
  "desmembramento_incra",
]);

let _logoBytesCache: Uint8Array | undefined;
async function logoBytes(): Promise<Uint8Array> {
  if (_logoBytesCache) return _logoBytesCache;
  const res = await fetch(logoUrl);
  const buf = await res.arrayBuffer();
  _logoBytesCache = new Uint8Array(buf);
  return _logoBytesCache;
}

function P(opts: { text?: string; bold?: boolean; color?: string; size?: number; align?: typeof AlignmentType[keyof typeof AlignmentType]; spacing?: number; runs?: TextRun[]; keepNext?: boolean; keepLines?: boolean }): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 100 },
    keepNext: opts.keepNext,
    keepLines: opts.keepLines,
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

export async function gerarOrcamentoDOCX(orc: OrcamentoData, escritorio?: Escritorio | null): Promise<Blob> {
  const esc = toInfo(escritorio);
  const titulo = TIPO_TITULOS[orc.tipo_servico] ?? "PRESTAÇÃO DE SERVIÇOS";
  const ano = new Date().getFullYear();
  const numero = orc.numero ? `${orc.numero}/${ano}` : `—/${ano}`;
  const logo = await logoBytes();

  // Normaliza blocos (multisserviço). Cada bloco = serviço completo.
  const blocos = (Array.isArray(orc.servicos) && orc.servicos.length > 0)
    ? orc.servicos
    : [{ id: "legacy", tipo_servico: orc.tipo_servico, itens: orc.itens, observacoes: undefined as string | undefined, subtotal: orc.valor_total }];
  const anyRural = blocos.some((b) => TIPOS_RURAIS.has(b.tipo_servico));

  const partes: string[] = [];
  if (orc.imovel_area_m2) partes.push(`com área de ${formatNumberBR(orc.imovel_area_m2)} m² (${formatNumberBR(orc.imovel_area_m2 / 10000, 4)} ha)`);
  if (orc.imovel_localizacao) partes.push(`localizado ${orc.imovel_localizacao}`);
  if (orc.imovel_municipio) partes.push(`no município de ${orc.imovel_municipio}`);
  if (orc.imovel_matricula) partes.push(`matriculado no Ofício de Registro de Imóveis sob o nº ${orc.imovel_matricula}`);
  if (orc.imovel_valor_avaliado) partes.push(`imóvel avaliado em ${formatBRL(orc.imovel_valor_avaliado)}`);

  // BLOCOS EXPLICATIVOS (título + descrição/fundamentação) — apresentados PRIMEIRO
  const blocosExplicativos: Paragraph[] = blocos.flatMap((bloco) => {
    const modelo = getModeloServico(bloco.tipo_servico);
    const ps: Paragraph[] = [P({ text: modelo.titulo, bold: true, size: 22, spacing: 120 })];
    if (modelo.descricao) {
      const partes = splitIncisos(modelo.descricao);
      partes.forEach((p) => ps.push(P({ text: p, spacing: 160, align: AlignmentType.JUSTIFIED })));
    }
    return ps;
  });

  // DESCRIÇÃO DOS SERVIÇOS (metodologia — escopo do que está incluso)
  const descricaoServicos: Paragraph[] = blocos.flatMap((bloco, bi) => {
    const modelo = getModeloServico(bloco.tipo_servico);
    const out: Paragraph[] = [];
    if (blocos.length > 1) {
      out.push(P({ text: `${bi + 1}. ${modelo.titulo}`, bold: true, spacing: 80 }));
    }
    const metod = (modelo.metodologia ?? "").replace(/^\s*DESCRIÇÃO DOS SERVIÇOS:\s*\n+/i, "");
    if (metod) {
      const partes = splitIncisos(metod);
      partes.forEach((p) => out.push(P({ text: p, spacing: 160, align: AlignmentType.JUSTIFIED })));
    }
    if (bloco.observacoes?.trim()) out.push(P({ text: `Observações: ${bloco.observacoes.trim()}`, spacing: 120 }));
    return out;
  });


  // DOS VALORES — uma tabela por serviço
  const tabelasServicos: (Paragraph | Table)[] = blocos.flatMap((bloco, bi) => {
    const tipoB = bloco.tipo_servico;
    const tituloB = TIPO_TITULOS[tipoB] ?? "PRESTAÇÃO DE SERVIÇOS";
    const subtotal = bloco.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const cabecalho = blocos.length > 1 ? `${bi + 1}. ${tituloB}` : tituloB;
    const tabelaB = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [
          new TableCell({
            columnSpan: 2,
            shading: { fill: CINZA_TAB, color: "auto", type: "clear" },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cabecalho, bold: true, color: "FFFFFF", size: 22, font: "Calibri" })] })],
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
    return [tabelaB, P({ text: "", spacing: 120 })];
  });

  const tabelaTotal = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      cell("VALOR TOTAL DO ORÇAMENTO:", { bold: true, bg: CINZA_TAB, color: "FFFFFF" }),
      cell(formatBRL(orc.valor_total), { bold: true, bg: CINZA_TAB, color: "FFFFFF", align: AlignmentType.RIGHT }),
    ]})],
  });

  const tabelaAdicional = null;

  // Bloco legal de GEORREFERENCIAMENTO (quando houver serviço rural)
  const blocoLegal: Paragraph[] = anyRural
    ? [
        P({ text: "GEORREFERENCIAMENTO", bold: true, size: 22 }),
        P({
          text: "A Lei nº 10.267/2001, a qual foi regulamentada pelo Decreto nº 4.449/2002, demonstra algumas alterações e determina que sejam cumpridas. Estas alterações estão relacionadas ao cadastramento de imóveis rurais, tornando obrigatório o georreferenciamento, o qual deverá conter as coordenadas dos vértices definidores dos limites dos imóveis rurais, com precisão posicional, nos casos de desmembramento, remembramento ou mudança de titularidade entre outras modalidades. Tais exigências representam uma mudança paradigmática nas formas de levantamento e cadastro imobiliário até então vigentes no Brasil. Todos os imóveis rurais possuem a obrigatoriedade em fazer o georreferenciamento até 20 de novembro de 2025, prazo esse definido no Decreto 4.449/02, alterado pelo decreto 9.311/18.",
          spacing: 160,
          align: AlignmentType.JUSTIFIED,
        }),
        P({ text: "• Vigente para imóveis acima de 100 hectares;", spacing: 60 }),
        P({ text: "• 20/11/2023 para os imóveis com área superior a 25 hectares;", spacing: 60 }),
        P({ text: "• 20/11/2025 para os imóveis com área inferior a 25 hectares.", spacing: 120 }),
      ]
    : [];


  const proprietariosBlock = orc.proprietarios?.length ? [
    P({ text: "PROPRIETÁRIOS", bold: true, size: 22 }),
    ...orc.proprietarios.map((p) => P({ text: `• ${p.nome}${p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ""}` })),
  ] : [];

  const unidadesFooter = [
    P({
      runs: [
        new TextRun({ text: esc.cidade, bold: true, font: "Calibri", size: 15 }),
        new TextRun({ text: ` - ${esc.endereco} · ${esc.telefone} · ${esc.email}`, font: "Calibri", size: 15, color: CINZA }),
      ],
      spacing: 40,
    }),
  ];

  const objetoServicos = blocos.length === 1
    ? titulo.toLowerCase()
    : blocos.map((b) => (TIPO_TITULOS[b.tipo_servico] ?? "prestação de serviços").toLowerCase()).join("; ");
  const subtituloCapa = blocos.length === 1 ? titulo : "ORÇAMENTO MULTISSERVIÇO";

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

        // Capa
        P({ text: `ORÇAMENTO Nº ${numero}`, bold: true, size: 26, align: AlignmentType.CENTER, spacing: 120 }),
        P({ text: subtituloCapa, bold: true, size: 22, align: AlignmentType.CENTER, spacing: 200 }),

        // Interessado
        P({ text: `Interessado: ${orc.requerente_nome}${orc.requerente_cpf_cnpj ? ` — ${orc.requerente_cpf_cnpj}` : ""}`, spacing: 200 }),

        // Prestadora
        P({ runs: [
          new TextRun({ text: "PRESTADORA DE SERVIÇO: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: `${esc.razao}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${esc.cnpj}, com sede em ${esc.endereco}, com endereço eletrônico: ${esc.email}, contato telefônico: ${esc.telefone}.`, font: "Calibri", size: 20 }),
        ], spacing: 200 }),

        // BLOCOS EXPLICATIVOS — cada serviço com título, metodologia e descrição
        ...blocosExplicativos,

        // GEORREFERENCIAMENTO (legal) — se houver serviço rural
        ...blocoLegal,

        // OBJETO
        P({ text: "OBJETO DO ORÇAMENTO", bold: true, size: 22 }),
        P({ text: `O presente orçamento refere-se à prestação dos seguintes serviços: ${objetoServicos}${anyRural ? ", com certificação junto ao INCRA quando aplicável," : ""} sobre o imóvel a seguir descrito:`, spacing: 120 }),
        P({ runs: [
          new TextRun({ text: "1. IMÓVEL: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: `${orc.imovel_descricao ? orc.imovel_descricao + ". " : ""}${partes.join(", ")}.`, font: "Calibri", size: 20 }),
        ], spacing: 200 }),

        ...proprietariosBlock,

        // DESCRIÇÃO DOS SERVIÇOS (resumo)
        P({ text: "DESCRIÇÃO DOS SERVIÇOS", bold: true, size: 22 }),
        ...descricaoServicos,

        // DOS VALORES (uma tabela por serviço + total geral)
        P({ text: "DOS VALORES", bold: true, size: 22, spacing: 160 }),
        ...tabelasServicos,
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
        P({ text: `${esc.cidade}, ${formatDateLong(new Date())}.`, spacing: 600 }),

        // Assinatura manual (linha em aberto + dados do responsável)
        P({ text: "_________________________________________", align: AlignmentType.CENTER, spacing: 120 }),
        P({ text: "AGILIZA ASSESSORIA EM DOCUMENTOS", bold: true, align: AlignmentType.CENTER }),
        P({ text: "E TOPOGRAFIA", bold: true, align: AlignmentType.CENTER }),
        P({ text: "Everton de Oliveira Meyer Ltda", align: AlignmentType.CENTER }),
        P({ text: "CNPJ 36.172.008/0001-82", align: AlignmentType.CENTER, spacing: 400 }),

        // Rodapé com unidades
        P({ text: "—".repeat(40), color: "C8C8CC", align: AlignmentType.CENTER, size: 14 }),
        ...unidadesFooter,
      ],
    }],
  });

  return Packer.toBlob(doc);
}
