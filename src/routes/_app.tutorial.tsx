import { createFileRoute } from "@tanstack/react-router";
import {
  FilePlus2,
  Upload,
  Calculator,
  Users,
  FileText,
  Download,
  CheckCircle2,
  Info,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/tutorial")({
  component: TutorialPage,
});

type Passo = {
  numero: number;
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  descricao: string;
  itens: string[];
  dica?: string;
};

const passos: Passo[] = [
  {
    numero: 1,
    titulo: "Criar um novo orçamento",
    icone: FilePlus2,
    descricao:
      "No menu lateral clique em \"Novo Orçamento\". Você será levado para o formulário em branco.",
    itens: [
      "Preencha os dados do cliente: nome, CPF/CNPJ, telefone e e-mail.",
      "Informe o endereço e o município do imóvel.",
      "Selecione o tipo de serviço (Retificação, Georreferenciamento, Topografia, etc).",
    ],
    dica: "Os dados do cliente são salvos junto do orçamento e ficam disponíveis no Histórico.",
  },
  {
    numero: 2,
    titulo: "Importar matrícula via PDF ou imagem (opcional)",
    icone: Upload,
    descricao:
      "Se você tiver a matrícula em PDF ou foto, use o botão de upload para extrair os dados automaticamente.",
    itens: [
      "Clique em \"Importar matrícula\" dentro do formulário.",
      "Selecione o arquivo (PDF ou imagem).",
      "Aguarde a leitura — o sistema extrai número da matrícula, área, município e tipo do imóvel.",
      "Revise os campos preenchidos automaticamente antes de seguir.",
    ],
    dica: "A leitura é otimizada para ser rápida. Se algum campo vier vazio, basta preencher manualmente.",
  },
  {
    numero: 3,
    titulo: "Informar o valor declarado do imóvel",
    icone: Calculator,
    descricao:
      "O valor declarado é a base de cálculo das custas do Registro de Imóveis (RI).",
    itens: [
      "Preencha o campo \"Valor declarado do imóvel\".",
      "O sistema aplica automaticamente o fator de ajuste interno antes de consultar a tabela do RI.",
      "É exibido o valor original e o valor ajustado lado a lado.",
      "Se necessário, você pode editar manualmente o valor declarado ou o valor do RI.",
    ],
    dica: "Valores muito altos disparam um alerta visual para revisão antes de gerar o orçamento.",
  },
  {
    numero: 4,
    titulo: "Adicionar serviços e custas",
    icone: Users,
    descricao:
      "Selecione os serviços que serão prestados — cada serviço puxa o valor configurado na Tabela de Valores.",
    itens: [
      "Marque os serviços aplicáveis (retificação, georreferenciamento, ART, topografia, etc).",
      "Adicione as custas externas (RI, ITBI, prefeitura) quando aplicáveis.",
      "Você pode editar qualquer valor manualmente se o caso exigir um ajuste pontual.",
    ],
    dica: "Para alterar os valores padrão, vá em \"Tabela de Valores\" no menu lateral.",
  },
  {
    numero: 5,
    titulo: "Conferir o resumo e observações",
    icone: FileText,
    descricao:
      "Antes de gerar o documento final, confira o resumo de valores e adicione observações específicas do caso.",
    itens: [
      "Revise o subtotal, descontos e valor total.",
      "Adicione observações relevantes (prazos, condições, particularidades do imóvel).",
      "Confirme as condições de pagamento.",
    ],
  },
  {
    numero: 6,
    titulo: "Gerar PDF ou DOCX",
    icone: Download,
    descricao:
      "Com tudo conferido, gere o orçamento no formato que preferir para enviar ao cliente.",
    itens: [
      "Clique em \"Gerar PDF\" para a versão final com assinatura digital do Everton.",
      "Clique em \"Gerar DOCX\" se precisar editar o orçamento em Word antes de enviar.",
      "O orçamento é salvo automaticamente no Histórico assim que é gerado.",
    ],
    dica: "A folha de assinatura é diagramada em página separada para não cobrir nenhuma informação.",
  },
  {
    numero: 7,
    titulo: "Acompanhar pelo Follow-up",
    icone: CheckCircle2,
    descricao:
      "Depois de enviado, acompanhe o status do orçamento na aba Follow-up.",
    itens: [
      "Marque como Enviado, Em negociação, Aprovado ou Recusado.",
      "Use o Dashboard para ver o panorama geral de orçamentos do mês.",
      "No Histórico você consegue reabrir, duplicar ou reimprimir qualquer orçamento.",
    ],
  },
];

function TutorialPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
          Tutorial
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Como gerar um orçamento</h1>
        <p className="text-muted-foreground max-w-2xl">
          Passo a passo completo para preencher, calcular e enviar um orçamento pelo AGILIZA.
          Esta aba é apenas informativa — nada do que está aqui interfere nos cálculos ou nos
          orçamentos já criados.
        </p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Antes de começar</AlertTitle>
        <AlertDescription>
          Confira se a <strong>Tabela de Valores</strong> está atualizada. Ela é a base de todos os
          cálculos automáticos do orçamento.
        </AlertDescription>
      </Alert>

      <ol className="space-y-4">
        {passos.map((passo) => {
          const Icone = passo.icone;
          return (
            <li key={passo.numero}>
              <Card className="border-border/60">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icone className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Passo {passo.numero}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1 text-xl">{passo.titulo}</CardTitle>
                    <CardDescription className="mt-1">{passo.descricao}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pl-20">
                  <ul className="space-y-2">
                    {passo.itens.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {passo.dica && (
                    <div className="flex gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
                      <span>
                        <strong className="text-foreground">Dica:</strong> {passo.dica}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle>Boas práticas</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>• Sempre confira o valor declarado e o valor ajustado antes de gerar o PDF.</p>
          <p>• Nunca apague um orçamento — use o status no Follow-up para arquivar.</p>
          <p>• Mantenha a Tabela de Valores revisada a cada 6 meses.</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
