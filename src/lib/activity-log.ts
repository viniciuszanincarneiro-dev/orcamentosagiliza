import { supabase } from "@/integrations/supabase/client";

export type AcaoLog =
  | "login"
  | "logout"
  | "criar"
  | "editar"
  | "excluir"
  | "restaurar"
  | "excluir_definitivo"
  | "duplicar"
  | "gerar_pdf"
  | "gerar_docx"
  | "editar_valores"
  | "alterar_valores"
  | "exportar";

export async function registrarLog(params: {
  acao: AcaoLog;
  entidade?: string;
  entidade_id?: string | null;
  numero?: string | null;
  descricao?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const metadata = { ...(params.metadata ?? {}), ...(params.numero ? { numero: params.numero } : {}) };
    await supabase.from("activity_logs").insert({
      acao: params.acao,
      entidade: params.entidade ?? null,
      entidade_id: params.entidade_id ?? null,
      descricao: params.descricao ?? null,
      metadata: metadata as never,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
    } as never);
  } catch {
    // best-effort; never block UX
  }
}
