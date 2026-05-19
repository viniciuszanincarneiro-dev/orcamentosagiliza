import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OrcamentoForm } from "@/components/orcamento-form";
import type { OrcamentoData } from "@/lib/orcamento-types";

export const Route = createFileRoute("/_app/orcamentos/$id")({
  component: EditarPage,
});

function EditarPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["orcamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as OrcamentoData;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/orcamentos"><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Orçamento <span className="font-mono text-xl text-muted-foreground">{data?.numero}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Edite os dados ou gere os documentos novamente.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="text-destructive">Erro: {(error as Error).message}</p>
      ) : data ? (
        <OrcamentoForm initial={data} />
      ) : null}
    </div>
  );
}
