import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  Sparkles,
  Flame,
  Dumbbell,
  Trophy,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { generateProgressionAI } from "@/lib/deepseek.functions";

export const Route = createFileRoute("/_authenticated/dashboard/progreso")({
  component: ProgresoPage,
});

type SetRow = { weight: number | null; reps: number | null; done?: boolean };
type LogRow = {
  id: string;
  exercise_name: string;
  muscle_group: string | null;
  sets: SetRow[];
  created_at: string;
  session_id: string;
};

function ProgresoPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: nutrition } = useQuery({
    queryKey: ["nutrition_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("nutrition_profile").select("*").maybeSingle();
      return data;
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["all_exercise_logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_logs")
        .select("id, exercise_name, muscle_group, sets, created_at, session_id")
        .order("created_at", { ascending: true });
      return (data ?? []) as LogRow[];
    },
  });

  const byExercise = useMemo(() => {
    const map = new Map<
      string,
      { name: string; muscle: string | null; logs: LogRow[] }
    >();
    for (const log of logs ?? []) {
      const entry = map.get(log.exercise_name) ?? {
        name: log.exercise_name,
        muscle: log.muscle_group,
        logs: [],
      };
      entry.logs.push(log);
      map.set(log.exercise_name, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.logs.length - a.logs.length);
  }, [logs]);

  const totalSessions = useMemo(() => {
    const ids = new Set((logs ?? []).map((l) => l.session_id));
    return ids.size;
  }, [logs]);

  const totalVolume = useMemo(() => {
    let v = 0;
    for (const l of logs ?? []) {
      for (const s of l.sets ?? []) {
        if (s.done && s.weight && s.reps) v += s.weight * s.reps;
      }
    }
    return v;
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!byExercise.length) {
    return (
      <Card className="space-y-3 p-8 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="font-display text-2xl font-bold">Sin datos todavía</h2>
        <p className="text-muted-foreground">
          Registra al menos una sesión en la pestaña <strong>Rutina</strong> para empezar a
          ver tus gráficas de progreso.
        </p>
      </Card>
    );
  }

  const current = selected
    ? byExercise.find((e) => e.name === selected) ?? byExercise[0]
    : byExercise[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Tu progreso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sigue cómo evoluciona cada ejercicio y deja que la IA te sugiera la próxima
          sobrecarga.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={CalendarDays} label="Sesiones totales" value={totalSessions.toString()} />
        <StatCard icon={Dumbbell} label="Ejercicios distintos" value={byExercise.length.toString()} />
        <StatCard
          icon={Flame}
          label="Volumen total"
          value={`${Math.round(totalVolume).toLocaleString()} kg`}
        />
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Ejercicio</p>
            <h2 className="font-display text-xl font-bold">{current.name}</h2>
            {current.muscle && (
              <Badge variant="outline" className="mt-1">
                {current.muscle}
              </Badge>
            )}
          </div>
          <Select value={current.name} onValueChange={setSelected}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {byExercise.map((e) => (
                <SelectItem key={e.name} value={e.name}>
                  {e.name} · {e.logs.length} sesiones
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ExerciseCharts logs={current.logs} />

        <AIProgressionBlock
          exerciseName={current.name}
          muscleGroup={current.muscle}
          logs={current.logs}
          goal={nutrition?.goal ?? "maintain"}
          level={nutrition?.experience ?? "intermediate"}
        />
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

function ExerciseCharts({ logs }: { logs: LogRow[] }) {
  const data = useMemo(() => {
    return logs.map((l) => {
      const sets = (l.sets ?? []).filter((s) => s.weight != null && s.reps != null);
      const maxW = sets.length ? Math.max(...sets.map((s) => Number(s.weight))) : 0;
      const vol = sets.reduce(
        (acc, s) => acc + Number(s.weight ?? 0) * Number(s.reps ?? 0),
        0,
      );
      // estimación de 1RM (Epley) con el set más pesado
      const top = sets.reduce<{ w: number; r: number }>(
        (acc, s) =>
          Number(s.weight) > acc.w ? { w: Number(s.weight), r: Number(s.reps) } : acc,
        { w: 0, r: 0 },
      );
      const e1rm = top.w > 0 ? Math.round(top.w * (1 + top.r / 30)) : 0;
      return {
        date: new Date(l.created_at).toLocaleDateString("es", {
          day: "2-digit",
          month: "short",
        }),
        max: maxW,
        volume: Math.round(vol),
        e1rm,
      };
    });
  }, [logs]);

  const pr = data.reduce((max, d) => (d.max > max ? d.max : max), 0);
  const lastVol = data[data.length - 1]?.volume ?? 0;
  const firstVol = data[0]?.volume ?? 0;
  const delta = firstVol ? Math.round(((lastVol - firstVol) / firstVol) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1">
          <Trophy className="h-3 w-3" /> PR: {pr} kg
        </Badge>
        <Badge variant={delta >= 0 ? "default" : "destructive"}>
          {delta >= 0 ? "+" : ""}
          {delta}% volumen vs. inicio
        </Badge>
      </div>

      <Chart title="Peso máximo por sesión (kg)" data={data} dataKey="max" color="hsl(var(--primary))" />
      <Chart title="Volumen total por sesión (kg)" data={data} dataKey="volume" color="hsl(142 76% 50%)" />
      <Chart title="1RM estimado (Epley)" data={data} dataKey="e1rm" color="hsl(38 95% 60%)" />
    </div>
  );
}

function Chart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AIProgressionBlock({
  exerciseName,
  muscleGroup,
  logs,
  goal,
  level,
}: {
  exerciseName: string;
  muscleGroup: string | null;
  logs: LogRow[];
  goal: string;
  level: string;
}) {
  const genProg = useServerFn(generateProgressionAI);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);

  async function run() {
    if (logs.length < 1) {
      toast.error("Necesitas al menos una sesión registrada.");
      return;
    }
    setLoading(true);
    try {
      const history = logs.slice(-10).map((l) => ({
        date: l.created_at.slice(0, 10),
        sets: (l.sets ?? []).map((s) => ({
          weight: s.weight ?? null,
          reps: s.reps ?? null,
        })),
      }));
      const res = await genProg({
        data: {
          exercise_name: exerciseName,
          muscle_group: muscleGroup ?? undefined,
          goal,
          level,
          history,
        },
      });
      setPlan(res);
      toast.success("Plan de progresión generado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">Plan de progresión IA</h3>
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {plan ? "Regenerar" : "Generar con IA"}
        </Button>
      </div>

      {!plan && !loading && (
        <p className="mt-2 text-sm text-muted-foreground">
          Analiza tu historial y propone peso/reps para tu próxima sesión y un plan a 4 semanas.
        </p>
      )}

      {plan && (
        <div className="mt-4 space-y-4">
          {plan.diagnosis && (
            <p className="text-sm">
              <span className="font-semibold">Diagnóstico:</span> {plan.diagnosis}
            </p>
          )}

          {plan.next_session && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Próxima sesión sugerida
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Pill label="Peso" value={`${plan.next_session.weight} kg`} />
                <Pill label="Series" value={`${plan.next_session.sets}`} />
                <Pill label="Reps" value={plan.next_session.rep_range} />
                <Pill label="Descanso" value={`${plan.next_session.rest_seconds}s`} />
              </div>
            </div>
          )}

          {Array.isArray(plan.weekly_plan) && plan.weekly_plan.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Plan a 4 semanas
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {plan.weekly_plan.map((w: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold">Semana {w.week}</span>
                      <Badge variant="outline">
                        {w.weight} kg · {w.rep_range}
                      </Badge>
                    </div>
                    {w.focus && (
                      <p className="mt-1 text-xs text-muted-foreground">{w.focus}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(plan.tips) && plan.tips.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Tips
              </p>
              <ul className="space-y-1 text-sm">
                {plan.tips.map((t: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold">{value}</p>
    </div>
  );
}
