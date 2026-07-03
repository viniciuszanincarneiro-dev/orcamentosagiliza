
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS created_by_nome text,
  ADD COLUMN IF NOT EXISTS created_by_escritorio_nome text,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by_nome text,
  ADD COLUMN IF NOT EXISTS updated_by_escritorio_nome text;

DROP TABLE IF EXISTS public.activity_logs CASCADE;
