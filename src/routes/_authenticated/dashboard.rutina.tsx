import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/rutina")({
  component: RutinaPage,
});

const SPLITS: Record<number, { title: string; groups: string[] }[]> = {
  1: [{ title: "Full Body", groups: ["Pecho", "Espalda", "Piernas", "Hombros", "Core"] }],
  2: [
    { title: "Tren superior", groups: ["Pecho", "Espalda", "Hombros", "Brazos"] },
    { title: "Tren inferior", groups: ["Cuádriceps", "Femoral", "Glúteo", "Pantorrilla"] },
  ],
  3: [
    { title: "Push (empuje)", groups: ["Pecho", "Hombros", "Tríceps"] },
    { title: "Pull (jalón)", groups: ["Espalda", "Bíceps"] },
    { title: "Pierna", groups: ["Cuádriceps", "Femoral", "Glúteo"] },
  ],
  4: [
    { title: "Tren superior A", groups: ["Pecho", "Espalda"] },
    { title: "Tren inferior A", groups: ["Cuádriceps", "Glúteo"] },
    { title: "Tren superior B", groups: ["Hombros", "Brazos"] },
    { title: "Tren inferior B", groups: ["Femoral", "Pantorrilla"] },
  ],
  5: [
    { title: "Pecho", groups: ["Pecho", "Tríceps"] },
    { title: "Espalda", groups: ["Espalda", "Bíceps"] },
    { title: "Pierna", groups: ["Cuádriceps", "Femoral", "Glúteo"] },
    { title: "Hombros", groups: ["Hombros", "Trapecio"] },
    { title: "Brazos + Core", groups: ["Bíceps", "Tríceps", "Core"] },
  ],
  6: [
    { title: "Push A", groups: ["Pecho", "Hombros", "Tríceps"] },
    { title: "Pull A", groups: ["Espalda", "Bíceps"] },
    { title: "Pierna A", groups: ["Cuádriceps", "Glúteo"] },
    { title: "Push B", groups: ["Hombros", "Pecho", "Tríceps"] },
    { title: "Pull B", groups: ["Espalda", "Trapecio", "Bíceps"] },
    { title: "Pierna B", groups: ["Femoral", "Glúteo", "Pantorrilla"] },
  ],
  7: [
    { title: "Pecho", groups: ["Pecho"] },
    { title: "Espalda", groups: ["Espalda"] },
    { title: "Pierna", groups: ["Cuádriceps", "Femoral"] },
    { title: "Hombros", groups: ["Hombros"] },
    { title: "Brazos", groups: ["Bíceps", "Tríceps"] },
    { title: "Glúteo + Femoral", groups: ["Glúteo", "Femoral"] },
    { title: "Core + Cardio", groups: ["Core", "Cardio"] },
  ],
};

function RutinaPage() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

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

  async function generateRoutine() {
    if (!nutrition?.training_days_per_week) {
      toast.error("Primero completa el formulario nutricional.");
      return;
    }
    setGenerating(true);
    const days = nutrition.training_days_per_week;
    const template = SPLITS[days] ?? SPLITS[3];
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // deactivate old routines
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

    if (error || !newRoutine) {
      setGenerating(false);
      toast.error("No se pudo crear la rutina");
      return;
    }

    const rows = template.map((t, i) => ({
      routine_id: newRoutine.id,
      day_index: i + 1,
      title: t.title,
      muscle_groups: t.groups,
      exercises: [],
    }));
    await supabase.from("routine_days").insert(rows);

    setGenerating(false);
    toast.success(`Rutina de ${days} días generada`);
    qc.invalidateQueries({ queryKey: ["active_routine"] });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Tu rutina</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generada según los días que elegiste en el formulario nutricional.
          </p>
        </div>
        <Button onClick={generateRoutine} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {routine ? "Regenerar" : "Generar rutina"}
        </Button>
      </div>

      {!nutrition?.training_days_per_week && (
        <Card className="flex items-start gap-3 border-warning/40 bg-warning/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
          <div className="text-sm">
            Necesitas indicar cuántos días entrenas en el{" "}
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(routine.routine_days ?? [])
              .sort((a: any, b: any) => a.day_index - b.day_index)
              .map((day: any) => (
                <Card key={day.id} className="overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Día {day.day_index}
                    </span>
                    <span className="font-display text-base font-bold">{day.title}</span>
                  </div>
                  <div className="space-y-2 p-5">
                    {day.muscle_groups.map((g: string) => (
                      <div key={g} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {g}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
