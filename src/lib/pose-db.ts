// IndexedDB persistence for pose analysis sessions.
import { get, set, keys, del } from "idb-keyval";

export type PoseFrame = {
  t: number; // ms since session start
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  angle: number;
};

export type PoseSession = {
  id: string;
  exercise: string;
  createdAt: number;
  durationMs: number;
  reps: number;
  formScore: number;
  frames: PoseFrame[];
};

const PREFIX = "pose-session:";

export async function savePoseSession(session: PoseSession): Promise<void> {
  await set(PREFIX + session.id, session);
}

export async function listPoseSessions(): Promise<PoseSession[]> {
  const allKeys = (await keys()) as string[];
  const sessionKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith(PREFIX));
  const rows = await Promise.all(sessionKeys.map((k) => get<PoseSession>(k)));
  return rows
    .filter((r): r is PoseSession => !!r)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePoseSession(id: string): Promise<void> {
  await del(PREFIX + id);
}
