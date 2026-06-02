export const EMPRESA = {
  razao: "AGILIZA ASSESSORIA EM DOCUMENTOS E TOPOGRAFIA",
  fantasia: "AGILIZA",
  razaoLegal: "Everton de Oliveira Meyer Ltda",
  cnpj: "36.172.008/0001-82",
  email: "agiliza.smo@gmail.com",
  unidades: [
    { cidade: "São Miguel do Oeste", endereco: "Rua Marcilio Dias, 1539 - Centro", telefones: "(49) 3197-8160 · (49) 99990-9954 · (49) 99933-2552", email: "agiliza.smo@gmail.com" },
    { cidade: "Maravilha", endereco: "Avenida Anita Garibaldi, 340 - Centro", telefones: "(49) 99154-1854", email: "agiliza.mh@gmail.com" },
    { cidade: "Paraíso", endereco: "Rua Guilherme Schmidt, 834 - Centro", telefones: "(49) 99188-5181", email: "agiliza.paraiso@gmail.com" },
    { cidade: "Dionísio Cerqueira", endereco: "Avenida Washington Luis, 646 - Centro", telefones: "(49) 99192-2081", email: "agiliza.dc@gmail.com" },
  ],
};

export const TIPOS_SERVICO = [
  { value: "retificacao_geo", label: "Retificação Administrativa com Georreferenciamento" },
  { value: "retificacao_urbana", label: "Retificação Administrativa Urbana" },
  { value: "georreferenciamento", label: "Georreferenciamento Certificado pelo INCRA" },
  { value: "levantamento_topografico", label: "Levantamento Topográfico" },
  { value: "desmembramento", label: "Desmembramento" },
  { value: "remembramento", label: "Remembramento" },
  { value: "usucapiao_extrajudicial", label: "Usucapião Extrajudicial" },
  { value: "inventario_extrajudicial", label: "Inventário Extrajudicial" },
  { value: "outros", label: "Outros Serviços" },
] as const;

export const TIPO_TITULOS: Record<string, string> = {
  retificacao_geo: "RETIFICAÇÃO ADMINISTRATIVA COM GEORREFERENCIAMENTO CERTIFICADO PELO INCRA",
  retificacao_urbana: "RETIFICAÇÃO ADMINISTRATIVA DE IMÓVEL URBANO",
  georreferenciamento: "GEORREFERENCIAMENTO CERTIFICADO PELO INCRA",
  levantamento_topografico: "LEVANTAMENTO TOPOGRÁFICO",
  desmembramento: "DESMEMBRAMENTO DE IMÓVEL",
  remembramento: "REMEMBRAMENTO DE IMÓVEL",
  usucapiao_extrajudicial: "USUCAPIÃO EXTRAJUDICIAL",
  inventario_extrajudicial: "INVENTÁRIO EXTRAJUDICIAL",
  outros: "PRESTAÇÃO DE SERVIÇOS",
};

/**
 * Texto explicativo institucional de cada serviço (parágrafo descritivo,
 * apresentado antes do OBJETO DO ORÇAMENTO em cada bloco).
 */
export const TEXTO_EXPLICATIVO: Record<string, string> = {
  retificacao_geo:
    "A Retificação Administrativa com Georreferenciamento é o procedimento técnico e jurídico que corrige e atualiza as informações registradas na matrícula do imóvel rural — área, limites, confrontações e coordenadas — em conformidade com a Lei nº 10.267/2001 e o Decreto nº 4.449/2002. O serviço garante a regularização do imóvel junto ao Registro de Imóveis e ao INCRA, permitindo a livre disposição, transferência, desmembramento, remembramento e demais atos registrais.",
  retificacao_urbana:
    "A Retificação de imóvel urbano é um procedimento legal que corrige ou altera informações registradas na matrícula do imóvel, como localização, limites, área ou características, garantindo que o registro esteja correto e atualizado, facilitando venda, transferência e regularização do imóvel. Geralmente, isso acontece quando há erro no registro ou necessidade de atualização para refletir a situação real do imóvel.",
  georreferenciamento:
    "O Georreferenciamento de imóveis rurais é a identificação técnica do imóvel a partir das coordenadas dos vértices definidores de seus limites, certificada pelo INCRA, conforme exigência da Lei nº 10.267/2001 e do Decreto nº 4.449/2002. Trata-se de requisito obrigatório para qualquer alteração na matrícula do imóvel rural, incluindo transferências, desmembramentos, remembramentos e regularização fundiária.",
  levantamento_topografico:
    "O Levantamento Topográfico consiste no conjunto de operações técnicas executadas em campo e em escritório destinadas à representação gráfica do imóvel, contemplando seus limites, área, confrontações e demais características físicas relevantes. O resultado é apresentado em planta e memorial descritivo, servindo como base para projetos, regularizações e atos registrais.",
  desmembramento:
    "O Desmembramento é o procedimento técnico e jurídico que permite a divisão de um imóvel em duas ou mais partes autônomas, com novas matrículas individualizadas no Registro de Imóveis. Envolve levantamento topográfico, elaboração de mapas e memoriais descritivos, aprovação municipal quando aplicável e encaminhamento ao Ofício de Registro de Imóveis competente.",
  remembramento:
    "O Remembramento é o procedimento que unifica dois ou mais imóveis contíguos, pertencentes ao mesmo proprietário, em uma única matrícula. Envolve levantamento topográfico, elaboração de mapas e memoriais descritivos, aprovação municipal quando aplicável e encaminhamento ao Ofício de Registro de Imóveis para a unificação registral.",
  usucapiao_extrajudicial:
    "A Usucapião Extrajudicial é o procedimento previsto no art. 216-A da Lei de Registros Públicos (6.015/76) que possibilita o reconhecimento da propriedade pela posse mansa e pacífica diretamente no Cartório de Registro de Imóveis, sem necessidade de processo judicial. Envolve levantamento topográfico, memorial descritivo, ata notarial, coleta de assinaturas dos confrontantes e protocolo junto ao Registro de Imóveis.",
  inventario_extrajudicial:
    "O Inventário Extrajudicial é o procedimento previsto na Lei nº 11.441/2007 que permite a partilha de bens em vida ou por falecimento diretamente no Tabelionato de Notas, mediante escritura pública, sempre que todos os herdeiros forem capazes e estiverem de acordo. Envolve assessoria documental, elaboração de minuta, coleta de certidões e encaminhamento ao tabelionato competente.",
  outros:
    "O presente serviço será prestado conforme escopo descrito a seguir, com observância das normas técnicas e jurídicas aplicáveis, garantindo a regularização documental do imóvel ou demanda do interessado.",
};

/**
 * Frase que completa "O presente orçamento refere-se à prestação de serviço de ..."
 * (usada no OBJETO DO ORÇAMENTO de cada bloco).
 */
export const OBJETO_SERVICO: Record<string, string> = {
  retificacao_geo: "retificação administrativa com georreferenciamento certificado pelo INCRA",
  retificacao_urbana: "retificação administrativa de imóvel urbano",
  georreferenciamento: "georreferenciamento certificado pelo INCRA",
  levantamento_topografico: "levantamento topográfico",
  desmembramento: "desmembramento de imóvel",
  remembramento: "remembramento de imóvel",
  usucapiao_extrajudicial: "usucapião extrajudicial",
  inventario_extrajudicial: "inventário extrajudicial",
  outros: "prestação dos serviços descritos",
};

/**
 * Descrição detalhada (bullet list) dos serviços inclusos por tipo.
 * Apresentada como lista após o parágrafo "No presente orçamento estão inclusos os seguintes serviços:".
 */
export const DESCRICAO_ITENS: Record<string, string[]> = {
  retificacao_geo: [
    "Levantamento Topográfico",
    "Locação (colocação de marcos georreferenciados)",
    "Assessoria Documental",
    "Elaboração de mapas",
    "Memoriais descritivos",
    "TRT (Termo de Responsabilidade Técnica)",
    "Requerimentos",
    "Coleta de Assinaturas (proprietários e confrontantes)",
    "Encaminhamento junto ao Registro de Imóveis",
    "Atualização dos cadastros rurais (CCIR, ITR e CAR)",
  ],
  retificacao_urbana: [
    "Assessoria Documental completa",
    "Elaboração de memorial descritivo",
    "Elaboração de planta",
    "Requerimento de retificação",
    "Coleta de certidões e assinaturas",
    "Encaminhamento junto ao Registro de Imóveis",
  ],
  georreferenciamento: [
    "Levantamento Topográfico georreferenciado",
    "Locação de marcos",
    "Elaboração de planta e memorial descritivo",
    "TRT (Termo de Responsabilidade Técnica)",
    "Certificação junto ao INCRA",
    "Atualização dos cadastros rurais (CCIR, ITR e CAR)",
  ],
  levantamento_topografico: [
    "Levantamento Topográfico planialtimétrico",
    "Elaboração de planta",
    "Elaboração de memorial descritivo",
    "TRT (Termo de Responsabilidade Técnica)",
  ],
  desmembramento: [
    "Levantamento Topográfico",
    "Elaboração de mapas e memoriais descritivos",
    "Assessoria Documental",
    "Protocolo municipal (quando aplicável)",
    "Encaminhamento junto ao Registro de Imóveis",
  ],
  remembramento: [
    "Levantamento Topográfico",
    "Elaboração de mapas e memoriais descritivos",
    "Assessoria Documental",
    "Protocolo municipal (quando aplicável)",
    "Encaminhamento junto ao Registro de Imóveis",
  ],
  usucapiao_extrajudicial: [
    "Levantamento Topográfico",
    "Elaboração de memorial descritivo",
    "Ata notarial",
    "Coleta de assinaturas de confrontantes",
    "Coleta de certidões",
    "Assessoria Documental",
    "Encaminhamento junto ao Tabelionato e Registro de Imóveis",
  ],
  inventario_extrajudicial: [
    "Assessoria Documental",
    "Elaboração de minuta",
    "Coleta de certidões e negativas",
    "Encaminhamento junto ao Tabelionato de Notas",
  ],
  outros: [
    "Serviços conforme escopo descrito",
  ],
};

export const DESCRICAO_PADRAO: Record<string, string> = {
  retificacao_geo:
    "No presente orçamento está incluso os seguintes serviços: Levantamento Topográfico, Locação (marcos georreferenciados), Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), encaminhamento dos documentos no Registro de Imóveis e, atualização dos cadastros rurais CCIR, ITR e CAR.",
  georreferenciamento:
    "Inclui levantamento topográfico georreferenciado, locação de marcos, elaboração de planta e memorial descritivo, e certificação junto ao INCRA.",
  levantamento_topografico:
    "Inclui o levantamento topográfico planimétrico/altimétrico do imóvel, com elaboração de planta e memorial descritivo.",
  desmembramento:
    "Inclui levantamento topográfico, elaboração de mapas e memoriais descritivos, assessoria documental e encaminhamento ao Registro de Imóveis para o desmembramento.",
  remembramento:
    "Inclui levantamento topográfico, elaboração de mapas e memoriais descritivos, assessoria documental e encaminhamento ao Registro de Imóveis para o remembramento.",
  usucapiao_extrajudicial:
    "Inclui levantamento topográfico, elaboração de memorial descritivo, coleta de assinaturas de confrontantes, assessoria documental e encaminhamento ao tabelionato e Registro de Imóveis.",
  inventario_extrajudicial:
    "Inclui assessoria documental, elaboração de minuta, coleta de certidões e encaminhamento ao tabelionato.",
  retificacao_urbana:
    "Retificação administrativa de imóvel urbano: assessoria documental completa (memorial descritivo, planta, requerimento), coleta de certidões e assinaturas, e encaminhamento ao Registro de Imóveis. Modelo simplificado, sem georreferenciamento.",
  outros: "Serviços conforme descrição abaixo.",
};

/**
 * Templates de itens padrão por tipo de serviço.
 * Itens com `auto: true` são calculados dinamicamente (topografia / registro).
 * Itens sem `auto` usam um valor base sugerido (editável).
 */
export type TemplateItem =
  | { descricao: string; auto: "topografia" | "registro" | "certidoes" | "ccir" }
  | { descricao: string; valor_base: number };

export const TEMPLATES_ITENS: Record<string, TemplateItem[]> = {
  retificacao_geo: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO E LOCAÇÃO", auto: "topografia" },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
    { descricao: "CERTIDÕES, NEGATIVAS E ASSINATURAS", auto: "certidoes" },
    { descricao: "ATUALIZAÇÃO CCIR, ITR, CAR", auto: "ccir" },
  ],
  retificacao_urbana: [
    { descricao: "SERVIÇO PRESTADO (ASSESSORIA DOCUMENTAL)", valor_base: 1500 },
    { descricao: "CERTIDÕES NEGATIVAS E ASSINATURAS", valor_base: 420 },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
  ],
  georreferenciamento: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO GEORREFERENCIADO", auto: "topografia" },
    { descricao: "LOCAÇÃO DE MARCOS E CERTIFICAÇÃO INCRA", valor_base: 1800 },
    { descricao: "ATUALIZAÇÃO CCIR, ITR, CAR", auto: "ccir" },
  ],
  levantamento_topografico: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO PLANIALTIMÉTRICO", auto: "topografia" },
    { descricao: "ELABORAÇÃO DE PLANTA E MEMORIAL DESCRITIVO", valor_base: 800 },
  ],
  desmembramento: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO E DIVISÃO", auto: "topografia" },
    { descricao: "REGISTRO DE IMÓVEIS (DESMEMBRAMENTO)", auto: "registro" },
    { descricao: "ASSESSORIA DOCUMENTAL E PROTOCOLO MUNICIPAL", valor_base: 1200 },
  ],
  remembramento: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO E UNIFICAÇÃO", auto: "topografia" },
    { descricao: "REGISTRO DE IMÓVEIS (REMEMBRAMENTO)", auto: "registro" },
    { descricao: "ASSESSORIA DOCUMENTAL", valor_base: 900 },
  ],
  usucapiao_extrajudicial: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO E MEMORIAL DESCRITIVO", auto: "topografia" },
    { descricao: "COLETA DE ASSINATURAS E CERTIDÕES", auto: "certidoes" },
    { descricao: "ASSESSORIA DOCUMENTAL E ENCAMINHAMENTO AO TABELIONATO", valor_base: 2500 },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
  ],
  inventario_extrajudicial: [
    { descricao: "ASSESSORIA DOCUMENTAL E ELABORAÇÃO DA MINUTA", valor_base: 2000 },
    { descricao: "COLETA DE CERTIDÕES E NEGATIVAS", auto: "certidoes" },
    { descricao: "ENCAMINHAMENTO AO TABELIONATO", valor_base: 600 },
  ],
  outros: [],
};

export const STATUS_ORCAMENTO = [
  { value: "rascunho", label: "Rascunho" },
  { value: "aguardando", label: "Aguardando" },
  { value: "enviado", label: "Enviado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aprovado", label: "Aprovado" },
  { value: "recusado", label: "Recusado" },
  { value: "finalizado", label: "Finalizado" },
] as const;

export type StatusOrcamento = (typeof STATUS_ORCAMENTO)[number]["value"];

export const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  rascunho: "secondary",
  aguardando: "outline",
  enviado: "outline",
  em_andamento: "secondary",
  aprovado: "default",
  recusado: "destructive",
  finalizado: "default",
};
