import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Settings, Dumbbell, Apple, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const navItems: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/rutina", label: "Rutina", icon: Dumbbell },
  { to: "/dashboard/alimentacion", label: "Alimentación", icon: Apple },
  { to: "/dashboard/formulario", label: "Formulario", icon: ClipboardList },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/perfil"
              aria-label="Ajustes de perfil"
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition hover:border-primary hover:text-primary"
            >
              <Settings className="h-5 w-5 transition group-hover:rotate-45" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">BLACKGYM</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>

        {/* Tabs nav */}
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
