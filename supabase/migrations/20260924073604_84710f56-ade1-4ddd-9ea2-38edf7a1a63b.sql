ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
ALTER TABLE public.loan_applications ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS profiles_archived_at_idx ON public.profiles (archived_at);
CREATE INDEX IF NOT EXISTS leads_archived_at_idx ON public.leads (archived_at);
CREATE INDEX IF NOT EXISTS loan_applications_archived_at_idx ON public.loan_applications (archived_at);