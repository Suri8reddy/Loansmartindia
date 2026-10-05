import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  archive: fallback(z.enum(["active", "archived", "all"]), "active").default("active"),
  ...rangeSearchShape,
});

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [
    { title: "Applications | Loans Mart India Admin" },
    { name: "description", content: "Search and manage active and archived loan applications." },
    { property: "og:title", content: "Applications | Loans Mart India Admin" },
    { property: "og:description", content: "Search and manage active and archived loan applications." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Apps,
  validateSearch: zodValidator(searchSchema),
});

const ALL = "__all__";
const UNDER_REVIEW = "__under_review__";

function Apps() {
  const location = useLocation();
  const isDetailPage = /^\/admin\/applications\/[^/]+/.test(location.pathname);

  if (isDetailPage) return <Outlet />;

  return <AppsList />;
}

function AppsList() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q || "");
  const [statusFilter, setStatusFilter] = useState(search.status || ALL);
  const [productFilter, setProductFilter] = useState(search.product || ALL);

  // Sync URL → state when navigating in via a dashboard link
  useEffect(() => {
    setQ(search.q || "");
    setStatusFilter(search.status || ALL);
    setProductFilter(search.product || ALL);
  }, [search.q, search.status, search.product]);


  const { data: apps } = useQuery({
    queryKey: ["admin-all-apps"],
    queryFn: async () => (await supabase.from("loan_applications").select("*, loan_types(name,id), loan_statuses(stage_name,color), profiles!loan_applications_customer_profile_fkey(full_name,email,phone), application_documents(status)").order("created_at", { ascending: false })).data ?? [],
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
      if (search.archive === "active" && a.archived_at) return false;
      if (search.archive === "archived" && !a.archived_at) return false;
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
  }, [apps, q, statusFilter, productFilter, range.range, range.from, range.to, search.archive]);

  const updateUrl = (next: { q?: string; status?: string; product?: string; range?: any; from?: string; to?: string }) => {
    navigate({
      to: "/admin/applications",
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
        <h1 className="text-3xl font-bold">All Applications</h1>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={(v) => updateUrl({ range: v.range, from: v.from, to: v.to })} />
          <NewApplicationDialog showAssignee />
        </div>
      </div>

      <Card><CardContent className="p-4">
        <div className="grid sm:grid-cols-5 gap-2">
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
          <Select value={search.archive} onValueChange={(archive) => navigate({ to: "/admin/applications", search: (prev: any) => ({ ...prev, archive }), replace: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
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
                  <TableCell><Button size="sm" variant="outline" onClick={() => navigate({ to: "/admin/applications/$id", params: { id: a.id } })}>Review</Button></TableCell>
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
