import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommissionPaymentsDialog } from "@/components/CommissionPaymentsDialog";
import { DsaPayoutPaymentsDialog } from "@/components/DsaPayoutPaymentsDialog";
import { Eye } from "lucide-react";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";

const searchSchema = z.object({
  filter: fallback(z.enum(["all", "expected", "received", "pending"]), "all").default("all"),
  tab: fallback(z.enum(["all", "dsa", "payouts"]), "all").default("all"),
  payoutFilter: fallback(z.enum(["all", "expected", "paid", "pending"]), "all").default("all"),
  ...rangeSearchShape,
});

export const Route = createFileRoute("/admin/commissions")({
  component: Commissions,
  validateSearch: zodValidator(searchSchema),
});

function Commissions() {
  const search = Route.useSearch();
  const { filter, tab, payoutFilter } = search;
  const range = { range: search.range, from: search.from, to: search.to };
  const navigate = Route.useNavigate();

  const { data: commsAll } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => (await supabase.from("commissions").select("*, loan_applications(id, loan_types(name), profiles!loan_applications_customer_profile_fkey(full_name))").order("created_at", { ascending: false })).data ?? [],
  });
  const comms = useMemo(() => (commsAll ?? []).filter((c: any) => inRange(c.created_at, range)), [commsAll, range.range, range.from, range.to]);
  const { data: dsas } = useQuery({
    queryKey: ["dsa-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "dsa");
      const ids = [...new Set((roles ?? []).map(r => r.user_id))];
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      return data ?? [];
    },
  });

  const { data: payoutsAll } = useQuery({
    queryKey: ["dsa-payouts-all"],
    queryFn: async () =>
      (await supabase
        .from("dsa_payouts")
        .select("*, loan_applications(id, loan_types(name), profiles!loan_applications_customer_profile_fkey(full_name))")
        .order("created_at", { ascending: false })).data ?? [],
  });
  const payouts = useMemo(() => (payoutsAll ?? []).filter((p: any) => inRange(p.created_at, range)), [payoutsAll, range.range, range.from, range.to]);



  const expected = comms?.reduce((s, c) => s + Number(c.expected_amount ?? 0), 0) ?? 0;
  const received = comms?.reduce((s, c) => s + Number(c.received_amount ?? 0), 0) ?? 0;

  const byDsa = useMemo(() => {
    const map = new Map<string, { name: string; expected: number; received: number; count: number }>();
    (comms ?? []).forEach((c: any) => {
      const id = c.dsa_id ?? "unassigned";
      const name = c.dsa_id ? (dsas?.find(d => d.id === c.dsa_id)?.full_name ?? dsas?.find(d => d.id === c.dsa_id)?.email ?? "Unknown DSA") : "Unassigned";
      const cur = map.get(id) ?? { name, expected: 0, received: 0, count: 0 };
      cur.expected += Number(c.expected_amount ?? 0);
      cur.received += Number(c.received_amount ?? 0);
      cur.count += 1;
      map.set(id, cur);
    });
    return [...map.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.expected - a.expected);
  }, [comms, dsas]);

  const filteredComms = useMemo(() => {
    return (comms ?? []).filter((c: any) => {
      const exp = Number(c.expected_amount ?? 0);
      const rec = Number(c.received_amount ?? 0);
      if (filter === "expected") return exp > 0;
      if (filter === "received") return rec > 0;
      if (filter === "pending") return rec < exp;
      return true;
    });
  }, [comms, filter]);

  const payoutTotals = useMemo(() => {
    const exp = (payouts ?? []).reduce((s, p: any) => s + Number(p.expected_amount ?? 0), 0);
    const paid = (payouts ?? []).reduce((s, p: any) => s + Number(p.paid_amount ?? 0), 0);
    return { exp, paid, pending: Math.max(0, exp - paid) };
  }, [payouts]);

  const filteredPayouts = useMemo(() => {
    return (payouts ?? []).filter((p: any) => {
      const exp = Number(p.expected_amount ?? 0);
      const paid = Number(p.paid_amount ?? 0);
      if (payoutFilter === "expected") return exp > 0;
      if (payoutFilter === "paid") return paid > 0;
      if (payoutFilter === "pending") return paid < exp;
      return true;
    });
  }, [payouts, payoutFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Commissions{filter !== "all" ? ` — ${filter}` : ""}</h1>
        <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Bank Expected</div><div className="text-2xl font-bold">₹{expected.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Bank Received</div><div className="text-2xl font-bold text-success">₹{received.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Bank Pending</div><div className="text-2xl font-bold text-warning">₹{(expected - received).toLocaleString()}</div></CardContent></Card>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">DSA Payout Expected</div><div className="text-2xl font-bold">₹{payoutTotals.exp.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">DSA Payout Paid</div><div className="text-2xl font-bold text-success">₹{payoutTotals.paid.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">DSA Payout Pending</div><div className="text-2xl font-bold text-warning">₹{payoutTotals.pending.toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate({ search: (s: any) => ({ ...s, tab: v }) })}>
        <TabsList>
          <TabsTrigger value="all">Bank Commissions</TabsTrigger>
          <TabsTrigger value="dsa">DSA-wise Report</TabsTrigger>
          <TabsTrigger value="payouts">DSA Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Loan</TableHead><TableHead>DSA</TableHead><TableHead>Expected</TableHead><TableHead>Received</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredComms.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.loan_applications?.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>{c.loan_applications?.loan_types?.name ?? "—"}</TableCell>
                    <TableCell>{c.dsa_id ? (dsas?.find(d => d.id === c.dsa_id)?.full_name ?? "—") : "—"}</TableCell>
                    <TableCell>₹{Number(c.expected_amount).toLocaleString()}</TableCell>
                    <TableCell>₹{Number(c.received_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell><Badge>{c.status}</Badge></TableCell>
                    <TableCell>
                      <CommissionPaymentsDialog
                        commissionId={c.id}
                        expected={Number(c.expected_amount ?? 0)}
                        canRecord
                        trigger={<Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />Payments</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredComms.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No commissions match</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="dsa">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>DSA</TableHead><TableHead>Deals</TableHead><TableHead>Expected</TableHead><TableHead>Received</TableHead><TableHead>Pending</TableHead><TableHead>Collection %</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byDsa.map((d) => {
                  const pct = d.expected > 0 ? Math.round((d.received / d.expected) * 100) : 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.count}</TableCell>
                      <TableCell>₹{d.expected.toLocaleString()}</TableCell>
                      <TableCell className="text-success">₹{d.received.toLocaleString()}</TableCell>
                      <TableCell className="text-warning">₹{(d.expected - d.received).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={pct >= 80 ? "default" : "outline"}>{pct}%</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {byDsa.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Loan</TableHead><TableHead>DSA</TableHead><TableHead>Basis</TableHead><TableHead>Expected</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredPayouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.loan_applications?.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>{p.loan_applications?.loan_types?.name ?? "—"}</TableCell>
                    <TableCell>{dsas?.find(d => d.id === p.dsa_id)?.full_name ?? dsas?.find(d => d.id === p.dsa_id)?.email ?? "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{p.basis}{p.percentage ? ` · ${p.percentage}%` : ""}</TableCell>
                    <TableCell>₹{Number(p.expected_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-success">₹{Number(p.paid_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <DsaPayoutPaymentsDialog
                        payoutId={p.id}
                        expected={Number(p.expected_amount ?? 0)}
                        canRecord
                        trigger={<Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />Payments</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayouts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No payouts yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
