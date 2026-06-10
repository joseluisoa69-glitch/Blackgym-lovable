import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Flame, Beef, Wheat, Droplet, Sparkles, RefreshCw } from "lucide-react";
import { generateMealPlanAI } from "@/lib/deepseek.functions";

export const Route = createFileRoute("/_authenticated/dashboard/alimentacion")({
  component: AlimentacionPage,
});

function AlimentacionPage() {
  const qc = useQueryClient();
  const genMeal = useServerFn(generateMealPlanAI);
  const [generating, setGenerating] = useState(false);

  const { data: n, isLoading } = useQuery({
    queryKey: ["nutrition_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("nutrition_profile").select("*").maybeSingle();
      return data;
    },
  });

  const { data: mealPlan } = useQuery({
    queryKey: ["active_meal_plan"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  async function generateMenu() {
    if (!n?.target_calories) {
      toast.error("Primero completa el formulario nutricional.");
      return;
    }
    setGenerating(true);
    try {
      const result = await genMeal({
        data: {
          target_calories: Number(n.target_calories),
          protein_g: Number(n.protein_g ?? 0),
          carbs_g: Number(n.carbs_g ?? 0),
          fats_g: Number(n.fats_g ?? 0),
          dietary_pref: n.dietary_pref ?? undefined,
          allergies: (n.allergies ?? []) as string[],
          disliked_foods: ((n as any).disliked_foods ?? []) as string[],
          medical_conditions: n.medical_conditions ?? undefined,
          meals_count: 4,
        },
      });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from("meal_plans").update({ is_active: false }).eq("user_id", userData.user.id);
      await supabase.from("meal_plans").insert({
        user_id: userData.user.id,
        name: "Menú diario",
        total_calories: result.totals.kcal,
        protein_g: result.totals.protein_g,
        carbs_g: result.totals.carbs_g,
        fats_g: result.totals.fats_g,
        meals: result.meals,
        is_active: true,
      });

      toast.success("Menú generado ✨");
      qc.invalidateQueries({ queryKey: ["active_meal_plan"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el menú");
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!n?.completed_at) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <h2 className="font-display text-2xl font-bold">Aún no hay plan</h2>
        <p className="text-muted-foreground">
          Completa el formulario nutricional para calcular tus macros y calorías.
        </p>
        <Button asChild className="mx-auto">
          <Link to="/dashboard/formulario">Ir al formulario</Link>
        </Button>
      </Card>
    );
  }

  const macros = [
    { label: "Proteína", value: n.protein_g, unit: "g", icon: Beef, color: "oklch(0.62 0.22 25)" },
    { label: "Carbohidratos", value: n.carbs_g, unit: "g", icon: Wheat, color: "oklch(0.80 0.18 80)" },
    { label: "Grasas", value: n.fats_g, unit: "g", icon: Droplet, color: "oklch(0.70 0.18 145)" },
  ];

  const total =
    (n.protein_g ?? 0) * 4 + (n.carbs_g ?? 0) * 4 + (n.fats_g ?? 0) * 9 || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Tu plan nutricional</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calorías, macros y menú diario generado a la medida.
          </p>
        </div>
        <Button onClick={generateMenu} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : mealPlan ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {mealPlan ? "Regenerar menú" : "Generar menú con IA"}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-r from-primary/20 to-transparent p-6">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Calorías diarias objetivo</p>
              <p className="font-display text-4xl font-bold">
                {Math.round(n.target_calories ?? 0)} <span className="text-base text-muted-foreground">kcal</span>
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 p-6 sm:grid-cols-2">
          <Mini label="BMR" value={`${Math.round(n.bmr ?? 0)} kcal`} />
          <Mini label="TDEE" value={`${Math.round(n.tdee ?? 0)} kcal`} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {macros.map((m) => {
          const cal = m.label === "Grasas" ? (m.value ?? 0) * 9 : (m.value ?? 0) * 4;
          const pct = (cal / total) * 100;
          return (
            <Card key={m.label} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <m.icon className="h-5 w-5" style={{ color: m.color }} />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{m.label}</span>
              </div>
              <p className="font-display text-3xl font-bold">
                {Math.round(m.value ?? 0)}
                <span className="ml-1 text-base font-normal text-muted-foreground">{m.unit}</span>
              </p>
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% de las calorías</p>
            </Card>
          );
        })}
      </div>

      {mealPlan && <MealPlanView plan={mealPlan} target={{
        kcal: Math.round(n.target_calories ?? 0),
        protein_g: Math.round(n.protein_g ?? 0),
        carbs_g: Math.round(n.carbs_g ?? 0),
        fats_g: Math.round(n.fats_g ?? 0),
      }} />}

      {(n.is_pregnant || n.is_breastfeeding) && (
        <Card className="border-warning/40 bg-warning/5 p-4 text-sm">
          ⚠️ Hemos ajustado tu plan por {n.is_pregnant ? "embarazo" : "lactancia"}. Consulta siempre con un
          profesional de la salud antes de cambios drásticos.
        </Card>
      )}
    </div>
  );
}

function MealPlanView({ plan, target }: { plan: any; target: { kcal: number; protein_g: number; carbs_g: number; fats_g: number } }) {
  const totals = {
    kcal: Number(plan.total_calories ?? 0),
    protein_g: Number(plan.protein_g ?? 0),
    carbs_g: Number(plan.carbs_g ?? 0),
    fats_g: Number(plan.fats_g ?? 0),
  };
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const within = (a: number, b: number) => Math.abs(a - b) <= b * 0.07;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold">Menú diario</h2>
        <Badge variant={within(totals.kcal, target.kcal) ? "secondary" : "destructive"}>
          {within(totals.kcal, target.kcal) ? "Dentro de objetivo" : "Fuera de objetivo"}
        </Badge>
      </div>

      <Card className="grid gap-3 p-5 sm:grid-cols-4">
        <TotalsCell label="Calorías" actual={totals.kcal} target={target.kcal} unit="kcal" />
        <TotalsCell label="Proteína" actual={totals.protein_g} target={target.protein_g} unit="g" />
        <TotalsCell label="Carbohidr." actual={totals.carbs_g} target={target.carbs_g} unit="g" />
        <TotalsCell label="Grasas" actual={totals.fats_g} target={target.fats_g} unit="g" />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(plan.meals as any[]).map((meal, i) => (
          <Card key={i} className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
              <div>
                <p className="font-display text-base font-bold">{meal.name}</p>
                {meal.time && <p className="text-xs text-muted-foreground">{meal.time}</p>}
              </div>
              {meal.subtotal && (
                <div className="text-right text-xs">
                  <p className="font-display text-sm font-bold">{Math.round(meal.subtotal.kcal ?? 0)} kcal</p>
                  <p className="text-muted-foreground">
                    P{Math.round(meal.subtotal.protein_g ?? 0)} · C{Math.round(meal.subtotal.carbs_g ?? 0)} · G{Math.round(meal.subtotal.fats_g ?? 0)}
                  </p>
                </div>
              )}
            </div>
            <ul className="divide-y divide-border/40">
              {(meal.items ?? []).map((it: any, j: number) => (
                <li key={j} className="flex items-start justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium">{it.food}</p>
                    <p className="text-xs text-muted-foreground">{it.grams} g</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="font-display text-sm font-bold">{Math.round(it.kcal ?? 0)} kcal</p>
                    <p className="text-muted-foreground">
                      P{Math.round(it.protein_g ?? 0)} · C{Math.round(it.carbs_g ?? 0)} · G{Math.round(it.fats_g ?? 0)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Cobertura: {pct(totals.kcal, target.kcal)}% kcal · {pct(totals.protein_g, target.protein_g)}% proteína ·{" "}
        {pct(totals.carbs_g, target.carbs_g)}% carbohidratos · {pct(totals.fats_g, target.fats_g)}% grasas.
      </p>
    </section>
  );
}

function TotalsCell({ label, actual, target, unit }: { label: string; actual: number; target: number; unit: string }) {
  const diff = actual - target;
  const ok = Math.abs(diff) <= target * 0.07;
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">
        {Math.round(actual)} <span className="text-xs font-normal text-muted-foreground">/ {target} {unit}</span>
      </p>
      <p className={`text-xs ${ok ? "text-success" : "text-warning"}`}>
        {diff >= 0 ? "+" : ""}{Math.round(diff)} {unit}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
