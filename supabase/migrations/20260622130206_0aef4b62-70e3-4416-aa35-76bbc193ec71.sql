-- Trigger-only: nenhum cliente precisa executar
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT  EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- Geração de número de orçamento: só usuários autenticados podem chamar
REVOKE EXECUTE ON FUNCTION public.gen_orcamento_numero() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.gen_orcamento_numero() TO authenticated, service_role;

-- Helpers de RLS: anon não precisa, autenticado precisa para as policies funcionarem
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.current_escritorio_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_escritorio_id() TO authenticated, service_role;