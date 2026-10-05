
-- Tighten "always true" policies
DROP POLICY IF EXISTS "leads_public_insert" ON public.leads;
CREATE POLICY "leads_public_insert" ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (length(coalesce(name,'')) > 0 AND length(coalesce(phone,'')) > 0);

DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_logs;
CREATE POLICY "audit_insert_any" ON public.audit_logs FOR INSERT TO anon, authenticated
WITH CHECK (length(coalesce(action,'')) > 0);

-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- RLS policy evaluation runs with table-owner privileges, so these functions
-- remain callable from within policies even with EXECUTE revoked from end users.
