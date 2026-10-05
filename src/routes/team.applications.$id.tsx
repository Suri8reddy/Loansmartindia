import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { DocPreview } from "@/components/DocPreview";
import { StatusUpdateCard } from "@/components/StatusUpdateCard";
import { RequestDocumentCard } from "@/components/RequestDocumentCard";
import { ApplicationBanksCard } from "@/components/ApplicationBanksCard";
import { ApplicationNotesCard } from "@/components/ApplicationNotesCard";
import { ApplicationActivityCard } from "@/components/ApplicationActivityCard";
import { ResetCustomerPasswordCard } from "@/components/ResetCustomerPasswordCard";
import { Check, X, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PhoneLink } from "@/components/PhoneLink";
import { downloadDocument } from "@/lib/document-storage";

export const Route = createFileRoute("/team/applications/$id")({
  component: Detail,
  errorComponent: ErrBoundary,
  notFoundComponent: () => (
    <div className="p-6"><Link to="/team/applications" className="text-sm text-muted-foreground hover:underline">← My applications</Link><p className="mt-4">Application not found.</p></div>
  ),
});

function ErrBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="p-6 space-y-3">
      <Link to="/team/applications" className="text-sm text-muted-foreground hover:underline">← My applications</Link>
      <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded p-4 text-sm">
        <div className="font-semibold mb-1">Failed to load application</div>
        <div className="font-mono text-xs whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</div>
      </div>
      <Button size="sm" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
    </div>
  );
}

function Detail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const { data: app, isLoading: appLoading, error: appError } = useQuery({
    queryKey: ["t-app", id],
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
    queryKey: ["t-docs", id],
    queryFn: async () => (await supabase.from("application_documents").select("*").eq("application_id", id)).data ?? [],
  });

  const reviewDoc = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("application_documents").update({ status }).eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document reviewed"); qc.invalidateQueries({ queryKey: ["t-docs", id] }); },
  });

  if (appLoading) return <div className="p-6 text-muted-foreground">Loading application…</div>;
  if (appError) return (
    <div className="p-6 space-y-3">
      <Link to="/team/applications" className="text-sm text-muted-foreground hover:underline">← My applications</Link>
      <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded p-4 text-sm">
        <div className="font-semibold mb-1">Failed to load application</div>
        <div className="font-mono text-xs whitespace-pre-wrap">{(appError as any)?.message ?? String(appError)}</div>
      </div>
    </div>
  );
  if (!app) return (
    <div className="p-6 space-y-3">
      <Link to="/team/applications" className="text-sm text-muted-foreground hover:underline">← My applications</Link>
      <p>Application not found.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{(app.profiles as any)?.full_name ?? (app.profiles as any)?.email}</h1>
          <p className="text-muted-foreground text-sm">{(app.loan_types as any)?.name} • #{id.slice(0,8)}</p>
          {(app.profiles as any)?.phone && <p className="text-sm mt-1"><PhoneLink phone={(app.profiles as any).phone} /></p>}
        </div>
        <StatusBadge label={(app.loan_statuses as any)?.stage_name ?? "—"} color={(app.loan_statuses as any)?.color ?? "blue"} />
      </div>

      <StatusUpdateCard app={app as any} statuses={statuses ?? []} userId={user!.id} invalidateKey={["t-app", id]} />

      {loanTypeId && <ApplicationBanksCard applicationId={id} loanTypeId={loanTypeId} />}

      <Card><CardContent className="p-6">
        <h2 className="font-semibold mb-4">Documents</h2>
        <div className="space-y-2">
          {docs?.map((d) => {
            const cls = d.status === "approved" ? "bg-success/15 text-success" : d.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning";
            return (
              <div key={d.id} className="flex items-center justify-between border rounded p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.document_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${cls}`}>{d.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setPreview({ url: d.file_url, name: d.document_name })} title="Preview"><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Download" onClick={() => downloadDocument(d.file_url, d.document_name).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to download document"))}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => reviewDoc.mutate({ docId: d.id, status: "approved" })} title="Approve"><Check className="h-4 w-4 text-success" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => reviewDoc.mutate({ docId: d.id, status: "rejected" })} title="Reject"><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
          {(!docs || docs.length === 0) && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
        </div>
      </CardContent></Card>

      <RequestDocumentCard applicationId={id} />

      <ApplicationNotesCard applicationId={id} />

      <ResetCustomerPasswordCard applicationId={id} hasCustomer={!!(app as any).customer_id} />

      <ApplicationActivityCard applicationId={id} />


      <DocPreview open={!!preview} onOpenChange={(v) => !v && setPreview(null)} url={preview?.url} name={preview?.name} />
    </div>
  );
}
