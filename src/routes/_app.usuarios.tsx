import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile, type Escritorio, type Profile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin, loading } = useProfile();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const [p, e] = await Promise.all([
        supabase.from("profiles").select("*").order("email"),
        supabase.from("escritorios").select("*").order("ordem"),
      ]);
      if (p.error) throw p.error;
      if (e.error) throw e.error;
      return { profiles: (p.data ?? []) as Profile[], escritorios: (e.data ?? []) as Escritorio[] };
    },
  });

  const setEscritorio = useMutation({
    mutationFn: async ({ id, escritorio_id }: { id: string; escritorio_id: string | null }) => {
      const { error } = await supabase.from("profiles").update({ escritorio_id } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escritório atualizado");
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "usuario" }) => {
      const { error } = await supabase.from("profiles").update({ role } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return <Card><CardContent className="pt-6">Apenas administradores.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7" /> Usuários
        </h1>
        <p className="text-muted-foreground mt-1">Vincule cada usuário ao seu escritório e defina o papel.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de usuários</CardTitle>
          <CardDescription>{data?.profiles.length ?? 0} usuário(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Escritório</TableHead>
                <TableHead>Papel</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data?.profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email}</TableCell>
                    <TableCell>
                      <Select
                        value={p.escritorio_id ?? "none"}
                        onValueChange={(v) => setEscritorio.mutate({ id: p.id, escritorio_id: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Sem escritório —</SelectItem>
                          {data.escritorios.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.role}
                        onValueChange={(v) => setRole.mutate({ id: p.id, role: v as "admin" | "usuario" })}
                      >
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usuario">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
