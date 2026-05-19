export type ItemOrcamento = {
  descricao: string;
  valor: number;
};

export type Proprietario = { nome: string; cpf_cnpj?: string };
export type Confrontante = { nome: string; lado?: string };

export type OrcamentoData = {
  id?: string;
  numero?: string;
  tipo_servico: string;
  requerente_nome: string;
  requerente_cpf_cnpj?: string;
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
  itens: ItemOrcamento[];
  valor_total: number;
  observacoes?: string;
  status?: "rascunho" | "finalizado";
  created_at?: string;
};
