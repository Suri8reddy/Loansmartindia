ALTER TABLE public.dsa_payout_settings
  ADD COLUMN IF NOT EXISTS report_access boolean NOT NULL DEFAULT false;