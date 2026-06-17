
-- ============ tabela_honorarios ============
CREATE TABLE public.tabela_honorarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela_honorarios TO authenticated;
GRANT ALL ON public.tabela_honorarios TO service_role;
ALTER TABLE public.tabela_honorarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "honorarios_read_auth" ON public.tabela_honorarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "honorarios_write_admin" ON public.tabela_honorarios FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_honorarios_updated BEFORE UPDATE ON public.tabela_honorarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tabela_honorarios (codigo, descricao, valor, ordem) VALUES
  ('assessoria_documental',   'ASSESSORIA DOCUMENTAL',                 550.00, 10),
  ('certidoes_assinaturas',   'CERTIDÕES NEGATIVAS E ASSINATURAS',     420.00, 20),
  ('ccir_itr_car',            'ATUALIZAÇÃO CCIR, ITR E CAR',           250.00, 30),
  ('topografia_locacao',      'LEVANTAMENTO TOPOGRÁFICO E LOCAÇÃO',   2200.00, 40),
  ('planimetrico',            'LEVANTAMENTO PLANIMÉTRICO',            1200.00, 50),
  ('planialtimetrico',        'LEVANTAMENTO PLANIALTIMÉTRICO',        1200.00, 60),
  ('desdobro_urbano',         'DESDOBRO URBANO',                      3200.00, 70),
  ('desmembramento_incra',    'DESMEMBRAMENTO INCRA',                 3400.00, 80),
  ('remembramento',           'REMEMBRAMENTO',                        1800.00, 90),
  ('declaracao_tecnica',      'DECLARAÇÃO TÉCNICA',                    550.00, 100),
  ('assessoria_juridica',     'ASSESSORIA JURÍDICA',                  2800.00, 110);

-- ============ itcmd_aliquotas ============
CREATE TABLE public.itcmd_aliquotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('doacao','inventario')),
  uf TEXT NOT NULL DEFAULT 'SC',
  faixa_min NUMERIC(14,2) NOT NULL DEFAULT 0,
  faixa_max NUMERIC(14,2),
  aliquota NUMERIC(6,4) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itcmd_aliquotas TO authenticated;
GRANT ALL ON public.itcmd_aliquotas TO service_role;
ALTER TABLE public.itcmd_aliquotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itcmd_read_auth" ON public.itcmd_aliquotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "itcmd_write_admin" ON public.itcmd_aliquotas FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_itcmd_updated BEFORE UPDATE ON public.itcmd_aliquotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ tabela_tabelionato ============
CREATE TABLE public.tabela_tabelionato (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ato TEXT NOT NULL,
  descricao TEXT,
  faixa_min NUMERIC(14,2) NOT NULL DEFAULT 0,
  faixa_max NUMERIC(14,2),
  valor NUMERIC(12,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela_tabelionato TO authenticated;
GRANT ALL ON public.tabela_tabelionato TO service_role;
ALTER TABLE public.tabela_tabelionato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tabelionato_read_auth" ON public.tabela_tabelionato FOR SELECT TO authenticated USING (true);
CREATE POLICY "tabelionato_write_admin" ON public.tabela_tabelionato FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_tabelionato_updated BEFORE UPDATE ON public.tabela_tabelionato
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ tabela_registro_imoveis ============
CREATE TABLE public.tabela_registro_imoveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT,
  faixa_min NUMERIC(14,2) NOT NULL DEFAULT 0,
  faixa_max NUMERIC(14,2),
  valor NUMERIC(12,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela_registro_imoveis TO authenticated;
GRANT ALL ON public.tabela_registro_imoveis TO service_role;
ALTER TABLE public.tabela_registro_imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registro_read_auth" ON public.tabela_registro_imoveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "registro_write_admin" ON public.tabela_registro_imoveis FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_registro_updated BEFORE UPDATE ON public.tabela_registro_imoveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
