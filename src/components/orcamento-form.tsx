import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Calculator, Loader2, FileDown, FileText as FileTextIcon, Save, Sparkles, Upload, X, AlertTriangle, CheckCircle2, AlertCircle, Eraser, PencilLine, ChevronUp, ChevronDown, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";
// file-saver é carregado sob demanda para reduzir o bundle inicial

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { TIPOS_SERVICO, TEMPLATES_ITENS, STATUS_ORCAMENTO, servicoTemITBI, servicoTemITCMD } from "@/lib/empresa";
import { calcularGeoPorHectare, calcularRegistroImoveis, explicarRegistroImoveis, m2ParaHectares } from "@/lib/calculo-registro";
import { calcularTabelionato } from "@/lib/calculo-tabelionato";
// gerar-pdf e gerar-docx são pesados (jspdf/docx) — importados dinamicamente abaixo
import { parseMatricula, type MatriculaParsed } from "@/lib/parse-matricula.functions";
import type { OrcamentoData, ItemOrcamento, ServicoBloco } from "@/lib/orcamento-types";
import { registrarLog } from "@/lib/activity-log";
import { useProfile } from "@/hooks/use-profile";

function novoId(): string {
  try { return (globalThis.crypto as Crypto).randomUUID(); }
  catch { return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
}

function blocoVazio(tipo = "retificacao_geo"): ServicoBloco {
  return { id: novoId(), tipo_servico: tipo, itens: [], observacoes: "", subtotal: 0 };
}

function normalizarServicos(d: OrcamentoData): ServicoBloco[] {
  if (Array.isArray(d.servicos) && d.servicos.length > 0) {
    return d.servicos.map((s) => ({
      id: s.id ?? novoId(),
      tipo_servico: s.tipo_servico ?? "outros",
      titulo_personalizado: s.titulo_personalizado,
      itens: Array.isArray(s.itens) ? s.itens : [],
      observacoes: s.observacoes ?? "",
      subtotal: Array.isArray(s.itens) ? s.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0) : 0,
    }));
  }
  // legado: monta um único bloco a partir de tipo_servico + itens
  const itens = Array.isArray(d.itens) ? d.itens : [];
  return [{
    id: novoId(),
    tipo_servico: d.tipo_servico ?? "outros",
    itens,
    observacoes: d.observacoes ?? "",
    subtotal: itens.reduce((a, b) => a + (Number(b.valor) || 0), 0),
  }];
}

// Cache de leitura por sessão (chave: hash leve do arquivo/texto).
const parseCache = new Map<string, MatriculaParsed>();

type Qualidade = "alta" | "parcial" | "baixa";
function avaliarQualidade(p: MatriculaParsed): { nivel: Qualidade; preenchidos: number; total: number } {
  const campos = [
    !!p.numero_matricula,
    !!p.municipio,
    typeof p.area_m2 === "number" && p.area_m2 > 0,
    typeof p.valor_avaliado === "number" && p.valor_avaliado > 0,
    p.proprietarios.length > 0,
  ];
  const preenchidos = campos.filter(Boolean).length;
  const nivel: Qualidade = preenchidos >= 4 ? "alta" : preenchidos >= 2 ? "parcial" : "baixa";
  return { nivel, preenchidos, total: campos.length };
}

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
    servicos: [blocoVazio("retificacao_geo")],
    valor_total: 0,
    status: "rascunho",
  });
  // Garante que sempre existe pelo menos um bloco (normaliza orçamentos legados)
  const [servicos, setServicos] = useState<ServicoBloco[]>(() => normalizarServicos(initial ?? {
    tipo_servico: "retificacao_geo", requerente_nome: "", proprietarios: [], confrontantes: [], itens: [], valor_total: 0,
  } as OrcamentoData));
  const [matriculaTexto, setMatriculaTexto] = useState("");
  const [arquivo, setArquivo] = useState<{ nome: string; mime: string; size: number; base64: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [modo, setModo] = useState<"auto" | "manual">("auto");
  const [ultimaLeitura, setUltimaLeitura] = useState<{ parsed: MatriculaParsed; qualidade: ReturnType<typeof avaliarQualidade> } | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [fatorRI, setFatorRI] = useState<number>(70);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { escritorio, escritorios, profile } = useProfile();

  // Escritório a usar nos documentos: o vinculado ao orçamento (quando existir);
  // senão, o do usuário logado. Garante que cada PDF saia com os dados da unidade correta.
  function escritorioDoOrcamento(orc: { escritorio_id?: string | null }) {
    const id = orc.escritorio_id ?? null;
    if (id) {
      const e = escritorios.find((x) => x.id === id);
      if (e) return e;
    }
    return escritorio;
  }

  const parseFn = useServerFn(parseMatricula);

  const { data: tabelaValores } = useQuery({
    queryKey: ["tabela-valores-form"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tabela_valores").select("*").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: itbiMunicipios } = useQuery({
    queryKey: ["itbi-municipios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itbi_municipios" as never)
        .select("id, nome, aliquota")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nome: string; aliquota: number }>;
    },
  });

  // Sincroniza o fator de ajuste interno do RI vindo da configuração (se existir).
  // O usuário pode sobrescrever localmente no card de cálculo.
  const fatorRIConfig = useMemo(() => {
    const row = tabelaValores?.find((x) => x.chave === "ri_fator_ajuste");
    const n = row ? Number(row.valor) : 70;
    return Number.isFinite(n) && n > 0 ? Math.min(100, Math.max(1, n)) : 70;
  }, [tabelaValores]);
  const fatorRIInicializado = useRef(false);
  if (!fatorRIInicializado.current && tabelaValores) {
    fatorRIInicializado.current = true;
    if (fatorRI !== fatorRIConfig) setFatorRI(fatorRIConfig);
  }

  const set = <K extends keyof OrcamentoData>(k: K, v: OrcamentoData[K]) => setData((d) => ({ ...d, [k]: v }));

  type AutoKind = "topografia" | "registro" | "certidoes" | "ccir" | "tabelionato" | "assessoria";
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
      case "registro": return calcularRegistroImoveis(valor ?? 0, fatorRI);
      case "certidoes": return v.certidoes_assinaturas ?? 200;
      case "ccir": return v.atualizacao_ccir ?? 250;
      case "tabelionato": return calcularTabelionato(valor ?? 0);
      case "assessoria": return v.assessoria_documental ?? 580;
      default: return 0;
    }
  }

  function aplicarTemplate(tipo: string, blocoIdx = 0, area_m2 = data.imovel_area_m2, valor?: number) {
    // Por padrão usa a base proporcional (quando houver transmissão parcial),
    // caindo para o valor avaliado do imóvel quando nada for informado.
    const valorBase = valor ?? (valorBaseProporcional || data.imovel_valor_avaliado || 0);
    const template = TEMPLATES_ITENS[tipo] ?? [];
    const itens: ItemOrcamento[] = template.map((t) =>
      "auto" in t
        ? { descricao: t.descricao, valor: calcValorAuto(t.auto, area_m2, valorBase) }
        : { descricao: t.descricao, valor: t.valor_base }
    );
    setServicos((arr) => arr.map((s, i) => i === blocoIdx ? { ...s, tipo_servico: tipo, itens, subtotal: itens.reduce((a, b) => a + (Number(b.valor) || 0), 0) } : s));
  }

  async function fileToBase64(file: Blob): Promise<string> {
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

  // Reduz imagens grandes antes de enviar para a IA: drasticamente mais rápido.
  async function downscaleImage(file: File, maxDim = 1600, quality = 0.78): Promise<{ blob: Blob; mime: string }> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale >= 1 && file.size < 800 * 1024) return { blob: file, mime: file.type };
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { blob: file, mime: file.type };
      ctx.drawImage(img, 0, 0, w, h);
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality) as unknown as void,
      );
      return { blob, mime: "image/jpeg" };
    } catch {
      return { blob: file, mime: file.type };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 12MB)");
      return;
    }
    try {
      const isImg = f.type.startsWith("image/");
      const { blob, mime } = isImg ? await downscaleImage(f) : { blob: f, mime: f.type || "application/pdf" };
      const base64 = await fileToBase64(blob);
      setArquivo({ nome: f.name, mime: mime || "application/octet-stream", size: blob.size, base64 });
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
    setErroLeitura(null);
    try {
      // Cache em memória por sessão: evita reprocessar o mesmo arquivo/texto.
      const cacheKey = `m:${arquivo?.base64.slice(0, 64) ?? ""}|${arquivo?.size ?? 0}|${texto.slice(0, 200)}`;
      const cached = parseCache.get(cacheKey);
      const parsed = cached ?? await parseFn({
        data: {
          texto: texto || undefined,
          arquivo: arquivo ? { data_base64: arquivo.base64, mime_type: arquivo.mime, nome: arquivo.nome } : undefined,
        },
      });
      if (!cached) parseCache.set(cacheKey, parsed);
      const qualidade = avaliarQualidade(parsed);
      setUltimaLeitura({ parsed, qualidade });
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
      // Recalcula itens automáticos do primeiro bloco com a nova área/valor
      aplicarTemplate(servicos[0]?.tipo_servico ?? data.tipo_servico, 0, parsed.area_m2, parsed.valor_avaliado);
      if (qualidade.nivel === "alta") toast.success("Leitura confiável. Revise os campos antes de gerar o orçamento.");
      else if (qualidade.nivel === "parcial") toast.warning("Leitura parcial. Complete os campos faltantes manualmente.");
      else toast.warning("Leitura ruim. Recomendamos preencher manualmente.");
    } catch (e) {
      const msg = (e as Error).message ?? "Falha desconhecida";
      setErroLeitura(msg);
      toast.error("Não foi possível ler a matrícula automaticamente", {
        description: "Tente outra foto/arquivo ou use o modo manual.",
      });
    } finally {
      setParsing(false);
    }
  }

  function limparExtraidos() {
    setData((d) => ({
      ...d,
      imovel_matricula: undefined,
      imovel_municipio: undefined,
      imovel_area_m2: undefined,
      imovel_valor_avaliado: undefined,
      imovel_descricao: undefined,
      proprietarios: [],
    }));
    setUltimaLeitura(null);
    setErroLeitura(null);
    toast.success("Campos extraídos limpos. Preencha manualmente.");
  }

  // ============ Helpers de blocos de serviço (multisserviço) ============
  function addServico() {
    setServicos((arr) => [...arr, blocoVazio("retificacao_geo")]);
  }
  function removeServico(idx: number) {
    setServicos((arr) => arr.length <= 1 ? arr : arr.filter((_, i) => i !== idx));
  }
  function duplicarServico(idx: number) {
    setServicos((arr) => {
      const src = arr[idx];
      if (!src) return arr;
      const novo: ServicoBloco = { ...src, id: novoId(), itens: src.itens.map((i) => ({ ...i })) };
      const out = [...arr];
      out.splice(idx + 1, 0, novo);
      return out;
    });
  }
  function moverServico(idx: number, dir: -1 | 1) {
    setServicos((arr) => {
      const novo = [...arr];
      const j = idx + dir;
      if (j < 0 || j >= novo.length) return arr;
      [novo[idx], novo[j]] = [novo[j], novo[idx]];
      return novo;
    });
  }
  function updateBlocoTipo(idx: number, tipo: string) {
    const itensAtuais = servicos[idx]?.itens ?? [];
    // Aplica template se bloco está vazio
    if (itensAtuais.length === 0 || tipo === "retificacao_urbana") {
      aplicarTemplate(tipo, idx);
    } else {
      setServicos((arr) => arr.map((s, i) => i === idx ? { ...s, tipo_servico: tipo } : s));
    }
  }
  function updateBlocoObs(idx: number, observacoes: string) {
    setServicos((arr) => arr.map((s, i) => i === idx ? { ...s, observacoes } : s));
  }

  // ============ Itens (escopados ao bloco) ============
  function addItem(blocoIdx: number) {
    setServicos((arr) => arr.map((s, i) => i === blocoIdx ? { ...s, itens: [...s.itens, { descricao: "", valor: 0 }] } : s));
  }
  function removeItem(blocoIdx: number, idx: number) {
    setServicos((arr) => arr.map((s, i) => i === blocoIdx ? { ...s, itens: s.itens.filter((_, k) => k !== idx) } : s));
  }
  function updateItem(blocoIdx: number, idx: number, patch: Partial<ItemOrcamento>) {
    setServicos((arr) => arr.map((s, i) => {
      if (i !== blocoIdx) return s;
      const itens = s.itens.map((it, k) => k === idx ? { ...it, ...patch } : it);
      return { ...s, itens, subtotal: itens.reduce((a, b) => a + (Number(b.valor) || 0), 0) };
    }));
  }

  // Subtotais por bloco + total geral
  const subtotais = useMemo(
    () => servicos.map((s) => s.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0)),
    [servicos],
  );
  // ITBI só se aplica quando algum serviço do orçamento exige (ex.: compra e venda, doação, permuta…)
  const temITBI = useMemo(
    () => servicos.some((s) => servicoTemITBI(s.tipo_servico)),
    [servicos],
  );

  // ITBI agora é 100% MANUAL — o usuário informa o valor diretamente.
  // Mantemos os campos de "transmissão parcial" (área/fração/contrato) que
  // continuam alimentando a base proporcional do RI/Tabelionato.
  const itbiValorManual = Number(data.itbi_estimado ?? 0) || 0;
  const itbiNoTotal = temITBI ? itbiValorManual : 0;
  // ITCMD — também 100% MANUAL (recebido pronto do órgão fazendário).
  const temITCMD = useMemo(
    () => servicos.some((s) => servicoTemITCMD(s.tipo_servico)),
    [servicos],
  );
  const itcmdValorManual = Number(data.itcmd_estimado ?? 0) || 0;
  const itcmdNoTotal = temITCMD ? itcmdValorManual : 0;
  const totalServicos = useMemo(() => subtotais.reduce((a, b) => a + b, 0), [subtotais]);
  const total = totalServicos + itbiNoTotal + itcmdNoTotal;

  // Base proporcional para emolumentos (RI, Tabelionato etc.) — calculada a
  // partir da transmissão parcial informada, independentemente do ITBI.
  const baseTransmissao = useMemo(() => {
    const valorCheio = Number(data.imovel_valor_avaliado ?? 0) || 0;
    const areaTotal = Number(data.imovel_area_m2 ?? 0) || 0;
    const areaTrans = Number(data.itbi_area_transmitida ?? 0) || 0;
    const fracInf = Number(data.itbi_fracao_ideal ?? 0) || 0;
    const usarContrato = !!data.itbi_usar_contrato;
    const valorContrato = Number(data.itbi_valor_contrato ?? 0) || 0;
    let fracaoPct = 100;
    let origem: "area" | "fracao" | "total" | "contrato" = "total";
    let base = valorCheio;
    if (usarContrato && valorContrato > 0) {
      base = Number(valorContrato.toFixed(2));
      origem = "contrato";
      if (areaTrans > 0 && areaTotal > 0) fracaoPct = Math.min(100, (areaTrans / areaTotal) * 100);
      else if (fracInf > 0) fracaoPct = Math.min(100, fracInf);
    } else if (areaTrans > 0 && areaTotal > 0) {
      fracaoPct = Math.min(100, (areaTrans / areaTotal) * 100);
      origem = "area";
      base = Number(((valorCheio * fracaoPct) / 100).toFixed(2));
    } else if (fracInf > 0) {
      fracaoPct = Math.min(100, fracInf);
      origem = "fracao";
      base = Number(((valorCheio * fracaoPct) / 100).toFixed(2));
    }
    return { valorCheio, fracaoPct, origem, base };
  }, [data.imovel_valor_avaliado, data.imovel_area_m2, data.itbi_area_transmitida, data.itbi_fracao_ideal, data.itbi_usar_contrato, data.itbi_valor_contrato]);

  const valorBaseProporcional = baseTransmissao.base;
  const transmissaoParcial =
    baseTransmissao.origem !== "total" &&
    valorBaseProporcional > 0 &&
    valorBaseProporcional !== baseTransmissao.valorCheio;

  // Explicação do RI baseado na BASE PROPORCIONAL quando houver transmissão parcial.
  const explicacaoRI = useMemo(
    () => explicarRegistroImoveis(valorBaseProporcional, fatorRI),
    [valorBaseProporcional, fatorRI],
  );

  async function salvarFatorPadrao() {
    try {
      const { error } = await supabase
        .from("tabela_valores")
        .update({ valor: fatorRI } as never)
        .eq("categoria", "config")
        .eq("chave", "ri_fator_ajuste");
      if (error) throw error;
      toast.success(`Fator de ajuste salvo como padrão: ${fatorRI}%`);
    } catch (e) {
      toast.error("Erro ao salvar fator", { description: (e as Error).message });
    }
  }

  function recalcularRI() {
    const novo = explicacaoRI.valor;
    setServicos((arr) => {
      // Procura primeiro bloco com item RI; se não houver, adiciona no primeiro bloco
      let alvo = arr.findIndex((s) => s.itens.some((i) => /registro\s+de\s+im[oó]veis/i.test(i.descricao)));
      if (alvo === -1) alvo = 0;
      return arr.map((s, i) => {
        if (i !== alvo) return s;
        const idx = s.itens.findIndex((it) => /registro\s+de\s+im[oó]veis/i.test(it.descricao));
        const itens = idx === -1
          ? [...s.itens, { descricao: "REGISTRO DE IMÓVEIS", valor: novo }]
          : s.itens.map((it, k) => k === idx ? { ...it, valor: novo } : it);
        return { ...s, itens };
      });
    });
    toast.success(`RI recalculado: ${formatBRL(novo)}`);
  }

  // Mantém o item de "REGISTRO DE IMÓVEIS" sincronizado com a base proporcional.
  // Quando o usuário altera área transmitida / fração ideal / valor de contrato,
  // o RI é recalculado automaticamente nos blocos que já o possuem.
  const novoValorRI = explicacaoRI.valor;
  useEffect(() => {
    if (!Number.isFinite(novoValorRI) || novoValorRI <= 0) return;
    setServicos((arr) => {
      let mudou = false;
      const next = arr.map((s) => {
        const idx = s.itens.findIndex((it) => /registro\s+de\s+im[oó]veis/i.test(it.descricao));
        if (idx === -1) return s;
        if (Math.abs((Number(s.itens[idx].valor) || 0) - novoValorRI) < 0.005) return s;
        mudou = true;
        const itens = s.itens.map((it, k) => k === idx ? { ...it, valor: novoValorRI } : it);
        return { ...s, itens, subtotal: itens.reduce((a, b) => a + (Number(b.valor) || 0), 0) };
      });
      return mudou ? next : arr;
    });
  }, [novoValorRI]);


  async function save(status: string = data.status ?? "rascunho"): Promise<OrcamentoData | null> {
    if (!data.requerente_nome.trim()) {
      toast.error("Informe o nome do cliente");
      return null;
    }
    if (servicos.length === 0 || servicos.every((s) => s.itens.length === 0)) {
      toast.error("Adicione pelo menos um serviço com itens");
      return null;
    }
    setSaving(true);
    try {
      const agora = new Date().toISOString();
      const statusMudou = status !== data.status;
      // Aglutina itens de todos os blocos (mantém compat com lucro/financeiro)
      const itensFlat: ItemOrcamento[] = servicos.flatMap((s) => s.itens);
      const totalServicosAtual = itensFlat.reduce((a, b) => a + (Number(b.valor) || 0), 0);
      const totalAtual = totalServicosAtual + (temITBI ? itbiValorManual : 0) + (temITCMD ? itcmdValorManual : 0);
      // Observações: concatena observações de cada bloco quando houver mais de uma
      const obsFromBlocos = servicos
        .map((s, i) => s.observacoes?.trim() ? `[${i + 1}] ${s.observacoes.trim()}` : "")
        .filter(Boolean)
        .join("\n");
      const observacoesFinal = data.observacoes?.trim()
        ? (obsFromBlocos ? `${data.observacoes.trim()}\n\n${obsFromBlocos}` : data.observacoes.trim())
        : (obsFromBlocos || null);
      // Serializa blocos (com subtotais atualizados)
      const servicosPayload = servicos.map((s) => ({
        ...s,
        subtotal: s.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0),
      }));
      const payload: Record<string, unknown> = {
        tipo_servico: servicos[0]?.tipo_servico ?? data.tipo_servico,
        escritorio_id: data.escritorio_id ?? profile?.escritorio_id ?? null,
        requerente_nome: data.requerente_nome,
        requerente_cpf_cnpj: data.requerente_cpf_cnpj || null,
        cliente_telefone: data.cliente_telefone || null,
        cliente_whatsapp: data.cliente_whatsapp || null,
        imovel_descricao: data.imovel_descricao || null,
        imovel_municipio: data.imovel_municipio || null,
        imovel_area_m2: data.imovel_area_m2 ?? null,
        imovel_matricula: data.imovel_matricula || null,
        imovel_valor_avaliado: data.imovel_valor_avaliado ?? null,
        proprietarios: data.proprietarios,
        confrontantes: [],
        itens: itensFlat,
        servicos: servicosPayload,
        valor_total: totalAtual,
        observacoes: observacoesFinal,
        status,
        validade_dias: data.validade_dias ?? 30,
        ultimo_contato: data.ultimo_contato ?? null,
        itbi_municipio: temITBI ? (data.itbi_municipio ?? null) : null,
        itbi_valor_declarado: temITBI ? (data.itbi_valor_declarado ?? null) : null,
        itbi_aliquota: temITBI ? (data.itbi_aliquota ?? null) : null,
        itbi_estimado: temITBI ? itbiValorManual : null,
        itbi_area_transmitida: temITBI ? (data.itbi_area_transmitida ?? null) : null,
        itbi_fracao_ideal: temITBI ? (data.itbi_fracao_ideal ?? null) : null,
        itbi_base_calculo: temITBI ? valorBaseProporcional : null,
        itbi_usar_contrato: temITBI ? !!data.itbi_usar_contrato : null,
        itbi_valor_contrato: temITBI ? (data.itbi_valor_contrato ?? null) : null,
        itcmd_estimado: temITCMD ? itcmdValorManual : null,
      };
      // Marca data de envio automaticamente na primeira vez que vai para "enviado"
      if (status === "enviado" && !data.data_envio) {
        payload.data_envio = agora;
        payload.ultimo_contato = agora;
      } else {
        payload.data_envio = data.data_envio ?? null;
      }
      if (statusMudou) payload.ultimo_contato = agora;

      let saved: OrcamentoData;
      const eraNovo = !data.id;
      if (data.id) {
        // Permite alterar manualmente o número também em edição.
        const updatePayload = { ...payload, ...(data.numero?.trim() ? { numero: data.numero.trim() } : {}) };
        const { data: row, error } = await supabase.from("orcamentos").update(updatePayload as never).eq("id", data.id).select().single();
        if (error) throw error;
        saved = row as unknown as OrcamentoData;
      } else {
        // Número: usa o informado manualmente; senão gera automaticamente.
        const numeroManual = (data.numero ?? "").trim();
        let numeroFinal = numeroManual;
        if (!numeroFinal) {
          const { data: numero, error: numErr } = await supabase.rpc("gen_orcamento_numero");
          if (numErr) throw numErr;
          numeroFinal = numero as string;
        }
        const { data: row, error } = await supabase
          .from("orcamentos")
          .insert({ ...payload, numero: numeroFinal } as never)
          .select()
          .single();
        if (error) throw error;
        saved = row as unknown as OrcamentoData;
      }
      setData({ ...saved, valor_total: Number(saved.valor_total ?? totalAtual), itens: itensFlat, servicos: servicosPayload });
      setServicos(normalizarServicos({ ...saved, itens: itensFlat, servicos: servicosPayload } as OrcamentoData));
      toast.success("Orçamento salvo");
      void registrarLog({
        acao: eraNovo ? "criar" : "editar",
        entidade: "orcamento",
        entidade_id: saved.id,
        numero: saved.numero,
        descricao: `${eraNovo ? "Criou" : "Editou"} orçamento ${saved.numero} — ${saved.requerente_nome ?? ""}`,
        metadata: { valor_total: saved.valor_total, status: saved.status },
      });
      onSaved?.(saved.id!, saved.numero!);
      return saved;
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
      return null;
    } finally {
      setSaving(false);
    }
  }

  // Monta um snapshot do orçamento atual (sem persistir) para geração de PDF/DOCX
  function snapshotAtual(): OrcamentoData {
    const itensFlat: ItemOrcamento[] = servicos.flatMap((s) => s.itens);
    const servicosSnap = servicos.map((s) => ({
      ...s,
      subtotal: s.itens.reduce((a, b) => a + (Number(b.valor) || 0), 0),
    }));
    return { ...data, itens: itensFlat, servicos: servicosSnap, valor_total: total, tipo_servico: servicos[0]?.tipo_servico ?? data.tipo_servico };
  }

  async function downloadPDF() {
    setGenerating("pdf");
    try {
      const cur = data.id ? snapshotAtual() : (await save()) ?? snapshotAtual();
      const [{ gerarOrcamentoPDF }, { default: fileSaver }] = await Promise.all([
        import("@/lib/gerar-pdf"),
        import("file-saver"),
      ]);
      const blob = await gerarOrcamentoPDF(cur, escritorioDoOrcamento(cur), escritorios);
      fileSaver.saveAs(blob, `Orcamento-${cur.numero ?? "novo"}.pdf`);
      void registrarLog({
        acao: "gerar_pdf",
        entidade: "orcamento",
        entidade_id: cur.id ?? null,
        numero: cur.numero ?? null,
        descricao: `Gerou PDF do orçamento ${cur.numero ?? "novo"}`,
      });
    } catch (e) {
      toast.error("Erro ao gerar PDF", { description: (e as Error).message });
    } finally { setGenerating(null); }
  }
  async function downloadDOCX() {
    setGenerating("docx");
    try {
      const cur = data.id ? snapshotAtual() : (await save()) ?? snapshotAtual();
      const [{ gerarOrcamentoDOCX }, { default: fileSaver }] = await Promise.all([
        import("@/lib/gerar-docx"),
        import("file-saver"),
      ]);
      const blob = await gerarOrcamentoDOCX(cur, escritorioDoOrcamento(cur));
      fileSaver.saveAs(blob, `Orcamento-${cur.numero ?? "novo"}.docx`);
      void registrarLog({
        acao: "gerar_docx",
        entidade: "orcamento",
        entidade_id: cur.id ?? null,
        numero: cur.numero ?? null,
        descricao: `Gerou DOCX do orçamento ${cur.numero ?? "novo"}`,
      });
    } catch (e) {
      toast.error("Erro ao gerar DOCX", { description: (e as Error).message });
    } finally { setGenerating(null); }
  }


  return (
    <div className="space-y-6">
      <Tabs value={modo} onValueChange={(v) => setModo(v as "auto" | "manual")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="auto"><Sparkles className="h-4 w-4 mr-2" /> Automático (OCR + IA)</TabsTrigger>
          <TabsTrigger value="manual"><PencilLine className="h-4 w-4 mr-2" /> Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="mt-3">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Leitura automática da matrícula</CardTitle>
              <CardDescription>
                Envie PDF, foto, print ou scanner — mesmo de baixa qualidade. A IA tenta preencher os campos; tudo permanece editável.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input ref={fileInputRef} type="file" accept={ACCEPT_TYPES} onChange={onPickFile} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Enviar PDF ou imagem
                </Button>
                {arquivo ? (
                  <div className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded-md">
                    <FileTextIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium truncate max-w-[180px]">{arquivo.nome}</span>
                    <span className="text-muted-foreground">({(arquivo.size / 1024).toFixed(0)} KB)</span>
                    <button type="button" onClick={() => setArquivo(null)} className="hover:text-destructive" aria-label="Remover">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">PDF, JPG, PNG, HEIC, WEBP (até 12MB)</span>
                )}
              </div>
              <Textarea
                rows={5}
                placeholder="Ou cole aqui o texto completo da matrícula..."
                value={matriculaTexto}
                onChange={(e) => setMatriculaTexto(e.target.value)}
                className="font-mono text-sm"
              />

              {ultimaLeitura ? (
                <div className={
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm " +
                  (ultimaLeitura.qualidade.nivel === "alta"
                    ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                    : ultimaLeitura.qualidade.nivel === "parcial"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-destructive/40 bg-destructive/10 text-destructive")
                }>
                  {ultimaLeitura.qualidade.nivel === "alta" ? <CheckCircle2 className="h-4 w-4" />
                    : ultimaLeitura.qualidade.nivel === "parcial" ? <AlertCircle className="h-4 w-4" />
                    : <AlertTriangle className="h-4 w-4" />}
                  <span className="font-medium">
                    {ultimaLeitura.qualidade.nivel === "alta" && "Leitura confiável"}
                    {ultimaLeitura.qualidade.nivel === "parcial" && "Leitura parcial"}
                    {ultimaLeitura.qualidade.nivel === "baixa" && "Leitura ruim — revise manualmente"}
                  </span>
                  <span className="text-xs opacity-80">
                    ({ultimaLeitura.qualidade.preenchidos}/{ultimaLeitura.qualidade.total} campos extraídos)
                  </span>
                </div>
              ) : null}

              {erroLeitura ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Não conseguimos ler a matrícula</AlertTitle>
                  <AlertDescription>
                    Tente uma foto mais nítida, outro arquivo, ou troque para o modo <b>Manual</b> e preencha os campos.
                    <span className="block text-xs opacity-70 mt-1">Detalhe técnico: {erroLeitura}</span>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={limparExtraidos} disabled={parsing}>
                  <Eraser className="h-4 w-4 mr-2" /> Limpar dados extraídos
                </Button>
                <Button onClick={interpretarMatricula} disabled={parsing || (!arquivo && !matriculaTexto.trim())}>
                  {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Preencher automaticamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PencilLine className="h-5 w-5 text-primary" /> Preenchimento manual</CardTitle>
              <CardDescription>
                Sem upload e sem IA. Preencha os campos do orçamento abaixo normalmente — útil quando você já tem os dados em mãos.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {escritorio ? (
        <Alert className="border-primary/40 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Escritório: {escritorio.nome}</AlertTitle>
          <AlertDescription>
            Este orçamento será emitido em nome de <b>{escritorio.razao_social}</b> · CNPJ {escritorio.cnpj}. O CNPJ é definido automaticamente pelo seu cadastro.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem escritório vinculado</AlertTitle>
          <AlertDescription>
            Sua conta ainda não está vinculada a um escritório. Peça a um administrador para fazer o vínculo em <b>Usuários</b> — sem isso, o PDF/DOCX usará dados padrão.
          </AlertDescription>
        </Alert>
      )}


      <Card>
        <CardHeader><CardTitle>Status do orçamento</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-xs">
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
            <Label>Número do Orçamento</Label>
            <Input
              value={data.numero ?? ""}
              onChange={(e) => set("numero", e.target.value)}
              placeholder="Deixe em branco para gerar automaticamente (ex.: 0001)"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Você pode definir manualmente o número. Se ficar em branco em um orçamento novo, o sistema gera automaticamente. O número informado é usado no PDF e DOCX.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>Cliente *</Label>
            <Input value={data.requerente_nome} onChange={(e) => set("requerente_nome", e.target.value)} placeholder="Nome do cliente / proprietário" />
          </div>
          <div>
            <Label>CPF / CNPJ do cliente</Label>
            <Input value={data.requerente_cpf_cnpj ?? ""} onChange={(e) => set("requerente_cpf_cnpj", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input placeholder="(49) 9 9999-9999"
              value={data.cliente_telefone ?? ""} onChange={(e) => set("cliente_telefone", e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input placeholder="(49) 9 9999-9999"
              value={data.cliente_whatsapp ?? ""} onChange={(e) => set("cliente_whatsapp", e.target.value)} />
          </div>
          <div>
            <Label>Validade do orçamento (dias)</Label>
            <Input type="number" min={1} max={365}
              value={data.validade_dias ?? 30}
              onChange={(e) => set("validade_dias", e.target.value === "" ? undefined : Number(e.target.value))} />
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
            <p className="text-xs text-muted-foreground mt-1">
              O valor declarado nem sempre reflete o valor de mercado. Você pode ajustar manualmente o valor do imóvel e o valor do RI no item correspondente.
            </p>

            {data.imovel_valor_avaliado ? (
              <div className={
                "mt-2 rounded-md border px-3 py-2 text-sm flex flex-col gap-2 " +
                (explicacaoRI.alerta === "muito_alto"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : explicacaoRI.alerta === "alto"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-border bg-muted/40 text-foreground")
              }>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {explicacaoRI.alerta ? <AlertTriangle className="h-4 w-4" /> : <Calculator className="h-4 w-4 text-primary" />}
                    <span className="font-medium">Registro de Imóveis estimado:</span>
                    <span className="tabular-nums font-semibold">{formatBRL(explicacaoRI.valor)}</span>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={recalcularRI}>
                    Aplicar no item RI
                  </Button>
                </div>

                <div className="grid sm:grid-cols-[auto_120px_auto] items-center gap-2 text-xs">
                  <Label className="text-xs font-medium m-0">Fator de ajuste interno do RI</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={fatorRI}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n)) setFatorRI(Math.min(100, Math.max(1, n)));
                      }}
                      className="h-7 text-right tabular-nums"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={salvarFatorPadrao}>
                    Salvar como padrão
                  </Button>
                </div>

                <p className="text-xs opacity-90 tabular-nums">
                  Valor declarado: <b>{formatBRL(explicacaoRI.valorImovelOriginal)}</b>
                  {explicacaoRI.fatorPct < 100 ? (
                    <>
                      {" "}→ Base de cálculo (após {explicacaoRI.fatorPct}%): <b>{formatBRL(explicacaoRI.valorImovelAjustado)}</b>
                    </>
                  ) : null}
                </p>
                <p className="text-xs opacity-90">{explicacaoRI.descricao}</p>
                {explicacaoRI.alerta ? (
                  <p className="text-xs font-medium">
                    ⚠ RI representa {((explicacaoRI.valor / (data.imovel_valor_avaliado || 1)) * 100).toFixed(1)}% do valor declarado.
                    Ajuste o fator interno ou edite manualmente o valor do RI no item correspondente abaixo.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>


      {/* ============ ITBI 100% MANUAL (somado ao total) ============ */}
      {temITBI ? (
      <Card>
        <CardHeader>
          <CardTitle>ITBI — Imposto de Transmissão</CardTitle>
          <CardDescription>
            Informe o valor do ITBI <b>manualmente</b>. O valor digitado é somado ao total do orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Município do imóvel (opcional)</Label>
              <Select
                value={data.itbi_municipio ?? ""}
                onValueChange={(v) => setData((d) => ({ ...d, itbi_municipio: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o município" /></SelectTrigger>
                <SelectContent>
                  {(itbiMunicipios ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Apenas referência — não calcula o ITBI.</p>
            </div>
            <div>
              <Label>Valor do ITBI (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.itbi_estimado ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setData((d) => ({ ...d, itbi_estimado: v }));
                }}
                placeholder="Digite o valor do ITBI"
              />
              <p className="text-xs text-muted-foreground mt-1">Campo 100% manual. Será somado ao total.</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="text-sm font-medium mb-2">Transmissão parcial (opcional)</div>
          <p className="text-xs text-muted-foreground mb-3">
            Usado apenas para calcular a <b>base proporcional</b> do Registro de Imóveis e Tabelionato.
            Não afeta o valor do ITBI (que é manual).
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Área total do imóvel (m²)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.imovel_area_m2 ?? ""}
                onChange={(e) => set("imovel_area_m2", e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Área transmitida (m²)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.itbi_area_transmitida ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setData((d) => ({ ...d, itbi_area_transmitida: v, itbi_fracao_ideal: v != null ? null : d.itbi_fracao_ideal }));
                }}
                placeholder="Vazio = imóvel inteiro"
              />
            </div>
            <div>
              <Label>ou Fração ideal (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={data.itbi_fracao_ideal ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setData((d) => ({ ...d, itbi_fracao_ideal: v, itbi_area_transmitida: v != null ? null : d.itbi_area_transmitida }));
                }}
                placeholder="Ex.: 50"
              />
            </div>
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 px-4 py-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!data.itbi_usar_contrato}
                onChange={(e) => setData((d) => ({ ...d, itbi_usar_contrato: e.target.checked }))}
              />
              <span className="text-sm font-medium">Usar valor de contrato como base proporcional?</span>
            </label>
            {data.itbi_usar_contrato ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Valor do contrato (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={data.itbi_valor_contrato ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      setData((d) => ({ ...d, itbi_valor_contrato: v }));
                    }}
                    placeholder="Ex.: 50000"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-md border bg-muted/40 px-4 py-3 flex items-baseline justify-between">
            <div className="text-sm">
              <div className="text-muted-foreground text-xs">Valor do ITBI (manual)</div>
            </div>
            <div className="text-2xl font-semibold tabular-nums">{formatBRL(itbiValorManual)}</div>
          </div>

          {transmissaoParcial ? (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800">
              <div className="font-medium mb-1">Base proporcional aplicada ao RI/Tabelionato</div>
              <div className="text-xs">
                Valor cheio da matrícula: <b>{formatBRL(baseTransmissao.valorCheio)}</b><br />
                Percentual transmitido: <b>{baseTransmissao.fracaoPct.toFixed(2)}%</b><br />
                Valor base considerado: <b className="tabular-nums">{formatBRL(valorBaseProporcional)}</b>
              </div>
              <div className="text-xs mt-2 opacity-90">
                Esta base é usada no Registro de Imóveis e Tabelionato. O ITBI permanece com valor manual.
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      ) : null}


      {/* ============ ITCMD 100% MANUAL (somado ao total) ============ */}
      {temITCMD ? (
      <Card>
        <CardHeader>
          <CardTitle>ITCMD — Imposto de Transmissão Causa Mortis e Doação</CardTitle>
          <CardDescription>
            Informe o valor do ITCMD <b>manualmente</b>. O sistema não calcula o ITCMD — o valor é recebido pronto do órgão fazendário e somado ao total do orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Valor do ITCMD (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.itcmd_estimado ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setData((d) => ({ ...d, itcmd_estimado: v }));
                }}
                placeholder="Digite o valor do ITCMD"
              />
              <p className="text-xs text-muted-foreground mt-1">Campo 100% manual. Será somado ao total.</p>
            </div>
          </div>

          <div className="mt-4 rounded-md border bg-muted/40 px-4 py-3 flex items-baseline justify-between">
            <div className="text-sm">
              <div className="text-muted-foreground text-xs">Valor do ITCMD (manual)</div>
            </div>
            <div className="text-2xl font-semibold tabular-nums">{formatBRL(itcmdValorManual)}</div>
          </div>
        </CardContent>
      </Card>
      ) : null}





      {/* ============ SERVIÇOS DO ORÇAMENTO (multisserviço) ============ */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <CardTitle>Serviços do orçamento</CardTitle>
              <CardDescription>
                Adicione um ou mais serviços. Cada bloco tem tipo, itens e observações próprias e gera uma seção no PDF.
              </CardDescription>
            </div>
            <Button size="sm" onClick={addServico}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {servicos.map((bloco, bi) => {
            const subtotal = subtotais[bi] ?? 0;
            const tipoLabel = TIPOS_SERVICO.find((t) => t.value === bloco.tipo_servico)?.label ?? bloco.tipo_servico;
            return (
              <div key={bloco.id} className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-bold tabular-nums">
                      {bi + 1}
                    </span>
                    <span className="text-sm font-semibold truncate">{tipoLabel}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">· {formatBRL(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moverServico(bi, -1)} disabled={bi === 0} title="Mover para cima">
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moverServico(bi, 1)} disabled={bi === servicos.length - 1} title="Mover para baixo">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicarServico(bi)} title="Duplicar serviço">
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeServico(bi)} disabled={servicos.length <= 1} title="Remover serviço">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
                    <div>
                      <Label className="text-xs">Tipo de serviço</Label>
                      <Select value={bloco.tipo_servico} onValueChange={(v) => updateBlocoTipo(bi, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_SERVICO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => aplicarTemplate(bloco.tipo_servico, bi)}>
                      <Calculator className="h-4 w-4 mr-1" /> Aplicar template
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addItem(bi)}>
                      <Plus className="h-4 w-4 mr-1" /> Item
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {bloco.itens.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum item. Clique em <b>Aplicar template</b> para usar o padrão do tipo selecionado.
                      </p>
                    ) : null}
                    {bloco.itens.map((it, i) => (
                      <div key={i} className="grid gap-2 items-center sm:grid-cols-[1fr_160px_40px]">
                        <Input value={it.descricao} onChange={(e) => updateItem(bi, i, { descricao: e.target.value })} placeholder="Descrição do serviço" />
                        <Input type="number" step="0.01" className="text-right tabular-nums"
                          value={it.valor} onChange={(e) => updateItem(bi, i, { valor: Number(e.target.value) || 0 })} />
                        <Button size="icon" variant="ghost" onClick={() => removeItem(bi, i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="text-xs">Observações deste serviço (opcional)</Label>
                    <Textarea rows={2} value={bloco.observacoes ?? ""}
                      onChange={(e) => updateBlocoObs(bi, e.target.value)}
                      placeholder="Observações específicas deste serviço." />
                  </div>

                  <div className="flex justify-end items-baseline gap-3 pt-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wider">Subtotal</span>
                    <span className="text-lg font-semibold tabular-nums">{formatBRL(subtotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          <Separator className="my-2" />
          {(itbiNoTotal > 0 || itcmdNoTotal > 0) ? (
            <div className="flex justify-end items-baseline gap-4 pr-2">
              <span className="text-sm uppercase text-muted-foreground tracking-wider">Subtotal serviços</span>
              <span className="text-base font-medium tabular-nums">{formatBRL(totalServicos)}</span>
            </div>
          ) : null}
          {temITBI && itbiNoTotal > 0 ? (
            <div className="flex justify-end items-baseline gap-4 pr-2">
              <span className="text-sm uppercase text-muted-foreground tracking-wider">ITBI</span>
              <span className="text-base font-medium tabular-nums">{formatBRL(itbiNoTotal)}</span>
            </div>
          ) : null}
          {temITCMD && itcmdNoTotal > 0 ? (
            <div className="flex justify-end items-baseline gap-4 pr-2">
              <span className="text-sm uppercase text-muted-foreground tracking-wider">ITCMD</span>
              <span className="text-base font-medium tabular-nums">{formatBRL(itcmdNoTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-end items-baseline gap-4 pr-2">
            <span className="text-sm uppercase text-muted-foreground tracking-wider">Total geral</span>
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
