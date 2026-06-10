ALTER TABLE public.marketplace_item_downloads
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.marketplace_item_downloads
  ALTER COLUMN download_url DROP NOT NULL;

ALTER TABLE public.marketplace_item_downloads
  DROP CONSTRAINT IF EXISTS marketplace_item_downloads_has_source;

ALTER TABLE public.marketplace_item_downloads
  ADD CONSTRAINT marketplace_item_downloads_has_source
  CHECK (
    NULLIF(btrim(COALESCE(download_url, '')), '') IS NOT NULL
    OR NULLIF(btrim(COALESCE(storage_path, '')), '') IS NOT NULL
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_item_downloads TO authenticated;
GRANT ALL ON public.marketplace_item_downloads TO service_role;

CREATE OR REPLACE FUNCTION public.get_marketplace_download_url(p_item_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_download_url TEXT;
  v_storage_path TEXT;
  v_has_purchase BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin(v_uid) THEN
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
  END IF;

  SELECT download_url, storage_path
  INTO v_download_url, v_storage_path
  FROM public.marketplace_item_downloads
  WHERE item_id = p_item_id;

  IF NULLIF(btrim(COALESCE(v_storage_path, '')), '') IS NOT NULL THEN
    RETURN 'storage:' || v_storage_path;
  END IF;

  RETURN v_download_url;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_marketplace_download_url(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_download_url(UUID) TO authenticated;