import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, FileText, Target, Wallet } from "lucide-react";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({ ...rangeSearchShape });

export const Route = createFileRoute("/team/dashboard")({
  component: Dashboard,
  validateSearch: zodValidator(searchSchema),
});

function Dashboard() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };
  const rangeSearch = { range: search.range, from: search.from, to: search.to };

  const { data: leadsRaw } = useQuery({
    queryKey: ["team-leads", user?.id],
    queryFn: async () => (await supabase.from("leads").select("*").eq("assigned_to", user!.id)).data ?? [],
    enabled: !!user,
  });
  const { data: appsRaw } = useQuery({
    queryKey: ["team-apps", user?.id],
    queryFn: async () => (await supabase.from("loan_applications").select("*").eq("assigned_to", user!.id)).data ?? [],
    enabled: !!user,
  });

  const { data: payoutSettings } = useQuery({
    queryKey: ["my-payout-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dsa_payout_settings").select("*").eq("dsa_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const payoutsVisible = !!(payoutSettings as any)?.payout_visible;

  const { data: payoutsRaw } = useQuery({
    queryKey: ["my-dsa-payouts", user?.id],
    queryFn: async () => (await supabase.from("dsa_payouts").select("expected_amount, paid_amount, created_at").eq("dsa_id", user!.id)).data ?? [],
    enabled: !!user && payoutsVisible,
  });

  const leads = (leadsRaw ?? []).filter((l: any) => inRange(l.created_at, range));
  const apps = (appsRaw ?? []).filter((a: any) => inRange(a.created_at, range));
  const payouts = (payoutsRaw ?? []).filter((p: any) => inRange(p.created_at, range));

  const payoutExp = payouts.reduce((s, p: any) => s + Number(p.expected_amount ?? 0), 0);
  const payoutPaid = payouts.reduce((s, p: any) => s + Number(p.paid_amount ?? 0), 0);
  const conv = leads.filter((l) => l.status === "converted").length;

  type Stat = { l: string; v: number | string; i: any; to: string; extra: Record<string, string | undefined> };
  const stats: Stat[] = [
    { l: "My Leads", v: leads.length, i: UserCheck, to: "/team/leads", extra: {} },
    { l: "My Applications", v: apps.length, i: FileText, to: "/team/applications", extra: {} },
    { l: "Conversions", v: conv, i: Target, to: "/team/leads", extra: { status: "converted" } },
  ];
  if (payoutsVisible) {
    stats.push(
      { l: "Payout Expected", v: `₹${payoutExp.toLocaleString()}`, i: Wallet, to: "/team/commissions", extra: {} },
      { l: "Payout Paid", v: `₹${payoutPaid.toLocaleString()}`, i: Wallet, to: "/team/commissions", extra: {} },
      { l: "Payout Pending", v: `₹${Math.max(0, payoutExp - payoutPaid).toLocaleString()}`, i: Wallet, to: "/team/commissions", extra: {} },
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
      </div>
      <div className="grid sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.l} to={s.to} search={{ ...rangeSearch, ...s.extra } as any}>
            <Card className="hover:border-primary/40 hover:shadow-md transition cursor-pointer h-full"><CardContent className="p-5">
              <div className="flex items-center justify-between mb-1"><span className="text-sm text-muted-foreground">{s.l}</span><s.i className="h-4 w-4 text-primary" /></div>
              <div className="text-3xl font-bold">{s.v}</div>
            </CardContent></Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
