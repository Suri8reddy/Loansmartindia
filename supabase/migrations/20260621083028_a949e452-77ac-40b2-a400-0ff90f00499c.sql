ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS amount_approved numeric(14,2),
  ADD COLUMN IF NOT EXISTS amount_disbursed numeric(14,2),
  ADD COLUMN IF NOT EXISTS commission_expected numeric(14,2),
  ADD COLUMN IF NOT EXISTS commission_received numeric(14,2);