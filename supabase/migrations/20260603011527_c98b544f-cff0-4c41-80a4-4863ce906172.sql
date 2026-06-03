
CREATE OR REPLACE FUNCTION public.create_trial_and_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at)
  VALUES (
    NEW.id,
    'monthly',
    'active',
    now(),
    now() + INTERVAL '5 days'
  );

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.id,
    'Bienvenue sur EXAVY ! 🎉',
    'De la part de l''équipe d''Exavy, nous sommes ravis de vous accueillir. Explorez nos outils d''apprentissage intelligent pour booster vos révisions !',
    'welcome'
  );

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.id,
    'Essai Premium offert ! 🎁',
    'Vous avez reçu 05 jours d''essai gratuits de l''abonnement Premium. Profitez de toutes les fonctionnalités sans limite !',
    'trial'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_trial_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at)
  VALUES (
    NEW.id,
    'monthly',
    'active',
    now(),
    now() + INTERVAL '5 days'
  );
  RETURN NEW;
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
      IF (v_sub.expires_at - v_sub.started_at) <= interval '6 days' THEN
        v_is_trial := true;
      END IF;
    END IF;
  END IF;

  v_limits := public.get_plan_limits(v_plan);
  IF v_is_trial AND p_resource_type = 'documents' THEN
    v_limits := jsonb_set(v_limits, '{documents_limit}', '5'::jsonb);
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
        THEN 'Limite de 5 documents atteinte en mode essai. Passez à Premium pour un accès illimité.'
        ELSE 'Limite atteinte. Passez à Premium pour un accès illimité.'
      END);
  END IF;
END;
$function$;

-- Extend currently active trial subscriptions by 2 days
UPDATE public.subscriptions
SET expires_at = expires_at + INTERVAL '2 days'
WHERE status = 'active'
  AND plan IN ('monthly', 'yearly')
  AND expires_at IS NOT NULL
  AND payment_reference IS NULL
  AND (expires_at - started_at) <= interval '4 days';
