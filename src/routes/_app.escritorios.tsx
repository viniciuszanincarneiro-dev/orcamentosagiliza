import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile, type Escritorio } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/escritorios")({
  component: EscritoriosPage,
});

type Form = Omit<Escritorio, "id"> & { id?: string };
const emptyForm = (): Form => ({
  nome: "", cidade: "", razao_social: "", cnpj: "", endereco: "",
  telefone: "", email: "", ativo: true, ordem: 0,
});

function EscritoriosPage() {
  const { isAdmin, loading } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());

  const { data: rows, isLoading } = useQuery({
    queryKey: ["escritorios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("escritorios").select("*").order("ordem");
      if (error) throw error;
      return (data ?? []) as Escritorio[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (f.id) {
        const { error } = await supabase.from("escritorios").update(f as never).eq("id", f.id);
        if (error) throw error;
      } else {
        const { id: _id, ...rest } = f;
        void _id;
        const { error } = await supabase.from("escritorios").insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Escritório salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["escritorios"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escritorios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escritório excluído");
      qc.invalidateQueries({ queryKey: ["escritorios"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return (
      <Card><CardContent className="pt-6">
        <p className="text-sm">Apenas administradores podem gerenciar escritórios.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7" /> Escritórios
          </h1>
          <p className="text-muted-foreground mt-1">Cadastro das unidades da Agiliza. Os dados são usados automaticamente nos orçamentos.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo escritório
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades cadastradas</CardTitle>
          <CardDescription>{rows?.length ?? 0} escritório(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nome}<div className="text-xs text-muted-foreground">{e.razao_social}</div></TableCell>
                    <TableCell className="tabular-nums">{e.cnpj}</TableCell>
                    <TableCell>{e.telefone}</TableCell>
                    <TableCell>{e.email}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir ${e.nome}?`)) del.mutate(e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar escritório" : "Novo escritório"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome (curto)" v={form.nome} on={(v) => setForm({ ...form, nome: v })} />
            <Field label="Cidade / UF" v={form.cidade} on={(v) => setForm({ ...form, cidade: v })} />
            <div className="sm:col-span-2"><Field label="Razão social" v={form.razao_social} on={(v) => setForm({ ...form, razao_social: v })} /></div>
            <Field label="CNPJ" v={form.cnpj} on={(v) => setForm({ ...form, cnpj: v })} />
            <Field label="Telefone" v={form.telefone} on={(v) => setForm({ ...form, telefone: v })} />
            <div className="sm:col-span-2"><Field label="Endereço completo" v={form.endereco} on={(v) => setForm({ ...form, endereco: v })} /></div>
            <Field label="E-mail" v={form.email} on={(v) => setForm({ ...form, email: v })} />
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
