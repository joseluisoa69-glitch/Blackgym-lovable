/**
 * Cálculos nutricionales:
 *  - BMR (Mifflin-St Jeor)
 *  - TDEE según nivel de actividad
 *  - Ajustes por embarazo / lactancia
 *  - Distribución de macros según objetivo
 */

export type Gender = "male" | "female" | "other";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain" | "recomp";

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
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
  goal: Goal;
  isPregnant?: boolean;
  pregnancyWeeks?: number | null;
  isBreastfeeding?: boolean;
}) {
  const bmr = calcBmr(opts.weightKg, opts.heightCm, opts.age, opts.gender);
  let tdee = bmr * ACTIVITY_FACTOR[opts.activity];

  // Ajustes embarazo
  if (opts.gender === "female" && opts.isPregnant && opts.pregnancyWeeks) {
    if (opts.pregnancyWeeks >= 28) tdee += 450;          // 3er trimestre
    else if (opts.pregnancyWeeks >= 14) tdee += 340;     // 2do trimestre
    // 1er trimestre: sin extra significativo
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
