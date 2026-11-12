CREATE OR REPLACE FUNCTION public.is_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _uid AND (p.role = 'admin' OR p.escritorio_id IS NOT NULL))
$$;
REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "auth read escritorios" ON public.escritorios;
CREATE POLICY "member read escritorios" ON public.escritorios FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "auth read itbi" ON public.itbi_municipios;
CREATE POLICY "member read itbi" ON public.itbi_municipios FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS itcmd_read_auth ON public.itcmd_aliquotas;
CREATE POLICY itcmd_read_member ON public.itcmd_aliquotas FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS registro_read_auth ON public.tabela_registro_imoveis;
CREATE POLICY registro_read_member ON public.tabela_registro_imoveis FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS tabelionato_read_auth ON public.tabela_tabelionato;
CREATE POLICY tabelionato_read_member ON public.tabela_tabelionato FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Members can read tabela_valores" ON public.tabela_valores;
CREATE POLICY "Members can read tabela_valores" ON public.tabela_valores FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE INDEX IF NOT EXISTS orcamentos_escritorio_idx ON public.orcamentos(escritorio_id);
CREATE INDEX IF NOT EXISTS orcamentos_created_by_idx ON public.orcamentos(created_by);