-- Remove broad SELECT for authenticated users — they should validate via the function below
DROP POLICY IF EXISTS "Authenticated can read active promo rows" ON public.promo_codes;
DROP VIEW IF EXISTS public.promo_codes_public;

-- Secure validation function: returns only safe fields if code is valid, else null.
-- SECURITY DEFINER lets it read the underlying table without exposing it to the caller.
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text)
RETURNS TABLE (
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  plan_duration text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.code,
    p.discount_type,
    p.discount_value,
    p.plan_duration
  FROM public.promo_codes p
  WHERE upper(p.code) = upper(_code)
    AND p.is_active = true
    AND (p.valid_until IS NULL OR p.valid_until > now())
    AND (p.max_uses IS NULL OR p.times_used < p.max_uses)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text) FROM anon, public;