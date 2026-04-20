-- ─── 1. Promo codes: lock table to admins only; users use the safe view ───
DROP POLICY IF EXISTS "Authenticated can read active promo codes for view" ON public.promo_codes;

-- The view promo_codes_public uses security_invoker=true, so it needs the caller to
-- have SELECT on the table. Switch to security_definer so the view bypasses the table
-- RLS but still only exposes the safe columns.
DROP VIEW IF EXISTS public.promo_codes_public;

CREATE VIEW public.promo_codes_public
WITH (security_invoker = false)
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

GRANT SELECT ON public.promo_codes_public TO authenticated, anon;

-- ─── 2. user_subscriptions: only service role / admins can write ───
-- Block user self-insert and self-update (prevents granting themselves Pro).
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

-- The "Admins can manage all subscriptions" policy + service role bypass remain.
-- Edge functions (razorpay-verify, razorpay-webhook, admin-api) use the service role,
-- which bypasses RLS — so legitimate subscription writes still work.

-- ─── 3. user_roles: tighten admin policy to authenticated-only ───
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── 4. Remove message_reactions from realtime publication ───
-- Reactions still persist via normal queries; clients can refetch on demand.
-- This eliminates the cross-user broadcast leak.
ALTER PUBLICATION supabase_realtime DROP TABLE public.message_reactions;