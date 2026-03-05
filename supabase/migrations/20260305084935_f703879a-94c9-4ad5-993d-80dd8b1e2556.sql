
-- Love Notes table
CREATE TABLE public.love_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'morning',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own love notes" ON public.love_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mood Entries table
CREATE TABLE public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  mood text NOT NULL,
  score integer NOT NULL DEFAULT 5,
  source text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mood entries" ON public.mood_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
