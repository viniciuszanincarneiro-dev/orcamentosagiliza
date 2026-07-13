
-- 1) Regenera função de numeração usando advisory lock por ano
CREATE OR REPLACE FUNCTION public.gen_orcamento_numero()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  ano TEXT;
  seq INT;
BEGIN
  ano := to_char(now(), 'YYYY');
  -- Serializa geração concorrente dentro da transação corrente.
  PERFORM pg_advisory_xact_lock(hashtextextended('orcamento_numero_' || ano, 0));
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 10) AS INT)), 0) + 1
    INTO seq
    FROM public.orcamentos
    WHERE numero LIKE 'ORC-' || ano || '-%';
  RETURN 'ORC-' || ano || '-' || LPAD(seq::text, 4, '0');
END;
$function$;

-- 2) Trigger BEFORE INSERT: preenche numero se vier vazio
CREATE OR REPLACE FUNCTION public.set_orcamento_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.numero IS NULL OR btrim(NEW.numero) = '' THEN
    NEW.numero := public.gen_orcamento_numero();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_orcamentos_set_numero ON public.orcamentos;
CREATE TRIGGER trg_orcamentos_set_numero
  BEFORE INSERT ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_orcamento_numero();

-- 3) Índice único parcial para o padrão auto-gerado (não afeta números manuais legados)
CREATE UNIQUE INDEX IF NOT EXISTS orcamentos_numero_auto_unique
  ON public.orcamentos (numero)
  WHERE numero ~ '^ORC-[0-9]{4}-[0-9]+$';

-- 4) Revoga execute do público na função trigger (segurança/limpeza)
REVOKE ALL ON FUNCTION public.set_orcamento_numero() FROM PUBLIC;
