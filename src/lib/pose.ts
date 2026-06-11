// Pose detection helpers built on @mediapipe/tasks-vision (browser-only).
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  type PoseLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    );
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  })();
  return landmarkerPromise;
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  result: PoseLandmarkerResult,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  if (!result.landmarks?.length) return;
  const drawer = new DrawingUtils(ctx);
  for (const landmarks of result.landmarks) {
    drawer.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: "#22c55e",
      lineWidth: 3,
    });
    drawer.drawLandmarks(landmarks, {
      color: "#f97316",
      lineWidth: 1,
      radius: 4,
    });
  }
}

// Angle (in degrees) at point b formed by a-b-c.
export function angleAt(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby);
  const magCB = Math.hypot(cbx, cby);
  if (!magAB || !magCB) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// MediaPipe pose landmark indices we care about
export const LM = {
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
} as const;

export type ExerciseKey = "squat" | "curl" | "pushup";

export function getExerciseAngle(
  key: ExerciseKey,
  landmarks: NormalizedLandmark[],
): number {
  switch (key) {
    case "squat":
      return angleAt(landmarks[LM.L_HIP], landmarks[LM.L_KNEE], landmarks[LM.L_ANKLE]);
    case "curl":
      return angleAt(landmarks[LM.L_SHOULDER], landmarks[LM.L_ELBOW], landmarks[LM.L_WRIST]);
    case "pushup":
      return angleAt(landmarks[LM.L_SHOULDER], landmarks[LM.L_ELBOW], landmarks[LM.L_WRIST]);
  }
}

// Thresholds for rep counting (down angle, up angle)
export const REP_THRESHOLDS: Record<ExerciseKey, { down: number; up: number }> = {
  squat: { down: 100, up: 160 },
  curl: { down: 60, up: 150 },
  pushup: { down: 90, up: 160 },
};

export type RepState = "up" | "down";

export class RepCounter {
  reps = 0;
  state: RepState = "up";
  minAngle = 180;
  maxAngle = 0;
  formScores: number[] = [];

  constructor(private key: ExerciseKey) {}

  update(angle: number): { reps: number; state: RepState } {
    const t = REP_THRESHOLDS[this.key];
    this.minAngle = Math.min(this.minAngle, angle);
    this.maxAngle = Math.max(this.maxAngle, angle);
    if (this.state === "up" && angle < t.down) {
      this.state = "down";
    } else if (this.state === "down" && angle > t.up) {
      this.state = "up";
      this.reps += 1;
      // Form score: how close min got to the target down angle (lower = better depth)
      const depthBonus = Math.max(0, 100 - Math.abs(this.minAngle - t.down));
      this.formScores.push(depthBonus);
      this.minAngle = 180;
      this.maxAngle = 0;
    }
    return { reps: this.reps, state: this.state };
  }

  averageFormScore(): number {
    if (!this.formScores.length) return 0;
    return Math.round(this.formScores.reduce((a, b) => a + b, 0) / this.formScores.length);
  }
}
