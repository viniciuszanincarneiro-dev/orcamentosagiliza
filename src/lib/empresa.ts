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
    { cidade: "Anchieta", endereco: "Av. Anchieta, 330, Sala 01, Centro, 89970-000", telefones: "(49) 9 9911-7869", email: "agiliza.anchieta@gmail.com" },
  ],
};

export const TIPOS_SERVICO = [
  { value: "retificacao_geo", label: "Retificação Administrativa Rural" },
  { value: "retificacao_urbana", label: "Retificação Administrativa Urbana" },
  { value: "desdobro", label: "Desdobro" },
  { value: "desmembramento", label: "Desmembramento" },
  { value: "desmembramento_incra", label: "Desmembramento INCRA" },
  { value: "remembramento", label: "Remembramento" },
  { value: "estremacao", label: "Estremação" },
  { value: "compra_venda", label: "Compra e Venda" },
  { value: "doacao", label: "Doação" },
  { value: "doacao_usufruto", label: "Doação com Usufruto" },
  { value: "divisao_amigavel", label: "Divisão Amigável" },
  { value: "permuta", label: "Permuta" },
  { value: "declaracao_tecnica", label: "Declaração Técnica" },
  { value: "levantamento_topografico", label: "Levantamento Planimétrico" },
  { value: "levantamento_planialtimetrico", label: "Levantamento Planialtimétrico" },
  { value: "inventario_extrajudicial", label: "Inventário" },
  { value: "usucapiao_extrajudicial", label: "Usucapião" },
] as const;

/**
 * Serviços nos quais há incidência de ITBI (Imposto de Transmissão de Bens Imóveis).
 * Para esses tipos, o ITBI é exibido no formulário, calculado pela alíquota do município
 * e SOMADO ao valor total do orçamento.
 * Para os demais tipos, o ITBI é completamente ignorado (não exibido, não calculado).
 */
export const SERVICOS_COM_ITBI: ReadonlySet<string> = new Set([
  "compra_venda",
  "doacao",
  "doacao_usufruto",
  "permuta",
  "divisao_amigavel",
  "inventario_extrajudicial",
  "usucapiao_extrajudicial",
]);

export function servicoTemITBI(tipo: string): boolean {
  return SERVICOS_COM_ITBI.has(tipo);
}

/**
 * Serviços nos quais há incidência de ITCMD (transmissão gratuita — doação / causa mortis).
 * O ITCMD NÃO é calculado pelo sistema: o valor é informado manualmente pelo usuário
 * (recebido pronto do órgão fazendário) e somado ao total do orçamento.
 */
export const SERVICOS_COM_ITCMD: ReadonlySet<string> = new Set([
  "doacao",
  "doacao_usufruto",
  "inventario_extrajudicial",
]);

export function servicoTemITCMD(tipo: string): boolean {
  return SERVICOS_COM_ITCMD.has(tipo);
}

export const TIPO_TITULOS: Record<string, string> = {
  retificacao_geo: "GEORREFERENCIAMENTO CERTIFICADO PELO INCRA",
  retificacao_urbana: "RETIFICAÇÃO ADMINISTRATIVA DE IMÓVEL URBANO",
  georreferenciamento: "GEORREFERENCIAMENTO CERTIFICADO PELO INCRA",
  levantamento_topografico: "LEVANTAMENTO TOPOGRÁFICO",
  desmembramento: "DESMEMBRAMENTO DE IMÓVEL",
  remembramento: "REMEMBRAMENTO DE IMÓVEL",
  usucapiao_extrajudicial: "USUCAPIÃO EXTRAJUDICIAL",
  inventario_extrajudicial: "INVENTÁRIO EXTRAJUDICIAL",
  compra_venda: "COMPRA E VENDA",
  outros: "PRESTAÇÃO DE SERVIÇOS",
  desdobro: "DESDOBRO URBANO",
  desmembramento_incra: "DESMEMBRAMENTO COM AUTORIZAÇÃO INCRA",
  estremacao: "ESTREMAÇÃO DE IMÓVEL",
  doacao: "DOAÇÃO DE IMÓVEL",
  doacao_usufruto: "DOAÇÃO DE IMÓVEL COM RESERVA DE USUFRUTO",
  divisao_amigavel: "DIVISÃO AMIGÁVEL DE IMÓVEL",
  permuta: "PERMUTA DE IMÓVEIS",
  declaracao_tecnica: "DECLARAÇÃO TÉCNICA",
  levantamento_planialtimetrico: "LEVANTAMENTO PLANIALTIMÉTRICO",
};

export const DESCRICAO_PADRAO: Record<string, string> = {
  retificacao_geo:
    "No presente orçamento está incluso os seguintes serviços: Levantamento Topográfico, Locação (marcos georreferenciados), Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), encaminhamento dos documentos no Registro de Imóveis e, atualização dos cadastros rurais CCIR, ITR e CAR.",
  georreferenciamento:
    "Inclui levantamento topográfico georreferenciado, locação de marcos, elaboração de planta e memorial descritivo, e certificação junto ao INCRA.",
  levantamento_topografico:
    "Inclui o levantamento topográfico planimétrico/altimétrico do imóvel, com elaboração de planta e memorial descritivo.",
  desmembramento:
    "Inclui levantamento topográfico, elaboração de mapas e memoriais descritivos, assessoria documental e encaminhamento ao Registro de Imóveis para o desmembramento do imóvel em duas ou mais partes.",
  remembramento:
    "Remembramento urbano é a unificação de dois ou mais lotes para formar um único lote maior.\n\nÉ o processo inverso ao desmembramento, onde um lote é dividido em vários.\n\nO remembramento permite a criação de áreas maiores para construções ou melhor aproveitamento de espaços urbanos.",
  usucapiao_extrajudicial:
    "Inclui levantamento topográfico, elaboração de memorial descritivo, coleta de assinaturas de confrontantes, assessoria documental e encaminhamento ao tabelionato e Registro de Imóveis.",
  inventario_extrajudicial:
    "Inclui assessoria documental, elaboração de minuta, coleta de certidões e encaminhamento ao tabelionato.",
  retificacao_urbana:
    "Retificação administrativa de imóvel urbano: assessoria documental completa (memorial descritivo, planta, requerimento), coleta de certidões e assinaturas, e encaminhamento ao Registro de Imóveis. Modelo simplificado, sem georreferenciamento.",
  compra_venda:
    "Assessoria completa em processo de compra e venda de imóvel, incluindo elaboração de contrato, levantamento de certidões, conferência documental e encaminhamento ao Registro de Imóveis para lavratura da escritura e registro da transmissão.",
  outros: "Serviços conforme descrição abaixo.",
  desdobro:
    "O Desdobro de Imóvel Urbano é realizado com intuito de dividir um único terreno em lotes menores, desde que sejam edificáveis, permitindo assim a venda, doação ou construção de novas edificações.\n\nEntretanto, o parcelamento do solo para fins de Desdobro de Imóvel Urbano, deverá respeitar os seguintes quesitos:\n\n• Metragem mínima conforme zona pertencente e de acordo com o Plano Diretor de cada município;\n• Viabilidade de fornecimento de água potável e energia elétrica;\n• Acesso à via pública.",
  desmembramento_incra:
    "O desmembramento de um imóvel com autorização do INCRA é um procedimento técnico que permite subdividir uma propriedade rural em frações menores.\n\nA autorização pelo INCRA é necessária nas seguintes hipóteses:\n\na) Empreendimentos imobiliários rurais;\nb) Desmembramento de parcela de imóvel rural sem que haja título de transmissão que justifique o parcelamento;\nc) Desmembramento que resulte em área inferior à fração mínima de parcelamento.",
  estremacao:
    "Inclui levantamento topográfico, elaboração de planta e memorial descritivo, assessoria documental e encaminhamento ao Registro de Imóveis para a estremação da fração ideal em área certa e determinada.",
  doacao:
    "Assessoria completa em processo de doação de imóvel, incluindo coleta de certidões, elaboração de minuta da escritura, acompanhamento da lavratura em tabelionato e registro da transmissão.",
  doacao_usufruto:
    "Assessoria em doação de imóvel com reserva de usufruto, incluindo coleta de certidões, elaboração da minuta da escritura, lavratura em tabelionato e registro da transmissão e do usufruto na matrícula.",
  divisao_amigavel:
    "Inclui levantamento topográfico, elaboração de planta e memoriais descritivos das quotas, assessoria documental e encaminhamento ao Registro de Imóveis para a divisão amigável entre os condôminos.",
  permuta:
    "Assessoria completa em processo de permuta de imóveis, incluindo coleta de certidões, conferência documental, elaboração da minuta da escritura, lavratura em tabelionato e registros das transmissões.",
  declaracao_tecnica:
    "Elaboração de declaração técnica firmada por profissional habilitado, com emissão da ART/TRT correspondente, conforme finalidade indicada pelo requerente.",
  levantamento_planialtimetrico:
    "Inclui o levantamento topográfico planialtimétrico do imóvel, com curvas de nível, elaboração de planta e memorial descritivo, e emissão da ART/TRT.",
};

/**
 * Metodologia / texto explicativo completo de cada serviço.
 * Apresentado no PDF como BLOCO EXPLICATIVO no topo do orçamento,
 * antes das seções OBJETO / IMÓVEL / DESCRIÇÃO / DOS VALORES.
 */
export const METODOLOGIA_SERVICO: Record<string, string> = {
  retificacao_geo:
    "No presente orçamento está incluso os seguintes serviços: Levantamento Topográfico, Locação (marcos georreferenciados), Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), encaminhamento dos documentos no Registro de Imóveis e, atualização dos cadastros rurais CCIR, ITR e CAR.",
  retificacao_urbana:
    "A retificação administrativa de imóvel urbano destina-se à correção de divergências entre a descrição constante na matrícula e a situação física real do imóvel urbano (medidas perimetrais, área, confrontações). A metodologia compreende: (i) análise documental da matrícula e demais documentos do imóvel; (ii) levantamento topográfico planimétrico do lote quando necessário; (iii) elaboração de memorial descritivo, planta e requerimento administrativo; (iv) coleta de certidões negativas e das assinaturas dos confrontantes; (v) protocolo do pedido de retificação administrativa junto ao Cartório de Registro de Imóveis competente, com acompanhamento integral do procedimento até o averbamento.",
  georreferenciamento:
    "O georreferenciamento de imóvel rural certificado pelo INCRA consiste na descrição do imóvel em suas características, limites e confrontações, mediante memorial descritivo executado por profissional habilitado, contendo as coordenadas dos vértices definidores dos limites do imóvel rural, georreferenciadas ao Sistema Geodésico Brasileiro e com precisão posicional fixada pelo INCRA. A metodologia compreende: (i) reconhecimento de campo e identificação dos vértices; (ii) levantamento topográfico georreferenciado com receptores GNSS; (iii) locação e materialização dos marcos; (iv) elaboração de planta, memorial descritivo e TRT; (v) submissão da poligonal ao SIGEF/INCRA até a certificação.",
  desmembramento:
    "O desmembramento é o procedimento pelo qual um imóvel é dividido em duas ou mais partes autônomas, cada uma com matrícula própria. A metodologia compreende: (i) levantamento topográfico da gleba originária e definição técnica das novas divisões; (ii) elaboração de planta de desmembramento, memoriais descritivos individualizados das parcelas resultantes e da área remanescente; (iii) assessoria documental e protocolo municipal (quando exigido); (iv) certificação no INCRA quando se tratar de imóvel rural; (v) encaminhamento e acompanhamento do registro junto ao Cartório de Registro de Imóveis para abertura das novas matrículas.",
  remembramento:
    "No presente orçamento está incluso os seguintes serviços:\n\nLevantamento Topográfico, Locação, Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos organização dos documentos pessoais das partes e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), requerimento de viabilidade junto ao Prefeitura, CASAN e CELESC, encaminhamento dos documentos ao Cartório de Registro de Imóveis.",
  desdobro:
    "No presente orçamento está incluso os seguintes serviços:\n\nEncaminhamento de Viabilidade para Desdobro do Lote junto à Prefeitura Municipal, CASAN e CELESC;\n\nSendo viável o desdobro, realiza-se o Levantamento Topográfico, Locação, Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas dos proprietários;\n\nProtocolo do Projeto na Prefeitura Municipal e, por fim, Protocolo junto ao Registro de Imóveis.",
  desmembramento_incra:
    "No presente orçamento está incluso os seguintes serviços:\n\nLevantamento Topográfico, Locação, Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), encaminhamento dos documentos ao Tabelionato de Notas e ao Cartório de Registro de Imóveis e atualização dos cadastros rurais CCIR, ITR e CAR.",
  levantamento_topografico:
    "O levantamento topográfico planimétrico/altimétrico consiste na coleta de dados em campo destinada à representação gráfica e analítica do imóvel, suas medidas, limites, acidentes naturais e benfeitorias. A metodologia compreende: (i) reconhecimento da área e implantação de poligonal de apoio; (ii) coleta de pontos planimétricos e altimétricos com estação total e/ou GNSS; (iii) processamento dos dados; (iv) elaboração de planta topográfica e memorial descritivo, com emissão da ART/TRT correspondente.",
  usucapiao_extrajudicial:
    "A usucapião extrajudicial é o procedimento realizado diretamente perante o Tabelionato de Notas e o Registro de Imóveis para reconhecimento da propriedade pelo exercício da posse mansa, pacífica e prolongada. A metodologia compreende: (i) levantamento topográfico do imóvel e elaboração de planta e memorial descritivo assinados pelo profissional habilitado e por confrontantes; (ii) coleta de certidões pessoais, do imóvel e fiscais; (iii) assessoria na elaboração da ata notarial pelo tabelião; (iv) protocolo do procedimento junto ao Cartório de Registro de Imóveis até a abertura da nova matrícula em nome do usucapiente.",
  inventario_extrajudicial:
    "O inventário extrajudicial é o procedimento realizado em tabelionato para partilha de bens deixados pelo falecido, quando todos os herdeiros forem maiores, capazes e estiverem em consenso. A metodologia compreende: (i) levantamento documental do espólio e dos herdeiros; (ii) coleta de certidões negativas pessoais, fiscais e dos bens; (iii) elaboração da minuta da escritura pública de inventário e partilha; (iv) acompanhamento até a lavratura no tabelionato; (v) encaminhamento ao Registro de Imóveis para averbação e transferência dos bens imóveis.",
  compra_venda:
    "A assessoria em compra e venda compreende todo o suporte técnico-jurídico necessário para a transferência segura da propriedade. A metodologia compreende: (i) conferência da matrícula e da cadeia dominial; (ii) coleta de certidões pessoais (vendedores e compradores) e do imóvel; (iii) elaboração de contrato particular ou minuta de escritura pública; (iv) acompanhamento da lavratura da escritura junto ao tabelionato; (v) protocolo e acompanhamento do registro da transmissão junto ao Cartório de Registro de Imóveis até a averbação em nome do comprador.",
  outros: "",
};

/**
 * Templates de itens padrão por tipo de serviço.
 * Itens com `auto: true` são calculados dinamicamente (topografia / registro).
 * Itens sem `auto` usam um valor base sugerido (editável).
 */
export type TemplateItem =
  | { descricao: string; auto: "topografia" | "registro" | "certidoes" | "ccir" | "tabelionato" | "assessoria" | "averbacoes" }
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
    { descricao: "REMEMBRAMENTO", valor_base: 1800 },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
    { descricao: "CERTIDÕES, NEGATIVAS E ASSINATURAS", valor_base: 200 },
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
  compra_venda: [
    { descricao: "ASSESSORIA DOCUMENTAL", auto: "assessoria" },
    { descricao: "CERTIDÕES NEGATIVAS E CONFERÊNCIA", auto: "certidoes" },
    { descricao: "TABELIONATO DE NOTAS", auto: "tabelionato" },
    { descricao: "REGISTRO DE IMÓVEIS (TRANSMISSÃO)", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
  ],
  outros: [],
  desdobro: [
    { descricao: "DESDOBRO URBANO", valor_base: 3200 },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
    { descricao: "ASSINATURAS, CERTIDÕES E NEGATIVAS", valor_base: 420 },
  ],
  desmembramento_incra: [
    { descricao: "DESMEMBRAMENTO INCRA", valor_base: 3400 },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
    { descricao: "CERTIDÕES, NEGATIVAS E ASSINATURAS", valor_base: 450 },
    { descricao: "ATUALIZAÇÃO CCIR, ITR, CAR", valor_base: 250 },
  ],
  estremacao: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO", auto: "topografia" },
    { descricao: "REGISTRO DE IMÓVEIS (ESTREMAÇÃO)", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
    { descricao: "ASSESSORIA DOCUMENTAL", valor_base: 1500 },
  ],
  doacao: [
    { descricao: "TABELIONATO DE NOTAS", auto: "tabelionato" },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
    { descricao: "ASSESSORIA DOCUMENTAL", auto: "assessoria" },
    { descricao: "CERTIDÕES NEGATIVAS E ASSINATURAS", auto: "certidoes" },
  ],
  doacao_usufruto: [
    { descricao: "TABELIONATO DE NOTAS", auto: "tabelionato" },
    { descricao: "REGISTRO DE IMÓVEIS", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
    { descricao: "ASSESSORIA DOCUMENTAL", auto: "assessoria" },
    { descricao: "CERTIDÕES NEGATIVAS E ASSINATURAS", auto: "certidoes" },
  ],
  divisao_amigavel: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO E DIVISÃO", auto: "topografia" },
    { descricao: "TABELIONATO DE NOTAS", auto: "tabelionato" },
    { descricao: "REGISTRO DE IMÓVEIS (DIVISÃO AMIGÁVEL)", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
    { descricao: "ASSESSORIA DOCUMENTAL", valor_base: 1500 },
  ],
  permuta: [
    { descricao: "ASSESSORIA DOCUMENTAL (ESCRITURA DE PERMUTA)", valor_base: 1800 },
    { descricao: "CERTIDÕES NEGATIVAS E CONFERÊNCIA", auto: "certidoes" },
    { descricao: "TABELIONATO DE NOTAS", auto: "tabelionato" },
    { descricao: "REGISTRO DE IMÓVEIS (TRANSMISSÕES)", auto: "registro" },
    { descricao: "AVERBAÇÕES (2 sem valor econômico)", auto: "averbacoes" },
  ],
  declaracao_tecnica: [
    { descricao: "ELABORAÇÃO DE DECLARAÇÃO TÉCNICA E ART/TRT", valor_base: 600 },
  ],
  levantamento_planialtimetrico: [
    { descricao: "LEVANTAMENTO PLANIALTIMÉTRICO", auto: "topografia" },
    { descricao: "ELABORAÇÃO DE PLANTA E MEMORIAL DESCRITIVO", valor_base: 900 },
  ],

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
