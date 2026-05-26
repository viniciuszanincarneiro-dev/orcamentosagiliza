import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
      throw redirect({ to: "/login" });
    } catch (err) {
      // Re-throw redirects, fall back to login on any other error
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/login" });
    }
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
