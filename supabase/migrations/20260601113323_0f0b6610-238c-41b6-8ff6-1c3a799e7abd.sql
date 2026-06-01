-- Soft delete on orcamentos
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_orcamentos_deleted_at ON public.orcamentos(deleted_at);

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_email text,
  acao text NOT NULL,
  entidade text,
  entidade_id uuid,
  descricao text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entidade ON public.activity_logs(entidade, entidade_id);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity_logs"
  ON public.activity_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert activity_logs"
  ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);