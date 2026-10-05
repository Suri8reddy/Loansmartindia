
-- Per-application ad-hoc doc requests
CREATE TABLE public.application_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  description text,
  allowed_formats text[] NOT NULL DEFAULT ARRAY['pdf','jpg','jpeg','png'],
  is_mandatory boolean NOT NULL DEFAULT true,
  requested_by uuid REFERENCES auth.users(id),
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_document_requests TO authenticated;
GRANT ALL ON public.application_document_requests TO service_role;

ALTER TABLE public.application_document_requests ENABLE ROW LEVEL SECURITY;

-- Team/admin can manage all
CREATE POLICY "team manage doc requests"
  ON public.application_document_requests FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- Customer can read their own application's requests
CREATE POLICY "customer read own doc requests"
  ON public.application_document_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loan_applications la
    WHERE la.id = application_id AND la.customer_id = auth.uid()
  ));

-- Link uploaded files to a request
ALTER TABLE public.application_documents
  ADD COLUMN IF NOT EXISTS document_request_id uuid REFERENCES public.application_document_requests(id) ON DELETE SET NULL;

-- Mark request fulfilled + notify requester when a matching upload arrives
CREATE OR REPLACE FUNCTION public.fulfill_document_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_requested_by uuid;
  v_name text;
BEGIN
  IF NEW.document_request_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.application_document_requests
    SET fulfilled_at = COALESCE(fulfilled_at, now())
    WHERE id = NEW.document_request_id
    RETURNING requested_by, document_name INTO v_requested_by, v_name;

  IF v_requested_by IS NOT NULL AND v_requested_by <> NEW.uploaded_by THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_requested_by, 'Document uploaded',
      'Customer uploaded "' || COALESCE(v_name, NEW.document_name) || '"',
      'doc_request_fulfilled',
      '/admin/applications/' || NEW.application_id::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfill_doc_request ON public.application_documents;
CREATE TRIGGER trg_fulfill_doc_request
  AFTER INSERT ON public.application_documents
  FOR EACH ROW EXECUTE FUNCTION public.fulfill_document_request();
