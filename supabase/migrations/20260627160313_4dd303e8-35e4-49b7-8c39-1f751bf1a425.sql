
-- Enums
DO $$ BEGIN
  CREATE TYPE public.dsa_payout_basis AS ENUM ('manual', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsa_payout_status AS ENUM ('pending', 'partial', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) Settings
CREATE TABLE public.dsa_payout_settings (
  dsa_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  payout_visible boolean NOT NULL DEFAULT false,
  default_percentage numeric(6,3),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dsa_payout_settings TO authenticated;
GRANT ALL ON public.dsa_payout_settings TO service_role;
ALTER TABLE public.dsa_payout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_settings_admin_all" ON public.dsa_payout_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "payout_settings_self_read" ON public.dsa_payout_settings
  FOR SELECT TO authenticated
  USING (dsa_id = auth.uid());

-- 2) Payouts
CREATE TABLE public.dsa_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  dsa_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  basis public.dsa_payout_basis NOT NULL DEFAULT 'manual',
  percentage numeric(6,3),
  expected_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.dsa_payout_status NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, dsa_id)
);
CREATE INDEX idx_dsa_payouts_dsa ON public.dsa_payouts(dsa_id);
CREATE INDEX idx_dsa_payouts_app ON public.dsa_payouts(application_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dsa_payouts TO authenticated;
GRANT ALL ON public.dsa_payouts TO service_role;
ALTER TABLE public.dsa_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsa_payouts_admin_all" ON public.dsa_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dsa_payouts_dsa_read" ON public.dsa_payouts
  FOR SELECT TO authenticated
  USING (
    dsa_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.dsa_payout_settings s
      WHERE s.dsa_id = auth.uid() AND s.payout_visible = true
    )
  );

-- 3) Payments
CREATE TABLE public.dsa_payout_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.dsa_payouts(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  reference text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dsa_payout_payments_payout ON public.dsa_payout_payments(payout_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dsa_payout_payments TO authenticated;
GRANT ALL ON public.dsa_payout_payments TO service_role;
ALTER TABLE public.dsa_payout_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsa_payout_payments_admin_all" ON public.dsa_payout_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dsa_payout_payments_dsa_read" ON public.dsa_payout_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dsa_payouts p
      JOIN public.dsa_payout_settings s ON s.dsa_id = p.dsa_id
      WHERE p.id = dsa_payout_payments.payout_id
        AND p.dsa_id = auth.uid()
        AND s.payout_visible = true
    )
  );

-- Sync trigger: recalc paid_amount + status on the parent payout
CREATE OR REPLACE FUNCTION public.sync_dsa_payout_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout_id uuid;
  v_total numeric;
  v_expected numeric;
  v_status public.dsa_payout_status;
BEGIN
  v_payout_id := COALESCE(NEW.payout_id, OLD.payout_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.dsa_payout_payments WHERE payout_id = v_payout_id;
  SELECT expected_amount INTO v_expected
    FROM public.dsa_payouts WHERE id = v_payout_id;
  IF v_total >= COALESCE(v_expected, 0) AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_total > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;
  UPDATE public.dsa_payouts
    SET paid_amount = v_total, status = v_status, updated_at = now()
    WHERE id = v_payout_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_dsa_payout_totals
AFTER INSERT OR UPDATE OR DELETE ON public.dsa_payout_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_dsa_payout_totals();

-- Notify DSA on payout changes, gated on visibility
CREATE OR REPLACE FUNCTION public.notify_dsa_on_payout_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visible boolean;
  v_title text;
  v_msg text;
BEGIN
  IF NEW.dsa_id IS NULL THEN RETURN NEW; END IF;
  SELECT payout_visible INTO v_visible FROM public.dsa_payout_settings WHERE dsa_id = NEW.dsa_id;
  IF COALESCE(v_visible, false) = false THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'New payout recorded';
    v_msg := 'Expected payout: ₹' || COALESCE(NEW.expected_amount, 0)::text;
  ELSIF NEW.paid_amount IS DISTINCT FROM OLD.paid_amount THEN
    IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
      v_title := 'Payout fully paid';
      v_msg := 'Total paid: ₹' || COALESCE(NEW.paid_amount, 0)::text;
    ELSE
      v_title := 'Payout payment received';
      v_msg := 'Total paid so far: ₹' || COALESCE(NEW.paid_amount, 0)::text;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.dsa_id, v_title, v_msg, 'dsa_payout', '/team/commissions');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dsa_payout
AFTER INSERT OR UPDATE ON public.dsa_payouts
FOR EACH ROW EXECUTE FUNCTION public.notify_dsa_on_payout_change();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_dsa_payouts_touch BEFORE UPDATE ON public.dsa_payouts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_dsa_payout_settings_touch BEFORE UPDATE ON public.dsa_payout_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
