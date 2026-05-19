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
  georreferenciamento: "GEORREFERENCIAMENTO CERTIFICADO PELO INCRA",
  levantamento_topografico: "LEVANTAMENTO TOPOGRÁFICO",
  desmembramento: "DESMEMBRAMENTO DE IMÓVEL",
  remembramento: "REMEMBRAMENTO DE IMÓVEL",
  usucapiao_extrajudicial: "USUCAPIÃO EXTRAJUDICIAL",
  inventario_extrajudicial: "INVENTÁRIO EXTRAJUDICIAL",
  outros: "PRESTAÇÃO DE SERVIÇOS",
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
  outros: "Serviços conforme descrição abaixo.",
};
