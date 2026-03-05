CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reactions"
  ON public.message_reactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all reactions on their messages"
  ON public.message_reactions
  FOR SELECT
  TO authenticated
  USING (true);