import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, XCircle, DollarSign, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({ ...rangeSearchShape });

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDash,
  validateSearch: zodValidator(searchSchema),
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function AdminDash() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };
  const rangeSearch = { range: search.range, from: search.from, to: search.to };

  const { data: appsRaw } = useQuery({
    queryKey: ["admin-apps"],
    queryFn: async () => (await supabase.from("loan_applications").select("*, loan_types(name), loan_statuses(stage_name)")).data ?? [],
  });
  const { data: commissionsRaw } = useQuery({
    queryKey: ["admin-comm"],
    queryFn: async () => (await supabase.from("commissions").select("*")).data ?? [],
  });
  const { data: payoutsRaw } = useQuery({
    queryKey: ["admin-dsa-payouts"],
    queryFn: async () => (await supabase.from("dsa_payouts").select("expected_amount, paid_amount, created_at").returns<any[]>()).data ?? [],
  });

  const apps = (appsRaw ?? []).filter((a: any) => inRange(a.created_at, range));
  const commissions = (commissionsRaw ?? []).filter((c: any) => inRange(c.created_at, range));
  const payouts = (payoutsRaw ?? []).filter((p: any) => inRange(p.created_at, range));

  const total = apps.length;
  const disbursed = apps.filter((a) => (a.loan_statuses as any)?.stage_name === "Disbursed").length;
  const approved = apps.filter((a) => (a.loan_statuses as any)?.stage_name === "Approved").length + disbursed;
  const rejected = apps.filter((a) => (a.loan_statuses as any)?.stage_name === "Rejected").length;
  const pending = total - approved - rejected;

  const expected = commissions.reduce((s, c) => s + Number(c.expected_amount ?? 0), 0);
  const received = commissions.reduce((s, c) => s + Number(c.received_amount ?? 0), 0);
  const payoutExp = payouts.reduce((s, p: any) => s + Number(p.expected_amount ?? 0), 0);
  const payoutPaid = payouts.reduce((s, p: any) => s + Number(p.paid_amount ?? 0), 0);

  const byType = Object.entries(
    apps.reduce<Record<string, number>>((acc, a) => {
      const n = (a.loan_types as any)?.name ?? "Other"; acc[n] = (acc[n] ?? 0) + 1; return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const key = d.toLocaleString("default", { month: "short" });
    const count = apps.filter((a) => new Date(a.created_at).getMonth() === d.getMonth() && new Date(a.created_at).getFullYear() === d.getFullYear()).length;
    return { month: key, count };
  });

  type Stat = { l: string; v: string | number; i: any; c: string; to: string; extra: Record<string, string | undefined> };
  const stats: Stat[] = [
    { l: "Total Applications", v: total, i: FileText, c: "text-primary", to: "/admin/applications", extra: {} },
    { l: "Approved", v: approved, i: CheckCircle, c: "text-success", to: "/admin/applications", extra: { status: "Approved" } },
    { l: "Disbursed", v: disbursed, i: TrendingUp, c: "text-success", to: "/admin/applications", extra: { status: "Disbursed" } },
    { l: "Pending", v: pending, i: Clock, c: "text-warning", to: "/admin/applications", extra: { status: "__under_review__" } },
    { l: "Rejected", v: rejected, i: XCircle, c: "text-destructive", to: "/admin/applications", extra: { status: "Rejected" } },
    { l: "Commission Expected", v: `₹${expected.toLocaleString()}`, i: DollarSign, c: "text-primary", to: "/admin/commissions", extra: { filter: "expected" } },
    { l: "Commission Received", v: `₹${received.toLocaleString()}`, i: DollarSign, c: "text-success", to: "/admin/commissions", extra: { filter: "received" } },
    { l: "Pending Commission", v: `₹${(expected - received).toLocaleString()}`, i: DollarSign, c: "text-warning", to: "/admin/commissions", extra: { filter: "pending" } },
    { l: "Payout Expected", v: `₹${payoutExp.toLocaleString()}`, i: DollarSign, c: "text-primary", to: "/admin/commissions", extra: { tab: "payouts", payoutFilter: "expected" } },
    { l: "Payout Paid", v: `₹${payoutPaid.toLocaleString()}`, i: DollarSign, c: "text-success", to: "/admin/commissions", extra: { tab: "payouts", payoutFilter: "paid" } },
    { l: "Payout Pending", v: `₹${Math.max(0, payoutExp - payoutPaid).toLocaleString()}`, i: DollarSign, c: "text-warning", to: "/admin/commissions", extra: { tab: "payouts", payoutFilter: "pending" } },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <DateRangeFilter
          value={range}
          onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.l} to={s.to} search={{ ...rangeSearch, ...s.extra } as any} className="block">
            <Card className="hover:border-primary/40 hover:shadow-md transition cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{s.l}</span>
                  <s.i className={`h-4 w-4 ${s.c}`} />
                </div>
                <div className="text-2xl font-bold">{s.v}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-6">
          <h2 className="font-semibold mb-4">Applications — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill="#1e40af" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <h2 className="font-semibold mb-4">Applications by Loan Type</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" outerRadius={90} label>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend /><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}
