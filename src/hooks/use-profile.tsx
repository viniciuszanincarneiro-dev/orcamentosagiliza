import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Escritorio = {
  id: string;
  nome: string;
  cidade: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  ativo: boolean;
  ordem: number;
};

export type Profile = {
  id: string;
  email: string;
  nome: string | null;
  role: "admin" | "usuario";
  escritorio_id: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  const uid = user?.id;
  const q = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
    queryFn: async () => {
      if (!uid) return null;
      const [p, e] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("escritorios").select("*").order("ordem"),
      ]);
      // Nunca lançar erro aqui — se qualquer consulta falhar, seguimos com
      // dados vazios para que a aplicação carregue mesmo que o perfil/escritório
      // esteja inacessível temporariamente (evita "loading infinito").
      if (p.error) console.error("[useProfile] profiles:", p.error);
      if (e.error) console.error("[useProfile] escritorios:", e.error);
      const profile = (p.data ?? null) as Profile | null;
      const escritorios = (e.data ?? []) as Escritorio[];
      const escritorio = profile?.escritorio_id
        ? escritorios.find((x) => x.id === profile.escritorio_id) ?? null
        : null;
      return { profile, escritorio, escritorios };
    },
  });
  return {
    loading: q.isLoading,
    profile: q.data?.profile ?? null,
    escritorio: q.data?.escritorio ?? null,
    escritorios: q.data?.escritorios ?? [],
    isAdmin: q.data?.profile?.role === "admin",
    refetch: q.refetch,
  };
}
