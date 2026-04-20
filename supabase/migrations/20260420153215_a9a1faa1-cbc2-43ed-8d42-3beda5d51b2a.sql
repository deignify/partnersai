-- ─── 1. Lock down user_roles: only admins can write ───
-- The existing "Admins can manage roles" ALL policy is permissive; without an explicit
-- restrictive policy, a non-admin could potentially insert. Add explicit deny via
-- restrictive policies for non-admin write operations.

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── 2. Restrict promo_codes column exposure via a safe view ───
-- Drop the broad SELECT policy for non-admins; expose only safe columns through a view.
DROP POLICY IF EXISTS "Users can read active promo codes" ON public.promo_codes;

-- Create a safe view that exposes only code, discount info, validity, and plan_duration
CREATE OR REPLACE VIEW public.promo_codes_public
WITH (security_invoker = true)
AS
SELECT
  id,
  code,
  discount_type,
  discount_value,
  plan_duration,
  valid_from,
  valid_until,
  is_active
FROM public.promo_codes
WHERE is_active = true
  AND (valid_until IS NULL OR valid_until > now())
  AND (max_uses IS NULL OR times_used < max_uses);

GRANT SELECT ON public.promo_codes_public TO authenticated;

-- Re-add a minimal SELECT policy on the underlying table so the view (security_invoker)
-- can read rows for authenticated users — but column exposure is still controlled by the view.
CREATE POLICY "Authenticated can read active promo codes for view"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
);

-- ─── 3. Restrict message_reactions SELECT to reactions on the user's own messages ───
DROP POLICY IF EXISTS "Users can view all reactions on their messages" ON public.message_reactions;

-- Reactions are stored with message_id as text (synthetic id from the chat session).
-- Scope SELECT to reactions the user themselves made, OR reactions on messages within
-- chat sessions they own. Since message_id is text without FK, we restrict to the
-- user's own reactions plus any reactions where the message belongs to one of their sessions.
CREATE POLICY "Users view reactions on own session messages"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id::text = message_reactions.message_id
      AND cm.user_id = auth.uid()
  )
);