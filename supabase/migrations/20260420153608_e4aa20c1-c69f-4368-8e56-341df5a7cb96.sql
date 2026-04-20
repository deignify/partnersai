-- chat_messages
DROP POLICY IF EXISTS "Users manage own messages" ON public.chat_messages;
CREATE POLICY "Users manage own messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- imported_chats
DROP POLICY IF EXISTS "Users manage own imports" ON public.imported_chats;
CREATE POLICY "Users manage own imports" ON public.imported_chats
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_roles SELECT
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- promo_codes admin
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- promo_redemptions
DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins can manage redemptions" ON public.promo_redemptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can insert own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can insert own redemptions" ON public.promo_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- user_subscriptions
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users cannot directly select subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);

-- daily_usage
DROP POLICY IF EXISTS "Users can insert own usage" ON public.daily_usage;
CREATE POLICY "Users can insert own usage" ON public.daily_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON public.daily_usage;
CREATE POLICY "Users can update own usage" ON public.daily_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own usage" ON public.daily_usage;
CREATE POLICY "Users can view own usage" ON public.daily_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);