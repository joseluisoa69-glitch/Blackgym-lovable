/**
 * Cálculos nutricionales:
 *  - BMR (Mifflin-St Jeor)
 *  - TDEE = BMR * factor de actividad cotidiana (NEAT) + energía de entrenamientos
 *  - Ajustes por embarazo / lactancia
 *  - Distribución de macros según objetivo
 */

export type Gender = "male" | "female" | "other";
// Actividad cotidiana SIN contar entrenamientos (los días de gym van aparte).
export type Activity = "sedentary" | "moderate" | "active";
export type Goal = "lose" | "maintain" | "gain" | "recomp";

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2, // oficina, mayormente sentado
  moderate: 1.45, // mucho caminar, recados, de pie buena parte del día
  active: 1.7, // trabajo físico (construcción, mensajería, etc.)
};

// kcal adicionales aproximadas por sesión de entrenamiento de fuerza ~60 min
const KCAL_PER_TRAINING_DAY = 250;

export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentario",
  moderate: "Moderado",
  active: "Activo",
};

export const ACTIVITY_DESC: Record<Activity, string> = {
  sedentary: "Trabajo de oficina, la mayor parte del día sentado, poco caminar.",
  moderate: "De pie o caminando varias horas, tareas domésticas, recados frecuentes.",
  active: "Trabajo físico: construcción, mensajería, mesero, agricultura, etc.",
};

export function calcAge(dob: string | null | undefined): number {
  if (!dob) return 30;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.max(15, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

export function calcBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") return base + 5;
  return base - 161;
}

export function calcMacros(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activity: Activity;
  trainingDaysPerWeek: number;
  goal: Goal;
  isPregnant?: boolean;
  pregnancyWeeks?: number | null;
  isBreastfeeding?: boolean;
}) {
  const bmr = calcBmr(opts.weightKg, opts.heightCm, opts.age, opts.gender);
  const trainingKcalPerDay = (opts.trainingDaysPerWeek * KCAL_PER_TRAINING_DAY) / 7;
  let tdee = bmr * ACTIVITY_FACTOR[opts.activity] + trainingKcalPerDay;

  // Ajustes embarazo
  if (opts.gender === "female" && opts.isPregnant && opts.pregnancyWeeks) {
    if (opts.pregnancyWeeks >= 28) tdee += 450;
    else if (opts.pregnancyWeeks >= 14) tdee += 340;
  }
  if (opts.gender === "female" && opts.isBreastfeeding) tdee += 500;

  // Ajustes por objetivo (no aplicar déficit en embarazo/lactancia)
  let target = tdee;
  const isProtected = opts.isPregnant || opts.isBreastfeeding;
  if (!isProtected) {
    if (opts.goal === "lose") target = tdee - 400;
    else if (opts.goal === "gain") target = tdee + 300;
    else if (opts.goal === "recomp") target = tdee - 150;
  }

  // Macros
  const proteinPerKg = opts.goal === "gain" ? 2.0 : opts.goal === "lose" ? 2.2 : 1.8;
  const protein = Math.round(opts.weightKg * proteinPerKg);
  const fats = Math.round((target * 0.27) / 9);
  const carbs = Math.max(50, Math.round((target - protein * 4 - fats * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_calories: Math.round(target),
    protein_g: protein,
    carbs_g: carbs,
    fats_g: fats,
  };
}
