import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { convertLeadToApplication } from "@/lib/lead-conversion.functions";
import { PhoneLink } from "@/components/PhoneLink";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";

const searchSchema = z.object({ archive: fallback(z.enum(["active", "archived", "all"]), "active").default("active"), ...rangeSearchShape });

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [
    { title: "Leads | Loans Mart India Admin" },
    { name: "description", content: "Manage active and archived loan leads." },
    { property: "og:title", content: "Leads | Loans Mart India Admin" },
    { property: "og:description", content: "Manage active and archived loan leads." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Leads,
  validateSearch: zodValidator(searchSchema),
});

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

function Leads() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };
  const [detail, setDetail] = useState<any | null>(null);

  const { data: leadsAll } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => (await supabase.from("leads").select("*, loan_types(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: team } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id,role").in("role", ["dsa","rm","loan_executive","team_leader"]);
      if (!roles?.length) return [];
      const ids = [...new Set(roles.map(r => r.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      return profs ?? [];
    },
  });

  const assign = useMutation({
    mutationFn: async ({ leadId, userId, reassign }: { leadId: string; userId: string; reassign: boolean }) => {
      const { error } = await supabase.from("leads").update({ assigned_to: userId, status: reassign ? undefined : "contacted" } as any).eq("id", leadId);
      if (error) throw error;
      await supabase.from("notifications").insert({ user_id: userId, title: reassign ? "Lead re-assigned" : "New lead assigned", message: "A lead has been assigned to you", type: "lead_assigned", link: "/team/leads" });
    },
    onSuccess: (_d, v) => { toast.success(v.reassign ? "Lead re-assigned" : "Lead assigned"); qc.invalidateQueries({ queryKey: ["admin-leads"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-leads"] }); },
  });

  const convertFn = useServerFn(convertLeadToApplication);
  const convert = useMutation({
    mutationFn: async (leadId: string) => convertFn({ data: { lead_id: leadId } }),
    onSuccess: (res: any) => {
      toast.success(res?.customerCreated ? "Customer login created & application started" : "Application created");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const teamName = (id?: string | null) => team?.find((m) => m.id === id)?.full_name ?? team?.find((m) => m.id === id)?.email ?? "—";

  const leads = useMemo(() => (leadsAll ?? []).filter((l: any) => {
    if (!inRange(l.created_at, range)) return false;
    if (search.archive === "active" && l.archived_at) return false;
    if (search.archive === "archived" && !l.archived_at) return false;
    return true;
  }), [leadsAll, range.range, range.from, range.to, search.archive]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex items-center gap-2">
          <Select value={search.archive} onValueChange={(archive) => navigate({ search: (s: any) => ({ ...s, archive }), replace: true })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
          </Select>
          <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
          <NewLeadDialog invalidateKeys={[["admin-leads"]]} />
        </div>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Loan</TableHead><TableHead>Status</TableHead><TableHead>Assigned To</TableHead><TableHead>Follow-up</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {leads?.map((l) => {
              const fu = (l as any).next_followup_at ? new Date((l as any).next_followup_at) : null;
              const overdue = fu && fu < new Date() && l.status !== "converted" && l.status !== "lost";
              return (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell><PhoneLink phone={l.phone} /></TableCell>
                <TableCell>{(l.loan_types as any)?.name ?? "—"}</TableCell>
                <TableCell>
                  <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={l.assigned_to ?? ""} onValueChange={(uid) => assign.mutate({ leadId: l.id, userId: uid, reassign: !!l.assigned_to })}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Assign..." /></SelectTrigger>
                    <SelectContent>{team?.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {fu ? (
                    <div className="flex flex-col">
                      <span className="text-xs">{fu.toLocaleDateString()}</span>
                      {overdue && <Badge variant="destructive" className="w-fit text-[10px] mt-0.5">Overdue</Badge>}
                    </div>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex gap-1">
                  {l.application_id ? (
                    <Button asChild size="sm" variant="outline"><Link to="/admin/applications/$id" params={{ id: l.application_id }}>View App</Link></Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={convert.isPending || !l.loan_type_id}
                      title={!l.loan_type_id ? "Lead needs a loan product" : !l.email ? "Open lead and enter client password" : ""}
                      onClick={() => !l.email ? setDetail(l) : convert.mutate(l.id)}
                    >
                      Convert
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => setDetail(l)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            );})}
            {(!leads || leads.length === 0) && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No leads yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <LeadDetailDialog lead={detail} onClose={() => setDetail(null)} onLeadUpdated={(patch) => setDetail((d: any) => d ? { ...d, ...patch } : d)} />
    </div>
  );
}
