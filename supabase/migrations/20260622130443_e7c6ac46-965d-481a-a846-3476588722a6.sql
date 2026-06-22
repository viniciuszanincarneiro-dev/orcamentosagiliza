-- ====== tabela_valores: leitura para todos os autenticados, escrita só admin ======
DROP POLICY IF EXISTS "Authenticated can insert tabela_valores" ON public.tabela_valores;
DROP POLICY IF EXISTS "Authenticated can update tabela_valores" ON public.tabela_valores;
DROP POLICY IF EXISTS "Authenticated can delete tabela_valores" ON public.tabela_valores;

CREATE POLICY "Admin insert tabela_valores"
  ON public.tabela_valores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin update tabela_valores"
  ON public.tabela_valores FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin delete tabela_valores"
  ON public.tabela_valores FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ====== profiles: só admin pode trocar escritorio_id ======
CREATE OR REPLACE FUNCTION public.enforce_profile_escritorio_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.escritorio_id IS DISTINCT FROM NEW.escritorio_id)
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem vincular o escritório de um usuário';
  END IF;
  -- também protege a alteração de papel (role) para não-admin
  IF (OLD.role IS DISTINCT FROM NEW.role)
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar o papel de um usuário';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_escritorio_admin_only() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.enforce_profile_escritorio_admin_only() TO service_role;

DROP TRIGGER IF EXISTS trg_profiles_admin_only_escritorio ON public.profiles;
CREATE TRIGGER trg_profiles_admin_only_escritorio
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_escritorio_admin_only();