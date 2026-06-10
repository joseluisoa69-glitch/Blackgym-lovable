/**
 * Splits deterministas por número de días/semana.
 * Cada día define qué grupos musculares trabajar y cuántos ejercicios por grupo.
 */

export type ExerciseSlot = { muscle: string; count: number };
export type DayPlan = {
  day_index: number;
  title: string;
  muscle_groups: string[];
  slots: ExerciseSlot[];
};

export const SPLITS: Record<number, DayPlan[]> = {
  1: [
    {
      day_index: 1,
      title: "Full Body",
      muscle_groups: ["Pecho", "Espalda", "Cuádriceps", "Femoral", "Hombros", "Core"],
      slots: [
        { muscle: "Pecho", count: 1 },
        { muscle: "Espalda", count: 1 },
        { muscle: "Cuádriceps", count: 1 },
        { muscle: "Femoral", count: 1 },
        { muscle: "Hombros", count: 1 },
        { muscle: "Core", count: 1 },
      ],
    },
  ],
  2: [
    {
      day_index: 1,
      title: "Torso",
      muscle_groups: ["Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps"],
      slots: [
        { muscle: "Pecho", count: 2 },
        { muscle: "Espalda", count: 2 },
        { muscle: "Hombros", count: 1 },
        { muscle: "Bíceps", count: 1 },
        { muscle: "Tríceps", count: 1 },
      ],
    },
    {
      day_index: 2,
      title: "Piernas",
      muscle_groups: ["Cuádriceps", "Femoral", "Glúteo", "Pantorrilla", "Core"],
      slots: [
        { muscle: "Cuádriceps", count: 2 },
        { muscle: "Femoral", count: 1 },
        { muscle: "Glúteo", count: 1 },
        { muscle: "Pantorrilla", count: 1 },
        { muscle: "Core", count: 1 },
      ],
    },
  ],
  3: [
    {
      day_index: 1,
      title: "Pecho y Tríceps",
      muscle_groups: ["Pecho", "Tríceps"],
      slots: [
        { muscle: "Pecho", count: 4 },
        { muscle: "Tríceps", count: 2 },
      ],
    },
    {
      day_index: 2,
      title: "Espalda y Bíceps",
      muscle_groups: ["Espalda", "Bíceps"],
      slots: [
        { muscle: "Espalda", count: 4 },
        { muscle: "Bíceps", count: 2 },
      ],
    },
    {
      day_index: 3,
      title: "Piernas y Hombros",
      muscle_groups: ["Cuádriceps", "Femoral", "Glúteo", "Hombros"],
      slots: [
        { muscle: "Cuádriceps", count: 2 },
        { muscle: "Femoral", count: 1 },
        { muscle: "Glúteo", count: 1 },
        { muscle: "Hombros", count: 2 },
      ],
    },
  ],
  4: [
    {
      day_index: 1,
      title: "Pecho",
      muscle_groups: ["Pecho", "Core"],
      slots: [
        { muscle: "Pecho", count: 4 },
        { muscle: "Core", count: 1 },
      ],
    },
    {
      day_index: 2,
      title: "Espalda",
      muscle_groups: ["Espalda"],
      slots: [{ muscle: "Espalda", count: 5 }],
    },
    {
      day_index: 3,
      title: "Piernas",
      muscle_groups: ["Cuádriceps", "Femoral", "Glúteo", "Pantorrilla"],
      slots: [
        { muscle: "Cuádriceps", count: 2 },
        { muscle: "Femoral", count: 1 },
        { muscle: "Glúteo", count: 1 },
        { muscle: "Pantorrilla", count: 1 },
      ],
    },
    {
      day_index: 4,
      title: "Hombros, Bíceps y Tríceps",
      muscle_groups: ["Hombros", "Bíceps", "Tríceps"],
      slots: [
        { muscle: "Hombros", count: 2 },
        { muscle: "Bíceps", count: 2 },
        { muscle: "Tríceps", count: 2 },
      ],
    },
  ],
  5: [
    {
      day_index: 1,
      title: "Push A",
      muscle_groups: ["Pecho", "Hombros", "Tríceps"],
      slots: [
        { muscle: "Pecho", count: 2 },
        { muscle: "Hombros", count: 2 },
        { muscle: "Tríceps", count: 2 },
      ],
    },
    {
      day_index: 2,
      title: "Pull A",
      muscle_groups: ["Espalda", "Bíceps"],
      slots: [
        { muscle: "Espalda", count: 3 },
        { muscle: "Bíceps", count: 2 },
      ],
    },
    {
      day_index: 3,
      title: "Legs",
      muscle_groups: ["Cuádriceps", "Femoral", "Glúteo", "Pantorrilla"],
      slots: [
        { muscle: "Cuádriceps", count: 2 },
        { muscle: "Femoral", count: 1 },
        { muscle: "Glúteo", count: 1 },
        { muscle: "Pantorrilla", count: 1 },
      ],
    },
    {
      day_index: 4,
      title: "Push B",
      muscle_groups: ["Pecho", "Hombros", "Tríceps"],
      slots: [
        { muscle: "Pecho", count: 2 },
        { muscle: "Hombros", count: 2 },
        { muscle: "Tríceps", count: 2 },
      ],
    },
    {
      day_index: 5,
      title: "Pull B",
      muscle_groups: ["Espalda", "Bíceps"],
      slots: [
        { muscle: "Espalda", count: 3 },
        { muscle: "Bíceps", count: 2 },
      ],
    },
  ],
  6: [
    {
      day_index: 1,
      title: "Push A",
      muscle_groups: ["Pecho", "Hombros", "Tríceps"],
      slots: [
        { muscle: "Pecho", count: 2 },
        { muscle: "Hombros", count: 2 },
        { muscle: "Tríceps", count: 2 },
      ],
    },
    {
      day_index: 2,
      title: "Pull A",
      muscle_groups: ["Espalda", "Bíceps"],
      slots: [
        { muscle: "Espalda", count: 3 },
        { muscle: "Bíceps", count: 2 },
      ],
    },
    {
      day_index: 3,
      title: "Legs A",
      muscle_groups: ["Cuádriceps", "Femoral", "Pantorrilla"],
      slots: [
        { muscle: "Cuádriceps", count: 3 },
        { muscle: "Femoral", count: 1 },
        { muscle: "Pantorrilla", count: 1 },
      ],
    },
    {
      day_index: 4,
      title: "Push B",
      muscle_groups: ["Pecho", "Hombros", "Tríceps"],
      slots: [
        { muscle: "Pecho", count: 2 },
        { muscle: "Hombros", count: 2 },
        { muscle: "Tríceps", count: 2 },
      ],
    },
    {
      day_index: 5,
      title: "Pull B",
      muscle_groups: ["Espalda", "Bíceps"],
      slots: [
        { muscle: "Espalda", count: 3 },
        { muscle: "Bíceps", count: 2 },
      ],
    },
    {
      day_index: 6,
      title: "Legs B / Glúteo",
      muscle_groups: ["Glúteo", "Femoral", "Cuádriceps", "Core"],
      slots: [
        { muscle: "Glúteo", count: 2 },
        { muscle: "Femoral", count: 2 },
        { muscle: "Cuádriceps", count: 1 },
        { muscle: "Core", count: 1 },
      ],
    },
  ],
};

export type LibraryExercise = {
  id: string;
  name: string;
  muscle_group: string;
  is_compound: boolean | null;
};

export type ExerciseInstance = {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest_seconds: number;
};

/**
 * Recibe la biblioteca de ejercicios + el plan de un día y devuelve los ejercicios concretos.
 * Prioriza compuestos primero, evita repetir entre los slots.
 */
export function pickExercisesForDay(
  library: LibraryExercise[],
  day: DayPlan,
  usedNames: Set<string> = new Set(),
): ExerciseInstance[] {
  const out: ExerciseInstance[] = [];
  for (const slot of day.slots) {
    const candidates = library
      .filter((e) => e.muscle_group === slot.muscle && !usedNames.has(e.name))
      .sort((a, b) => Number(b.is_compound) - Number(a.is_compound));
    // mezcla ligera para que no salga exactamente el mismo orden siempre
    const pool = [...candidates];
    const chosen: LibraryExercise[] = [];
    for (let i = 0; i < slot.count && pool.length > 0; i++) {
      const idx = i === 0 ? 0 : Math.floor(Math.random() * Math.min(pool.length, 3));
      chosen.push(pool.splice(idx, 1)[0]);
    }
    for (const ex of chosen) {
      usedNames.add(ex.name);
      out.push({
        name: ex.name,
        muscle: ex.muscle_group,
        sets: ex.is_compound ? 4 : 3,
        reps: ex.is_compound ? "6-8" : "10-12",
        rest_seconds: ex.is_compound ? 120 : 60,
      });
    }
  }
  return out;
}

export function buildRoutine(
  library: LibraryExercise[],
  daysPerWeek: number,
): { day_index: number; title: string; muscle_groups: string[]; exercises: ExerciseInstance[] }[] {
  const plan = SPLITS[Math.min(6, Math.max(1, daysPerWeek))] ?? SPLITS[3];
  const used = new Set<string>();
  return plan.map((day) => ({
    day_index: day.day_index,
    title: day.title,
    muscle_groups: day.muscle_groups,
    exercises: pickExercisesForDay(library, day, used),
  }));
}
