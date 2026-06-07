
-- Marketplace storage policies
CREATE POLICY "Authenticated read marketplace covers"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace-covers');

CREATE POLICY "Admins write marketplace covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update marketplace covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketplace-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete marketplace covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins read marketplace files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins write marketplace files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update marketplace files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketplace-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete marketplace files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace-files' AND public.is_admin(auth.uid()));
