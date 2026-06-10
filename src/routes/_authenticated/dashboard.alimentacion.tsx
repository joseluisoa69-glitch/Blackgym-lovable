import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Flame, Beef, Wheat, Droplet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/alimentacion")({
  component: AlimentacionPage,
});

function AlimentacionPage() {
  const { data: n, isLoading } = useQuery({
    queryKey: ["nutrition_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("nutrition_profile").select("*").maybeSingle();
      return data;
    },
  });

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

  const proteinCal = (n.protein_g ?? 0) * 4;
  const carbsCal = (n.carbs_g ?? 0) * 4;
  const fatsCal = (n.fats_g ?? 0) * 9;
  const total = proteinCal + carbsCal + fatsCal || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Tu plan de macros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculado a partir de tus datos. Ajustaremos cuando actualices el formulario.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-r from-primary/20 to-transparent p-6">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Calorías diarias</p>
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
          const cal = (m.label === "Grasas" ? m.value! * 9 : m.value! * 4);
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

      {(n.is_pregnant || n.is_breastfeeding) && (
        <Card className="border-warning/40 bg-warning/5 p-4 text-sm">
          ⚠️ Hemos ajustado tu plan por {n.is_pregnant ? "embarazo" : "lactancia"}. Consulta siempre con un
          profesional de la salud antes de cambios drásticos.
        </Card>
      )}
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
