import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewApplicationDialog } from "@/components/NewApplicationDialog";
import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";

const searchSchema = z.object({
  status: fallback(z.string(), "").default(""),
  product: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  ...rangeSearchShape,
});

export const Route = createFileRoute("/team/applications")({
  component: Apps,
  validateSearch: zodValidator(searchSchema),
});

const ALL = "__all__";
const UNDER_REVIEW = "__under_review__";

function Apps() {
  const location = useLocation();
  const isDetailPage = /^\/team\/applications\/[^/]+/.test(location.pathname);
  if (isDetailPage) return <Outlet />;
  return <AppsList />;
}

function AppsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q || "");
  const [statusFilter, setStatusFilter] = useState(search.status || ALL);
  const [productFilter, setProductFilter] = useState(search.product || ALL);

  useEffect(() => {
    setQ(search.q || "");
    setStatusFilter(search.status || ALL);
    setProductFilter(search.product || ALL);
  }, [search.q, search.status, search.product]);

  const { data: apps } = useQuery({
    queryKey: ["team-apps-full", user?.id],
    queryFn: async () => {
      const uid = user!.id;
      const { data: leadRows } = await supabase
        .from("leads")
        .select("application_id")
        .not("application_id", "is", null)
        .or(`assigned_to.eq.${uid},created_by.eq.${uid},converted_by.eq.${uid}`);
      const leadAppIds = (leadRows ?? []).map((r: any) => r.application_id).filter(Boolean);
      const filter = leadAppIds.length > 0
        ? `assigned_to.eq.${uid},id.in.(${leadAppIds.join(",")})`
        : `assigned_to.eq.${uid}`;
      const { data } = await supabase
        .from("loan_applications")
        .select("*, loan_types(name,id), loan_statuses(stage_name,color), profiles!loan_applications_customer_profile_fkey(full_name,email,phone), application_documents(status)")
        .or(filter)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: statuses } = useQuery({
    queryKey: ["statuses-flat"],
    queryFn: async () => (await supabase.from("loan_statuses").select("id,stage_name").eq("is_active", true).order("stage_order")).data ?? [],
  });
  const uniqueStatuses = useMemo(() => {
    const seen = new Set<string>();
    return (statuses ?? []).filter((s: any) => {
      if (seen.has(s.stage_name)) return false;
      seen.add(s.stage_name);
      return true;
    });
  }, [statuses]);
  const { data: products } = useQuery({
    queryKey: ["products-flat"],
    queryFn: async () => (await supabase.from("loan_types").select("id,name").order("name")).data ?? [],
  });

  const range = { range: search.range, from: search.from, to: search.to };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const closedStages = new Set(["Approved", "Disbursed", "Rejected"]);
    return (apps ?? []).filter((a: any) => {
      if (!inRange(a.created_at, range)) return false;
      const stageName = (a.loan_statuses as any)?.stage_name ?? "";
      if (statusFilter === UNDER_REVIEW) {
        if (closedStages.has(stageName)) return false;
      } else if (statusFilter === "Approved") {
        if (stageName !== "Approved" && stageName !== "Disbursed") return false;
      } else if (statusFilter !== ALL && stageName !== statusFilter) return false;
      if (productFilter !== ALL && (a.loan_types as any)?.id !== productFilter) return false;
      if (!ql) return true;
      const hay = [
        (a.profiles as any)?.full_name, (a.profiles as any)?.email, (a.profiles as any)?.phone,
        a.id?.slice(0, 8), (a.loan_types as any)?.name,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(ql);
    });
  }, [apps, q, statusFilter, productFilter, range.range, range.from, range.to]);

  const updateUrl = (next: { q?: string; status?: string; product?: string; range?: any; from?: string; to?: string }) => {
    navigate({
      to: "/team/applications",
      search: (prev: any) => ({
        ...prev,
        q: (next.q ?? q) || "",
        status: (next.status ?? statusFilter) === ALL ? "" : (next.status ?? statusFilter),
        product: (next.product ?? productFilter) === ALL ? "" : (next.product ?? productFilter),
        ...(next.range !== undefined ? { range: next.range, from: next.from, to: next.to } : {}),
      }),
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={(v) => updateUrl({ range: v.range, from: v.from, to: v.to })} />
          <NewApplicationDialog />
        </div>
      </div>

      <Card><CardContent className="p-4">
        <div className="grid sm:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search customer, phone, email, app #" value={q} onChange={(e) => { setQ(e.target.value); updateUrl({ q: e.target.value }); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); updateUrl({ status: v }); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value={UNDER_REVIEW}>Under Review (pending)</SelectItem>
              {uniqueStatuses.map((s: any) => <SelectItem key={s.id} value={s.stage_name}>{s.stage_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); updateUrl({ product: v }); }}>
            <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All products</SelectItem>
              {products?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground mt-2">{filtered.length} of {apps?.length ?? 0} applications</div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Customer</TableHead><TableHead>Loan</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Docs</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((a: any) => {
              const ds = (a.application_documents as any[]) ?? [];
              const approved = ds.filter((d) => d.status === "approved").length;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{(a.profiles as any)?.full_name ?? (a.profiles as any)?.email ?? "—"}</TableCell>
                  <TableCell>{(a.loan_types as any)?.name}</TableCell>
                  <TableCell>{a.amount_requested ? `₹${Number(a.amount_requested).toLocaleString()}` : "—"}</TableCell>
                  <TableCell><StatusBadge label={(a.loan_statuses as any)?.stage_name ?? "—"} color={(a.loan_statuses as any)?.color ?? "blue"} /></TableCell>
                  <TableCell className="text-xs"><span className="text-success">{approved}</span> / {ds.length}</TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => navigate({ to: "/team/applications/$id", params: { id: a.id } })}>Review</Button></TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No applications match</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
