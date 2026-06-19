ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS itbi_area_transmitida numeric,
  ADD COLUMN IF NOT EXISTS itbi_fracao_ideal numeric,
  ADD COLUMN IF NOT EXISTS itbi_base_calculo numeric;