import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { DocPreview } from "@/components/DocPreview";
import { StatusUpdateCard } from "@/components/StatusUpdateCard";
import { RequestDocumentCard } from "@/components/RequestDocumentCard";
import { Check, X, Eye, Download, Copy, Plus, Clock, Mail, MessageCircle } from "lucide-react";
import { ApplicationBanksCard } from "@/components/ApplicationBanksCard";
import { ApplicationNotesCard } from "@/components/ApplicationNotesCard";
import { ApplicationActivityCard } from "@/components/ApplicationActivityCard";
import { ResetCustomerPasswordCard } from "@/components/ResetCustomerPasswordCard";
import { AssignApplicationCard } from "@/components/AssignApplicationCard";
import { DsaPayoutCard } from "@/components/DsaPayoutCard";
import { toast } from "sonner";
import { useState } from "react";
import { PhoneLink } from "@/components/PhoneLink";
import { AdminApplicationEditor } from "@/components/AdminApplicationEditor";
import { AdminRecordActions } from "@/components/AdminRecordActions";
import { manageRecordByAdmin } from "@/lib/admin-users.functions";
import { useServerFn } from "@tanstack/react-start";
import { downloadDocument } from "@/lib/document-storage";

const PUBLIC_SITE_URL = "https://loansmartindia.com";

export const Route = createFileRoute("/admin/applications/$id")({
  head: () => ({ meta: [
    { title: "Application Details | Loans Mart India" },
    { name: "description", content: "Review and manage a loan application." },
    { property: "og:title", content: "Application Details | Loans Mart India" },
    { property: "og:description", content: "Review and manage a loan application." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Detail,
  errorComponent: ErrBoundary,
  notFoundComponent: () => (
    <div className="p-6"><Link to="/admin/applications" className="text-sm text-muted-foreground hover:underline">← All applications</Link><p className="mt-4">Application not found.</p></div>
  ),
});

function ErrBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="p-6 space-y-3">
      <Link to="/admin/applications" className="text-sm text-muted-foreground hover:underline">← All applications</Link>
      <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded p-4 text-sm">
        <div className="font-semibold mb-1">Failed to load application</div>
        <div className="font-mono text-xs whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</div>
      </div>
      <Button size="sm" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
    </div>
  );
}

function statusBadge(s: string) {
  const map: Record<string, string> = { approved: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive", pending: "bg-warning/15 text-warning" };
  return <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${map[s] ?? "bg-muted"}`}>{s}</span>;
}

function Detail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [hours, setHours] = useState("48");
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const router = useRouter();
  const manageRecordFn = useServerFn(manageRecordByAdmin);

  const { data: app, isLoading: appLoading, error: appError } = useQuery({
    queryKey: ["a-app", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_applications").select("*, loan_types(name,id), loan_statuses(stage_name,color), profiles!loan_applications_customer_profile_fkey(full_name,email,phone)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const loanTypeId = (app?.loan_types as any)?.id ?? app?.loan_type_id;
  const { data: statuses } = useQuery({
    queryKey: ["statuses-active", loanTypeId],
    queryFn: async () => {
      const { data } = await supabase.from("loan_statuses").select("*").eq("is_active", true)
        .or(`loan_type_id.eq.${loanTypeId},loan_type_id.is.null`).order("stage_order");
      const all = data ?? [];
      const scoped = all.filter((s: any) => s.loan_type_id === loanTypeId);
      return scoped.length > 0 ? scoped : all;
    },
    enabled: !!loanTypeId,
  });
  const { data: docs } = useQuery({
    queryKey: ["a-docs", id],
    queryFn: async () => (await supabase.from("application_documents").select("*").eq("application_id", id).order("uploaded_at", { ascending: false })).data ?? [],
  });
  const { data: links } = useQuery({
    queryKey: ["a-links", id],
    queryFn: async () => (await supabase.from("banker_share_links").select("*").eq("application_id", id).order("created_at", { ascending: false })).data ?? [],
  });


  const reviewDoc = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("application_documents").update({ status }).eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document updated"); qc.invalidateQueries({ queryKey: ["a-docs", id] }); },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID();
      const expires_at = new Date(Date.now() + Number(hours) * 3600 * 1000).toISOString();
      const { error } = await supabase.from("banker_share_links").insert({
        application_id: id, generated_by: user!.id, token, expires_at, is_active: true,
        recipient_name: rName || null, recipient_email: rEmail || null, recipient_phone: rPhone || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Share link created");
      setRName(""); setREmail(""); setRPhone("");
      qc.invalidateQueries({ queryKey: ["a-links", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markSent = useMutation({
    mutationFn: async (lid: string) => {
      await supabase.from("banker_share_links").update({ sent_at: new Date().toISOString() } as any).eq("id", lid);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["a-links", id] }),
  });

  const revokeLink = useMutation({
    mutationFn: async (lid: string) => { await supabase.from("banker_share_links").update({ is_active: false }).eq("id", lid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["a-links", id] }),
  });
  const manageRecord = useMutation({
    mutationFn: (action: "archive" | "restore" | "delete") => manageRecordFn({ data: { kind: "application", id, action } }),
    onSuccess: (_result, action) => {
      toast.success(action === "delete" ? "Application permanently deleted" : action === "archive" ? "Application archived" : "Application restored");
      qc.invalidateQueries({ queryKey: ["admin-all-apps"] });
      if (action === "delete") router.navigate({ to: "/admin/applications" });
      else qc.invalidateQueries({ queryKey: ["a-app", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${PUBLIC_SITE_URL}/banker/${token}`);
    toast.success("Link copied to clipboard");
  };

  if (appLoading) return <div className="p-6 text-muted-foreground">Loading application…</div>;
  if (appError) return (
    <div className="p-6 space-y-3">
      <Link to="/admin/applications" className="text-sm text-muted-foreground hover:underline">← All applications</Link>
      <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded p-4 text-sm">
        <div className="font-semibold mb-1">Failed to load application</div>
        <div className="font-mono text-xs whitespace-pre-wrap">{(appError as any)?.message ?? String(appError)}</div>
      </div>
    </div>
  );
  if (!app) return (
    <div className="p-6 space-y-3">
      <Link to="/admin/applications" className="text-sm text-muted-foreground hover:underline">← All applications</Link>
      <p>Application not found.</p>
    </div>
  );

  const approvedCount = docs?.filter((d) => d.status === "approved").length ?? 0;
  const pendingCount = docs?.filter((d) => d.status === "pending").length ?? 0;
  const rejectedCount = docs?.filter((d) => d.status === "rejected").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/applications" className="text-sm text-muted-foreground hover:underline">← All applications</Link>
          <h1 className="text-3xl font-bold mt-1">{(app.profiles as any)?.full_name ?? (app.profiles as any)?.email}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">{(app.loan_types as any)?.name} • #{id.slice(0,8)} {(app.profiles as any)?.phone && <>• <PhoneLink phone={(app.profiles as any).phone} /></>}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge label={(app.loan_statuses as any)?.stage_name ?? "—"} color={(app.loan_statuses as any)?.color ?? "blue"} />
          <AdminApplicationEditor app={app} statuses={statuses ?? []} invalidateKey={["a-app", id]} />
          <AdminRecordActions archived={!!(app as any).archived_at} label="application" pending={manageRecord.isPending} onArchive={() => manageRecord.mutate((app as any).archived_at ? "restore" : "archive")} onDelete={() => manageRecord.mutate("delete")} />
        </div>
      </div>

      <StatusUpdateCard app={app as any} statuses={statuses ?? []} userId={user!.id} invalidateKey={["a-app", id]} />

      <AssignApplicationCard applicationId={id} currentAssignee={(app as any).assigned_to ?? null} invalidateKey={["a-app", id]} />

      <DsaPayoutCard app={{ id, assigned_to: (app as any).assigned_to ?? null, amount_disbursed: (app as any).amount_disbursed ?? null, amount_approved: (app as any).amount_approved ?? null }} />

      {loanTypeId && <ApplicationBanksCard applicationId={id} loanTypeId={loanTypeId} />}

      <Card><CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Documents</h2>
          <div className="flex gap-3 text-xs">
            <span className="text-success">✓ {approvedCount} approved</span>
            <span className="text-warning">⏳ {pendingCount} pending</span>
            <span className="text-destructive">✕ {rejectedCount} rejected</span>
          </div>
        </div>
        <div className="space-y-2">
          {docs?.map((d) => (
            <div key={d.id} className="flex items-center justify-between border rounded p-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{d.document_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {statusBadge(d.status)}
                  <span className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setPreview({ url: d.file_url, name: d.document_name })}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" title="Download" onClick={() => downloadDocument(d.file_url, d.document_name).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to download document"))}><Download className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => reviewDoc.mutate({ docId: d.id, status: "approved" })} title="Approve"><Check className="h-4 w-4 text-success" /></Button>
                <Button size="sm" variant="ghost" onClick={() => reviewDoc.mutate({ docId: d.id, status: "rejected" })} title="Reject"><X className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {(!docs || docs.length === 0) && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
        </div>
      </CardContent></Card>

      <RequestDocumentCard applicationId={id} />

      <ApplicationNotesCard applicationId={id} />

      <ResetCustomerPasswordCard applicationId={id} hasCustomer={!!app.customer_id} />

      <ApplicationActivityCard applicationId={id} />


      <Card><CardContent className="p-6 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Third-Party Share Links</h2>
            <p className="text-xs text-muted-foreground mt-1">Recipients will only see approved documents.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <div><Label>Banker name</Label><Input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Optional" /></div>
          <div><Label>Banker email</Label><Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="banker@bank.com" /></div>
          <div><Label>Banker phone</Label><Input value={rPhone} onChange={(e) => setRPhone(e.target.value)} placeholder="+91…" /></div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Expires in</Label>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
                <SelectItem value="720">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => createLink.mutate()} disabled={createLink.isPending}><Plus className="h-4 w-4 mr-1" />Generate link</Button>
        </div>
        <div className="space-y-2">
          {links?.map((l: any) => {
            const active = l.is_active && new Date(l.expires_at) > new Date();
            const url = `${PUBLIC_SITE_URL}/banker/${l.token}`;
            const customerName = (app.profiles as any)?.full_name ?? "customer";
            const msg = `Hi${l.recipient_name ? " " + l.recipient_name : ""}, please review loan documents for ${customerName}: ${url}`;
            const sendEmail = () => {
              if (!l.recipient_email) { toast.error("No email on this link"); return; }
              window.open(`mailto:${l.recipient_email}?subject=${encodeURIComponent(`Loan documents – ${customerName}`)}&body=${encodeURIComponent(msg)}`);
              markSent.mutate(l.id);
            };
            const sendWA = () => {
              if (!l.recipient_phone) { toast.error("No phone on this link"); return; }
              const phone = l.recipient_phone.replace(/[^\d]/g, "");
              const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(msg)}`;
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              markSent.mutate(l.id);
            };
            return (
              <div key={l.id} className="flex flex-wrap items-center justify-between border rounded p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate">/banker/{l.token}</div>
                  {(l.recipient_name || l.recipient_email || l.recipient_phone) && (
                    <div className="text-xs mt-1">
                      <span className="font-medium">{l.recipient_name || "—"}</span>
                      {l.recipient_email && <span className="text-muted-foreground"> · {l.recipient_email}</span>}
                      {l.recipient_phone && <span className="text-muted-foreground"> · <PhoneLink phone={l.recipient_phone} className="text-xs" /></span>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                    <Clock className="h-3 w-3" />Expires {new Date(l.expires_at).toLocaleString()} • {l.access_count} views
                    {l.sent_at && <span className="text-success">Sent {new Date(l.sent_at).toLocaleString()}</span>}
                    {!active && <span className="text-destructive">Expired</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(l.token)}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  {active && l.recipient_email && <Button size="sm" variant="ghost" onClick={sendEmail}><Mail className="h-3 w-3 mr-1" />Email</Button>}
                  {active && l.recipient_phone && <Button size="sm" variant="ghost" onClick={sendWA}><MessageCircle className="h-3 w-3 mr-1" />WhatsApp</Button>}
                  {active && <Button size="sm" variant="ghost" onClick={() => revokeLink.mutate(l.id)}>Revoke</Button>}
                </div>
              </div>
            );
          })}
          {(!links || links.length === 0) && <p className="text-sm text-muted-foreground">No share links generated yet.</p>}
        </div>
      </CardContent></Card>

      <DocPreview open={!!preview} onOpenChange={(v) => !v && setPreview(null)} url={preview?.url} name={preview?.name} />
    </div>
  );
}
