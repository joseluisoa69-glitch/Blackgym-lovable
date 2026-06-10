
-- 1) Diet budget en nutrition_profile
ALTER TABLE public.nutrition_profile
  ADD COLUMN IF NOT EXISTS diet_budget TEXT DEFAULT 'medium';

-- 2) Catálogo público de ejercicios
CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  difficulty TEXT DEFAULT 'intermediate',
  is_compound BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercise_library TO authenticated, anon;
GRANT ALL ON public.exercise_library TO service_role;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_library readable" ON public.exercise_library FOR SELECT USING (true);
CREATE INDEX exercise_library_muscle_idx ON public.exercise_library(muscle_group);

-- 3) Sesiones de entrenamiento
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  day_index INTEGER NOT NULL,
  day_title TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX workout_sessions_user_date_idx ON public.workout_sessions(user_id, session_date DESC);
CREATE TRIGGER workout_sessions_touch BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) Registro de ejercicios por sesión (series en jsonb)
CREATE TABLE public.exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs TO authenticated;
GRANT ALL ON public.exercise_logs TO service_role;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise logs" ON public.exercise_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exercise_logs_user_ex_idx ON public.exercise_logs(user_id, exercise_name, created_at DESC);
CREATE INDEX exercise_logs_session_idx ON public.exercise_logs(session_id);
CREATE TRIGGER exercise_logs_touch BEFORE UPDATE ON public.exercise_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Racha semanal
CREATE TABLE public.weekly_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  target_days INTEGER NOT NULL,
  completed_days INTEGER NOT NULL DEFAULT 0,
  achieved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_streaks TO authenticated;
GRANT ALL ON public.weekly_streaks TO service_role;
ALTER TABLE public.weekly_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streaks" ON public.weekly_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER weekly_streaks_touch BEFORE UPDATE ON public.weekly_streaks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) Seed de biblioteca de ejercicios
INSERT INTO public.exercise_library (name, muscle_group, equipment, difficulty, is_compound) VALUES
-- Pecho
('Press banca con barra','Pecho','Barra','intermediate',true),
('Press banca con mancuernas','Pecho','Mancuernas','intermediate',true),
('Press inclinado con barra','Pecho','Barra','intermediate',true),
('Press inclinado con mancuernas','Pecho','Mancuernas','intermediate',true),
('Press declinado','Pecho','Barra','intermediate',true),
('Aperturas con mancuernas','Pecho','Mancuernas','beginner',false),
('Aperturas en polea (cruces)','Pecho','Polea','beginner',false),
('Fondos en paralelas','Pecho','Peso corporal','advanced',true),
('Press en máquina','Pecho','Máquina','beginner',true),
('Flexiones','Pecho','Peso corporal','beginner',true),
-- Espalda
('Dominadas','Espalda','Peso corporal','advanced',true),
('Jalón al pecho','Espalda','Polea','beginner',true),
('Remo con barra','Espalda','Barra','intermediate',true),
('Remo con mancuerna','Espalda','Mancuernas','beginner',true),
('Remo en polea baja','Espalda','Polea','beginner',true),
('Remo en máquina','Espalda','Máquina','beginner',true),
('Peso muerto','Espalda','Barra','advanced',true),
('Pull over con mancuerna','Espalda','Mancuernas','intermediate',false),
('Encogimientos (trapecio)','Espalda','Mancuernas','beginner',false),
-- Piernas
('Sentadilla con barra','Cuádriceps','Barra','intermediate',true),
('Sentadilla frontal','Cuádriceps','Barra','advanced',true),
('Prensa de piernas','Cuádriceps','Máquina','beginner',true),
('Extensión de cuádriceps','Cuádriceps','Máquina','beginner',false),
('Zancadas con mancuernas','Cuádriceps','Mancuernas','intermediate',true),
('Sentadilla búlgara','Cuádriceps','Mancuernas','intermediate',true),
('Hack squat','Cuádriceps','Máquina','intermediate',true),
('Peso muerto rumano','Femoral','Barra','intermediate',true),
('Curl femoral acostado','Femoral','Máquina','beginner',false),
('Curl femoral sentado','Femoral','Máquina','beginner',false),
('Hip thrust','Glúteo','Barra','intermediate',true),
('Patada de glúteo en polea','Glúteo','Polea','beginner',false),
('Abductor en máquina','Glúteo','Máquina','beginner',false),
('Elevación de talones de pie','Pantorrilla','Máquina','beginner',false),
('Elevación de talones sentado','Pantorrilla','Máquina','beginner',false),
-- Hombros
('Press militar con barra','Hombros','Barra','intermediate',true),
('Press militar con mancuernas','Hombros','Mancuernas','intermediate',true),
('Press Arnold','Hombros','Mancuernas','intermediate',true),
('Elevaciones laterales','Hombros','Mancuernas','beginner',false),
('Elevaciones frontales','Hombros','Mancuernas','beginner',false),
('Pájaros (rear delt)','Hombros','Mancuernas','beginner',false),
('Face pull','Hombros','Polea','beginner',false),
('Press en máquina hombro','Hombros','Máquina','beginner',true),
-- Bíceps
('Curl con barra','Bíceps','Barra','beginner',false),
('Curl con mancuernas alterno','Bíceps','Mancuernas','beginner',false),
('Curl martillo','Bíceps','Mancuernas','beginner',false),
('Curl predicador','Bíceps','Barra Z','intermediate',false),
('Curl en polea','Bíceps','Polea','beginner',false),
('Curl concentrado','Bíceps','Mancuerna','beginner',false),
-- Tríceps
('Press francés','Tríceps','Barra Z','intermediate',false),
('Extensión en polea (cuerda)','Tríceps','Polea','beginner',false),
('Extensión en polea (barra)','Tríceps','Polea','beginner',false),
('Fondos entre bancos','Tríceps','Peso corporal','beginner',true),
('Press cerrado','Tríceps','Barra','intermediate',true),
('Patada de tríceps','Tríceps','Mancuerna','beginner',false),
-- Core
('Plancha','Core','Peso corporal','beginner',false),
('Crunch abdominal','Core','Peso corporal','beginner',false),
('Elevación de piernas colgado','Core','Peso corporal','intermediate',false),
('Rueda abdominal','Core','Rueda','advanced',false),
('Russian twist','Core','Peso corporal','beginner',false),
('Crunch en polea','Core','Polea','beginner',false);
