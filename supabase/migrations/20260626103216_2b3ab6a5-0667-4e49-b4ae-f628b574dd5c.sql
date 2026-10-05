
CREATE OR REPLACE FUNCTION public.notify_customer_on_doc_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  SELECT customer_id INTO v_customer_id
    FROM public.loan_applications WHERE id = NEW.application_id;
  IF v_customer_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_customer_id,
    CASE WHEN NEW.is_mandatory THEN 'Document required: ' || NEW.document_name
         ELSE 'Document requested: ' || NEW.document_name END,
    COALESCE(NEW.description, 'Please upload this document to continue your application.'),
    'doc_request',
    '/customer/applications/' || NEW.application_id::text || '#documents'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_customer_on_doc_request ON public.application_document_requests;
CREATE TRIGGER trg_notify_customer_on_doc_request
AFTER INSERT ON public.application_document_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_doc_request();
