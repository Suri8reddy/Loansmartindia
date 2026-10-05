
-- 1. Per-loan-type status flow
ALTER TABLE public.loan_statuses ADD COLUMN IF NOT EXISTS loan_type_id uuid REFERENCES public.loan_types(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_loan_statuses_loan_type ON public.loan_statuses(loan_type_id);

-- 2. Banks directory
CREATE TABLE IF NOT EXISTS public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text,
  logo_url text,
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
GRANT ALL ON public.banks TO service_role;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read banks" ON public.banks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage banks" ON public.banks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Application banks (per-bank submission)
CREATE TABLE IF NOT EXISTS public.application_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  bank_id uuid NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
  status_id uuid REFERENCES public.loan_statuses(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_amount numeric,
  rejection_reason text,
  notes text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, bank_id)
);
CREATE INDEX IF NOT EXISTS idx_app_banks_app ON public.application_banks(application_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_banks TO authenticated;
GRANT ALL ON public.application_banks TO service_role;
ALTER TABLE public.application_banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manage app banks" ON public.application_banks FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "customer read own app banks" ON public.application_banks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.loan_applications la WHERE la.id = application_id AND la.customer_id = auth.uid()));

-- 4. Internal application notes + follow-ups
CREATE TABLE IF NOT EXISTS public.application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  follow_up_at timestamptz,
  follow_up_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_notes_app ON public.application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_app_notes_followup ON public.application_notes(follow_up_at) WHERE follow_up_at IS NOT NULL AND follow_up_notified_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_notes TO authenticated;
GRANT ALL ON public.application_notes TO service_role;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read app notes" ON public.application_notes FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert app notes" ON public.application_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "author update own app notes" ON public.application_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "author delete own app notes" ON public.application_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- profile FK so PostgREST can join author profile
DO $$ BEGIN
  ALTER TABLE public.application_notes
    ADD CONSTRAINT application_notes_author_profile_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.application_banks
    ADD CONSTRAINT application_banks_updater_profile_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
