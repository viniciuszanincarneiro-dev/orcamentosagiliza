import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_app/admin-tabelas")({
  component: AdminTabelasPage,
});

function AdminTabelasPage() {
  const { isAdmin, loading } = useProfile();
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return (
      <Card><CardContent className="pt-6">
        <p className="text-sm">Apenas administradores podem acessar a área de tabelas.</p>
      </CardContent></Card>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-7 w-7" /> Tabelas e Valores
        </h1>
        <p className="text-muted-foreground mt-1">
          Cadastre honorários da Agiliza e custas externas (ITCMD, Tabelionato, Registro de Imóveis).
          Os valores aqui alimentam automaticamente os orçamentos.
        </p>
      </div>

      <Tabs defaultValue="itcmd">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="itcmd">ITCMD</TabsTrigger>
          <TabsTrigger value="tabelionato">Tabelionato</TabsTrigger>
          <TabsTrigger value="registro">Registro de Imóveis</TabsTrigger>
        </TabsList>

        <TabsContent value="itcmd" className="pt-4"><ItcmdTab /></TabsContent>
        <TabsContent value="tabelionato" className="pt-4"><TabelionatoTab /></TabsContent>
        <TabsContent value="registro" className="pt-4"><RegistroTab /></TabsContent>
      </Tabs>
    </div>
  );
}



/* ============================ ITCMD ============================ */

type ItcmdRow = { id: string; tipo: string; uf: string; faixa_min: number; faixa_max: number | null; aliquota: number; descricao: string | null; ativo: boolean };
type ItcmdForm = { id?: string; tipo: "doacao" | "inventario"; uf: string; faixa_min: number; faixa_max: number | null; aliquota: number; descricao: string };
const emptyItcmd = (): ItcmdForm => ({ tipo: "doacao", uf: "SC", faixa_min: 0, faixa_max: null, aliquota: 0, descricao: "" });

function ItcmdTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ItcmdForm>(emptyItcmd());

  const { data: rows, isLoading } = useQuery({
    queryKey: ["itcmd_aliquotas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itcmd_aliquotas" as never).select("*").order("tipo").order("faixa_min");
      if (error) throw error;
      return (data ?? []) as ItcmdRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: ItcmdForm) => {
      const payload = { tipo: f.tipo, uf: f.uf.trim().toUpperCase(), faixa_min: f.faixa_min, faixa_max: f.faixa_max, aliquota: f.aliquota, descricao: f.descricao || null };
      if (f.id) {
        const { error } = await supabase.from("itcmd_aliquotas" as never).update(payload as never).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("itcmd_aliquotas" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["itcmd_aliquotas"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itcmd_aliquotas" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["itcmd_aliquotas"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>ITCMD — Alíquotas por faixa</CardTitle>
          <CardDescription>Cadastre faixas de valor base e a alíquota aplicada. {rows?.length ?? 0} faixa(s).</CardDescription>
        </div>
        <Button onClick={() => { setForm(emptyItcmd()); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova faixa</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>UF</TableHead>
              <TableHead className="text-right">Faixa Min</TableHead>
              <TableHead className="text-right">Faixa Max</TableHead>
              <TableHead className="text-right">Alíquota</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right w-32">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows?.map((m) => (
                <TableRow key={m.id} className={m.ativo ? "" : "opacity-50"}>
                  <TableCell className="capitalize">{m.tipo}</TableCell>
                  <TableCell>{m.uf}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(Number(m.faixa_min))}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.faixa_max == null ? "—" : formatBRL(Number(m.faixa_max))}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(m.aliquota).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.descricao ?? ""}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({ id: m.id, tipo: m.tipo as "doacao"|"inventario", uf: m.uf, faixa_min: Number(m.faixa_min), faixa_max: m.faixa_max == null ? null : Number(m.faixa_max), aliquota: Number(m.aliquota), descricao: m.descricao ?? "" }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover faixa?")) del.mutate(m.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar faixa ITCMD" : "Nova faixa ITCMD"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "doacao"|"inventario" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doacao">Doação</SelectItem>
                    <SelectItem value="inventario">Inventário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>UF</Label><Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Faixa mínima (R$)</Label><Input type="number" step="0.01" value={form.faixa_min} onChange={(e) => setForm({ ...form, faixa_min: Number(e.target.value) || 0 })} /></div>
              <div><Label>Faixa máxima (R$) — vazio = sem limite</Label><Input type="number" step="0.01" value={form.faixa_max ?? ""} onChange={(e) => setForm({ ...form, faixa_max: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            </div>
            <div><Label>Alíquota (%)</Label><Input type="number" step="0.01" value={form.aliquota} onChange={(e) => setForm({ ...form, aliquota: Number(e.target.value) || 0 })} /></div>
            <div><Label>Descrição (opcional)</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ============================ TABELIONATO ============================ */

type TabRow = { id: string; ato: string; descricao: string | null; faixa_min: number; faixa_max: number | null; valor: number; ativo: boolean };
type TabForm = { id?: string; ato: string; descricao: string; faixa_min: number; faixa_max: number | null; valor: number };
const emptyTab = (): TabForm => ({ ato: "", descricao: "", faixa_min: 0, faixa_max: null, valor: 0 });

function TabelionatoTab() {
  return <FaixaCrud
    tabela="tabela_tabelionato"
    titulo="Tabelionato — Emolumentos por ato e faixa"
    descricao="Cadastre o ato (ex.: Escritura de Compra e Venda) e o valor por faixa de valor declarado."
    extraField={{ key: "ato", label: "Ato", placeholder: "ex.: Escritura de Compra e Venda" }}
    formInit={emptyTab}
  />;
}

function RegistroTab() {
  return <FaixaCrud
    tabela="tabela_registro_imoveis"
    titulo="Registro de Imóveis — Emolumentos por faixa"
    descricao="Cadastre o valor do registro conforme a faixa de valor declarado do imóvel."
    formInit={() => ({ ato: "", descricao: "", faixa_min: 0, faixa_max: null, valor: 0 })}
  />;
}

/* Genérico: tabela com faixa_min/faixa_max/valor (+ ato opcional para tabelionato) */
function FaixaCrud({ tabela, titulo, descricao, extraField, formInit }: {
  tabela: "tabela_tabelionato" | "tabela_registro_imoveis";
  titulo: string;
  descricao: string;
  extraField?: { key: "ato"; label: string; placeholder: string };
  formInit: () => TabForm;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TabForm>(formInit());

  const { data: rows, isLoading } = useQuery({
    queryKey: [tabela],
    queryFn: async () => {
      const { data, error } = await supabase.from(tabela as never).select("*").order("faixa_min");
      if (error) throw error;
      return (data ?? []) as TabRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: TabForm) => {
      const payload: Record<string, unknown> = {
        descricao: f.descricao || null,
        faixa_min: f.faixa_min,
        faixa_max: f.faixa_max,
        valor: f.valor,
      };
      if (extraField) payload.ato = f.ato.trim();
      if (f.id) {
        const { error } = await supabase.from(tabela as never).update(payload as never).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tabela as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: [tabela] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabela as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: [tabela] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div><CardTitle>{titulo}</CardTitle><CardDescription>{descricao} {rows?.length ?? 0} faixa(s).</CardDescription></div>
        <Button onClick={() => { setForm(formInit()); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova faixa</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : rows && rows.length > 0 ? (
          <Table>
            <TableHeader><TableRow>
              {extraField && <TableHead>{extraField.label}</TableHead>}
              <TableHead className="text-right">Faixa Min</TableHead>
              <TableHead className="text-right">Faixa Max</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right w-32">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  {extraField && <TableCell className="font-medium">{m.ato}</TableCell>}
                  <TableCell className="text-right tabular-nums">{formatBRL(Number(m.faixa_min))}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.faixa_max == null ? "—" : formatBRL(Number(m.faixa_max))}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(Number(m.valor))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.descricao ?? ""}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({ id: m.id, ato: m.ato ?? "", descricao: m.descricao ?? "", faixa_min: Number(m.faixa_min), faixa_max: m.faixa_max == null ? null : Number(m.faixa_max), valor: Number(m.valor) }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover faixa?")) del.mutate(m.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma faixa cadastrada. Enquanto não houver tabela, o orçamento usa campo manual.</p>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar faixa" : "Nova faixa"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {extraField && <div><Label>{extraField.label}</Label><Input value={form.ato} onChange={(e) => setForm({ ...form, ato: e.target.value })} placeholder={extraField.placeholder} /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Faixa mínima (R$)</Label><Input type="number" step="0.01" value={form.faixa_min} onChange={(e) => setForm({ ...form, faixa_min: Number(e.target.value) || 0 })} /></div>
              <div><Label>Faixa máxima (R$) — vazio = sem limite</Label><Input type="number" step="0.01" value={form.faixa_max ?? ""} onChange={(e) => setForm({ ...form, faixa_max: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            </div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })} /></div>
            <div><Label>Descrição (opcional)</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || (extraField ? !form.ato.trim() : false)}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
