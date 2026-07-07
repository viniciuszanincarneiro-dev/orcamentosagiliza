import { createFileRoute, useNavigate, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

import logo from "@/assets/agiliza-logo.png";

export const Route = createFileRoute("/login")({
  // Se já estiver autenticado, pula direto para o dashboard — evita o "loop" no login.
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Pré-carrega o chunk e as queries do dashboard em paralelo enquanto o usuário digita.
  // Após o submit, a navegação encontra tudo pronto no cache.
  useEffect(() => {
    router.preloadRoute({ to: "/dashboard" }).catch(() => {});
  }, [router]);


  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      return toast.error("Erro ao entrar", { description: error });
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) return toast.error("Erro ao cadastrar", { description: error });
    toast.success("Conta criada! Faça login.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="AGILIZA" className="h-20 object-contain" />
          <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
            Gerador de Orçamentos
          </p>
        </div>
        <Card className="border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle>Acesso interno</CardTitle>
            <CardDescription>Entre com sua conta para acessar o sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <Field id="signin-email" label="E-mail" value={email} setValue={setEmail} type="email" />
                  <Field id="signin-pass" label="Senha" value={password} setValue={setPassword} type="password" />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? "Entrando…" : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <Field id="signup-email" label="E-mail" value={email} setValue={setEmail} type="email" />
                  <Field id="signup-pass" label="Senha (mín. 6)" value={password} setValue={setPassword} type="password" />
                  <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? "Criando…" : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          AGILIZA Assessoria em Documentos e Topografia · São Miguel do Oeste · SC
        </p>
      </div>
    </div>
  );
}

function Field({ id, label, value, setValue, type }: { id: string; label: string; value: string; setValue: (v: string) => void; type: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => setValue(e.target.value)} required autoComplete={type === "password" ? "current-password" : "email"} />
    </div>
  );
}
