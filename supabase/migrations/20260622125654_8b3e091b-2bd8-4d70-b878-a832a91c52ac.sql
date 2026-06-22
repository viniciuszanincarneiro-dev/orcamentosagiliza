ALTER TABLE public.orcamentos 
  ADD COLUMN IF NOT EXISTS itbi_usar_contrato boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS itbi_valor_contrato numeric;