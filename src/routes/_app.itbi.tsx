import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/itbi")({
  component: ItbiPage,
});

type Municipio = { id: string; nome: string; aliquota: number };
type Form = { id?: string; nome: string; aliquota: number };
const emptyForm = (): Form => ({ nome: "", aliquota: 2 });

function ItbiPage() {
  const { isAdmin, loading } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());

  const { data: rows, isLoading } = useQuery({
    queryKey: ["itbi-municipios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itbi_municipios" as never)
        .select("id, nome, aliquota")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Municipio[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (f.id) {
        const { error } = await supabase
          .from("itbi_municipios" as never)
          .update({ nome: f.nome, aliquota: f.aliquota } as never)
          .eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itbi_municipios" as never)
          .insert({ nome: f.nome, aliquota: f.aliquota } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Município salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["itbi-municipios"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itbi_municipios" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Município removido");
      qc.invalidateQueries({ queryKey: ["itbi-municipios"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return (
      <Card><CardContent className="pt-6">
        <p className="text-sm">Apenas administradores podem configurar alíquotas de ITBI.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-7 w-7" /> ITBI — Alíquotas por município
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure a porcentagem de ITBI aplicada na estimativa dos orçamentos. Alterações refletem nos próximos cálculos.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo município
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Municípios cadastrados</CardTitle>
          <CardDescription>{rows?.length ?? 0} município(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Município</TableHead>
                <TableHead className="text-right">Alíquota</TableHead>
                <TableHead className="text-right w-32">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(m.aliquota).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm({ id: m.id, nome: m.nome, aliquota: Number(m.aliquota) }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remover ${m.nome}?`)) del.mutate(m.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar município" : "Novo município"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nome do município</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Alíquota (%)</Label>
              <Input type="number" step="0.01" value={form.aliquota}
                onChange={(e) => setForm({ ...form, aliquota: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.nome.trim()}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
