
-- 1. Notifications: drop permissive INSERT policy, add strict one
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Support tickets: enforce NOT NULL user_id (trigger already sets it)
UPDATE public.support_tickets SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
ALTER TABLE public.support_tickets ALTER COLUMN user_id SET NOT NULL;

-- 3. User sessions: drop direct user write policies; use SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can insert their sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON public.user_sessions;

CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_user_session(p_user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.user_sessions (user_id, email, user_agent, logged_in_at, last_active_at)
  VALUES (v_uid, v_email, left(coalesce(p_user_agent, ''), 500), now(), now());
END;
$$;

-- 4. Add caller authorization to usage functions
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id uuid, p_resource_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.usage_tracking (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.usage_tracking
  SET documents_count = 0, quizzes_count = 0, flashcards_count = 0,
      summaries_count = 0, mind_maps_count = 0,
      period_start = date_trunc('month', now()), updated_at = now()
  WHERE user_id = p_user_id AND period_start < date_trunc('month', now());

  CASE p_resource_type
    WHEN 'documents' THEN UPDATE public.usage_tracking SET documents_count = documents_count + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'quizzes' THEN UPDATE public.usage_tracking SET quizzes_count = quizzes_count + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'flashcards' THEN UPDATE public.usage_tracking SET flashcards_count = flashcards_count + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'summaries' THEN UPDATE public.usage_tracking SET summaries_count = summaries_count + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'mind_maps' THEN UPDATE public.usage_tracking SET mind_maps_count = mind_maps_count + 1, updated_at = now() WHERE user_id = p_user_id;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_usage_limit(p_user_id uuid, p_resource_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan subscription_plan;
  v_is_trial boolean := false;
  v_limits jsonb;
  v_usage RECORD;
  v_limit_key TEXT;
  v_current_count INTEGER;
  v_limit_value INTEGER;
  v_sub RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF public.is_admin(p_user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1, 'plan', 'admin');
  END IF;

  SELECT plan, status, started_at, expires_at INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC LIMIT 1;

  IF v_sub IS NULL THEN
    v_plan := 'free';
  ELSE
    v_plan := v_sub.plan;
    IF v_sub.plan IN ('monthly', 'yearly') AND v_sub.expires_at IS NOT NULL THEN
      IF (v_sub.expires_at - v_sub.started_at) <= interval '4 days' THEN
        v_is_trial := true;
      END IF;
    END IF;
  END IF;

  v_limits := public.get_plan_limits(v_plan);
  IF v_is_trial AND p_resource_type = 'documents' THEN
    v_limits := jsonb_set(v_limits, '{documents_limit}', '3'::jsonb);
  END IF;

  SELECT * INTO v_usage FROM public.usage_tracking WHERE user_id = p_user_id;
  IF v_usage IS NOT NULL AND v_usage.period_start < date_trunc('month', now()) THEN
    UPDATE public.usage_tracking
    SET documents_count = 0, quizzes_count = 0, flashcards_count = 0,
        summaries_count = 0, mind_maps_count = 0,
        period_start = date_trunc('month', now()), updated_at = now()
    WHERE user_id = p_user_id;
    SELECT * INTO v_usage FROM public.usage_tracking WHERE user_id = p_user_id;
  END IF;

  IF v_usage IS NULL THEN
    INSERT INTO public.usage_tracking (user_id) VALUES (p_user_id) RETURNING * INTO v_usage;
  END IF;

  v_limit_key := p_resource_type || '_limit';
  CASE p_resource_type
    WHEN 'documents' THEN v_current_count := v_usage.documents_count;
    WHEN 'quizzes' THEN v_current_count := v_usage.quizzes_count;
    WHEN 'flashcards' THEN v_current_count := v_usage.flashcards_count;
    WHEN 'summaries' THEN v_current_count := v_usage.summaries_count;
    WHEN 'mind_maps' THEN v_current_count := v_usage.mind_maps_count;
    ELSE v_current_count := 0;
  END CASE;

  v_limit_value := (v_limits ->> v_limit_key)::INTEGER;

  IF v_limit_value = -1 OR v_current_count < v_limit_value THEN
    RETURN jsonb_build_object('allowed', true, 'current', v_current_count, 'limit', v_limit_value, 'plan', v_plan, 'is_trial', v_is_trial);
  ELSE
    RETURN jsonb_build_object('allowed', false, 'current', v_current_count, 'limit', v_limit_value, 'plan', v_plan, 'is_trial', v_is_trial,
      'message', CASE WHEN v_is_trial
        THEN 'Limite de 3 documents atteinte en mode essai. Passez à Premium pour un accès illimité.'
        ELSE 'Limite atteinte. Passez à Premium pour un accès illimité.'
      END);
  END IF;
END;
$function$;
