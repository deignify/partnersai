-- Recreate view with security_invoker = true (safer; uses caller's RLS)
DROP VIEW IF EXISTS public.promo_codes_public;

CREATE VIEW public.promo_codes_public
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

-- Allow authenticated users to SELECT from the underlying table, but ONLY active rows.
-- Column-level safety is enforced by the view (clients should query the view, not the table).
-- Edge functions use the service role and bypass RLS, so admin/payment paths are unaffected.
CREATE POLICY "Authenticated can read active promo rows"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
);