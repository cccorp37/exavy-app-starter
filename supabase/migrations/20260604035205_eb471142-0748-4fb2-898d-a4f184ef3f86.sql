
-- Marketplace tables
CREATE TYPE public.marketplace_item_type AS ENUM ('ebook', 'training');
CREATE TYPE public.marketplace_purchase_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE public.marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.marketplace_item_type NOT NULL DEFAULT 'ebook',
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_fcfa INTEGER NOT NULL DEFAULT 0,
  price_usd NUMERIC(10,2),
  cover_url TEXT,
  download_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_items TO authenticated;
GRANT ALL ON public.marketplace_items TO service_role;

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Authenticated can view published items, but download_url is filtered via RPC (not via RLS column-level which doesn't exist)
-- We keep RLS allowing SELECT on published items; client code never selects download_url directly.
CREATE POLICY "Authenticated can view published items"
  ON public.marketplace_items FOR SELECT TO authenticated
  USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage items"
  ON public.marketplace_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_marketplace_items_updated
  BEFORE UPDATE ON public.marketplace_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchases
CREATE TABLE public.marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  amount_fcfa INTEGER NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  status public.marketplace_purchase_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_purchases TO authenticated;
GRANT ALL ON public.marketplace_purchases TO service_role;

ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.marketplace_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users create own pending purchases"
  ON public.marketplace_purchases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins update purchases"
  ON public.marketplace_purchases FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_marketplace_purchases_updated
  BEFORE UPDATE ON public.marketplace_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secure RPC to fetch the download link only after successful purchase (or admin)
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF public.is_admin(v_uid) THEN
    SELECT download_url INTO v_url FROM public.marketplace_items WHERE id = p_item_id;
    RETURN v_url;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_purchases
    WHERE item_id = p_item_id AND user_id = v_uid AND status = 'completed'
  ) INTO v_has_purchase;

  IF NOT v_has_purchase THEN
    RAISE EXCEPTION 'Achat requis';
  END IF;

  SELECT download_url INTO v_url FROM public.marketplace_items WHERE id = p_item_id;
  RETURN v_url;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_marketplace_download_url(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_download_url(UUID) TO authenticated;
