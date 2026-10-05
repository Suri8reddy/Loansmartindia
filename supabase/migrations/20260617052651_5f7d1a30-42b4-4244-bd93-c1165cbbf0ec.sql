
ALTER TABLE public.loan_documents ADD COLUMN IF NOT EXISTS allowed_formats text[] NOT NULL DEFAULT ARRAY['pdf','jpg','png'];
ALTER TABLE public.loan_documents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS loan_document_id uuid REFERENCES public.loan_documents(id) ON DELETE SET NULL;
