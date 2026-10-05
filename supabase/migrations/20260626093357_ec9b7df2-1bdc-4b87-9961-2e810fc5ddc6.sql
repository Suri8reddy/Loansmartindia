-- Add public-schema FK so PostgREST can traverse loan_applications → profiles in joins
ALTER TABLE public.loan_applications
  ADD CONSTRAINT loan_applications_customer_profile_fkey
  FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.loan_applications
  ADD CONSTRAINT loan_applications_assigned_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Same fix for leads (assigned_to → profiles) so admin/team list joins work
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='assigned_to') THEN
    BEGIN
      ALTER TABLE public.leads
        ADD CONSTRAINT leads_assigned_profile_fkey
        FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Same fix for commissions.dsa_id → profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='commissions' AND column_name='dsa_id') THEN
    BEGIN
      ALTER TABLE public.commissions
        ADD CONSTRAINT commissions_dsa_profile_fkey
        FOREIGN KEY (dsa_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;