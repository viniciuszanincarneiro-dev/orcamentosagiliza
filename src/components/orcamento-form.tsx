import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Calculator, Loader2, FileDown, FileText as FileTextIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { TIPOS_SERVICO } from "@/lib/empresa";
import { calcularGeoPorHectare, calcularRegistroImoveis, m2ParaHectares } from "@/lib/calculo-registro";
import { gerarOrcamentoPDF } from "@/lib/gerar-pdf";
import { gerarOrcamentoDOCX } from "@/lib/gerar-docx";
import type { OrcamentoData, ItemOrcamento, Proprietario, Confrontante } from "@/lib/orcamento-types";

type Props = {
  initial?: OrcamentoData;
  onSaved?: (id: string, numero: string) => void;
};

export function OrcamentoForm({ initial, onSaved }: Props) {
  const [data, setData] = useState<OrcamentoData>(() => initial ?? {
    tipo_servico: "retificacao_geo",
    requerente_nome: "",
    proprietarios: [],
    confrontantes: [],
    itens: [],
    valor_total: 0,
    status: "rascunho",
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);

  const { data: tabelaValores } = useQuery({
    queryKey: ["tabela-valores-form"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tabela_valores").select("*").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = <K extends keyof OrcamentoData>(k: K, v: OrcamentoData[K]) => setData((d) => ({ ...d, [k]: v }));

  // Recalcula total quando itens mudam
  useEffect(() => {
    const total = data.itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
    if (total !== data.valor_total) setData((d) => ({ ...d, valor_total: total }));
  }, [data.itens]); // eslint-disable-line

  // Cálculo automático
  function calcularAutomaticamente() {
    if (!tabelaValores) return toast.error("Tabela de valores ainda não carregou");
    const valByChave = Object.fromEntries(tabelaValores.map((v) => [v.chave, Number(v.valor)]));

    const itens: ItemOrcamento[] = [];

    // 1) Levantamento topográfico (por hectare)
    const hectares = data.imovel_area_m2 ? m2ParaHectares(data.imovel_area_m2) : 0;
    if (hectares > 0) {
      const v = calcularGeoPorHectare(hectares, {
        ate_5ha: valByChave.ate_5ha ?? 3600,
        ate_10ha: valByChave.ate_10ha ?? 5300,
        ate_25ha: valByChave.ate_25ha ?? 8300,
      });
      itens.push({ descricao: "LEVANTAMENTO TOPOGRÁFICO E LOCAÇÃO", valor: v });
    } else {
      itens.push({ descricao: "LEVANTAMENTO TOPOGRÁFICO E LOCAÇÃO", valor: valByChave.ate_5ha ?? 3600 });
    }

    // 2) Registro de Imóveis (faixa pelo valor do imóvel)
    const valorImovel = data.imovel_valor_avaliado ?? 0;
    itens.push({ descricao: "REGISTRO DE IMÓVEIS", valor: calcularRegistroImoveis(valorImovel) });

    // 3) Certidões
    itens.push({ descricao: "CERTIDÕES, NEGATIVAS E ASSINATURAS", valor: valByChave.certidoes_assinaturas ?? 450 });

    // 4) CCIR / ITR / CAR
    itens.push({ descricao: "ATUALIZAÇÃO CCIR, ITR, CAR", valor: valByChave.atualizacao_ccir ?? 250 });

    setData((d) => ({ ...d, itens }));
    toast.success("Valores calculados automaticamente. Você pode ajustá-los individualmente.");
  }

  function addItem() {
    setData((d) => ({ ...d, itens: [...d.itens, { descricao: "", valor: 0 }] }));
  }
  function removeItem(idx: number) {
    setData((d) => ({ ...d, itens: d.itens.filter((_, i) => i !== idx) }));
  }
  function updateItem(idx: number, patch: Partial<ItemOrcamento>) {
    setData((d) => ({ ...d, itens: d.itens.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  }

  function addProprietario() { setData((d) => ({ ...d, proprietarios: [...d.proprietarios, { nome: "" }] })); }
  function updateProprietario(idx: number, patch: Partial<Proprietario>) {
    setData((d) => ({ ...d, proprietarios: d.proprietarios.map((p, i) => i === idx ? { ...p, ...patch } : p) }));
  }
  function removeProprietario(idx: number) {
    setData((d) => ({ ...d, proprietarios: d.proprietarios.filter((_, i) => i !== idx) }));
  }
  function addConfrontante() { setData((d) => ({ ...d, confrontantes: [...d.confrontantes, { nome: "" }] })); }
  function updateConfrontante(idx: number, patch: Partial<Confrontante>) {
    setData((d) => ({ ...d, confrontantes: d.confrontantes.map((p, i) => i === idx ? { ...p, ...patch } : p) }));
  }
  function removeConfrontante(idx: number) {
    setData((d) => ({ ...d, confrontantes: d.confrontantes.filter((_, i) => i !== idx) }));
  }

  async function save(status: "rascunho" | "finalizado" = data.status ?? "rascunho"): Promise<OrcamentoData | null> {
    if (!data.requerente_nome.trim()) {
      toast.error("Informe o nome do requerente");
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        tipo_servico: data.tipo_servico,
        requerente_nome: data.requerente_nome,
        requerente_cpf_cnpj: data.requerente_cpf_cnpj || null,
        imovel_descricao: data.imovel_descricao || null,
        imovel_localizacao: data.imovel_localizacao || null,
        imovel_municipio: data.imovel_municipio || null,
        imovel_area_m2: data.imovel_area_m2 ?? null,
        imovel_matricula: data.imovel_matricula || null,
        imovel_valor_avaliado: data.imovel_valor_avaliado ?? null,
        imovel_ccir: data.imovel_ccir || null,
        imovel_car: data.imovel_car || null,
        proprietarios: data.proprietarios,
        confrontantes: data.confrontantes,
        itens: data.itens,
        valor_total: data.valor_total,
        observacoes: data.observacoes || null,
        status,
      };

      let saved: OrcamentoData;
      if (data.id) {
        const { data: row, error } = await supabase.from("orcamentos").update(payload).eq("id", data.id).select().single();
        if (error) throw error;
        saved = row as unknown as OrcamentoData;
      } else {
        const { data: numero, error: numErr } = await supabase.rpc("gen_orcamento_numero");
        if (numErr) throw numErr;
        const { data: row, error } = await supabase
          .from("orcamentos")
          .insert({ ...payload, numero: numero as string })
          .select()
          .single();
        if (error) throw error;
        saved = row as unknown as OrcamentoData;
      }
      setData(saved);
      toast.success(status === "finalizado" ? "Orçamento finalizado" : "Orçamento salvo");
      onSaved?.(saved.id!, saved.numero!);
      return saved;
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function downloadPDF() {
    setGenerating("pdf");
    try {
      const cur = data.id ? data : (await save()) ?? data;
      const blob = await gerarOrcamentoPDF(cur);
      saveAs(blob, `Orcamento-${cur.numero ?? "novo"}.pdf`);
    } catch (e) {
      toast.error("Erro ao gerar PDF", { description: (e as Error).message });
    } finally { setGenerating(null); }
  }
  async function downloadDOCX() {
    setGenerating("docx");
    try {
      const cur = data.id ? data : (await save()) ?? data;
      const blob = await gerarOrcamentoDOCX(cur);
      saveAs(blob, `Orcamento-${cur.numero ?? "novo"}.docx`);
    } catch (e) {
      toast.error("Erro ao gerar DOCX", { description: (e as Error).message });
    } finally { setGenerating(null); }
  }

  const total = useMemo(() => data.itens.reduce((s, i) => s + Number(i.valor || 0), 0), [data.itens]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tipo de serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={data.tipo_servico} onValueChange={(v) => set("tipo_servico", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_SERVICO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Requerente</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome / Razão Social *</Label>
            <Input value={data.requerente_nome} onChange={(e) => set("requerente_nome", e.target.value)} />
          </div>
          <div>
            <Label>CPF / CNPJ</Label>
            <Input value={data.requerente_cpf_cnpj ?? ""} onChange={(e) => set("requerente_cpf_cnpj", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Imóvel</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Descrição do imóvel</Label>
            <Input placeholder='Ex.: Imóvel rural, Lote nº...'
              value={data.imovel_descricao ?? ""} onChange={(e) => set("imovel_descricao", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Localização</Label>
            <Input placeholder="Ex.: Linha Castelo Branco"
              value={data.imovel_localizacao ?? ""} onChange={(e) => set("imovel_localizacao", e.target.value)} />
          </div>
          <div>
            <Label>Município / UF</Label>
            <Input placeholder="São Miguel do Oeste/SC"
              value={data.imovel_municipio ?? ""} onChange={(e) => set("imovel_municipio", e.target.value)} />
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input value={data.imovel_matricula ?? ""} onChange={(e) => set("imovel_matricula", e.target.value)} />
          </div>
          <div>
            <Label>Área (m²)</Label>
            <Input type="number" step="0.01"
              value={data.imovel_area_m2 ?? ""}
              onChange={(e) => set("imovel_area_m2", e.target.value === "" ? undefined : Number(e.target.value))} />
            {data.imovel_area_m2 ? (
              <p className="text-xs text-muted-foreground mt-1">{(data.imovel_area_m2 / 10000).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ha</p>
            ) : null}
          </div>
          <div>
            <Label>Valor avaliado (R$)</Label>
            <Input type="number" step="0.01"
              value={data.imovel_valor_avaliado ?? ""}
              onChange={(e) => set("imovel_valor_avaliado", e.target.value === "" ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <Label>CCIR</Label>
            <Input value={data.imovel_ccir ?? ""} onChange={(e) => set("imovel_ccir", e.target.value)} />
          </div>
          <div>
            <Label>CAR</Label>
            <Input value={data.imovel_car ?? ""} onChange={(e) => set("imovel_car", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <CardTitle>Proprietários</CardTitle>
              <CardDescription>Adicione todos os proprietários do imóvel.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addProprietario}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.proprietarios.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum proprietário.</p> : null}
          {data.proprietarios.map((p, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_220px_40px] gap-2">
              <Input placeholder="Nome" value={p.nome} onChange={(e) => updateProprietario(i, { nome: e.target.value })} />
              <Input placeholder="CPF/CNPJ" value={p.cpf_cnpj ?? ""} onChange={(e) => updateProprietario(i, { cpf_cnpj: e.target.value })} />
              <Button size="icon" variant="ghost" onClick={() => removeProprietario(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <CardTitle>Confrontantes</CardTitle>
              <CardDescription>Vizinhos confrontantes do imóvel.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addConfrontante}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.confrontantes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum confrontante.</p> : null}
          {data.confrontantes.map((c, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_220px_40px] gap-2">
              <Input placeholder="Nome" value={c.nome} onChange={(e) => updateConfrontante(i, { nome: e.target.value })} />
              <Input placeholder="Lado (Norte, Leste...)" value={c.lado ?? ""} onChange={(e) => updateConfrontante(i, { lado: e.target.value })} />
              <Button size="icon" variant="ghost" onClick={() => removeConfrontante(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <CardTitle>Itens do Orçamento</CardTitle>
              <CardDescription>
                Use o cálculo automático para preencher conforme a tabela padrão — depois edite cada valor para aplicar descontos negociados.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={calcularAutomaticamente}>
                <Calculator className="h-4 w-4 mr-1" /> Calcular automaticamente
              </Button>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Item</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item adicionado. Clique em <b>Calcular automaticamente</b> para preencher os valores padrão.</p>
          ) : null}
          {data.itens.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_160px_40px] gap-2 items-center">
              <Input value={it.descricao} onChange={(e) => updateItem(i, { descricao: e.target.value })} placeholder="Descrição do serviço" />
              <Input type="number" step="0.01" className="text-right tabular-nums"
                value={it.valor} onChange={(e) => updateItem(i, { valor: Number(e.target.value) || 0 })} />
              <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          <Separator className="my-3" />
          <div className="flex justify-end items-baseline gap-4 pr-12">
            <span className="text-sm uppercase text-muted-foreground tracking-wider">Valor total</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{formatBRL(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={data.observacoes ?? ""}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Observações adicionais que devem aparecer no orçamento." />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-end sticky bottom-0 bg-background/95 backdrop-blur py-3 -mx-4 px-4 border-t">
        <Button variant="outline" onClick={() => save("rascunho")} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar rascunho
        </Button>
        <Button variant="secondary" onClick={() => save("finalizado")} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Finalizar
        </Button>
        <Button onClick={downloadPDF} disabled={generating !== null || saving}>
          {generating === "pdf" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />} Baixar PDF
        </Button>
        <Button onClick={downloadDOCX} disabled={generating !== null || saving}>
          {generating === "docx" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileTextIcon className="h-4 w-4 mr-1" />} Baixar DOCX
        </Button>
      </div>
    </div>
  );
}
