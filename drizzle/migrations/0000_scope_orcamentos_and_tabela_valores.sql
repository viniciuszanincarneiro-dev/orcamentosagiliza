DROP POLICY IF EXISTS "Authenticated can read orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Authenticated can insert orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Authenticated can update orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Authenticated can delete orcamentos" ON public.orcamentos;

CREATE POLICY "scoped read orcamentos" ON public.orcamentos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR created_by = auth.uid() OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));
CREATE POLICY "scoped insert orcamentos" ON public.orcamentos FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR (created_by = auth.uid() AND (escritorio_id IS NULL OR escritorio_id = public.current_escritorio_id())));
CREATE POLICY "scoped update orcamentos" ON public.orcamentos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR created_by = auth.uid() OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()))
WITH CHECK (public.is_admin(auth.uid()) OR created_by = auth.uid() OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));
CREATE POLICY "scoped delete orcamentos" ON public.orcamentos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR created_by = auth.uid() OR (escritorio_id IS NOT NULL AND escritorio_id = public.current_escritorio_id()));

DROP POLICY IF EXISTS "Authenticated can read tabela_valores" ON public.tabela_valores;
CREATE POLICY "Members can read tabela_valores" ON public.tabela_valores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()));