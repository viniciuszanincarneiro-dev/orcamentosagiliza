
-- Single shared login model: anyone authenticated can read/write everything

-- 1) Orçamentos
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  tipo_servico TEXT NOT NULL DEFAULT 'retificacao_geo',
  -- Requerente
  requerente_nome TEXT NOT NULL,
  requerente_cpf_cnpj TEXT,
  -- Imóvel
  imovel_descricao TEXT,
  imovel_localizacao TEXT,
  imovel_municipio TEXT,
  imovel_area_m2 NUMERIC,
  imovel_matricula TEXT,
  imovel_valor_avaliado NUMERIC,
  imovel_ccir TEXT,
  imovel_car TEXT,
  proprietarios JSONB DEFAULT '[]'::jsonb,
  confrontantes JSONB DEFAULT '[]'::jsonb,
  -- Valores (todos editáveis)
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read orcamentos" ON public.orcamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert orcamentos" ON public.orcamentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update orcamentos" ON public.orcamentos
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete orcamentos" ON public.orcamentos
  FOR DELETE TO authenticated USING (true);

-- 2) Tabela de valores editável (preços base por categoria)
CREATE TABLE public.tabela_valores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL, -- 'geo_hectare', 'valor_municipio', 'servico_base'
  chave TEXT NOT NULL,     -- ex.: 'ate_5ha', 'sao_miguel_oeste', 'certidoes'
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(categoria, chave)
);

ALTER TABLE public.tabela_valores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tabela_valores" ON public.tabela_valores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tabela_valores" ON public.tabela_valores
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tabela_valores" ON public.tabela_valores
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete tabela_valores" ON public.tabela_valores
  FOR DELETE TO authenticated USING (true);

-- 3) Função updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tabela_valores_updated_at
BEFORE UPDATE ON public.tabela_valores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Função para gerar número sequencial do orçamento (ORC-2026-0001)
CREATE OR REPLACE FUNCTION public.gen_orcamento_numero()
RETURNS TEXT AS $$
DECLARE
  ano TEXT;
  seq INT;
BEGIN
  ano := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 10) AS INT)), 0) + 1
    INTO seq
    FROM public.orcamentos
    WHERE numero LIKE 'ORC-' || ano || '-%';
  RETURN 'ORC-' || ano || '-' || LPAD(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5) Seed da tabela de valores padrão
INSERT INTO public.tabela_valores (categoria, chave, descricao, valor, ordem) VALUES
  -- Valor de georreferenciamento por faixa de hectare
  ('geo_hectare', 'ate_5ha',    'De 2 ha até 5 ha',     3600.00, 1),
  ('geo_hectare', 'ate_10ha',   'De 5 ha até 10 ha',    5300.00, 2),
  ('geo_hectare', 'ate_25ha',   'De 10 ha até 25 ha',   8300.00, 3),
  -- Valor por hectare por município (referência)
  ('valor_municipio', 'tunapolis',          'Tunápolis',              60000.00, 1),
  ('valor_municipio', 'paraiso',            'Paraíso',                35000.00, 2),
  ('valor_municipio', 'sao_miguel_oeste',   'São Miguel do Oeste',    50000.00, 3),
  ('valor_municipio', 'guaraciaba',         'Guaraciaba',             50000.00, 4),
  ('valor_municipio', 'barra_bonita',       'Barra Bonita',           40000.00, 5),
  -- Serviços base
  ('servico_base', 'certidoes_assinaturas', 'Certidões, negativas e assinaturas', 450.00, 1),
  ('servico_base', 'atualizacao_ccir',      'Atualização CCIR, ITR, CAR',         250.00, 2);
