import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle2, XCircle, Upload, FilePlus, DollarSign, Building2, Phone, MessageSquare, CalendarClock, UserPlus, ArrowRightLeft, UserCog } from "lucide-react";

type Event = { ts: string; icon: any; iconColor: string; title: string; detail?: string; actor?: string };

export function ApplicationActivityCard({ applicationId }: { applicationId: string }) {
  const { data: history } = useQuery({
    queryKey: ["activity-hist", applicationId],
    queryFn: async () => (await supabase.from("application_status_history")
      .select("*, loan_statuses(stage_name)").eq("application_id", applicationId).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: docs } = useQuery({
    queryKey: ["activity-docs", applicationId],
    queryFn: async () => (await supabase.from("application_documents").select("*").eq("application_id", applicationId)).data ?? [],
  });
  const { data: reqs } = useQuery({
    queryKey: ["activity-reqs", applicationId],
    queryFn: async () => (await supabase.from("application_document_requests").select("*").eq("application_id", applicationId)).data ?? [],
  });
  const { data: appBanks } = useQuery({
    queryKey: ["activity-banks", applicationId],
    queryFn: async () => (await supabase.from("application_banks").select("*, banks(name)").eq("application_id", applicationId)).data ?? [],
  });
  const { data: payments } = useQuery({
    queryKey: ["activity-pay", applicationId],
    queryFn: async () => {
      const { data: comm } = await supabase.from("commissions").select("id").eq("application_id", applicationId).maybeSingle();
      if (!comm?.id) return [];
      return (await supabase.from("commission_payments").select("*").eq("commission_id", comm.id)).data ?? [];
    },
  });
  const { data: lead } = useQuery({
    queryKey: ["activity-lead", applicationId],
    queryFn: async () => (await supabase.from("leads").select("*").eq("application_id", applicationId).maybeSingle()).data,
  });
  const { data: leadNotes } = useQuery({
    queryKey: ["activity-lead-notes", lead?.id],
    queryFn: async () => lead?.id ? (await supabase.from("lead_notes").select("*").eq("lead_id", lead.id)).data ?? [] : [],
    enabled: !!lead?.id,
  });
  const { data: appNotes } = useQuery({
    queryKey: ["activity-app-notes", applicationId],
    queryFn: async () => (await supabase.from("application_notes").select("*").eq("application_id", applicationId)).data ?? [],
  });
  const { data: convertedBy } = useQuery({
    queryKey: ["activity-converter", (lead as any)?.converted_by],
    queryFn: async () => {
      const uid = (lead as any)?.converted_by;
      if (!uid) return null;
      const { data } = await supabase.from("profiles").select("full_name,email").eq("id", uid).maybeSingle();
      return data;
    },
    enabled: !!(lead as any)?.converted_by,
  });
  const { data: audits } = useQuery({
    queryKey: ["activity-audit", applicationId],
    queryFn: async () => (await supabase.from("audit_logs")
      .select("*").eq("entity_type", "loan_application").eq("entity_id", applicationId)).data ?? [],
  });
  const actorIds = Array.from(new Set((audits ?? []).map((a: any) => a.user_id).filter(Boolean)));
  const { data: actors } = useQuery({
    queryKey: ["activity-audit-actors", actorIds.sort().join(",")],
    queryFn: async () => actorIds.length
      ? (await supabase.from("profiles").select("id,full_name,email").in("id", actorIds)).data ?? []
      : [],
    enabled: actorIds.length > 0,
  });

  const events: Event[] = [];
  if (lead) {
    events.push({
      ts: lead.created_at, icon: UserPlus, iconColor: "text-purple-600",
      title: `Enquiry received from ${lead.name}`,
      detail: [lead.phone, lead.email].filter(Boolean).join(" • ") + (lead.message ? ` — "${lead.message}"` : ""),
    });
    if ((lead as any).next_followup_at) {
      events.push({
        ts: (lead as any).next_followup_at, icon: CalendarClock, iconColor: "text-amber-600",
        title: `Lead follow-up scheduled`,
      });
    }
    if ((lead as any).requirements) {
      events.push({
        ts: lead.created_at, icon: MessageSquare, iconColor: "text-purple-600",
        title: "Lead requirements captured", detail: (lead as any).requirements,
      });
    }
    if ((lead as any).converted_at) {
      const who = convertedBy?.full_name ?? convertedBy?.email ?? "team";
      events.push({
        ts: (lead as any).converted_at, icon: ArrowRightLeft, iconColor: "text-success",
        title: `Enquiry converted to application`,
        detail: `Converted by ${who}`,
      });
    }
  }
  for (const n of leadNotes ?? []) {
    events.push({ ts: n.created_at, icon: Phone, iconColor: "text-purple-600", title: `Lead note / call log`, detail: n.body });
  }
  for (const n of appNotes ?? []) {
    events.push({
      ts: n.created_at, icon: MessageSquare, iconColor: "text-slate-600",
      title: `Internal note`,
      detail: (n as any).body + ((n as any).followup_at ? ` (follow-up: ${new Date((n as any).followup_at).toLocaleDateString()})` : ""),
    });
  }
  for (const h of history ?? []) {
    events.push({
      ts: h.created_at, icon: Activity, iconColor: "text-primary",
      title: `Status → ${(h.loan_statuses as any)?.stage_name ?? "—"}`,
      detail: h.notes ?? undefined,
    });
  }
  for (const d of docs ?? []) {
    events.push({ ts: d.uploaded_at, icon: Upload, iconColor: "text-blue-600", title: `Document uploaded: ${d.document_name}` });
    if (d.status === "approved") events.push({ ts: d.uploaded_at, icon: CheckCircle2, iconColor: "text-success", title: `Approved: ${d.document_name}` });
    if (d.status === "rejected") events.push({ ts: d.uploaded_at, icon: XCircle, iconColor: "text-destructive", title: `Rejected: ${d.document_name}` });
  }
  for (const r of reqs ?? []) {
    events.push({ ts: r.created_at, icon: FilePlus, iconColor: "text-amber-600", title: `Document requested: ${r.document_name}` });
  }
  for (const b of appBanks ?? []) {
    if ((b as any).submitted_at) events.push({ ts: (b as any).submitted_at, icon: Building2, iconColor: "text-indigo-600", title: `Submitted to bank: ${(b.banks as any)?.name ?? "—"}` });
    if ((b as any).updated_at && (b as any).status) events.push({ ts: (b as any).updated_at, icon: Building2, iconColor: "text-indigo-600", title: `Bank update — ${(b.banks as any)?.name ?? "—"}: ${(b as any).status}`, detail: (b as any).remarks ?? undefined });
  }
  for (const p of payments ?? []) {
    events.push({ ts: p.created_at, icon: DollarSign, iconColor: "text-success", title: `Commission payment: ₹${Number(p.amount).toLocaleString()}`, detail: p.notes ?? undefined });
  }
  for (const a of audits ?? []) {
    const meta = ((a as any).metadata ?? {}) as any;
    const actor = actors?.find((p: any) => p.id === (a as any).user_id);
    const actorName = actor?.full_name ?? actor?.email ?? "Admin";
    if ((a as any).action === "application_reassigned") {
      const to = meta.to_name ?? (meta.to ? "team member" : "Unassigned");
      const from = meta.from_name ?? (meta.from ? "previous assignee" : "Unassigned");
      events.push({
        ts: (a as any).created_at,
        icon: UserCog,
        iconColor: "text-indigo-600",
        title: `Reassigned to ${to}`,
        detail: `by ${actorName} (was ${from})`,
      });
    }
  }

  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <Card><CardContent className="p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4"><Activity className="h-4 w-4" />Activity log</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <li key={i} className="flex gap-3 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${e.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{e.title}</div>
                  {e.detail && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{e.detail}</p>}
                  <div className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </CardContent></Card>
  );
}
