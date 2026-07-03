export type ItemOrcamento = {
  descricao: string;
  valor: number;
};

export type Proprietario = { nome: string; cpf_cnpj?: string };
export type Confrontante = { nome: string; lado?: string };

/**
 * Bloco de serviço dentro de um orçamento multisserviço.
 * Cada bloco tem tipo, itens e observações próprias.
 */
export type ServicoBloco = {
  id: string;                // uuid simples (crypto.randomUUID)
  tipo_servico: string;      // chave em TIPOS_SERVICO
  titulo_personalizado?: string; // opcional — sobrescreve TIPO_TITULOS
  itens: ItemOrcamento[];
  observacoes?: string;
  subtotal: number;
};

export type OrcamentoData = {
  id?: string;
  numero?: string;
  escritorio_id?: string | null;
  tipo_servico: string;
  requerente_nome: string;
  requerente_cpf_cnpj?: string;
  cliente_telefone?: string;
  cliente_whatsapp?: string;
  imovel_descricao?: string;
  imovel_localizacao?: string;
  imovel_municipio?: string;
  imovel_area_m2?: number;
  imovel_matricula?: string;
  imovel_valor_avaliado?: number;
  imovel_ccir?: string;
  imovel_car?: string;
  proprietarios: Proprietario[];
  confrontantes: Confrontante[];
  /** Itens consolidados (aglutinação de todos os blocos) — mantido para compat. */
  itens: ItemOrcamento[];
  /** Lista de blocos de serviço. Quando vazio, usa modo legado (tipo_servico + itens). */
  servicos?: ServicoBloco[];
  valor_total: number;
  observacoes?: string;
  status?: string;
  data_envio?: string | null;
  ultimo_contato?: string | null;
  validade_dias?: number | null;
  /** Estimativa de ITBI — integrado ao total quando o serviço exigir. */
  itbi_municipio?: string | null;
  itbi_valor_declarado?: number | null;
  itbi_aliquota?: number | null;
  itbi_estimado?: number | null;
  /** Área transmitida em m² (parte ideal). Quando vazia, considera 100%. */
  itbi_area_transmitida?: number | null;
  /** Fração ideal transmitida em % (alternativa à área). */
  itbi_fracao_ideal?: number | null;
  /** Base de cálculo aplicada ao ITBI (valor_declarado × fração ou valor do contrato). */
  itbi_base_calculo?: number | null;
  /** Quando true, usa o valor de contrato como base do ITBI (ignora fração ideal). */
  itbi_usar_contrato?: boolean | null;
  /** Valor do contrato (R$) usado como base do ITBI quando itbi_usar_contrato = true. */
  itbi_valor_contrato?: number | null;
  /** Valor do ITCMD — informado manualmente (recebido pronto do órgão fazendário). */
  itcmd_estimado?: number | null;
  /** Autoria — preenchida automaticamente pelo sistema. */
  created_by?: string | null;
  created_by_nome?: string | null;
  created_by_escritorio_nome?: string | null;
  updated_by?: string | null;
  updated_by_nome?: string | null;
  updated_by_escritorio_nome?: string | null;
  created_at?: string;
  updated_at?: string;
};
