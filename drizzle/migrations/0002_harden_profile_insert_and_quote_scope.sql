DROP POLICY IF EXISTS "self insert profile" ON public.profiles;
CREATE POLICY "self insert profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND role = 'usuario' AND escritorio_id IS NULL);

DROP POLICY IF EXISTS "scoped read orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "scoped insert orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "scoped update orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "scoped delete orcamentos" ON public.orcamentos;
CREATE POLICY "scoped read orcamentos" ON public.orcamentos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));
CREATE POLICY "scoped insert orcamentos" ON public.orcamentos FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR (created_by = auth.uid() AND escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));
CREATE POLICY "scoped update orcamentos" ON public.orcamentos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()))
WITH CHECK (public.is_admin(auth.uid()) OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));
CREATE POLICY "scoped delete orcamentos" ON public.orcamentos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));