
-- Commission payments history table
CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  reference text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_payments_commission ON public.commission_payments(commission_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payments TO authenticated;
GRANT ALL ON public.commission_payments TO service_role;

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- DSAs see payments for commissions assigned to them; admins see all
CREATE POLICY "Admins manage all commission payments"
  ON public.commission_payments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "DSA can view own commission payments"
  ON public.commission_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.commissions c
      WHERE c.id = commission_payments.commission_id
        AND c.dsa_id = auth.uid()
    )
  );

-- Recompute commission totals from payment rows
CREATE OR REPLACE FUNCTION public.sync_commission_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_id uuid;
  v_total numeric;
  v_expected numeric;
  v_status commission_status;
  v_app_id uuid;
BEGIN
  v_commission_id := COALESCE(NEW.commission_id, OLD.commission_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.commission_payments WHERE commission_id = v_commission_id;

  SELECT expected_amount, application_id INTO v_expected, v_app_id
    FROM public.commissions WHERE id = v_commission_id;

  IF v_total >= COALESCE(v_expected, 0) AND v_total > 0 THEN
    v_status := 'received';
  ELSIF v_total > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE public.commissions
    SET received_amount = v_total, status = v_status, updated_at = now()
    WHERE id = v_commission_id;

  IF v_app_id IS NOT NULL THEN
    UPDATE public.loan_applications
      SET commission_received = v_total, updated_at = now()
      WHERE id = v_app_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_commission_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_commission_totals();

-- Notify DSA on commission insert/update
CREATE OR REPLACE FUNCTION public.notify_dsa_on_commission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_message text;
  v_delta numeric;
BEGIN
  IF NEW.dsa_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'Commission recorded';
    v_message := 'Expected commission: ₹' || COALESCE(NEW.expected_amount, 0)::text;
  ELSE
    IF NEW.received_amount IS DISTINCT FROM OLD.received_amount THEN
      v_delta := COALESCE(NEW.received_amount,0) - COALESCE(OLD.received_amount,0);
      IF NEW.status = 'received' AND OLD.status <> 'received' THEN
        v_title := 'Commission fully received';
        v_message := 'Total received: ₹' || COALESCE(NEW.received_amount,0)::text;
      ELSIF v_delta > 0 THEN
        v_title := 'Partial commission received';
        v_message := '+₹' || v_delta::text || ' (total ₹' || COALESCE(NEW.received_amount,0)::text || ')';
      ELSE
        v_title := 'Commission updated';
        v_message := 'Received amount changed to ₹' || COALESCE(NEW.received_amount,0)::text;
      END IF;
    ELSIF NEW.expected_amount IS DISTINCT FROM OLD.expected_amount THEN
      v_title := 'Expected commission updated';
      v_message := 'New expected: ₹' || COALESCE(NEW.expected_amount,0)::text;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.dsa_id, v_title, v_message, 'commission_update', '/team/commissions');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dsa_commission
  AFTER INSERT OR UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_dsa_on_commission_change();
