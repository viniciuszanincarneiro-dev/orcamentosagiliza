CREATE OR REPLACE FUNCTION public.financeiro_agregado(
  _desde timestamptz DEFAULT NULL,
  _tipo text DEFAULT NULL,
  _status text DEFAULT NULL,
  _escritorio uuid DEFAULT NULL
)
RETURNS TABLE(mes date, escritorio_id uuid, qtd bigint, aprovados bigint, finalizados bigint, bruto numeric, liquido numeric, despesas numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH base AS (
    SELECT o.id, o.status, o.escritorio_id, o.valor_total, o.created_at,
      COALESCE((SELECT sum(CASE WHEN (it->>'valor') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (it->>'valor')::numeric ELSE 0 END)
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.itens)='array' THEN o.itens ELSE '[]'::jsonb END) it
        WHERE COALESCE(it->>'descricao','') ~* '(registro\s+de?\s*im[oó]veis|\mri\M|certid|negativ|emolument|cart[oó]rio)'),0) AS repasse,
      COALESCE((SELECT sum(CASE WHEN (it->>'valor') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (it->>'valor')::numeric ELSE 0 END)
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.itens)='array' THEN o.itens ELSE '[]'::jsonb END) it
        WHERE NOT (COALESCE(it->>'descricao','') ~* '(registro\s+de?\s*im[oó]veis|\mri\M|certid|negativ|emolument|cart[oó]rio)')),0) AS lucro
    FROM public.orcamentos o
    WHERE o.deleted_at IS NULL
      AND (_desde IS NULL OR o.created_at >= _desde)
      AND (_tipo IS NULL OR o.tipo_servico = _tipo)
      AND (_status IS NULL OR o.status = _status)
      AND (_escritorio IS NULL OR o.escritorio_id = _escritorio)
  )
  SELECT date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')::date,
    escritorio_id,
    count(*),
    count(*) FILTER (WHERE status = 'aprovado'),
    count(*) FILTER (WHERE status = 'finalizado'),
    COALESCE(sum(valor_total),0),
    COALESCE(sum(lucro) FILTER (WHERE status = 'aprovado'),0),
    COALESCE(sum(repasse),0)
  FROM base GROUP BY 1, 2;
$$;
REVOKE ALL ON FUNCTION public.financeiro_agregado(timestamptz, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.financeiro_agregado(timestamptz, text, text, uuid) TO authenticated;
CREATE INDEX IF NOT EXISTS orcamentos_active_created_idx ON public.orcamentos (created_at DESC) WHERE deleted_at IS NULL;