
-- 1. otp_codes: add restrictive policy to block any non-service-role access
CREATE POLICY "Deny non-service-role access to otp_codes"
ON public.otp_codes
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2. user_sessions: block direct INSERT/UPDATE/DELETE from clients (use RPC instead)
CREATE POLICY "Block client inserts on user_sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on user_sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block client deletes on user_sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- 3. pawapay_transactions: explicit service-role-only writes
CREATE POLICY "Service role manages transactions - insert"
ON public.pawapay_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role manages transactions - update"
ON public.pawapay_transactions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role manages transactions - delete"
ON public.pawapay_transactions
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Block client writes on pawapay_transactions"
ON public.pawapay_transactions
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on pawapay_transactions"
ON public.pawapay_transactions
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block client deletes on pawapay_transactions"
ON public.pawapay_transactions
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- 4. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
-- These are still callable inside RLS/triggers (security definer bypasses execute grants in trigger ctx),
-- but should not be invokable directly via the Data API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_blocked(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_plan_limits(subscription_plan) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otp_codes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_sessions() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_support_ticket_user_id() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_trial_and_notifications() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_trial_subscription() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin_role() FROM anon, authenticated, PUBLIC;

-- Keep these callable by authenticated clients (used by app code):
GRANT EXECUTE ON FUNCTION public.record_user_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(uuid, text) TO authenticated;
