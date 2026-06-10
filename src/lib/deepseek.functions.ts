import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(8000),
  system: z.string().max(2000).optional(),
  model: z.string().default("deepseek-chat"),
});

/**
 * Llama a DeepSeek con la API key del servidor (secreto DEEPSEEK_API_KEY).
 * Pensado para generar rutinas y planes de comidas a partir del perfil del usuario.
 */
export const callDeepseek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: data.model,
        messages: [
          ...(data.system ? [{ role: "system", content: data.system }] : []),
          { role: "user", content: data.prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`DeepSeek ${res.status}: ${txt.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { content: json.choices?.[0]?.message?.content ?? "" };
  });
