ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS cliente_telefone text,
  ADD COLUMN IF NOT EXISTS cliente_whatsapp text,
  ADD COLUMN IF NOT EXISTS data_envio timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_contato timestamptz,
  ADD COLUMN IF NOT EXISTS validade_dias integer DEFAULT 30;