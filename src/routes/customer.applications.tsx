import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Upload } from "lucide-react";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";

const searchSchema = z.object({
  status: fallback(z.enum(["all", "under_review", "approved", "rejected"]), "all").default("all"),
  ...rangeSearchShape,
});

export const Route = createFileRoute("/customer/applications")({
  component: Apps,
  validateSearch: zodValidator(searchSchema),
});

function Apps() {
  const location = useLocation();
  const isDetailPage = /^\/customer\/applications\/[^/]+/.test(location.pathname);

  if (isDetailPage) return <Outlet />;

  return <AppsList />;
}

function AppsList() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { status: statusFilter } = search;
  const range = { range: search.range, from: search.from, to: search.to };

  const { data: apps } = useQuery({
    queryKey: ["my-apps-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("loan_applications")
        .select("*, loan_types(name), loan_statuses(stage_name,color), application_documents(loan_document_id)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      const apps = data ?? [];
      const typeIds = [...new Set(apps.map((a: any) => a.loan_type_id))];
      const appIds = apps.map((a: any) => a.id);
      const reqByType: Record<string, number> = {};
      if (typeIds.length) {
        const { data: docs } = await supabase
          .from("loan_documents")
          .select("loan_type_id")
          .in("loan_type_id", typeIds)
          .eq("is_mandatory", true);
        (docs ?? []).forEach((d: any) => { reqByType[d.loan_type_id] = (reqByType[d.loan_type_id] ?? 0) + 1; });
      }
      const extraByApp: Record<string, number> = {};
      if (appIds.length) {
        const { data: extra } = await supabase
          .from("application_document_requests")
          .select("application_id, fulfilled_at")
          .in("application_id", appIds)
          .is("fulfilled_at", null);
        (extra ?? []).forEach((r: any) => { extraByApp[r.application_id] = (extraByApp[r.application_id] ?? 0) + 1; });
      }
      return apps.map((a: any) => {
        const required = reqByType[a.loan_type_id] ?? 0;
        const uploaded = new Set((a.application_documents ?? []).map((d: any) => d.loan_document_id).filter(Boolean)).size;
        const extraPending = extraByApp[a.id] ?? 0;
        const productPending = Math.max(0, required - uploaded);
        return { ...a, _pending: productPending + extraPending, _required: required + extraPending, _extraPending: extraPending };
      });
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!apps) return [];
    return apps.filter((a: any) => {
      if (!inRange(a.created_at, range)) return false;
      if (statusFilter === "all") return true;
      const stage = (a.loan_statuses as any)?.stage_name;
      if (statusFilter === "approved") return stage === "Approved" || stage === "Disbursed";
      if (statusFilter === "rejected") return stage === "Rejected";
      if (statusFilter === "under_review") return !["Approved", "Disbursed", "Rejected"].includes(stage);
      return true;
    });
  }, [apps, statusFilter, range.range, range.from, range.to]);

  const titleSuffix = statusFilter === "all" ? "" : ` — ${statusFilter.replace("_", " ")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">My Applications{titleSuffix}</h1>
        <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
      </div>
      <div className="space-y-3 lg:hidden">
        {filtered.map((a: any) => (

          <Card key={a.id}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to="/customer/applications/$id" params={{ id: a.id }} className="font-semibold hover:underline">
                    {(a.loan_types as any)?.name}
                  </Link>
                  <div className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                <StatusBadge label={(a.loan_statuses as any)?.stage_name ?? "—"} color={(a.loan_statuses as any)?.color ?? "blue"} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-medium">{a.amount_requested ? `₹${Number(a.amount_requested).toLocaleString()}` : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Documents</div>
                  {a._required === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : a._pending > 0 ? (
                    <div className="flex flex-col gap-1 items-start"><Badge variant="destructive">{a._pending} pending</Badge>{a._extraPending > 0 && <span className="text-[10px] text-warning font-medium">{a._extraPending} new request{a._extraPending>1?"s":""}</span>}</div>
                  ) : (
                    <Badge variant="secondary">All uploaded</Badge>
                  )}
                </div>
              </div>

              <Button asChild className="w-full" variant={a._pending > 0 ? "default" : "outline"}>
                <Link
                  to="/customer/applications/$id"
                  params={{ id: a.id }}
                  hash={a._pending > 0 ? "documents-upload" : "documents"}
                >
                  <Upload className="h-4 w-4 mr-1" /> {a._pending > 0 ? "Upload Documents" : "View Documents"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="text-center text-muted-foreground py-12">No applications</CardContent></Card>
        )}

      </div>

      <Card className="hidden lg:block"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Loan Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Documents</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell><Link to="/customer/applications/$id" params={{ id: a.id }} className="font-medium hover:underline">{(a.loan_types as any)?.name}</Link></TableCell>
                <TableCell>{a.amount_requested ? `₹${Number(a.amount_requested).toLocaleString()}` : "—"}</TableCell>
                <TableCell><StatusBadge label={(a.loan_statuses as any)?.stage_name ?? "—"} color={(a.loan_statuses as any)?.color ?? "blue"} /></TableCell>
                <TableCell>
                  {a._required === 0 ? (
                    <span className="text-muted-foreground text-sm">—</span>
                  ) : a._pending > 0 ? (
                    <div className="flex flex-col gap-1 items-start"><Badge variant="destructive">{a._pending} pending</Badge>{a._extraPending > 0 && <span className="text-[10px] text-warning font-medium">{a._extraPending} new request{a._extraPending>1?"s":""}</span>}</div>
                  ) : (
                    <Badge variant="secondary">All uploaded</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant={a._pending > 0 ? "default" : "outline"}>
                    <Link
                      to="/customer/applications/$id"
                      params={{ id: a.id }}
                      hash={a._pending > 0 ? "documents-upload" : "documents"}
                    >
                      <Upload className="h-4 w-4 mr-1" /> {a._pending > 0 ? "Upload Documents" : "View Documents"}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No applications</TableCell></TableRow>
            )}

          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
