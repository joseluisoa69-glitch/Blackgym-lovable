import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  CircleStop,
  Download,
  Loader2,
  Trash2,
  Video,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPoseLandmarker,
  drawPose,
  getExerciseAngle,
  RepCounter,
  type ExerciseKey,
} from "@/lib/pose";
import {
  savePoseSession,
  listPoseSessions,
  deletePoseSession,
  type PoseSession,
  type PoseFrame,
} from "@/lib/pose-db";

export const Route = createFileRoute("/_authenticated/dashboard/camara")({
  component: CamaraPage,
});

const EXERCISES: Array<{ key: ExerciseKey; label: string }> = [
  { key: "squat", label: "Sentadilla" },
  { key: "curl", label: "Curl de bíceps" },
  { key: "pushup", label: "Flexión" },
];

function CamaraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<PoseFrame[]>([]);
  const counterRef = useRef<RepCounter | null>(null);
  const sessionStartRef = useRef<number>(0);

  const [exercise, setExercise] = useState<ExerciseKey>("squat");
  const [loading, setLoading] = useState(true);
  const [streamOn, setStreamOn] = useState(false);
  const [detected, setDetected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reps, setReps] = useState(0);
  const [angle, setAngle] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PoseSession[]>([]);

  // Load history
  async function refreshSessions() {
    setSessions(await listPoseSessions());
  }
  useEffect(() => {
    refreshSessions();
  }, []);

  // Start camera + pose loop
  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        const landmarker = await getPoseLandmarker();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (stop) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d")!;
        setStreamOn(true);
        setLoading(false);

        let lastTs = -1;
        const loop = () => {
          if (stop) return;
          const ts = performance.now();
          if (ts !== lastTs && video.readyState >= 2) {
            lastTs = ts;
            const result = landmarker.detectForVideo(video, ts);
            drawPose(ctx, result, canvas.width, canvas.height);
            const lm = result.landmarks?.[0];
            if (lm) {
              setDetected(true);
              const a = getExerciseAngle(exerciseRef.current, lm);
              setAngle(Math.round(a));
              if (counterRef.current) {
                const { reps: r } = counterRef.current.update(a);
                setReps(r);
              }
              if (recorderRef.current?.state === "recording") {
                framesRef.current.push({
                  t: ts - sessionStartRef.current,
                  landmarks: lm.map((p) => ({
                    x: p.x,
                    y: p.y,
                    z: p.z,
                    visibility: p.visibility,
                  })),
                  angle: a,
                });
              }
            } else {
              setDetected(false);
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e: any) {
        setLoading(false);
        toast.error(e?.message ?? "No se pudo acceder a la cámara");
      }
    })();

    return () => {
      stop = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep exercise in a ref so the long-lived rAF loop sees the latest value
  const exerciseRef = useRef<ExerciseKey>(exercise);
  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  function startRecording() {
    if (!canvasRef.current) return;
    if (!detected) {
      toast.error("Acércate más a la cámara primero");
      return;
    }
    counterRef.current = new RepCounter(exercise);
    framesRef.current = [];
    chunksRef.current = [];
    setReps(0);
    setVideoUrl(null);
    sessionStartRef.current = performance.now();

    // Stream video at 30fps with overlay
    const stream = (canvasRef.current as any).captureStream(30) as MediaStream;
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);

      const cnt = counterRef.current!;
      const session: PoseSession = {
        id: crypto.randomUUID(),
        exercise: exerciseRef.current,
        createdAt: Date.now(),
        durationMs: Math.round(performance.now() - sessionStartRef.current),
        reps: cnt.reps,
        formScore: cnt.averageFormScore(),
        frames: framesRef.current,
      };
      await savePoseSession(session);
      await refreshSessions();
      toast.success(`Guardado: ${cnt.reps} reps · forma ${cnt.averageFormScore()}/100`);
    };
    rec.start(250);
    recorderRef.current = rec;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function download() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `blackgym-${exercise}-${Date.now()}.webm`;
    a.click();
  }

  async function removeSession(id: string) {
    await deletePoseSession(id);
    await refreshSessions();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Cámara · Forma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detección de pose en vivo, conteo de reps y grabación con overlay. Todo se procesa
          localmente.
        </p>
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={exercise}
            onValueChange={(v) => setExercise(v as ExerciseKey)}
            disabled={recording}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXERCISES.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {streamOn &&
            (detected ? (
              <Badge className="gap-1 bg-success/20 text-success">
                <CheckCircle2 className="h-3 w-3" /> Cuerpo detectado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-warning">
                <AlertCircle className="h-3 w-3" /> Acércate más
              </Badge>
            ))}

          <Badge variant="outline">Ángulo: {angle}°</Badge>
          <Badge variant="outline">Reps: {reps}</Badge>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando modelo de pose…
            </div>
          )}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          {recording && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-destructive-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <Button onClick={startRecording} disabled={!streamOn || loading}>
              <Video className="h-4 w-4" /> Iniciar grabación
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive">
              <CircleStop className="h-4 w-4" /> Detener
            </Button>
          )}
          {videoUrl && (
            <Button onClick={download} variant="outline">
              <Download className="h-4 w-4" /> Descargar video
            </Button>
          )}
        </div>

        {videoUrl && (
          <video src={videoUrl} controls className="w-full rounded-lg" />
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-display text-xl font-bold">Historial local</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Sesiones guardadas en este dispositivo (IndexedDB).
        </p>
        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay sesiones grabadas.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">{s.exercise}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()} ·{" "}
                    {(s.durationMs / 1000).toFixed(1)}s · {s.frames.length} frames
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{s.reps} reps</Badge>
                  <Badge variant="outline">Forma {s.formScore}/100</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSession(s.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
