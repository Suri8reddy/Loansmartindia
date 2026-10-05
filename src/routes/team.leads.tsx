import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

const searchSchema = z.object({
  status: fallback(z.string(), "").default(""),
  ...rangeSearchShape,
});

export const Route = createFileRoute("/team/leads")({
  component: Leads,
  validateSearch: zodValidator(searchSchema),
});

function Leads() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { status: statusFilter } = search;
  const range = { range: search.range, from: search.from, to: search.to };
  const [detail, setDetail] = useState<any | null>(null);
  const { data: leads } = useQuery({
    queryKey: ["team-leads-full", user?.id],
    queryFn: async () => (await supabase.from("leads").select("*, loan_types(name)").eq("assigned_to", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l: any) => {
      if (!inRange(l.created_at, range)) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      return true;
    });
  }, [leads, statusFilter, range.range, range.from, range.to]);


  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status: status as any, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["team-leads-full", user?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const convertFn = useServerFn(convertLeadToApplication);
  const convert = useMutation({
    mutationFn: async (leadId: string) => convertFn({ data: { lead_id: leadId } }),
    onSuccess: (res: any) => {
      toast.success(res?.customerCreated ? "Customer login created & application started" : "Application created");
      qc.invalidateQueries({ queryKey: ["team-leads-full", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">My Leads{statusFilter ? ` — ${statusFilter}` : ""}</h1>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
          <NewLeadDialog assignToSelf invalidateKeys={[["team-leads-full", user?.id ?? ""]]} />
        </div>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Loan</TableHead><TableHead>Status</TableHead><TableHead>Follow-up</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((l) => {
              const fu = (l as any).next_followup_at ? new Date((l as any).next_followup_at) : null;
              const overdue = fu && fu < new Date() && l.status !== "converted" && l.status !== "lost";
              return (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell><PhoneLink phone={l.phone} /></TableCell>
                <TableCell>{l.email ?? "—"}</TableCell>
                <TableCell>{(l.loan_types as any)?.name ?? "—"}</TableCell>
                <TableCell>
                  <Select value={l.status} onValueChange={(v) => update.mutate({ id: l.id, status: v })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
                <TableCell className="flex gap-1">
                  {(l as any).application_id ? (
                    <Button asChild size="sm" variant="outline"><Link to="/team/applications/$id" params={{ id: (l as any).application_id }}>View App</Link></Button>
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
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leads</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <LeadDetailDialog lead={detail} onClose={() => setDetail(null)} onLeadUpdated={(patch) => setDetail((d: any) => d ? { ...d, ...patch } : d)} />
    </div>
  );
}
