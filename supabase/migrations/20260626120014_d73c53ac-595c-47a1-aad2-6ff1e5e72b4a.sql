
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS requirements text,
  ADD COLUMN IF NOT EXISTS amount_requested numeric,
  ADD COLUMN IF NOT EXISTS converted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Allow team members to insert leads directly (creator becomes assigned)
DROP POLICY IF EXISTS "team_can_insert_leads" ON public.leads;
CREATE POLICY "team_can_insert_leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
