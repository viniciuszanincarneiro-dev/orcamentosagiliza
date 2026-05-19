import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OrcamentoForm } from "@/components/orcamento-form";

export const Route = createFileRoute("/_app/orcamentos/novo")({
  component: NovoPage,
});

function NovoPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Orçamento</h1>
        <p className="text-muted-foreground mt-1">Preencha os dados do imóvel — os valores serão calculados automaticamente e podem ser ajustados.</p>
      </div>
      <OrcamentoForm onSaved={(id) => navigate({ to: "/orcamentos/$id", params: { id } })} />
    </div>
  );
}
