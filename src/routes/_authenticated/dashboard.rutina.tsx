import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { generateRoutineAI } from "@/lib/deepseek.functions";

export const Route = createFileRoute("/_authenticated/dashboard/rutina")({
  component: RutinaPage,
});

type DayShape = {
  day_index: number;
  title: string;
  muscle_groups: string[];
  exercises: any[];
};

function RutinaPage() {
  const qc = useQueryClient();
  const genAI = useServerFn(generateRoutineAI);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const { data: nutrition } = useQuery({
    queryKey: ["nutrition_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("nutrition_profile").select("*").maybeSingle();
      return data;
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

  async function generate(regenerateDays?: number[]) {
    if (!nutrition?.training_days_per_week) {
      toast.error("Primero completa el formulario nutricional.");
      return;
    }
    setGenerating(true);
    try {
      const days = nutrition.training_days_per_week;
      const previousDays: DayShape[] =
        (routine?.routine_days ?? []).map((d: any) => ({
          day_index: d.day_index,
          title: d.title,
          muscle_groups: d.muscle_groups ?? [],
          exercises: d.exercises ?? [],
        }));

      const ai = await genAI({
        data: {
          days,
          goal: String(nutrition.goal ?? "maintain"),
          level: String(nutrition.experience ?? "beginner"),
          gender: undefined,
          limitations: (nutrition as any).physical_limitations ?? "",
          regenerateDays: regenerateDays && regenerateDays.length ? regenerateDays : undefined,
          previousDays: previousDays.length ? previousDays : undefined,
        },
      });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // desactiva anteriores y crea nueva activa
      await supabase.from("routines").update({ is_active: false }).eq("user_id", userData.user.id);
      const { data: newRoutine, error } = await supabase
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
      if (error || !newRoutine) throw error ?? new Error("No se pudo crear rutina");

      const rows = ai.days.map((d) => ({
        routine_id: newRoutine.id,
        day_index: d.day_index,
        title: d.title,
        muscle_groups: d.muscle_groups,
        exercises: d.exercises,
      }));
      await supabase.from("routine_days").insert(rows);

      toast.success(
        regenerateDays && regenerateDays.length
          ? `Días regenerados: ${regenerateDays.join(", ")}`
          : `Rutina de ${days} días generada`,
      );
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["active_routine"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar la rutina");
    } finally {
      setGenerating(false);
    }
  }

  function toggleDay(i: number) {
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const days = (routine?.routine_days ?? []).sort((a: any, b: any) => a.day_index - b.day_index);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Tu rutina</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generada por IA según tus días, objetivo y limitaciones físicas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {routine && selected.length > 0 && (
            <Button variant="outline" onClick={() => generate(selected)} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerar {selected.length} día{selected.length > 1 ? "s" : ""}
            </Button>
          )}
          <Button onClick={() => generate()} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {routine ? "Regenerar todo" : "Generar rutina"}
          </Button>
        </div>
      </div>

      {!nutrition?.training_days_per_week && (
        <Card className="flex items-start gap-3 border-warning/40 bg-warning/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
          <div className="text-sm">
            Necesitas indicar cuántos días vas al gym en el{" "}
            <Link to="/dashboard/formulario" className="font-semibold text-primary underline">
              formulario nutricional
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

          {days.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Marca los días que no te gustan y pulsa <strong>Regenerar N días</strong>. La IA cuidará el volumen semanal total.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {days.map((day: any) => {
              const isSel = selected.includes(day.day_index);
              return (
                <Card
                  key={day.id}
                  className={`overflow-hidden p-0 transition ${isSel ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggleDay(day.day_index)}
                        aria-label={`Seleccionar Día ${day.day_index}`}
                      />
                      <div>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Día {day.day_index}
                        </span>
                        <div className="font-display text-base font-bold">{day.title}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {day.muscle_groups.slice(0, 3).map((g: string) => (
                        <Badge key={g} variant="outline" className="text-[10px]">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    {(day.exercises ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin ejercicios — regenera para llenar.</p>
                    )}
                    {(day.exercises ?? []).map((ex: any, i: number) => (
                      <div key={i} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{ex.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.muscle} {ex.notes ? `· ${ex.notes}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs">
                          <p className="font-display text-sm font-bold">{ex.sets}×{ex.reps}</p>
                          <p className="text-muted-foreground">{ex.rest_seconds}s desc.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
