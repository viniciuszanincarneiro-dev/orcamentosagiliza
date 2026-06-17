/**
 * Biblioteca oficial de modelos de orçamento da Agiliza.
 *
 * Regra: o PDF imprime EXATAMENTE o conteúdo cadastrado aqui.
 * Não resumir, não reescrever, não simplificar, não remover etapas.
 *
 * Modelos marcados com `revisao_pendente: true` ainda usam o texto antigo
 * (importado de empresa.ts) e aguardam o texto oficial. Quando o texto
 * oficial chegar, basta preencher os campos abaixo e remover a flag.
 */

import { DESCRICAO_PADRAO, METODOLOGIA_SERVICO, TIPO_TITULOS } from "./empresa";

export type ModeloServico = {
  titulo: string;
  descricao: string;
  /** Metodologia / serviços inclusos — texto integral renderizado no PDF. */
  metodologia: string;
  /** Quando true, modelo ainda usa textos antigos genéricos. */
  revisao_pendente?: boolean;
};

/**
 * Modelos oficiais já revisados (texto integral, travado).
 * NÃO editar estes textos sem autorização — eles foram aprovados pela Agiliza.
 */
const OFICIAIS: Record<string, ModeloServico> = {
  desdobro: {
    titulo: "DESDOBRO URBANO",
    descricao:
      "O Desdobro de Imóvel Urbano é realizado com intuito de dividir um único terreno em lotes menores, desde que sejam edificáveis, permitindo assim a venda, doação ou construção de novas edificações.\n\nEntretanto, o parcelamento do solo para fins de Desdobro de Imóvel Urbano, deverá respeitar os seguintes quesitos:\n\n• Metragem mínima conforme zona pertencente e de acordo com o Plano Diretor de cada município;\n• Viabilidade de fornecimento de água potável e energia elétrica;\n• Acesso à via pública.",
    metodologia:
      "No presente orçamento está incluso os seguintes serviços:\n\nEncaminhamento de Viabilidade para Desdobro do Lote junto à Prefeitura Municipal, CASAN e CELESC;\n\nSendo viável o desdobro, realiza-se o Levantamento Topográfico, Locação, Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas dos proprietários;\n\nProtocolo do Projeto na Prefeitura Municipal e, por fim, Protocolo junto ao Registro de Imóveis.",
  },
  desmembramento_incra: {
    titulo: "DESMEMBRAMENTO COM AUTORIZAÇÃO INCRA",
    descricao:
      "O desmembramento de um imóvel com autorização do INCRA é um procedimento técnico que permite subdividir uma propriedade rural em frações menores.\n\nA autorização pelo INCRA é necessária nas seguintes hipóteses:\n\na) Empreendimentos imobiliários rurais;\nb) Desmembramento de parcela de imóvel rural sem que haja título de transmissão que justifique o parcelamento;\nc) Desmembramento que resulte em área inferior à fração mínima de parcelamento.",
    metodologia:
      "No presente orçamento está incluso os seguintes serviços:\n\nLevantamento Topográfico, Locação, Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), encaminhamento dos documentos ao Tabelionato de Notas e ao Cartório de Registro de Imóveis e atualização dos cadastros rurais CCIR, ITR e CAR.",
  },
  remembramento: {
    titulo: "REMEMBRAMENTO DE IMÓVEL",
    descricao:
      "Remembramento urbano é a unificação de dois ou mais lotes para formar um único lote maior.\n\nÉ o processo inverso ao desmembramento, onde um lote é dividido em vários.\n\nO remembramento permite a criação de áreas maiores para construções ou melhor aproveitamento de espaços urbanos.",
    metodologia:
      "No presente orçamento está incluso os seguintes serviços:\n\nLevantamento Topográfico, Locação, Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos organização dos documentos pessoais das partes e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), requerimento de viabilidade junto ao Prefeitura, CASAN e CELESC, encaminhamento dos documentos ao Cartório de Registro de Imóveis.",
  },
};

/**
 * Recupera o modelo oficial. Quando não há modelo oficial cadastrado,
 * monta um modelo a partir dos textos antigos (compat) marcado como pendente.
 */
export function getModeloServico(tipo: string): ModeloServico {
  const oficial = OFICIAIS[tipo];
  if (oficial) return oficial;
  return {
    titulo: TIPO_TITULOS[tipo] ?? "PRESTAÇÃO DE SERVIÇOS",
    descricao: DESCRICAO_PADRAO[tipo] ?? "",
    metodologia: METODOLOGIA_SERVICO[tipo] ?? "",
    revisao_pendente: true,
  };
}

/** Lista de tipos com modelo oficial já revisado. */
export const MODELOS_OFICIAIS = Object.keys(OFICIAIS);
