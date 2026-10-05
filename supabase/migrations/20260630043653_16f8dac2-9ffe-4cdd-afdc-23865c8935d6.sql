
CREATE POLICY "Public read bank-logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bank-logos');

CREATE POLICY "Admins upload bank-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bank-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update bank-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bank-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bank-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bank-logos' AND public.has_role(auth.uid(), 'admin'));
