DROP POLICY IF EXISTS "Customers and team can view loan documents" ON storage.objects;
CREATE POLICY "Customers and team can view loan documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'loan-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_team_member(auth.uid())
  )
);