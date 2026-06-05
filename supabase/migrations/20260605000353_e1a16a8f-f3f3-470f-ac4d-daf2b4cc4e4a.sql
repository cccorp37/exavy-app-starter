CREATE TABLE IF NOT EXISTS public.marketplace_item_downloads (
  item_id UUID PRIMARY KEY REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  download_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_item_downloads TO authenticated;
GRANT ALL ON public.marketplace_item_downloads TO service_role;

ALTER TABLE public.marketplace_item_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage marketplace downloads" ON public.marketplace_item_downloads;
CREATE POLICY "Admins manage marketplace downloads"
  ON public.marketplace_item_downloads
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_marketplace_item_downloads_updated ON public.marketplace_item_downloads;
CREATE TRIGGER trg_marketplace_item_downloads_updated
  BEFORE UPDATE ON public.marketplace_item_downloads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.marketplace_item_downloads (item_id, download_url, created_at, updated_at)
SELECT id, download_url, created_at, updated_at
FROM public.marketplace_items
WHERE download_url IS NOT NULL
ON CONFLICT (item_id) DO UPDATE
SET download_url = EXCLUDED.download_url,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.get_marketplace_download_url(p_item_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_url TEXT;
  v_has_purchase BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_admin(v_uid) THEN
    SELECT download_url INTO v_url
    FROM public.marketplace_item_downloads
    WHERE item_id = p_item_id;
    RETURN v_url;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.marketplace_purchases
    WHERE item_id = p_item_id
      AND user_id = v_uid
      AND status = 'completed'
  ) INTO v_has_purchase;

  IF NOT v_has_purchase THEN
    RAISE EXCEPTION 'Achat requis';
  END IF;

  SELECT download_url INTO v_url
  FROM public.marketplace_item_downloads
  WHERE item_id = p_item_id;

  RETURN v_url;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_marketplace_download_url(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_download_url(UUID) TO authenticated;

ALTER TABLE public.marketplace_items DROP COLUMN IF EXISTS download_url;

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.weekly_stats FROM authenticated;

DROP POLICY IF EXISTS "Authenticated clients cannot insert weekly stats" ON public.weekly_stats;
CREATE POLICY "Authenticated clients cannot insert weekly stats"
  ON public.weekly_stats
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated clients cannot update weekly stats" ON public.weekly_stats;
CREATE POLICY "Authenticated clients cannot update weekly stats"
  ON public.weekly_stats
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated clients cannot delete weekly stats" ON public.weekly_stats;
CREATE POLICY "Authenticated clients cannot delete weekly stats"
  ON public.weekly_stats
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);