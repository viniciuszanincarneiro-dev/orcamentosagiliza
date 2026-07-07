
CREATE OR REPLACE FUNCTION public.dashboard_stats()
RETURNS TABLE (
  total bigint,
  finalizados bigint,
  rascunhos bigint,
  valor_total numeric,
  lucro_bruto numeric,
  repasses numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      o.id,
      o.status,
      o.valor_total,
      CASE
        WHEN jsonb_typeof(o.servicos) = 'array' AND jsonb_array_length(o.servicos) > 0
          THEN (
            SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
            FROM jsonb_array_elements(o.servicos) s,
                 jsonb_array_elements(COALESCE(s->'itens', '[]'::jsonb)) item
          )
        ELSE COALESCE(o.itens, '[]'::jsonb)
      END AS itens_flat
    FROM public.orcamentos o
    WHERE o.deleted_at IS NULL
  ),
  itens AS (
    SELECT
      COALESCE(NULLIF(item->>'valor','')::numeric, 0) AS v,
      (COALESCE(item->>'descricao','') ~* '(registro\s+de?\s*im[oó]veis|\ybi\y|certid|negativ|emolument|cart[oó]rio)') AS is_pass
    FROM base b,
         jsonb_array_elements(b.itens_flat) item
  ),
  contagens AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'finalizado') AS finalizados,
      count(*) FILTER (WHERE status = 'rascunho') AS rascunhos,
      COALESCE(sum(valor_total), 0) AS valor_total
    FROM base
  ),
  agg AS (
    SELECT
      COALESCE(round(sum(CASE WHEN NOT is_pass THEN v ELSE 0 END)::numeric, 2), 0) AS lucro_bruto,
      COALESCE(round(sum(CASE WHEN     is_pass THEN v ELSE 0 END)::numeric, 2), 0) AS repasses
    FROM itens
  )
  SELECT c.total, c.finalizados, c.rascunhos, c.valor_total, a.lucro_bruto, a.repasses
  FROM contagens c CROSS JOIN agg a;
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_stats() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dashboard_stats() TO authenticated;
