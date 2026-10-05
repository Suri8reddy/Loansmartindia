
-- 1. banks: restrict full-detail read to team/admin
DROP POLICY IF EXISTS "auth read banks" ON public.banks;
CREATE POLICY "team read banks" ON public.banks
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. audit_logs: only authenticated users, must match auth.uid()
DROP POLICY IF EXISTS audit_insert_any ON public.audit_logs;
CREATE POLICY audit_insert_self ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    length(COALESCE(action, '')) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 3. banker_share_links: remove broad anon read
DROP POLICY IF EXISTS bsl_public_read ON public.banker_share_links;

-- Secure token-scoped RPC returning link + minimal app + approved docs, and bumps access_count
CREATE OR REPLACE FUNCTION public.get_banker_share_bundle(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.banker_share_links;
  v_app  jsonb;
  v_docs jsonb;
BEGIN
  SELECT * INTO v_link
    FROM public.banker_share_links
   WHERE token = _token
     AND is_active = true
     AND expires_at > now()
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.banker_share_links
     SET access_count = COALESCE(access_count, 0) + 1
   WHERE id = v_link.id;

  SELECT jsonb_build_object(
           'id', la.id,
           'amount_requested', la.amount_requested,
           'loan_types', jsonb_build_object('name', lt.name)
         )
    INTO v_app
    FROM public.loan_applications la
    LEFT JOIN public.loan_types lt ON lt.id = la.loan_type_id
   WHERE la.id = v_link.application_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', ad.id,
           'document_name', ad.document_name,
           'file_url', ad.file_url
         )), '[]'::jsonb)
    INTO v_docs
    FROM public.application_documents ad
   WHERE ad.application_id = v_link.application_id
     AND ad.status = 'approved';

  RETURN jsonb_build_object(
    'link', jsonb_build_object(
      'id', v_link.id,
      'expires_at', v_link.expires_at,
      'is_active', v_link.is_active,
      'access_count', COALESCE(v_link.access_count, 0) + 1
    ),
    'app',  v_app,
    'docs', v_docs
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_banker_share_bundle(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_banker_share_bundle(uuid) TO anon, authenticated;

-- 4. Fix mutable search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 5. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions that
--    are only invoked internally (as triggers or from other definer functions).
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_document_request()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_commission_totals()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_dsa_on_commission_change()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_customer_on_doc_request()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_dsa_on_payout_change()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_dsa_payout_totals()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()                    FROM PUBLIC, anon, authenticated;

-- has_role / is_team_member are referenced by RLS policies, so authenticated
-- must keep EXECUTE; revoke anon/PUBLIC access.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid)     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_team_member(uuid)     TO authenticated;
