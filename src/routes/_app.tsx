import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus2, History, Settings, LogOut, Menu, AlertTriangle, BookOpen, TrendingUp, Trash2, Activity, Building2, Users, Receipt } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import logo from "@/assets/agiliza-logo.png";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

const baseNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orcamentos/novo", label: "Novo Orçamento", icon: FilePlus2 },
  { to: "/orcamentos", label: "Histórico", icon: History },
  { to: "/follow-up", label: "Follow-up", icon: AlertTriangle },
  { to: "/financeiro", label: "Financeiro", icon: TrendingUp },
  { to: "/valores", label: "Tabela de Valores", icon: Settings },
  { to: "/lixeira", label: "Lixeira", icon: Trash2 },
  { to: "/logs", label: "Histórico de Ações", icon: Activity },
  { to: "/tutorial", label: "Tutorial", icon: BookOpen },
] as const;

const adminNav = [
  { to: "/escritorios", label: "Escritórios", icon: Building2 },
  { to: "/usuarios", label: "Usuários", icon: Users },
] as const;

function AppLayout() {
  const { user, signOut } = useAuth();
  const { escritorio, isAdmin } = useProfile();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    router.navigate({ to: "/login" });
  }


  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarContent onNavigate={() => {}} isAdmin={isAdmin} />
      </aside>

      {/* Mobile sheet */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="secondary" className="shadow-md">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <SidebarContent onNavigate={() => setOpen(false)} isAdmin={isAdmin} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border min-h-14 flex items-center justify-end px-4 lg:px-8 gap-3 pl-16 lg:pl-8">
          {escritorio ? (
            <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary hidden md:inline">
              {escritorio.nome}
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 hidden md:inline">
              Sem escritório vinculado
            </span>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate, isAdmin }: { onNavigate: () => void; isAdmin: boolean }) {
  const location = useLocation();
  const items = isAdmin ? [...baseNav, ...adminNav] : baseNav;
  return (
    <>
      <div className="p-5 border-b border-sidebar-border bg-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-md p-1.5">
            <img src={logo} alt="AGILIZA" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight tracking-wide">AGILIZA</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 leading-tight">
              Gerador de Orçamentos
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-[10px] text-sidebar-foreground/50 leading-relaxed">
        AGILIZA Assessoria em Documentos e Topografia
      </div>
    </>
  );
}
