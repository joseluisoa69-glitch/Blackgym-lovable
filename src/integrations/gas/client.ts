/**
 * Google Apps Script (GAS) — cliente listo.
 *
 * Despliega tu script como Web App (doPost / doGet) y guarda la URL en:
 *   VITE_GAS_WEBAPP_URL  (para llamadas desde el cliente)
 * o como secreto del servidor:
 *   GAS_WEBAPP_URL
 *
 * Uso:
 *   import { callGas } from "@/integrations/gas/client";
 *   const data = await callGas("addRow", { sheet: "Logs", values: [...] });
 */

const GAS_URL =
  (typeof window !== "undefined" ? import.meta.env.VITE_GAS_WEBAPP_URL : undefined) ?? "";

export const isGasConfigured = Boolean(GAS_URL);

export async function callGas<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  if (!GAS_URL) throw new Error("GAS no configurado. Define VITE_GAS_WEBAPP_URL.");
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`GAS error ${res.status}`);
  return (await res.json()) as T;
}
