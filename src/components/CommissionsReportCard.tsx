import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { inRange, type RangeValue } from "@/lib/date-range";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8884d8", "#82ca9d"];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const monthKey = (d: string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function CommissionsReportCard({ range, scope = "all" }: { range: RangeValue; scope?: "all" | "self" }) {
  // RLS naturally scopes "self" (DSAs only see their own rows). Admins see all.
  const { data: commsAll = [] } = useQuery({
    queryKey: ["report-commissions", scope],
    queryFn: async () => (await supabase
      .from("commissions")
      .select("*, loan_applications(id, loan_types(name), profiles!loan_applications_customer_profile_fkey(full_name), application_banks(bank_id, banks(name)))")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const { data: payoutsAll = [] } = useQuery({
    queryKey: ["report-payouts", scope],
    queryFn: async () => (await supabase
      .from("dsa_payouts")
      .select("*, loan_applications(id, loan_types(name), profiles!loan_applications_customer_profile_fkey(full_name))")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const { data: dsas = [] } = useQuery({
    queryKey: ["report-dsa-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["dsa", "rm", "loan_executive", "team_leader"]);
      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      return data ?? [];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["report-banks"],
    queryFn: async () => (await supabase.from("banks").select("id,name")).data ?? [],
  });

  const dsaName = (id?: string | null) => {
    if (!id) return "Unassigned";
    const d = dsas.find((x: any) => x.id === id);
    return d?.full_name ?? d?.email ?? "Unknown";
  };

  const comms = useMemo(() => commsAll.filter((c: any) => inRange(c.created_at, range)), [commsAll, range]);
  const payouts = useMemo(() => payoutsAll.filter((p: any) => inRange(p.created_at, range)), [payoutsAll, range]);

  // ===== Bank commissions aggregates =====
  const cTotals = useMemo(() => {
    const exp = comms.reduce((s, c: any) => s + Number(c.expected_amount ?? 0), 0);
    const rec = comms.reduce((s, c: any) => s + Number(c.received_amount ?? 0), 0);
    return { exp, rec, pending: Math.max(0, exp - rec), count: comms.length };
  }, [comms]);

  const byDsa = useMemo(() => {
    const m = new Map<string, { name: string; expected: number; received: number; count: number }>();
    comms.forEach((c: any) => {
      const id = c.dsa_id ?? "unassigned";
      const cur = m.get(id) ?? { name: dsaName(c.dsa_id), expected: 0, received: 0, count: 0 };
      cur.expected += Number(c.expected_amount ?? 0);
      cur.received += Number(c.received_amount ?? 0);
      cur.count += 1;
      m.set(id, cur);
    });
    return [...m.values()].sort((a, b) => b.expected - a.expected);
  }, [comms, dsas]);

  const byLoanType = useMemo(() => {
    const m = new Map<string, { name: string; expected: number; received: number; count: number }>();
    comms.forEach((c: any) => {
      const name = c.loan_applications?.loan_types?.name ?? "Other";
      const cur = m.get(name) ?? { name, expected: 0, received: 0, count: 0 };
      cur.expected += Number(c.expected_amount ?? 0);
      cur.received += Number(c.received_amount ?? 0);
      cur.count += 1;
      m.set(name, cur);
    });
    return [...m.values()].sort((a, b) => b.expected - a.expected);
  }, [comms]);

  const byBank = useMemo(() => {
    // Pull application_banks separately so a single commission can map to multiple banks
    const m = new Map<string, { name: string; expected: number; received: number; count: number }>();
    comms.forEach((c: any) => {
      const ab = c.loan_applications?.application_banks ?? [];
      if (!ab.length) {
        const cur = m.get("Unassigned") ?? { name: "Unassigned", expected: 0, received: 0, count: 0 };
        cur.expected += Number(c.expected_amount ?? 0);
        cur.received += Number(c.received_amount ?? 0);
        cur.count += 1;
        m.set("Unassigned", cur);
        return;
      }
      ab.forEach((row: any) => {
        const name = row.banks?.name ?? banks.find((b: any) => b.id === row.bank_id)?.name ?? "Unknown";
        const cur = m.get(name) ?? { name, expected: 0, received: 0, count: 0 };
        cur.expected += Number(c.expected_amount ?? 0) / ab.length;
        cur.received += Number(c.received_amount ?? 0) / ab.length;
        cur.count += 1;
        m.set(name, cur);
      });
    });
    return [...m.values()].sort((a, b) => b.expected - a.expected);
  }, [comms, banks]);

  const byMonth = useMemo(() => {
    const m = new Map<string, { month: string; expected: number; received: number }>();
    comms.forEach((c: any) => {
      const k = monthKey(c.created_at);
      const cur = m.get(k) ?? { month: k, expected: 0, received: 0 };
      cur.expected += Number(c.expected_amount ?? 0);
      cur.received += Number(c.received_amount ?? 0);
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [comms]);

  const statusMix = useMemo(() => {
    const m = new Map<string, number>();
    comms.forEach((c: any) => m.set(c.status, (m.get(c.status) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [comms]);

  // ===== Payouts aggregates =====
  const pTotals = useMemo(() => {
    const exp = payouts.reduce((s, p: any) => s + Number(p.expected_amount ?? 0), 0);
    const paid = payouts.reduce((s, p: any) => s + Number(p.paid_amount ?? 0), 0);
    return { exp, paid, pending: Math.max(0, exp - paid), count: payouts.length };
  }, [payouts]);

  const payoutByDsa = useMemo(() => {
    const m = new Map<string, { name: string; expected: number; paid: number; count: number }>();
    payouts.forEach((p: any) => {
      const id = p.dsa_id ?? "unassigned";
      const cur = m.get(id) ?? { name: dsaName(p.dsa_id), expected: 0, paid: 0, count: 0 };
      cur.expected += Number(p.expected_amount ?? 0);
      cur.paid += Number(p.paid_amount ?? 0);
      cur.count += 1;
      m.set(id, cur);
    });
    return [...m.values()].sort((a, b) => b.expected - a.expected);
  }, [payouts, dsas]);

  const payoutByLoanType = useMemo(() => {
    const m = new Map<string, { name: string; expected: number; paid: number; count: number }>();
    payouts.forEach((p: any) => {
      const name = p.loan_applications?.loan_types?.name ?? "Other";
      const cur = m.get(name) ?? { name, expected: 0, paid: 0, count: 0 };
      cur.expected += Number(p.expected_amount ?? 0);
      cur.paid += Number(p.paid_amount ?? 0);
      cur.count += 1;
      m.set(name, cur);
    });
    return [...m.values()].sort((a, b) => b.expected - a.expected);
  }, [payouts]);

  const payoutByMonth = useMemo(() => {
    const m = new Map<string, { month: string; expected: number; paid: number }>();
    payouts.forEach((p: any) => {
      const k = monthKey(p.created_at);
      const cur = m.get(k) ?? { month: k, expected: 0, paid: 0 };
      cur.expected += Number(p.expected_amount ?? 0);
      cur.paid += Number(p.paid_amount ?? 0);
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [payouts]);

  const exportComms = () => downloadCSV(`bank-commissions-${Date.now()}.csv`, comms.map((c: any) => ({
    date: c.created_at,
    customer: c.loan_applications?.profiles?.full_name ?? "",
    loan_type: c.loan_applications?.loan_types?.name ?? "",
    dsa: dsaName(c.dsa_id),
    expected: Number(c.expected_amount ?? 0),
    received: Number(c.received_amount ?? 0),
    pending: Math.max(0, Number(c.expected_amount ?? 0) - Number(c.received_amount ?? 0)),
    status: c.status,
  })));

  const exportPayouts = () => downloadCSV(`dsa-payouts-${Date.now()}.csv`, payouts.map((p: any) => ({
    date: p.created_at,
    customer: p.loan_applications?.profiles?.full_name ?? "",
    loan_type: p.loan_applications?.loan_types?.name ?? "",
    dsa: dsaName(p.dsa_id),
    basis: p.basis,
    percentage: p.percentage,
    expected: Number(p.expected_amount ?? 0),
    paid: Number(p.paid_amount ?? 0),
    pending: Math.max(0, Number(p.expected_amount ?? 0) - Number(p.paid_amount ?? 0)),
    status: p.status,
  })));

  return (
    <Tabs defaultValue="bank">
      <TabsList>
        <TabsTrigger value="bank">Bank Commissions</TabsTrigger>
        <TabsTrigger value="payouts">DSA Payouts</TabsTrigger>
      </TabsList>

      <TabsContent value="bank" className="space-y-6">
        <div className="grid sm:grid-cols-4 gap-4">
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Records</div><div className="text-2xl font-bold">{cTotals.count}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Expected</div><div className="text-2xl font-bold">{inr(cTotals.exp)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Received</div><div className="text-2xl font-bold text-success">{inr(cTotals.rec)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-warning">{inr(cTotals.pending)}</div></CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-5">
            <div className="font-semibold mb-3">Monthly trend</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend />
                <Line type="monotone" dataKey="expected" stroke={COLORS[0]} />
                <Line type="monotone" dataKey="received" stroke={COLORS[1]} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="font-semibold mb-3">Status mix</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>

        <Card><CardContent className="p-5">
          <div className="font-semibold mb-3">Top DSAs</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDsa.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend />
              <Bar dataKey="expected" fill={COLORS[0]} /><Bar dataKey="received" fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <BreakdownTable title="By DSA" rows={byDsa} kind="bank" />
        <BreakdownTable title="By Loan Type" rows={byLoanType} kind="bank" />
        <BreakdownTable title="By Bank" rows={byBank} kind="bank" />

        <Card><CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold">Detailed transactions</div>
            <div className="text-xs text-muted-foreground">{comms.length} rows in selected range</div>
          </div>
          <Button onClick={exportComms} disabled={!comms.length}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="payouts" className="space-y-6">
        <div className="grid sm:grid-cols-4 gap-4">
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Records</div><div className="text-2xl font-bold">{pTotals.count}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Expected</div><div className="text-2xl font-bold">{inr(pTotals.exp)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Paid</div><div className="text-2xl font-bold text-success">{inr(pTotals.paid)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-warning">{inr(pTotals.pending)}</div></CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-5">
            <div className="font-semibold mb-3">Monthly trend</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={payoutByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend />
                <Line type="monotone" dataKey="expected" stroke={COLORS[0]} />
                <Line type="monotone" dataKey="paid" stroke={COLORS[1]} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="font-semibold mb-3">Top DSAs by payout</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={payoutByDsa.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend />
                <Bar dataKey="expected" fill={COLORS[0]} /><Bar dataKey="paid" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>

        <BreakdownTable title="By DSA" rows={payoutByDsa} kind="payout" />
        <BreakdownTable title="By Loan Type" rows={payoutByLoanType} kind="payout" />

        <Card><CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold">Detailed payouts</div>
            <div className="text-xs text-muted-foreground">{payouts.length} rows in selected range</div>
          </div>
          <Button onClick={exportPayouts} disabled={!payouts.length}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}

function BreakdownTable({ title, rows, kind }: { title: string; rows: any[]; kind: "bank" | "payout" }) {
  const isBank = kind === "bank";
  return (
    <Card><CardContent className="p-0">
      <div className="px-5 py-3 border-b font-semibold">{title}</div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Count</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead>{isBank ? "Received" : "Paid"}</TableHead>
          <TableHead>Pending</TableHead><TableHead>%</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const got = isBank ? r.received : r.paid;
            const pct = r.expected > 0 ? Math.round((got / r.expected) * 100) : 0;
            return (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.count}</TableCell>
                <TableCell>{inr(r.expected)}</TableCell>
                <TableCell className="text-success">{inr(got)}</TableCell>
                <TableCell className="text-warning">{inr(Math.max(0, r.expected - got))}</TableCell>
                <TableCell><Badge variant={pct >= 80 ? "default" : "outline"}>{pct}%</Badge></TableCell>
              </TableRow>
            );
          })}
          {!rows.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
