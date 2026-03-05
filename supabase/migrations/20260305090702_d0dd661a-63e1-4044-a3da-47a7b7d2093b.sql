
-- Drop the existing ALL policy and replace with explicit per-operation policies for authenticated users only
DROP POLICY IF EXISTS "Users manage own session" ON public.chat_sessions;

-- SELECT: only authenticated users can read their own sessions
CREATE POLICY "Users can view own sessions"
ON public.chat_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: only authenticated users can create their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: only authenticated users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.chat_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: only authenticated users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.chat_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
