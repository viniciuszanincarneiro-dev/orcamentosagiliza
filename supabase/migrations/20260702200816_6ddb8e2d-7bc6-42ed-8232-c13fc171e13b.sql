CREATE INDEX IF NOT EXISTS idx_orcamentos_ativos_created
  ON public.orcamentos (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orcamentos_status_ativos
  ON public.orcamentos (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orcamentos_escritorio_created
  ON public.orcamentos (escritorio_id, created_at DESC)
  WHERE deleted_at IS NULL;
