ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS servicos jsonb NOT NULL DEFAULT '[]'::jsonb;