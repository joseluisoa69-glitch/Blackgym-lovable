import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Apple, ClipboardList, Flame, Target, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  currentWeekStart,
  weekDates,
  ymd,
  computeCurrentStreak,
  computeMaxStreak,
  type WeekStreak,
} from "@/lib/streaks";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { data: nutrition } = useQuery({
    queryKey: ["nutrition_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("nutrition_profile").select("*").maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  const { data: routine } = useQuery({
    queryKey: ["active_routine"],
    queryFn: async () => {
      const { data } = await supabase
        .from("routines")
        .select("*, routine_days(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: streaks } = useQuery({
    queryKey: ["streak_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_streaks")
        .select("week_start, target_days, completed_days, achieved")
        .order("week_start", { ascending: false })
        .limit(30);
      return (data ?? []) as WeekStreak[];
    },
  });

  const weekStart = currentWeekStart();
  const days = weekDates(weekStart);
  const { data: weekSessions } = useQuery({
    queryKey: ["week_sessions", weekStart],
    queryFn: async () => {
      const end = ymd(days[6]);
      const { data } = await supabase
        .from("workout_sessions")
        .select("session_date, completed")
        .gte("session_date", weekStart)
        .lte("session_date", end);
      return data ?? [];
    },
  });

  const currentStreak = streaks ? computeCurrentStreak(streaks) : 0;
  const maxStreak = streaks ? computeMaxStreak(streaks) : 0;
  const target = routine?.days_per_week ?? nutrition?.training_days_per_week ?? 0;
  const completedThisWeek = (weekSessions ?? []).filter((s) => s.completed).length;
  const sessionByDate = new Map<string, boolean>();
  for (const s of weekSessions ?? []) {
    if (s.completed) sessionByDate.set(s.session_date, true);
  }

  const hasNutrition = nutrition?.completed_at;
  const hasRoutine = !!routine;
  const completion = ((profile ? 1 : 0) + (hasNutrition ? 1 : 0) + (hasRoutine ? 1 : 0)) * 33;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-widest text-primary">Bienvenido de vuelta</p>
        <h1 className="mt-1 text-4xl font-display font-bold tracking-tight sm:text-5xl">
          Hola, {profile?.display_name?.split(" ")[0] ?? "atleta"} 👋
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Tu centro de control de entrenamiento y nutrición.
        </p>
      </section>

      {completion < 99 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-bold">Completa tu perfil</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Llena el formulario para desbloquear tu plan personalizado.
              </p>
            </div>
            <Button asChild>
              <Link to="/dashboard/formulario">Empezar</Link>
            </Button>
          </div>
          <Progress value={completion} className="mt-4" />
        </Card>
      )}

      {/* Streak / week tracker */}
      {target > 0 && (
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Flame className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Racha actual
                </p>
                <p className="font-display text-3xl font-bold">
                  {currentStreak} <span className="text-base font-normal text-muted-foreground">semana{currentStreak === 1 ? "" : "s"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-warning" />
              Máxima: <span className="font-bold text-foreground">{maxStreak}</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Esta semana</span>
              <span>
                {completedThisWeek}/{target} entrenos
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => {
                const key = ymd(d);
                const isPast = key < ymd(new Date());
                const isToday = key === ymd(new Date());
                const done = sessionByDate.get(key);
                const dayLabel = ["L", "M", "X", "J", "V", "S", "D"][i];
                let color = "bg-muted text-muted-foreground";
                if (done) color = "bg-success text-success-foreground";
                else if (isPast) color = "bg-destructive/20 text-destructive";
                if (isToday && !done) color = "border-2 border-primary bg-primary/10 text-primary";
                return (
                  <div
                    key={key}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-bold ${color}`}
                  >
                    <span>{dayLabel}</span>
                    <span className="text-[10px] opacity-70">{d.getDate()}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Objetivo: completar <strong>{target}</strong> entrenos esta semana para mantener la racha.
            </p>
          </div>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Flame}
          label="Calorías objetivo"
          value={nutrition?.target_calories ? `${Math.round(nutrition.target_calories)} kcal` : "—"}
        />
        <StatCard
          icon={Target}
          label="Objetivo"
          value={nutrition?.goal ? goalLabel(nutrition.goal) : "—"}
        />
        <StatCard
          icon={Dumbbell}
          label="Días/semana"
          value={target ? `${target} días` : "—"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ModuleCard
          to="/dashboard/rutina"
          icon={Dumbbell}
          title="Rutina"
          description="Tu plan semanal y registro de series."
          status={hasRoutine ? `${routine!.days_per_week} días activos` : "Sin generar"}
        />
        <ModuleCard
          to="/dashboard/alimentacion"
          icon={Apple}
          title="Alimentación"
          description="Macros, calorías y guía nutricional."
          status={hasNutrition ? "Plan listo" : "Pendiente"}
        />
        <ModuleCard
          to="/dashboard/formulario"
          icon={ClipboardList}
          title="Formulario"
          description="Tus datos clave: cuerpo, objetivo, restricciones."
          status={hasNutrition ? "Completado" : "Pendiente"}
        />
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

function ModuleCard({
  to, icon: Icon, title, description, status,
}: { to: string; icon: typeof Dumbbell; title: string; description: string; status: string }) {
  return (
    <Link to={to} className="group">
      <Card className="h-full p-6 transition hover:border-primary hover:shadow-glow">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground transition group-hover:scale-110">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{status}</span>
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </Card>
    </Link>
  );
}

function goalLabel(g: string) {
  return { lose: "Bajar grasa", maintain: "Mantener", gain: "Ganar músculo", recomp: "Recomposición" }[g] ?? g;
}
