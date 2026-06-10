import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { calcAge, calcMacros, type Activity, type Gender, type Goal } from "@/lib/nutrition";

export const Route = createFileRoute("/_authenticated/dashboard/formulario")({
  component: FormularioPage,
});

const TOTAL_STEPS = 5;

function FormularioPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Profile fields (shared)
  const [gender, setGender] = useState<Gender | "">("");
  const [dob, setDob] = useState("");

  // Nutrition fields
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [activity, setActivity] = useState<Activity | "">("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [experience, setExperience] = useState<"beginner" | "intermediate" | "advanced" | "">("");
  const [trainingDays, setTrainingDays] = useState<string>("3");
  const [isPregnant, setIsPregnant] = useState(false);
  const [pregnancyWeeks, setPregnancyWeeks] = useState<string>("");
  const [isBreastfeeding, setIsBreastfeeding] = useState(false);
  const [allergiesText, setAllergiesText] = useState("");
  const [dietaryPref, setDietaryPref] = useState("");
  const [medical, setMedical] = useState("");

  // Hydrate from existing data so perfil <-> formulario stay sincronizados
  const { data: existing } = useQuery({
    queryKey: ["formulario_hydrate"],
    queryFn: async () => {
      const [{ data: p }, { data: n }] = await Promise.all([
        supabase.from("profiles").select("*").maybeSingle(),
        supabase.from("nutrition_profile").select("*").maybeSingle(),
      ]);
      return { p, n };
    },
  });

  useEffect(() => {
    if (!existing) return;
    if (existing.p) {
      setGender((existing.p.gender as Gender) ?? "");
      setDob(existing.p.date_of_birth ?? "");
    }
    if (existing.n) {
      setHeightCm(existing.n.height_cm?.toString() ?? "");
      setWeightKg(existing.n.weight_kg?.toString() ?? "");
      setTargetWeight(existing.n.target_weight_kg?.toString() ?? "");
      setActivity((existing.n.activity_level as Activity) ?? "");
      setGoal((existing.n.goal as Goal) ?? "");
      setExperience((existing.n.experience as any) ?? "");
      setTrainingDays(existing.n.training_days_per_week?.toString() ?? "3");
      setIsPregnant(!!existing.n.is_pregnant);
      setPregnancyWeeks(existing.n.pregnancy_weeks?.toString() ?? "");
      setIsBreastfeeding(!!existing.n.is_breastfeeding);
      setAllergiesText((existing.n.allergies ?? []).join(", "));
      setDietaryPref(existing.n.dietary_pref ?? "");
      setMedical(existing.n.medical_conditions ?? "");
    }
  }, [existing]);

  const canNext = (() => {
    switch (step) {
      case 1: return gender !== "" && dob !== "";
      case 2: return heightCm !== "" && weightKg !== "";
      case 3: return activity !== "" && goal !== "" && experience !== "";
      case 4:
        if (gender === "female" && isPregnant && !pregnancyWeeks) return false;
        return true;
      case 5: return true;
      default: return false;
    }
  })();

  async function handleSubmit() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const age = calcAge(dob);

    const macros = calcMacros({
      weightKg: w,
      heightCm: h,
      age,
      gender: gender as Gender,
      activity: activity as Activity,
      goal: goal as Goal,
      isPregnant: gender === "female" ? isPregnant : false,
      pregnancyWeeks: pregnancyWeeks ? parseInt(pregnancyWeeks) : null,
      isBreastfeeding: gender === "female" ? isBreastfeeding : false,
    });

    // 1) profiles
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      gender: gender as "male" | "female" | "other",
      date_of_birth: dob,
    });

    // 2) nutrition_profile
    const allergies = allergiesText
      .split(",").map((s) => s.trim()).filter(Boolean);
    const { error: nErr } = await supabase.from("nutrition_profile").upsert({
      user_id: userData.user.id,
      height_cm: h,
      weight_kg: w,
      target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
      activity_level: activity as Activity,
      goal: goal as Goal,
      experience: experience || null,
      training_days_per_week: parseInt(trainingDays),
      is_pregnant: gender === "female" ? isPregnant : false,
      pregnancy_weeks: gender === "female" && isPregnant && pregnancyWeeks ? parseInt(pregnancyWeeks) : null,
      is_breastfeeding: gender === "female" ? isBreastfeeding : false,
      allergies,
      dietary_pref: dietaryPref || null,
      medical_conditions: medical || null,
      ...macros,
      completed_at: new Date().toISOString(),
    });

    setSaving(false);

    if (pErr || nErr) {
      toast.error("No se pudo guardar el formulario");
      return;
    }
    toast.success("Plan calculado ✨");
    qc.invalidateQueries();
    navigate({ to: "/dashboard/alimentacion" });
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Paso {step} de {TOTAL_STEPS}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Formulario nutricional</h1>
        <Progress value={progress} className="mt-4" />
      </div>

      <Card className="space-y-6 p-6">
        {step === 1 && (
          <>
            <SectionTitle title="Datos personales" subtitle="Para calcular tu metabolismo basal." />

            <div className="space-y-2">
              <Label>Género biológico</Label>
              <RadioGroup value={gender} onValueChange={(v) => setGender(v as Gender)} className="grid grid-cols-3 gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <Label key={g} className={`cursor-pointer rounded-lg border p-3 text-center text-sm transition ${gender === g ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <RadioGroupItem value={g} className="sr-only" />
                    {g === "male" ? "Hombre" : g === "female" ? "Mujer" : "Otro"}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Fecha de nacimiento</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle title="Composición corporal" subtitle="Tu peso y altura actuales." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="h">Altura (cm)</Label>
                <Input id="h" type="number" min={100} max={230} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="170" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w">Peso (kg)</Label>
                <Input id="w" type="number" min={30} max={300} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="70" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tw">Peso objetivo (kg) <span className="text-muted-foreground">— opcional</span></Label>
              <Input id="tw" type="number" min={30} max={300} step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="65" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle title="Actividad y objetivo" subtitle="Define cómo entrenas y a dónde quieres llegar." />

            <div className="space-y-2">
              <Label>Nivel de actividad</Label>
              <Select value={activity} onValueChange={(v) => setActivity(v as Activity)}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentario (oficina, poco movimiento)</SelectItem>
                  <SelectItem value="light">Ligero (1-3 días ejercicio)</SelectItem>
                  <SelectItem value="moderate">Moderado (3-5 días)</SelectItem>
                  <SelectItem value="active">Alto (6-7 días)</SelectItem>
                  <SelectItem value="very_active">Muy alto (trabajo físico + entreno)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Objetivo</Label>
              <RadioGroup value={goal} onValueChange={(v) => setGoal(v as Goal)} className="grid grid-cols-2 gap-2">
                {([
                  ["lose", "Bajar grasa"],
                  ["maintain", "Mantener"],
                  ["gain", "Ganar músculo"],
                  ["recomp", "Recomposición"],
                ] as const).map(([v, label]) => (
                  <Label key={v} className={`cursor-pointer rounded-lg border p-3 text-center text-sm transition ${goal === v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <RadioGroupItem value={v} className="sr-only" />
                    {label}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Experiencia entrenando</Label>
              <Select value={experience} onValueChange={(v) => setExperience(v as any)}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Principiante (&lt; 6 meses)</SelectItem>
                  <SelectItem value="intermediate">Intermedio (6 m - 2 años)</SelectItem>
                  <SelectItem value="advanced">Avanzado (2+ años)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Días de entrenamiento por semana</Label>
              <div className="grid grid-cols-7 gap-2">
                {[1,2,3,4,5,6,7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrainingDays(d.toString())}
                    className={`rounded-lg border py-3 font-display text-lg font-bold transition ${
                      trainingDays === d.toString()
                        ? "border-primary bg-primary text-primary-foreground shadow-glow"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Generaremos automáticamente una rutina dividida según los días que elijas.
              </p>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <SectionTitle
              title="Salud y restricciones"
              subtitle={gender === "female" ? "Datos importantes para mujeres." : "Información médica relevante."}
            />

            {gender === "female" && (
              <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">¿Estás embarazada?</Label>
                    <p className="text-xs text-muted-foreground">Ajustaremos tus macros y evitaremos déficit calórico.</p>
                  </div>
                  <Switch checked={isPregnant} onCheckedChange={setIsPregnant} />
                </div>

                {isPregnant && (
                  <div className="space-y-2">
                    <Label htmlFor="pw">Semanas de embarazo</Label>
                    <Input
                      id="pw"
                      type="number"
                      min={1}
                      max={42}
                      value={pregnancyWeeks}
                      onChange={(e) => setPregnancyWeeks(e.target.value)}
                      placeholder="Ej. 18"
                    />
                    <p className="text-xs text-muted-foreground">
                      Añadimos energía extra desde el 2.º trimestre (+340 kcal) y aún más en el 3.º (+450 kcal).
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">¿Estás en lactancia?</Label>
                    <p className="text-xs text-muted-foreground">Sumamos +500 kcal diarias.</p>
                  </div>
                  <Switch checked={isBreastfeeding} onCheckedChange={setIsBreastfeeding} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="al">Alergias o intolerancias (separadas por coma)</Label>
              <Input id="al" value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} placeholder="lactosa, frutos secos…" />
            </div>

            <div className="space-y-2">
              <Label>Preferencia dietética</Label>
              <Select value={dietaryPref} onValueChange={setDietaryPref}>
                <SelectTrigger><SelectValue placeholder="Sin preferencia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="omnivore">Omnívora</SelectItem>
                  <SelectItem value="vegetarian">Vegetariana</SelectItem>
                  <SelectItem value="vegan">Vegana</SelectItem>
                  <SelectItem value="pescatarian">Pescetariana</SelectItem>
                  <SelectItem value="keto">Keto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="med">Condiciones médicas relevantes <span className="text-muted-foreground">— opcional</span></Label>
              <Input id="med" value={medical} onChange={(e) => setMedical(e.target.value)} placeholder="diabetes, hipertensión…" />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <SectionTitle title="Revisar y guardar" subtitle="Verifica que todo esté correcto." />
            <ReviewRow label="Género" value={gender === "male" ? "Hombre" : gender === "female" ? "Mujer" : "Otro"} />
            <ReviewRow label="Edad" value={`${calcAge(dob)} años`} />
            <ReviewRow label="Altura / Peso" value={`${heightCm} cm · ${weightKg} kg`} />
            <ReviewRow label="Objetivo" value={goal} />
            <ReviewRow label="Días/semana" value={`${trainingDays} días`} />
            {gender === "female" && isPregnant && (
              <ReviewRow label="Embarazo" value={`${pregnancyWeeks} semanas`} />
            )}
            <div className="rounded-lg border border-success/40 bg-success/5 p-4 text-sm">
              <CheckCircle2 className="mb-2 h-5 w-5 text-success" />
              Al guardar, calcularemos BMR, TDEE, calorías objetivo y macros (proteína / carbohidratos / grasas).
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Siguiente <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular plan"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
