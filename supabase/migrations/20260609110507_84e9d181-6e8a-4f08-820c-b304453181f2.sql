
-- =========================================================
-- 1. Tabela de escritórios
-- =========================================================
CREATE TABLE public.escritorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cidade text NOT NULL,
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  endereco text NOT NULL,
  telefone text NOT NULL,
  email text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.escritorios TO authenticated;
GRANT ALL ON public.escritorios TO service_role;

ALTER TABLE public.escritorios ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. Enum de papéis e tabela de perfis
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text,
  role public.app_role NOT NULL DEFAULT 'usuario',
  escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checar role sem recursão
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'admin');
$$;

-- Função que retorna o escritório do usuário corrente
CREATE OR REPLACE FUNCTION public.current_escritorio_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT escritorio_id FROM public.profiles WHERE id = auth.uid();
$$;

-- =========================================================
-- 3. Policies
-- =========================================================
-- escritorios: todos autenticados podem ler; só admin escreve
CREATE POLICY "auth read escritorios"
  ON public.escritorios FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert escritorios"
  ON public.escritorios FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin update escritorios"
  ON public.escritorios FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin delete escritorios"
  ON public.escritorios FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- profiles: todos autenticados podem ler (necessário para relatórios);
-- usuário edita o próprio (sem mudar role/escritorio); admin edita qualquer.
CREATE POLICY "auth read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "self insert profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "self or admin update profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "admin delete profile"
  ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- =========================================================
-- 4. Trigger auto-criar profile no signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'usuario')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cria profile para usuários já existentes
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'usuario'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 5. Triggers updated_at
-- =========================================================
CREATE TRIGGER trg_escritorios_updated BEFORE UPDATE ON public.escritorios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 6. Coluna escritorio_id em orcamentos
-- =========================================================
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orcamentos_escritorio ON public.orcamentos(escritorio_id);

-- =========================================================
-- 7. Seed das 5 unidades
-- =========================================================
INSERT INTO public.escritorios (nome, cidade, razao_social, cnpj, endereco, telefone, email, ordem) VALUES
  ('São Miguel do Oeste', 'São Miguel do Oeste - SC', 'EVERTON DE OLIVEIRA MEYER LTDA', '36.172.008/0001-82',
   'Rua Marcilio Dias, 1539 - Centro, São Miguel do Oeste - SC',
   '(49) 3197-8160 · (49) 99990-9954 · (49) 99933-2552',
   'agiliza.smo@gmail.com', 1),
  ('Paraíso', 'Paraíso - SC', 'AGILIZA PARAÍSO LTDA', '00.000.000/0000-00',
   'Rua Guilherme Schmidt, 834 - Centro, Paraíso - SC',
   '(49) 99188-5181', 'agiliza.paraiso@gmail.com', 2),
  ('Maravilha', 'Maravilha - SC', 'AGILIZA MARAVILHA LTDA', '00.000.000/0000-00',
   'Avenida Anita Garibaldi, 340 - Centro, Maravilha - SC',
   '(49) 99154-1854', 'agiliza.mh@gmail.com', 3),
  ('Dionísio Cerqueira', 'Dionísio Cerqueira - SC', 'AGILIZA DIONÍSIO CERQUEIRA LTDA', '00.000.000/0000-00',
   'Avenida Washington Luis, 646 - Centro, Dionísio Cerqueira - SC',
   '(49) 99192-2081', 'agiliza.dc@gmail.com', 4),
  ('Anchieta', 'Anchieta - SC', 'AGILIZA ANCHIETA LTDA', '00.000.000/0000-00',
   'Av. Anchieta, 330, Sala 01, Centro, 89970-000, Anchieta - SC',
   '(49) 9 9911-7869', 'agiliza.anchieta@gmail.com', 5)
ON CONFLICT (nome) DO NOTHING;
