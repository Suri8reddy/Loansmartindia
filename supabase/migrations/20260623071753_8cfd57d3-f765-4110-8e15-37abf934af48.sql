
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE TABLE public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all lead notes"
ON public.lead_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team can view notes for their assigned leads"
ON public.lead_notes FOR SELECT TO authenticated
USING (
  public.is_team_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id AND l.assigned_to = auth.uid()
  )
);

CREATE POLICY "Admins can add notes to any lead"
ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team can add notes to their assigned leads"
ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_team_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id AND l.assigned_to = auth.uid()
  )
);

CREATE POLICY "Authors can delete their own notes"
ON public.lead_notes FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE INDEX IF NOT EXISTS lead_notes_lead_id_created_at_idx
  ON public.lead_notes (lead_id, created_at DESC);
