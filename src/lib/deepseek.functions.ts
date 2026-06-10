import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * Cliente DeepSeek base
 * ============================================================ */

async function deepseekChat(opts: {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? "deepseek-chat",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0.5,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): any {
  // intenta JSON puro; si no, busca el primer bloque {...}
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("La IA no devolvió JSON válido");
    return JSON.parse(match[0]);
  }
}

/* ============================================================
 * Chat genérico (sigue disponible si quieres llamarlo desde UI)
 * ============================================================ */

const ChatInput = z.object({
  prompt: z.string().min(1).max(8000),
  system: z.string().max(2000).optional(),
  model: z.string().default("deepseek-chat"),
});

export const callDeepseek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");
    const content = await deepseekChat({
      apiKey,
      system: data.system ?? "Eres un asistente útil.",
      user: data.prompt,
      model: data.model,
    });
    return { content };
  });

/* ============================================================
 * Generación de RUTINA
 * Devuelve N días con ejercicios. Cuida el volumen semanal por
 * grupo (sets totales/semana) según los días solicitados.
 * ============================================================ */

const RoutineInput = z.object({
  days: z.number().int().min(1).max(7),
  goal: z.string(),
  level: z.string(),
  gender: z.string().optional(),
  limitations: z.string().optional(),
  // opcional: días que el usuario quiere regenerar (1-indexed). vacío = todos.
  regenerateDays: z.array(z.number().int().min(1).max(7)).optional(),
  // si se pasa, mantenemos los días no seleccionados
  previousDays: z
    .array(
      z.object({
        day_index: z.number(),
        title: z.string(),
        muscle_groups: z.array(z.string()),
        exercises: z.array(z.any()),
      }),
    )
    .optional(),
});

export const generateRoutineAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RoutineInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");

    const regen = data.regenerateDays ?? Array.from({ length: data.days }, (_, i) => i + 1);
    const keepDays = (data.previousDays ?? []).filter((d) => !regen.includes(d.day_index));

    const system = [
      "Eres un coach de fuerza e hipertrofia. Devuelves SIEMPRE un JSON válido en español.",
      "Reglas de volumen semanal por grupo muscular (sets totales/semana):",
      "- Pecho 10-18, Espalda 12-20, Cuádriceps 10-18, Femoral 8-14,",
      "  Glúteo 8-16, Hombros 10-16, Bíceps 8-14, Tríceps 8-14,",
      "  Pantorrilla 8-12, Core 6-12.",
      "Distribuye los sets entre los días seleccionados de forma equilibrada y respeta el split.",
      "Cada ejercicio: { name, muscle, sets, reps, rest_seconds, notes }.",
      "reps y rest deben ajustarse al objetivo: fuerza 3-6 reps 150-180s; hipertrofia 6-12 reps 60-120s; resistencia 12-20 reps 30-60s.",
      "Si hay limitaciones físicas, ELIMINA ejercicios que las agraven y usa alternativas.",
    ].join(" ");

    const user = `
Genera ÚNICAMENTE los días: ${regen.join(", ")} de una rutina de ${data.days} días/semana.
Objetivo: ${data.goal}. Nivel: ${data.level}. Género: ${data.gender ?? "no especificado"}.
Limitaciones físicas: ${data.limitations || "ninguna"}.

${
  keepDays.length
    ? `Estos días YA EXISTEN, NO los repitas y considéralos para no duplicar grupos:\n${JSON.stringify(
        keepDays.map((d) => ({ day: d.day_index, title: d.title, groups: d.muscle_groups })),
      )}`
    : ""
}

Devuelve JSON con esta forma exacta:
{
  "days": [
    {
      "day_index": <numero>,
      "title": "<nombre del día, ej. Push A>",
      "muscle_groups": ["Pecho", "Hombros", "Tríceps"],
      "exercises": [
        { "name": "Press banca", "muscle": "Pecho", "sets": 4, "reps": "8-10", "rest_seconds": 90, "notes": "" }
      ]
    }
  ]
}
No incluyas explicaciones fuera del JSON.
`.trim();

    const content = await deepseekChat({
      apiKey,
      system,
      user,
      json: true,
      temperature: 0.7,
    });
    const parsed = extractJson(content);
    const newDays = Array.isArray(parsed.days) ? parsed.days : [];

    // combina con los días que NO se regeneraron
    const merged = [
      ...keepDays,
      ...newDays.map((d: any) => ({
        day_index: Number(d.day_index),
        title: String(d.title ?? `Día ${d.day_index}`),
        muscle_groups: Array.isArray(d.muscle_groups) ? d.muscle_groups : [],
        exercises: Array.isArray(d.exercises) ? d.exercises : [],
      })),
    ].sort((a, b) => a.day_index - b.day_index);

    return { days: merged };
  });

/* ============================================================
 * Generación de PLAN DE COMIDAS
 * Respeta target de calorías y macros con tolerancia ±5%.
 * Reintenta hasta 2 veces si no encaja.
 * ============================================================ */

const MealInput = z.object({
  target_calories: z.number().positive(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fats_g: z.number().nonnegative(),
  dietary_pref: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  disliked_foods: z.array(z.string()).optional(),
  medical_conditions: z.string().optional(),
  meals_count: z.number().int().min(3).max(6).default(4),
});

export const generateMealPlanAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MealInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");

    const tolerance = 0.07; // 7% para que no se trabe
    const inRange = (val: number, target: number) =>
      Math.abs(val - target) <= target * tolerance;

    const system = [
      "Eres un nutricionista. Diseñas menús diarios EQUILIBRADOS y REALISTAS.",
      "Devuelves SIEMPRE JSON válido en español. Las cantidades en gramos deben ser realistas (ej. arroz cocido 150g, pollo 180g).",
      "Cada alimento debe tener kcal y macros calculados correctamente a partir de su porción.",
      "Suma TODAS las porciones y el total debe acercarse lo más posible a los objetivos del usuario (tolerancia ±5%).",
      "Respeta estrictamente alergias, alimentos no deseados y restricciones médicas.",
    ].join(" ");

    const userPrompt = (correction?: string) =>
      `
Crea un MENÚ DIARIO de ${data.meals_count} comidas para alcanzar EXACTAMENTE:
- Calorías: ${Math.round(data.target_calories)} kcal
- Proteína: ${Math.round(data.protein_g)} g
- Carbohidratos: ${Math.round(data.carbs_g)} g
- Grasas: ${Math.round(data.fats_g)} g

Preferencia dietética: ${data.dietary_pref || "omnívora"}.
Alergias: ${(data.allergies ?? []).join(", ") || "ninguna"}.
Alimentos que NO le gustan (no usar): ${(data.disliked_foods ?? []).join(", ") || "ninguno"}.
Condiciones médicas: ${data.medical_conditions || "ninguna"}.

${correction ?? ""}

Devuelve JSON con esta forma exacta:
{
  "meals": [
    {
      "name": "Desayuno",
      "time": "08:00",
      "items": [
        { "food": "Avena cocida", "grams": 80, "kcal": 304, "protein_g": 11, "carbs_g": 54, "fats_g": 6 }
      ],
      "subtotal": { "kcal": 0, "protein_g": 0, "carbs_g": 0, "fats_g": 0 }
    }
  ],
  "totals": { "kcal": 0, "protein_g": 0, "carbs_g": 0, "fats_g": 0 }
}
Calcula bien los subtotales y totales. No agregues texto fuera del JSON.
`.trim();

    let lastResult: any = null;
    let lastTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };

    for (let attempt = 0; attempt < 3; attempt++) {
      const correction =
        attempt === 0
          ? undefined
          : `INTENTO ANTERIOR FALLÓ. Tus totales fueron: kcal=${lastTotals.kcal}, P=${lastTotals.protein_g}g, C=${lastTotals.carbs_g}g, G=${lastTotals.fats_g}g. AJUSTA las porciones para acercarte a los objetivos.`;
      const content = await deepseekChat({
        apiKey,
        system,
        user: userPrompt(correction),
        json: true,
        temperature: 0.4,
      });
      const parsed = extractJson(content);
      lastResult = parsed;
      const t = parsed.totals ?? {};
      lastTotals = {
        kcal: Number(t.kcal ?? 0),
        protein_g: Number(t.protein_g ?? 0),
        carbs_g: Number(t.carbs_g ?? 0),
        fats_g: Number(t.fats_g ?? 0),
      };
      const okCal = inRange(lastTotals.kcal, data.target_calories);
      const okP = inRange(lastTotals.protein_g, data.protein_g);
      const okC = inRange(lastTotals.carbs_g, data.carbs_g);
      const okF = inRange(lastTotals.fats_g, data.fats_g);
      if (okCal && okP && okC && okF) break;
    }

    return {
      meals: Array.isArray(lastResult?.meals) ? lastResult.meals : [],
      totals: lastTotals,
      targets: {
        kcal: Math.round(data.target_calories),
        protein_g: Math.round(data.protein_g),
        carbs_g: Math.round(data.carbs_g),
        fats_g: Math.round(data.fats_g),
      },
    };
  });
