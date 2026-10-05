-- lovable-cron-fallback-reviewed: Follow-up alerts are genuinely time-based; five-minute polling preserves the existing maximum reminder delay while removing the unauthenticated HTTP endpoint.
DROP POLICY IF EXISTS "banners_public_read" ON public.website_banners;
CREATE POLICY "banners_public_read"
ON public.website_banners
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Public can view loan_type_banks" ON public.loan_type_banks;
CREATE POLICY "Public can view active loan_type_banks"
ON public.loan_type_banks
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loan_types lt
    WHERE lt.id = loan_type_banks.loan_type_id AND lt.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.banks b
    WHERE b.id = loan_type_banks.bank_id AND b.is_active = true
  )
);

DROP POLICY IF EXISTS "loan_documents_public_read" ON public.loan_documents;
CREATE POLICY "loan_documents_public_read"
ON public.loan_documents
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loan_types lt
    WHERE lt.id = loan_documents.loan_type_id AND lt.is_active = true
  )
);

DROP POLICY IF EXISTS "loan_statuses_auth_read" ON public.loan_statuses;
CREATE POLICY "loan_statuses_auth_read"
ON public.loan_statuses
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "loan_types_public_read" ON public.loan_types;
CREATE POLICY "loan_types_public_read"
ON public.loan_types
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "content_public_read" ON public.website_content;
CREATE POLICY "content_public_read"
ON public.website_content
FOR SELECT
TO anon, authenticated
USING (section IN ('hero', 'about', 'contact', 'testimonials'));

CREATE OR REPLACE FUNCTION public.process_followup_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_leads integer := 0;
  v_lead_notifications integer := 0;
  v_note_notifications integer := 0;
BEGIN
  WITH due_leads AS (
    SELECT l.id, l.name, l.assigned_to
    FROM public.leads l
    WHERE l.next_followup_at IS NOT NULL
      AND l.next_followup_at <= v_now
      AND l.status NOT IN ('converted', 'lost')
      AND (l.followup_reminded_at IS NULL OR l.followup_reminded_at < l.next_followup_at)
  ), recipients AS (
    SELECT dl.id AS lead_id, dl.name, dl.assigned_to AS user_id
    FROM due_leads dl WHERE dl.assigned_to IS NOT NULL
    UNION ALL
    SELECT dl.id, dl.name, ur.user_id
    FROM due_leads dl
    JOIN public.user_roles ur ON ur.role = 'admin'
    WHERE dl.assigned_to IS NULL
  ), inserted AS (
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT user_id, 'Follow-up due', 'Reminder: follow up with ' || name,
           'lead_followup', '/team/leads'
    FROM recipients
    RETURNING 1
  ) SELECT count(*) INTO v_lead_notifications FROM inserted;

  WITH updated AS (
    UPDATE public.leads l SET followup_reminded_at = v_now
    WHERE l.next_followup_at IS NOT NULL
      AND l.next_followup_at <= v_now
      AND l.status NOT IN ('converted', 'lost')
      AND (l.followup_reminded_at IS NULL OR l.followup_reminded_at < l.next_followup_at)
    RETURNING 1
  ) SELECT count(*) INTO v_leads FROM updated;

  WITH due_notes AS (
    SELECT n.application_id, n.author_id, n.body
    FROM public.application_notes n
    WHERE n.follow_up_at IS NOT NULL
      AND n.follow_up_at <= v_now
      AND n.follow_up_notified_at IS NULL
  ), inserted AS (
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT author_id, 'Application follow-up due', left(body, 140),
           'application_followup', '/admin/applications/' || application_id::text
    FROM due_notes
    RETURNING 1
  ) SELECT count(*) INTO v_note_notifications FROM inserted;

  UPDATE public.application_notes n SET follow_up_notified_at = v_now
  WHERE n.follow_up_at IS NOT NULL
    AND n.follow_up_at <= v_now
    AND n.follow_up_notified_at IS NULL;

  RETURN jsonb_build_object('processed', v_leads, 'notifications', v_lead_notifications, 'application_followups', v_note_notifications);
END;
$$;
REVOKE ALL ON FUNCTION public.process_followup_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_followup_reminders() TO service_role;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'lead-followup-reminders';
SELECT cron.schedule('lead-followup-reminders', '*/5 * * * *', 'SELECT public.process_followup_reminders();');