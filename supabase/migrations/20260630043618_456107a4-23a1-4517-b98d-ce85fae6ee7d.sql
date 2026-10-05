
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.loan_types
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interest_rate_min numeric,
  ADD COLUMN IF NOT EXISTS interest_rate_max numeric,
  ADD COLUMN IF NOT EXISTS tenure_min_months integer,
  ADD COLUMN IF NOT EXISTS tenure_max_months integer,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill slug from name
UPDATE public.loan_types
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS loan_types_slug_unique ON public.loan_types(slug);

CREATE TABLE IF NOT EXISTS public.loan_type_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_type_id uuid NOT NULL REFERENCES public.loan_types(id) ON DELETE CASCADE,
  bank_id uuid NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_type_id, bank_id)
);

GRANT SELECT ON public.loan_type_banks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.loan_type_banks TO authenticated;
GRANT ALL ON public.loan_type_banks TO service_role;

ALTER TABLE public.loan_type_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view loan_type_banks"
  ON public.loan_type_banks FOR SELECT USING (true);

CREATE POLICY "Admins manage loan_type_banks"
  ON public.loan_type_banks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
