import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommissionPaymentsDialog } from "@/components/CommissionPaymentsDialog";
import { DsaPayoutPaymentsDialog } from "@/components/DsaPayoutPaymentsDialog";
import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";

const searchSchema = z.object({ ...rangeSearchShape });

export const Route = createFileRoute("/team/commissions")({
  component: MyCommissions,
  validateSearch: zodValidator(searchSchema),
});

function MyCommissions() {
  const { user, isAdmin } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<string>("bank");

  const { data: comms } = useQuery({
    queryKey: ["my-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, loan_applications(id, loan_types(name), profiles!loan_applications_customer_profile_fkey(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: payoutSettings } = useQuery({
    queryKey: ["my-payout-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dsa_payout_settings").select("*").eq("dsa_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const payoutsVisible = isAdmin || !!(payoutSettings as any)?.payout_visible;

  const { data: payouts } = useQuery({
    queryKey: ["my-dsa-payouts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("dsa_payouts")
        .select("*, loan_applications(id, loan_types(name), profiles!loan_applications_customer_profile_fkey(full_name))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && payoutsVisible,
  });

  const ranged = useMemo(() => (comms ?? []).filter((c: any) => inRange(c.created_at, range)), [comms, range.range, range.from, range.to]);
  const filtered = useMemo(() => ranged.filter((c: any) => filter === "all" || c.status === filter), [ranged, filter]);

  const totals = useMemo(() => {
    const exp = ranged.reduce((s, c: any) => s + Number(c.expected_amount ?? 0), 0);
    const rec = ranged.reduce((s, c: any) => s + Number(c.received_amount ?? 0), 0);
    return { exp, rec, pending: Math.max(0, exp - rec) };
  }, [ranged]);

  const rangedPayouts = useMemo(() => (payouts ?? []).filter((p: any) => inRange(p.created_at, range)), [payouts, range.range, range.from, range.to]);
  const payoutTotals = useMemo(() => {
    const exp = rangedPayouts.reduce((s, p: any) => s + Number(p.expected_amount ?? 0), 0);
    const paid = rangedPayouts.reduce((s, p: any) => s + Number(p.paid_amount ?? 0), 0);
    return { exp, paid, pending: Math.max(0, exp - paid) };
  }, [rangedPayouts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Commissions</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? "All commissions across DSAs" : "Commissions on applications assigned to you"}</p>
        </div>
        <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
      </div>

      {payoutsVisible && (
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="bank">Bank Commissions</TabsTrigger>
            <TabsTrigger value="payouts">My Payouts</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {view === "bank" || !payoutsVisible ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Expected</div><div className="text-2xl font-bold">₹{totals.exp.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Received</div><div className="text-2xl font-bold text-success">₹{totals.rec.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-warning">₹{totals.pending.toLocaleString()}</div></CardContent></Card>
          </div>

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="partial">Partial</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Loan</TableHead>
                <TableHead>Expected</TableHead><TableHead>Received</TableHead><TableHead>Pending</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((c: any) => {
                  const exp = Number(c.expected_amount ?? 0);
                  const rec = Number(c.received_amount ?? 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{c.loan_applications?.profiles?.full_name ?? "—"}</TableCell>
                      <TableCell>{c.loan_applications?.loan_types?.name ?? "—"}</TableCell>
                      <TableCell>₹{exp.toLocaleString()}</TableCell>
                      <TableCell className="text-success">₹{rec.toLocaleString()}</TableCell>
                      <TableCell className="text-warning">₹{Math.max(0, exp - rec).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={c.status === "received" ? "default" : "outline"}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <CommissionPaymentsDialog
                          commissionId={c.id}
                          expected={exp}
                          canRecord={isAdmin}
                          trigger={<Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />Payments</Button>}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No commissions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Expected</div><div className="text-2xl font-bold">₹{payoutTotals.exp.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Paid</div><div className="text-2xl font-bold text-success">₹{payoutTotals.paid.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-warning">₹{payoutTotals.pending.toLocaleString()}</div></CardContent></Card>
          </div>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Loan</TableHead>
                <TableHead>Basis</TableHead><TableHead>Expected</TableHead><TableHead>Paid</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rangedPayouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.loan_applications?.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>{p.loan_applications?.loan_types?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{p.basis}{p.percentage ? ` · ${p.percentage}%` : ""}</TableCell>
                    <TableCell>₹{Number(p.expected_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-success">₹{Number(p.paid_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <DsaPayoutPaymentsDialog
                        payoutId={p.id}
                        expected={Number(p.expected_amount ?? 0)}
                        canRecord={isAdmin}
                        trigger={<Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />Payments</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {rangedPayouts.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payouts yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
