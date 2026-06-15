
ALTER TABLE public.nutrition_profile
  ADD COLUMN IF NOT EXISTS equipment_pref text NOT NULL DEFAULT 'both'
  CHECK (equipment_pref IN ('free','machines','both'));

INSERT INTO public.exercise_library (name, muscle_group, equipment, difficulty, is_compound) VALUES
  ('Peck deck (contractor de pecho)', 'Pecho', 'Máquina', 'beginner', false),
  ('Crossover en polea alta', 'Pecho', 'Polea', 'intermediate', false),
  ('Front Pulldown Hammer Strength', 'Espalda', 'Máquina', 'intermediate', true),
  ('Dominadas asistidas en máquina', 'Espalda', 'Máquina', 'beginner', true),
  ('Hiperextensión lumbar', 'Espalda', 'Máquina', 'beginner', false),
  ('Hack squat', 'Cuádriceps', 'Máquina', 'intermediate', true),
  ('V-Squat', 'Cuádriceps', 'Máquina', 'intermediate', true),
  ('Sentadilla Sissy', 'Cuádriceps', 'Peso corporal', 'intermediate', false),
  ('Sentadilla en Smith', 'Cuádriceps', 'Máquina', 'intermediate', true),
  ('Hip Thrust en Smith', 'Glúteo', 'Máquina', 'intermediate', true),
  ('Patada de glúteo en máquina', 'Glúteo', 'Máquina', 'beginner', false),
  ('Aductor en máquina', 'Glúteo', 'Máquina', 'beginner', false),
  ('Predicador Scott para tríceps', 'Tríceps', 'Máquina', 'intermediate', false),
  ('Fondos asistidos en máquina', 'Tríceps', 'Máquina', 'beginner', true),
  ('Deslizador abdominal en riel', 'Core', 'Máquina', 'intermediate', false),
  ('Saltar la cuerda', 'Cardio', 'Cuerda', 'beginner', false),
  ('Caminadora', 'Cardio', 'Máquina', 'beginner', false),
  ('Escaladora', 'Cardio', 'Máquina', 'intermediate', false),
  ('Elíptica', 'Cardio', 'Máquina', 'beginner', false)
ON CONFLICT DO NOTHING;
