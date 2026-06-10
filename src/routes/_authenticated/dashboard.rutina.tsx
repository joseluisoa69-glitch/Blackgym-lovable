import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Replace,
  Flame,
} from "lucide-react";
import { buildRoutine, type LibraryExercise } from "@/lib/splits";

export const Route = createFileRoute("/_authenticated/dashboard/rutina")({
  component: RutinaPage,
});

type SetRow = { weight: number | null; reps: number | null; done: boolean };
type ExerciseInRoutine = {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest_seconds: number;
};

function RutinaPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [openDay, setOpenDay] = useState<any | null>(null);

  const { data: nutrition } = useQuery({
    queryKey: ["nutrition_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("nutrition_profile").select("*").maybeSingle();
      return data;
    },
  });

  const { data: library } = useQuery({
    queryKey: ["exercise_library"],
    queryFn: async () => {
      const { data } = await supabase.from("exercise_library").select("*");
      return (data ?? []) as LibraryExercise[];
    },
  });

  const { data: routine, isLoading } = useQuery({
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

  async function generate() {
    if (!nutrition?.training_days_per_week) {
      toast.error("Primero completa el formulario.");
      return;
    }
    if (!library?.length) {
      toast.error("Biblioteca de ejercicios no disponible.");
      return;
    }
    setBusy(true);
    try {
      const days = nutrition.training_days_per_week;
      const built = buildRoutine(library, days);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase
        .from("routines")
        .update({ is_active: false })
        .eq("user_id", userData.user.id);
      const { data: newR, error } = await supabase
        .from("routines")
        .insert({
          user_id: userData.user.id,
          name: `Rutina de ${days} días`,
          days_per_week: days,
          level: nutrition.experience ?? "beginner",
          goal: nutrition.goal ?? "maintain",
          is_active: true,
        })
        .select()
        .single();
      if (error || !newR) throw error;
      await supabase.from("routine_days").insert(
        built.map((d) => ({
          routine_id: newR.id,
          day_index: d.day_index,
          title: d.title,
          muscle_groups: d.muscle_groups,
          exercises: d.exercises,
        })),
      );
      toast.success(`Rutina de ${days} días generada`);
      qc.invalidateQueries({ queryKey: ["active_routine"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar la rutina");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const days = (routine?.routine_days ?? []).sort(
    (a: any, b: any) => a.day_index - b.day_index,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Tu semana</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toca un día para registrar tus series, pesos y repeticiones.
          </p>
        </div>
        <Button onClick={generate} disabled={busy} variant={routine ? "outline" : "default"}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {routine ? "Regenerar rutina" : "Generar rutina"}
        </Button>
      </div>

      {!nutrition?.training_days_per_week && (
        <Card className="flex items-start gap-3 border-warning/40 bg-warning/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
          <div className="text-sm">
            Necesitas indicar cuántos días vas al gym en el{" "}
            <Link to="/dashboard/formulario" className="font-semibold text-primary underline">
              formulario
            </Link>
            .
          </div>
        </Card>
      )}

      {routine && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{routine.days_per_week} días/semana</Badge>
            {routine.level && <Badge variant="outline">Nivel: {routine.level}</Badge>}
            {routine.goal && <Badge variant="outline">Objetivo: {routine.goal}</Badge>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {days.map((day: any) => (
              <DayCard key={day.id} day={day} onOpen={() => setOpenDay(day)} />
            ))}
          </div>
        </>
      )}

      {openDay && routine && (
        <DayLoggerSheet
          day={openDay}
          routineId={routine.id}
          targetDays={routine.days_per_week}
          library={library ?? []}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

function DayCard({ day, onOpen }: { day: any; onOpen: () => void }) {
  // saber si hay sesión completada hoy
  const today = new Date().toISOString().slice(0, 10);
  const { data: todaySession } = useQuery({
    queryKey: ["session_today", day.id, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("id, completed")
        .eq("routine_id", day.routine_id)
        .eq("day_index", day.day_index)
        .eq("session_date", today)
        .maybeSingle();
      return data;
    },
  });

  return (
    <Card
      onClick={onOpen}
      className={`cursor-pointer overflow-hidden p-0 transition hover:border-primary ${
        todaySession?.completed ? "border-success/50 bg-success/5" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Día {day.day_index}
          </span>
          <div className="font-display text-base font-bold">{day.title}</div>
        </div>
        {todaySession?.completed && <CheckCircle2 className="h-5 w-5 text-success" />}
      </div>
      <div className="space-y-1.5 p-5">
        {(day.exercises ?? []).slice(0, 5).map((ex: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{ex.name}</span>
            <span className="text-muted-foreground">
              {ex.sets}×{ex.reps}
            </span>
          </div>
        ))}
        {(day.exercises ?? []).length > 5 && (
          <p className="pt-1 text-xs text-muted-foreground">
            + {day.exercises.length - 5} más
          </p>
        )}
      </div>
    </Card>
  );
}

/* ============================================================
 * Logger del día — Sheet con acordeón por ejercicio
 * ============================================================ */

function DayLoggerSheet({
  day,
  routineId,
  targetDays,
  library,
  onClose,
}: {
  day: any;
  routineId: string;
  targetDays: number;
  library: LibraryExercise[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseInRoutine[]>(
    (day.exercises ?? []) as ExerciseInRoutine[],
  );
  const [logs, setLogs] = useState<Record<string, SetRow[]>>({});
  const [completing, setCompleting] = useState(false);
  const [swapping, setSwapping] = useState<{ index: number; muscle: string } | null>(null);

  // 1. obtener o crear sesión de hoy
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: existing } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("day_index", day.day_index)
        .eq("session_date", today)
        .maybeSingle();
      let sid = existing?.id;
      if (!sid) {
        const { data: created } = await supabase
          .from("workout_sessions")
          .insert({
            user_id: userData.user.id,
            routine_id: routineId,
            day_index: day.day_index,
            day_title: day.title,
            session_date: today,
          })
          .select("id")
          .single();
        sid = created?.id;
      }
      if (cancel || !sid) return;
      setSessionId(sid);

      // 2. cargar logs ya existentes de esta sesión
      const { data: existingLogs } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("session_id", sid);

      const initial: Record<string, SetRow[]> = {};
      const remaining = [...exercises];

      for (const ex of remaining) {
        const found = (existingLogs ?? []).find((l) => l.exercise_name === ex.name);
        if (found && Array.isArray(found.sets) && (found.sets as any[]).length) {
          initial[ex.name] = found.sets as unknown as SetRow[];
          continue;
        }
        // precarga del último log histórico (misma sesión → no)
        const { data: prior } = await supabase
          .from("exercise_logs")
          .select("sets")
          .eq("user_id", userData.user.id)
          .eq("exercise_name", ex.name)
          .neq("session_id", sid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const priorSets =
          prior && Array.isArray(prior.sets) ? (prior.sets as unknown as SetRow[]) : null;
        initial[ex.name] = Array.from({ length: ex.sets }, (_, i) => ({
          weight: priorSets?.[i]?.weight ?? null,
          reps: priorSets?.[i]?.reps ?? null,
          done: false,
        }));
      }
      if (!cancel) setLogs(initial);
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  // Fallback determinista (sin constraint único)
  async function persistRow(exName: string, muscle: string, rows: SetRow[], position: number) {
    if (!sessionId) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: existing } = await supabase
      .from("exercise_logs")
      .select("id")
      .eq("session_id", sessionId)
      .eq("exercise_name", exName)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("exercise_logs")
        .update({ sets: rows as any, muscle_group: muscle, position })
        .eq("id", existing.id);
    } else {
      await supabase.from("exercise_logs").insert({
        user_id: userData.user.id,
        session_id: sessionId,
        exercise_name: exName,
        muscle_group: muscle,
        position,
        sets: rows as any,
      });
    }
  }

  function updateSet(exName: string, idx: number, patch: Partial<SetRow>) {
    setLogs((prev) => {
      const arr = [...(prev[exName] ?? [])];
      arr[idx] = { ...arr[idx], ...patch };
      const next = { ...prev, [exName]: arr };
      const ex = exercises.find((e) => e.name === exName);
      const position = exercises.findIndex((e) => e.name === exName);
      if (ex) persistRow(exName, ex.muscle, arr, position);
      return next;
    });
  }

  async function completeSession() {
    if (!sessionId) return;
    setCompleting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setCompleting(false);
        return;
      }
      await supabase
        .from("workout_sessions")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", sessionId);

      // actualizar racha semanal
      const monday = getMondayStr();
      const { data: streak } = await supabase
        .from("weekly_streaks")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("week_start", monday)
        .maybeSingle();
      const prevCompleted = streak?.completed_days ?? 0;
      const newCompleted = prevCompleted + 1;
      const achieved = newCompleted >= targetDays;
      if (streak) {
        await supabase
          .from("weekly_streaks")
          .update({ completed_days: newCompleted, achieved })
          .eq("id", streak.id);
      } else {
        await supabase.from("weekly_streaks").insert({
          user_id: userData.user.id,
          week_start: monday,
          target_days: targetDays,
          completed_days: newCompleted,
          achieved,
        });
      }
      toast.success(achieved ? "🔥 ¡Semana completada! Racha asegurada." : "Sesión completada 💪");
      qc.invalidateQueries({ queryKey: ["session_today"] });
      qc.invalidateQueries({ queryKey: ["weekly_streaks"] });
      qc.invalidateQueries({ queryKey: ["streak_history"] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo cerrar la sesión");
    } finally {
      setCompleting(false);
    }
  }

  function swapExercise(newName: string) {
    if (!swapping) return;
    const { index } = swapping;
    setExercises((prev) => {
      const arr = [...prev];
      const old = arr[index];
      arr[index] = { ...old, name: newName };
      // mover los logs al nuevo nombre
      setLogs((p) => {
        const copy = { ...p };
        if (copy[old.name]) {
          copy[newName] = copy[old.name];
          delete copy[old.name];
        }
        return copy;
      });
      // persistir el cambio en routine_days
      supabase
        .from("routine_days")
        .update({ exercises: arr as any })
        .eq("id", day.id);
      return arr;
    });
    setSwapping(null);
  }

  const allDone = useMemo(() => {
    if (!exercises.length) return false;
    return exercises.every((ex) => {
      const rows = logs[ex.name] ?? [];
      return rows.length > 0 && rows.every((r) => r.done);
    });
  }, [exercises, logs]);

  return (
    <>
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              Día {day.day_index} — {day.title}
            </SheetTitle>
            <SheetDescription>
              Registra peso y reps por serie. Se guarda automáticamente.
            </SheetDescription>
          </SheetHeader>

          <Accordion type="multiple" className="mt-4">
            {exercises.map((ex, i) => {
              const rows = logs[ex.name] ?? [];
              const doneCount = rows.filter((r) => r.done).length;
              const allEx = rows.length > 0 && doneCount === rows.length;
              return (
                <AccordionItem key={ex.name + i} value={ex.name}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between pr-2">
                      <div className="text-left">
                        <p className={`font-medium ${allEx ? "text-success line-through" : ""}`}>
                          {ex.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ex.muscle} · {ex.sets}×{ex.reps} · {ex.rest_seconds}s
                        </p>
                      </div>
                      <Badge variant={allEx ? "default" : "outline"} className="ml-2">
                        {doneCount}/{rows.length || ex.sets}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[40px_1fr_1fr_40px] items-center gap-2 text-xs uppercase text-muted-foreground">
                        <span>Set</span>
                        <span>Kg</span>
                        <span>Reps</span>
                        <span className="text-center">✓</span>
                      </div>
                      {rows.map((row, idx) => (
                        <div
                          key={idx}
                          className={`grid grid-cols-[40px_1fr_1fr_40px] items-center gap-2 rounded-lg p-1 ${
                            row.done ? "bg-success/5" : ""
                          }`}
                        >
                          <span className="text-center font-display font-bold">{idx + 1}</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={row.weight ?? ""}
                            onChange={(e) =>
                              updateSet(ex.name, idx, {
                                weight: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="h-10 text-center text-base"
                            placeholder="0"
                          />
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={row.reps ?? ""}
                            onChange={(e) =>
                              updateSet(ex.name, idx, {
                                reps: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="h-10 text-center text-base"
                            placeholder="0"
                          />
                          <div className="flex justify-center">
                            <Checkbox
                              checked={row.done}
                              onCheckedChange={(v) =>
                                updateSet(ex.name, idx, { done: !!v })
                              }
                              className="h-6 w-6"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => setSwapping({ index: i, muscle: ex.muscle })}
                      >
                        <Replace className="h-4 w-4" /> Cambiar ejercicio
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="sticky bottom-0 mt-6 -mx-6 border-t border-border bg-background px-6 py-4">
            <Button
              onClick={completeSession}
              disabled={completing || !sessionId}
              className="w-full"
              variant={allDone ? "default" : "secondary"}
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              {allDone ? "Cerrar sesión y sumar a la racha" : "Marcar día como hecho"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {swapping && (
        <SwapExerciseDialog
          muscle={swapping.muscle}
          library={library}
          currentNames={exercises.map((e) => e.name)}
          onPick={(name) => swapExercise(name)}
          onClose={() => setSwapping(null)}
        />
      )}
    </>
  );
}

function SwapExerciseDialog({
  muscle,
  library,
  currentNames,
  onPick,
  onClose,
}: {
  muscle: string;
  library: LibraryExercise[];
  currentNames: string[];
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const alternatives = library.filter(
    (e) => e.muscle_group === muscle && !currentNames.includes(e.name),
  );
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambiar ejercicio — {muscle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {alternatives.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onPick(ex.name)}
              className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <span className="font-medium">{ex.name}</span>
              {ex.is_compound && (
                <Badge variant="outline" className="text-[10px]">
                  Compuesto
                </Badge>
              )}
            </button>
          ))}
          {alternatives.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay más alternativas para {muscle}.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getMondayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
