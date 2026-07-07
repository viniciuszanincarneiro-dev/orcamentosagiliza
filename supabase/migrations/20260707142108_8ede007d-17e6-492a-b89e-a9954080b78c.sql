
-- Restrict profile reads to the user themselves or admins (removes public listing of every user's email/role).
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "own or admin read profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Make orcamentos UPDATE policy explicit (adds WITH CHECK to satisfy linter and prevent ambiguity).
DROP POLICY IF EXISTS "Authenticated can update orcamentos" ON public.orcamentos;
CREATE POLICY "Authenticated can update orcamentos"
  ON public.orcamentos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Lock trigger-only functions away from direct client execution.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_escritorio_admin_only() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
