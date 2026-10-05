import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle, XCircle, FileText, IndianRupee, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ApprovalCelebration } from "@/components/ApprovalCelebration";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({ ...rangeSearchShape });

export const Route = createFileRoute("/customer/dashboard")({
  component: Dashboard,
  validateSearch: zodValidator(searchSchema),
});

function Dashboard() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };
  const rangeSearch = { range: search.range, from: search.from, to: search.to };

  const { data: appsAll } = useQuery({
    queryKey: ["my-apps", user?.id],
    queryFn: async () => (await supabase.from("loan_applications").select("*, loan_types(name), loan_statuses(stage_name,color)").eq("customer_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const apps = (appsAll ?? []).filter((a: any) => inRange(a.created_at, range));

  const total = apps.length;
  const stageOf = (a: any) => (a.loan_statuses as any)?.stage_name;
  const underReview = apps.filter((a) => !["Approved", "Disbursed", "Rejected"].includes(stageOf(a))).length;
  const approved = apps.filter((a) => ["Approved", "Disbursed"].includes(stageOf(a))).length;
  const rejected = apps.filter((a) => stageOf(a) === "Rejected").length;
  const totalApproved = apps.reduce((s, a) => s + Number(a.amount_approved ?? 0), 0);
  const totalDisbursed = apps.reduce((s, a) => s + Number(a.amount_disbursed ?? 0), 0);

  return (
    <div className="space-y-8">
      <ApprovalCelebration apps={appsAll as any} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">My Dashboard</h1><p className="text-muted-foreground">Track all your loan applications</p></div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
          <Button asChild><Link to="/apply"><Plus className="h-4 w-4 mr-2" />New Application</Link></Button>
        </div>
      </div>

      {(totalApproved > 0 || totalDisbursed > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {totalApproved > 0 && (
            <Link to="/customer/applications" search={{ ...rangeSearch, status: "approved" } as any}>
              <Card className="border-success/30 bg-gradient-to-br from-success/10 to-transparent hover:shadow-md transition cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-success" /> Total Approved</div>
                    <div className="text-3xl font-bold text-success mt-1">₹{totalApproved.toLocaleString()}</div>
                  </div>
                  <IndianRupee className="h-10 w-10 text-success/40" />
                </CardContent>
              </Card>
            </Link>
          )}
          {totalDisbursed > 0 && (
            <Link to="/customer/applications" search={{ ...rangeSearch, status: "approved" } as any}>
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent hover:shadow-md transition cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Total Disbursed</div>
                    <div className="text-3xl font-bold text-primary mt-1">₹{totalDisbursed.toLocaleString()}</div>
                  </div>
                  <IndianRupee className="h-10 w-10 text-primary/40" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: total, icon: FileText, color: "text-primary", status: "all" as const },
          { label: "Under Review", value: underReview, icon: Clock, color: "text-warning", status: "under_review" as const },
          { label: "Approved", value: approved, icon: CheckCircle, color: "text-success", status: "approved" as const },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-destructive", status: "rejected" as const },
        ].map((s) => (
          <Link key={s.label} to="/customer/applications" search={{ ...rangeSearch, status: s.status } as any}>
            <Card className="hover:border-primary/40 hover:shadow-md transition cursor-pointer h-full"><CardContent className="p-5">
              <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{s.label}</span><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent></Card>
          </Link>
        ))}
      </div>


      <Card><CardContent className="p-6">
        <h2 className="font-semibold mb-4">Recent Applications</h2>
        {apps && apps.length > 0 ? (
          <div className="divide-y">
            {apps.slice(0, 5).map((a) => {
              const stage = stageOf(a);
              const approvedAmt = Number(a.amount_approved ?? 0);
              const disbursedAmt = Number(a.amount_disbursed ?? 0);
              return (
                <Link key={a.id} to="/customer/applications/$id" params={{ id: a.id }} className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 rounded">
                  <div>
                    <div className="font-medium">{(a.loan_types as any)?.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</div>
                    {(approvedAmt > 0 || disbursedAmt > 0) && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {approvedAmt > 0 && <span className="text-xs px-2 py-0.5 rounded bg-success/15 text-success font-medium">Approved ₹{approvedAmt.toLocaleString()}</span>}
                        {disbursedAmt > 0 && <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-medium">Disbursed ₹{disbursedAmt.toLocaleString()}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {a.amount_requested && <span className="text-sm hidden sm:inline">₹{Number(a.amount_requested).toLocaleString()}</span>}
                    <StatusBadge label={stage ?? "—"} color={(a.loan_statuses as any)?.color ?? "blue"} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No applications in this range</p>
            <Button asChild className="mt-4"><Link to="/apply">Apply for your first loan</Link></Button>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
