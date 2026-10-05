GRANT SELECT ON public.loan_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_types TO authenticated;
GRANT ALL ON public.loan_types TO service_role;

GRANT SELECT ON public.loan_type_banks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_type_banks TO authenticated;
GRANT ALL ON public.loan_type_banks TO service_role;

GRANT SELECT ON public.banks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
GRANT ALL ON public.banks TO service_role;