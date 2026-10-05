
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin','customer','dsa','rm','loan_executive','team_leader');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','converted','lost');
CREATE TYPE public.doc_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.commission_status AS ENUM ('pending','partial','received');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES (separate table — security best practice)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('dsa','rm','loan_executive','team_leader','admin')
  );
$$;

-- =========================================================
-- AUTO-CREATE profile + default role on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- LOAN TYPES + DOCUMENTS + STATUSES
-- =========================================================
CREATE TABLE public.loan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  eligibility_criteria TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loan_types TO anon, authenticated;
GRANT ALL ON public.loan_types TO service_role;
ALTER TABLE public.loan_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.loan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_type_id UUID NOT NULL REFERENCES public.loan_types(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loan_documents TO anon, authenticated;
GRANT ALL ON public.loan_documents TO service_role;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.loan_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT 'blue',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loan_statuses TO authenticated;
GRANT ALL ON public.loan_statuses TO service_role;
ALTER TABLE public.loan_statuses ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- LEADS
-- =========================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  loan_type_id UUID REFERENCES public.loan_types(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'website',
  message TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- LOAN APPLICATIONS
-- =========================================================
CREATE TABLE public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type_id UUID NOT NULL REFERENCES public.loan_types(id),
  status_id UUID REFERENCES public.loan_statuses(id),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_requested NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.loan_applications TO authenticated;
GRANT ALL ON public.loan_applications TO service_role;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  status doc_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  status_id UUID REFERENCES public.loan_statuses(id),
  updated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- COMMISSIONS
-- =========================================================
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  dsa_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_amount NUMERIC(14,2) DEFAULT 0,
  received_amount NUMERIC(14,2) DEFAULT 0,
  status commission_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- WEBSITE CONTENT
-- =========================================================
CREATE TABLE public.website_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  link_url TEXT,
  cta_label TEXT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_banners TO anon, authenticated;
GRANT ALL ON public.website_banners TO service_role;
ALTER TABLE public.website_banners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT UNIQUE NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_content TO anon, authenticated;
GRANT ALL ON public.website_content TO service_role;
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- BANKER SHARE LINKS
-- =========================================================
CREATE TABLE public.banker_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  access_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.banker_share_links TO authenticated;
GRANT SELECT ON public.banker_share_links TO anon;
GRANT ALL ON public.banker_share_links TO service_role;
ALTER TABLE public.banker_share_links ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO anon;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLICIES
-- =========================================================
-- profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_team_member(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- loan_types (public read; admin manage)
CREATE POLICY "loan_types_public_read" ON public.loan_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "loan_types_admin_all" ON public.loan_types FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- loan_documents
CREATE POLICY "loan_documents_public_read" ON public.loan_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "loan_documents_admin_all" ON public.loan_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- loan_statuses
CREATE POLICY "loan_statuses_auth_read" ON public.loan_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "loan_statuses_admin_all" ON public.loan_statuses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- leads
CREATE POLICY "leads_public_insert" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "leads_team_read" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR assigned_to = auth.uid());
CREATE POLICY "leads_team_update" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR assigned_to = auth.uid());

-- loan_applications
CREATE POLICY "apps_customer_read" ON public.loan_applications FOR SELECT TO authenticated USING (customer_id = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "apps_customer_insert" ON public.loan_applications FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.is_team_member(auth.uid()));
CREATE POLICY "apps_update" ON public.loan_applications FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- application_documents
CREATE POLICY "app_docs_read" ON public.application_documents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.customer_id = auth.uid() OR a.assigned_to = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "app_docs_insert" ON public.application_documents FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.customer_id = auth.uid() OR a.assigned_to = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "app_docs_update" ON public.application_documents FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.assigned_to = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- application_status_history
CREATE POLICY "ash_read" ON public.application_status_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.customer_id = auth.uid() OR a.assigned_to = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "ash_insert" ON public.application_status_history FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));

-- commissions
CREATE POLICY "comm_read" ON public.commissions FOR SELECT TO authenticated USING (dsa_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "comm_admin_all" ON public.commissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- website_banners + content (public read, admin write)
CREATE POLICY "banners_public_read" ON public.website_banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "banners_admin_all" ON public.website_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "content_public_read" ON public.website_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "content_admin_all" ON public.website_content FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notif_self_read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_self_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- banker_share_links
CREATE POLICY "bsl_team_all" ON public.banker_share_links FOR ALL TO authenticated USING (public.is_team_member(auth.uid()) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.is_team_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bsl_public_read" ON public.banker_share_links FOR SELECT TO anon USING (is_active = true AND expires_at > now());

-- audit_logs
CREATE POLICY "audit_insert_any" ON public.audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('loan-documents','loan-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "ld_customer_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ld_customer_read_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'loan-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_team_member(auth.uid())));
CREATE POLICY "ld_team_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'loan-documents' AND public.is_team_member(auth.uid()))
WITH CHECK (bucket_id = 'loan-documents' AND public.is_team_member(auth.uid()));

-- =========================================================
-- SEED DATA
-- =========================================================
INSERT INTO public.loan_statuses (stage_name, stage_order, color) VALUES
 ('Received', 1, 'gray'),
 ('Documents Pending', 2, 'amber'),
 ('Under Review', 3, 'blue'),
 ('Submitted to Bank', 4, 'blue'),
 ('Approved', 5, 'green'),
 ('Disbursed', 6, 'green'),
 ('Rejected', 7, 'red');

INSERT INTO public.loan_types (name, description, eligibility_criteria, icon, is_active) VALUES
 ('Personal Loan', 'Quick personal loans for any need with minimal documentation.', 'Salaried with min ₹25,000/month income; CIBIL 700+', 'Wallet', true),
 ('Home Loan', 'Make your dream home a reality with competitive interest rates.', 'Salaried/self-employed; age 23-65; stable income', 'Home', true),
 ('Business Loan', 'Fuel your business growth with flexible business loans.', '2+ years in business; min ₹10L annual turnover', 'Briefcase', true),
 ('Car Loan', 'Drive home your favourite car with easy EMIs.', 'Salaried with min ₹20,000/month income', 'Car', true);

INSERT INTO public.loan_documents (loan_type_id, document_name, is_mandatory, sort_order)
SELECT id, doc, true, ord FROM public.loan_types,
LATERAL (VALUES ('PAN Card', 1), ('Aadhaar Card', 2), ('Last 3 Months Salary Slip', 3), ('Bank Statement (6 months)', 4), ('Address Proof', 5)) AS d(doc, ord);

INSERT INTO public.website_banners (title, subtitle, image_url, cta_label, link_url, position, is_active) VALUES
 ('Loans Made Simple', 'Apply online in minutes. Get approved fast.', null, 'Apply Now', '/apply', 1, true),
 ('Home Loans at Best Rates', 'Starting from 8.4% p.a. with quick disbursal.', null, 'Explore', '/loans', 2, true);

INSERT INTO public.website_content (section, content_json) VALUES
 ('hero', '{"headline":"Your trusted loan partner","subheadline":"Compare, apply and get approved for loans — all in one place."}'),
 ('about', '{"title":"About Us","body":"We connect borrowers with the right lenders through expert DSAs."}'),
 ('contact', '{"phone":"+91 98765 43210","email":"hello@loanhub.in","address":"123 Finance Street, Mumbai"}');
