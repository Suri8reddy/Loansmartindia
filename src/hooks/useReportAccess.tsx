import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Who can see the Commissions Report:
 *  - admins and team_leaders: always
 *  - other team members: only when admin has toggled report_access=true on their settings
 */
export function useReportAccess() {
  const { user, roles, isAdmin } = useAuth();
  const isTeamLeader = roles.includes("team_leader");

  const { data, isLoading } = useQuery({
    queryKey: ["my-report-access", user?.id],
    enabled: !!user && !isAdmin && !isTeamLeader,
    queryFn: async () => {
      const { data } = await supabase
        .from("dsa_payout_settings")
        .select("report_access")
        .eq("dsa_id", user!.id)
        .maybeSingle();
      return !!(data as any)?.report_access;
    },
  });

  const allowed = isAdmin || isTeamLeader || !!data;
  return { allowed, loading: !!user && !isAdmin && !isTeamLeader && isLoading };
}
