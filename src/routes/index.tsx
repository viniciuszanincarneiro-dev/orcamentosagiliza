import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AGILIZA | Gerador de Orçamentos" },
      { name: "description", content: "Sistema interno para criação e gestão de orçamentos da AGILIZA." },
      { property: "og:title", content: "AGILIZA | Gerador de Orçamentos" },
      { property: "og:description", content: "Sistema interno para criação e gestão de orçamentos da AGILIZA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/login" });
  },
  component: Splash,
});

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
