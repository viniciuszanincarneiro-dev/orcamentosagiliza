import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Calculator, Loader2, FileDown, FileText as FileTextIcon, Save, Sparkles, Upload, X } from "lucide-react";
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
import { TIPOS_SERVICO, TEMPLATES_ITENS, STATUS_ORCAMENTO, type TemplateItem } from "@/lib/empresa";
import { calcularGeoPorHectare, calcularRegistroImoveis, m2ParaHectares } from "@/lib/calculo-registro";
import { gerarOrcamentoPDF } from "@/lib/gerar-pdf";
import { gerarOrcamentoDOCX } from "@/lib/gerar-docx";
import { parseMatricula } from "@/lib/parse-matricula.functions";
import type { OrcamentoData, ItemOrcamento } from "@/lib/orcamento-types";

type Props = {
  initial?: OrcamentoData;
  onSaved?: (id: string, numero: string) => void;
};

const ACCEPT_TYPES = "application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/heic";

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
  const [matriculaTexto, setMatriculaTexto] = useState("");
  const [arquivo, setArquivo] = useState<{ nome: string; mime: string; size: number; base64: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFn = useServerFn(parseMatricula);

  const { data: tabelaValores } = useQuery({
    queryKey: ["tabela-valores-form"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tabela_valores").select("*").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = <K extends keyof OrcamentoData>(k: K, v: OrcamentoData[K]) => setData((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    const total = data.itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
    if (total !== data.valor_total) setData((d) => ({ ...d, valor_total: total }));
  }, [data.itens]); // eslint-disable-line

  type AutoKind = "topografia" | "registro" | "certidoes" | "ccir";
  function calcValorAuto(kind: AutoKind, area_m2?: number, valor?: number): number {
    if (!tabelaValores) return 0;
    const v = Object.fromEntries(tabelaValores.map((x) => [x.chave, Number(x.valor)]));
    switch (kind) {
      case "topografia": {
        const ha = area_m2 ? m2ParaHectares(area_m2) : 0;
        return ha > 0
          ? calcularGeoPorHectare(ha, {
              ate_5ha: v.ate_5ha ?? 3600,
              ate_10ha: v.ate_10ha ?? 5300,
              ate_25ha: v.ate_25ha ?? 8300,
            })
          : v.ate_5ha ?? 3600;
      }
      case "registro": return calcularRegistroImoveis(valor ?? 0);
      case "certidoes": return v.certidoes_assinaturas ?? 450;
      case "ccir": return v.atualizacao_ccir ?? 250;
      default: return 0;
    }
  }

  function aplicarTemplate(tipo: string, area_m2 = data.imovel_area_m2, valor = data.imovel_valor_avaliado) {
    const template = TEMPLATES_ITENS[tipo] ?? [];
    const itens: ItemOrcamento[] = template.map((t) =>
      "auto" in t
        ? { descricao: t.descricao, valor: calcValorAuto(t.auto, area_m2, valor) }
        : { descricao: t.descricao, valor: t.valor_base }
    );
    setData((d) => ({ ...d, itens }));
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result);
        const i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 12MB)");
      return;
    }
    try {
      const base64 = await fileToBase64(f);
      setArquivo({ nome: f.name, mime: f.type || "application/octet-stream", size: f.size, base64 });
      toast.success(`Arquivo carregado: ${f.name}`);
    } catch (err) {
      toast.error("Erro ao ler arquivo", { description: (err as Error).message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function interpretarMatricula() {
    const texto = matriculaTexto.trim();
    if (!arquivo && texto.length < 30) {
      toast.error("Cole o texto ou envie um arquivo (PDF/imagem) da matrícula");
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseFn({
        data: {
          texto: texto || undefined,
          arquivo: arquivo ? { data_base64: arquivo.base64, mime_type: arquivo.mime, nome: arquivo.nome } : undefined,
        },
      });
      setData((d) => ({
        ...d,
        imovel_matricula: parsed.numero_matricula ?? d.imovel_matricula,
        imovel_municipio: parsed.municipio ?? d.imovel_municipio,
        imovel_area_m2: parsed.area_m2 ?? d.imovel_area_m2,
        imovel_valor_avaliado: parsed.valor_avaliado ?? d.imovel_valor_avaliado,
        imovel_descricao: parsed.descricao_imovel ?? d.imovel_descricao,
        proprietarios: parsed.proprietarios.length ? parsed.proprietarios : d.proprietarios,
        requerente_nome: d.requerente_nome || (parsed.proprietarios[0]?.nome ?? ""),
        requerente_cpf_cnpj: d.requerente_cpf_cnpj || parsed.proprietarios[0]?.cpf_cnpj,
      }));
      setTimeout(() => aplicarTemplate(data.tipo_servico, parsed.area_m2, parsed.valor_avaliado), 0);
      toast.success("Matrícula interpretada. Revise os campos antes de gerar o orçamento.");
    } catch (e) {
      toast.error("Erro ao interpretar matrícula", { description: (e as Error).message });
    } finally {
      setParsing(false);
    }
  }

  function onTipoServicoChange(tipo: string) {
    set("tipo_servico", tipo);
    // Se ainda não há itens (ou estavam vazios), aplica o template do novo tipo
    if (data.itens.length === 0) aplicarTemplate(tipo);
  }

  function addItem() { setData((d) => ({ ...d, itens: [...d.itens, { descricao: "", valor: 0 }] })); }
  function removeItem(idx: number) { setData((d) => ({ ...d, itens: d.itens.filter((_, i) => i !== idx) })); }
  function updateItem(idx: number, patch: Partial<ItemOrcamento>) {
    setData((d) => ({ ...d, itens: d.itens.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  }

  async function save(status: string = data.status ?? "rascunho"): Promise<OrcamentoData | null> {
    if (!data.requerente_nome.trim()) {
      toast.error("Informe o nome do cliente");
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        tipo_servico: data.tipo_servico,
        requerente_nome: data.requerente_nome,
        requerente_cpf_cnpj: data.requerente_cpf_cnpj || null,
        imovel_descricao: data.imovel_descricao || null,
        imovel_municipio: data.imovel_municipio || null,
        imovel_area_m2: data.imovel_area_m2 ?? null,
        imovel_matricula: data.imovel_matricula || null,
        imovel_valor_avaliado: data.imovel_valor_avaliado ?? null,
        proprietarios: data.proprietarios,
        confrontantes: [],
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
      toast.success("Orçamento salvo");
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
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Leitura automática da matrícula</CardTitle>
          <CardDescription>
            Envie o PDF/foto da matrícula (scanner, celular ou WhatsApp) <b>ou</b> cole o texto. A IA preenche cliente, área, município e valor automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              onChange={onPickFile}
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Enviar PDF ou imagem
            </Button>
            {arquivo ? (
              <div className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded-md">
                <FileTextIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">{arquivo.nome}</span>
                <span className="text-muted-foreground">({(arquivo.size / 1024).toFixed(0)} KB)</span>
                <button type="button" onClick={() => setArquivo(null)} className="hover:text-destructive" aria-label="Remover">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, HEIC (até 12MB)</span>
            )}
          </div>
          <Textarea
            rows={6}
            placeholder="Ou cole aqui o texto completo da matrícula..."
            value={matriculaTexto}
            onChange={(e) => setMatriculaTexto(e.target.value)}
            className="font-mono text-sm"
          />
          <div className="flex justify-end">
            <Button onClick={interpretarMatricula} disabled={parsing || (!arquivo && !matriculaTexto.trim())}>
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Interpretar matrícula
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tipo de serviço e status</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de serviço</Label>
            <Select value={data.tipo_servico} onValueChange={onTipoServicoChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_SERVICO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={data.status ?? "rascunho"} onValueChange={(v) => set("status", v as OrcamentoData["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORCAMENTO.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados do orçamento</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Cliente *</Label>
            <Input value={data.requerente_nome} onChange={(e) => set("requerente_nome", e.target.value)} placeholder="Nome do cliente / proprietário" />
          </div>
          <div>
            <Label>CPF / CNPJ do cliente</Label>
            <Input value={data.requerente_cpf_cnpj ?? ""} onChange={(e) => set("requerente_cpf_cnpj", e.target.value)} />
          </div>
          <div>
            <Label>Matrícula nº</Label>
            <Input value={data.imovel_matricula ?? ""} onChange={(e) => set("imovel_matricula", e.target.value)} />
          </div>
          <div>
            <Label>Município / UF</Label>
            <Input placeholder="São Miguel do Oeste/SC"
              value={data.imovel_municipio ?? ""} onChange={(e) => set("imovel_municipio", e.target.value)} />
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
          <div className="sm:col-span-2">
            <Label>Valor do imóvel (R$)</Label>
            <Input type="number" step="0.01"
              value={data.imovel_valor_avaliado ?? ""}
              onChange={(e) => set("imovel_valor_avaliado", e.target.value === "" ? undefined : Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <CardTitle>Itens do orçamento</CardTitle>
              <CardDescription>Aplique o template do tipo de serviço e ajuste qualquer valor manualmente.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => aplicarTemplate(data.tipo_servico)}>
                <Calculator className="h-4 w-4 mr-1" /> Aplicar template
              </Button>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Item</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item. Clique em <b>Aplicar template</b> para usar o padrão do tipo de serviço selecionado.</p>
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
        <Button variant="outline" onClick={() => save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
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
