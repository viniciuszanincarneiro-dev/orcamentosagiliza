
-- ITBI municípios table
CREATE TABLE public.itbi_municipios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  aliquota numeric NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itbi_municipios TO authenticated;
GRANT ALL ON public.itbi_municipios TO service_role;

ALTER TABLE public.itbi_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read itbi" ON public.itbi_municipios FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert itbi" ON public.itbi_municipios FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "admin update itbi" ON public.itbi_municipios FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "admin delete itbi" ON public.itbi_municipios FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER trg_itbi_updated BEFORE UPDATE ON public.itbi_municipios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed municípios
INSERT INTO public.itbi_municipios (nome, aliquota) VALUES
  ('São Miguel do Oeste', 2),('Paraíso', 2),('Maravilha', 2),('Anchieta', 2),
  ('Dionísio Cerqueira', 2),('São José do Cedro', 2),('Guaraciaba', 2),('Guarujá do Sul', 2),
  ('Descanso', 2),('Belmonte', 2),('Bandeirante', 2),('Barra Bonita', 2),
  ('Romelândia', 2),('Flor do Sertão', 2),('Tigrinhos', 2),('Bom Jesus do Oeste', 2),
  ('Cunha Porã', 2),('Cunhataí', 2),('Saudades', 2),('Modelo', 2),
  ('Pinhalzinho', 2),('Nova Erechim', 2),('São Carlos', 2),('Águas de Chapecó', 2),
  ('Palmitos', 2),('Mondaí', 2),('Iporã do Oeste', 2),('Itapiranga', 2),
  ('Tunápolis', 2),('Santa Helena', 2)
ON CONFLICT (nome) DO NOTHING;

-- ITBI fields on orcamentos (estimativa - não soma ao valor total)
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS itbi_municipio text,
  ADD COLUMN IF NOT EXISTS itbi_valor_declarado numeric,
  ADD COLUMN IF NOT EXISTS itbi_aliquota numeric,
  ADD COLUMN IF NOT EXISTS itbi_estimado numeric;
