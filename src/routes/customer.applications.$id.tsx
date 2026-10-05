import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Upload, FileText, Download, Check, X, Clock, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useId, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ApplicationBanksCard } from "@/components/ApplicationBanksCard";
import { downloadDocument } from "@/lib/document-storage";

export const Route = createFileRoute("/customer/applications/$id")({ component: Detail });

type RequiredDoc = {
  id: string;
  document_name: string;
  description: string | null;
  is_mandatory: boolean;
  allowed_formats: string[] | null;
  source: "product" | "request";
  request_id?: string | null;
};

const BROAD_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx";

function Detail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: app, isLoading: appLoading, error: appError } = useQuery({
    queryKey: ["app", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_applications").select("*, loan_types(name,id), loan_statuses(stage_name,color,stage_order)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: productDocs } = useQuery({
    queryKey: ["req-docs", app?.loan_type_id],
    queryFn: async () =>
      (await supabase.from("loan_documents").select("*").eq("loan_type_id", app!.loan_type_id).order("sort_order")).data ?? [],
    enabled: !!app,
  });
  const { data: extraReqs } = useQuery({
    queryKey: ["extra-reqs", id],
    queryFn: async () =>
      (await supabase.from("application_document_requests").select("*").eq("application_id", id).order("created_at")).data ?? [],
  });
  const { data: uploaded } = useQuery({
    queryKey: ["uploaded", id],
    queryFn: async () =>
      (await supabase.from("application_documents").select("*").eq("application_id", id).order("uploaded_at", { ascending: false })).data ?? [],
  });
  const { data: history } = useQuery({
    queryKey: ["hist", id],
    queryFn: async () =>
      (await supabase.from("application_status_history").select("*, loan_statuses(stage_name,color)").eq("application_id", id).order("created_at")).data ?? [],
  });
  const { data: reviewStatus } = useQuery({
    queryKey: ["status-under-review"],
    queryFn: async () =>
      (await supabase.from("loan_statuses").select("*").eq("stage_order", 3).maybeSingle()).data,
  });

  const requiredDocs: RequiredDoc[] = useMemo(() => {
    const base: RequiredDoc[] = (productDocs ?? []).map((d: any) => ({
      id: d.id, document_name: d.document_name, description: d.description,
      is_mandatory: d.is_mandatory, allowed_formats: d.allowed_formats, source: "product",
    }));
    const extra: RequiredDoc[] = (extraReqs ?? []).map((r: any) => ({
      id: r.id, document_name: r.document_name, description: r.description,
      is_mandatory: r.is_mandatory, allowed_formats: r.allowed_formats, source: "request", request_id: r.id,
    }));
    return [...base, ...extra];
  }, [productDocs, extraReqs]);

  const uploadMut = useMutation({
    mutationFn: async ({ file, target }: { file: File; target: RequiredDoc | null }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const formats = target?.allowed_formats ?? [];
      if (target && formats.length > 0 && !formats.includes(ext)) {
        throw new Error(`Only ${formats.join(", ").toUpperCase()} allowed for ${target.document_name}`);
      }
      const path = `${user!.id}/${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("loan-documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("application_documents").insert({
        application_id: id,
        document_name: target?.document_name ?? file.name,
        file_url: path,
        uploaded_by: user!.id,
        loan_document_id: target?.source === "product" ? target.id : null,
        document_request_id: target?.source === "request" ? target.request_id ?? null : null,
      } as any);
      if (error) throw error;
      return target?.document_name ?? file.name;
    },
    onSuccess: (name) => { toast.success(`${name} uploaded`); qc.invalidateQueries({ queryKey: ["uploaded", id] }); qc.invalidateQueries({ queryKey: ["extra-reqs", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFiles = async (files: FileList | null, target: RequiredDoc | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try { await uploadMut.mutateAsync({ file, target }); } catch { /* toasted */ }
    }
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!reviewStatus) throw new Error("Status workflow not configured");
      const { error } = await supabase.from("loan_applications").update({ status_id: reviewStatus.id, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await supabase.from("application_status_history").insert({
        application_id: id, status_id: reviewStatus.id, updated_by: user!.id, notes: "Submitted by customer",
      });
    },
    onSuccess: () => { toast.success("Application submitted for review"); qc.invalidateQueries({ queryKey: ["app", id] }); qc.invalidateQueries({ queryKey: ["hist", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash !== "#documents" && hash !== "#documents-upload") return;
    setTimeout(() => {
      document.getElementById("documents")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, []);

  if (appLoading) return <div className="rounded border p-6 text-sm text-muted-foreground">Loading…</div>;
  if (appError || !app) return <div className="rounded border p-6 text-sm text-destructive">Unable to open this application.</div>;

  // checklist counts
  const mandatoryDocs = requiredDocs.filter((d) => d.is_mandatory);
  const uploadedByKey = (d: RequiredDoc) => (uploaded ?? []).filter((u: any) =>
    d.source === "product" ? u.loan_document_id === d.id : u.document_request_id === d.id
  );
  const mandatoryDone = mandatoryDocs.filter((d) => uploadedByKey(d).length > 0).length;
  const allMandatoryUploaded = mandatoryDocs.length > 0 && mandatoryDone === mandatoryDocs.length;
  const currentOrder = (app.loan_statuses as any)?.stage_order ?? 0;
  const canSubmit = currentOrder <= 2 && allMandatoryUploaded; // up to Documents Pending

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{(app.loan_types as any)?.name}</h1>
          <p className="text-muted-foreground text-sm">Application #{id.slice(0, 8)}</p>
        </div>
        <StatusBadge label={(app.loan_statuses as any)?.stage_name ?? "—"} color={(app.loan_statuses as any)?.color ?? "blue"} />
      </div>

      {(() => {
        const pendingReqs = (extraReqs ?? []).filter((r: any) => !r.fulfilled_at);
        if (pendingReqs.length === 0) return null;
        return (
          <div className="rounded-lg border-2 border-warning bg-warning/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <div className="font-semibold text-warning-foreground">
                {pendingReqs.length} additional document{pendingReqs.length > 1 ? "s" : ""} requested by our team
              </div>
              <ul className="mt-1 text-xs list-disc ml-4 space-y-0.5">
                {pendingReqs.map((r: any) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.document_name}</span>
                    {r.is_mandatory && <span className="text-destructive ml-1">(mandatory)</span>}
                    {r.description && <span className="text-muted-foreground"> — {r.description}</span>}
                  </li>
                ))}
              </ul>
              <a href="#documents" className="text-xs underline font-medium mt-2 inline-block">Upload now ↓</a>
            </div>
          </div>
        );
      })()}

      {currentOrder >= 3 && (
        <div className="rounded border border-success/40 bg-success/10 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Your application is being reviewed.</div>
            <div className="text-muted-foreground text-xs">Our team will reach out shortly. Track progress below.</div>
          </div>
        </div>
      )}

      {app.loan_type_id && <ApplicationBanksCard applicationId={id} loanTypeId={app.loan_type_id} readOnly />}


      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-6">
        <Card><CardContent className="p-6">
          <h2 className="font-semibold mb-4">Application Timeline</h2>
          {history && history.length > 0 ? (
            <ol className="space-y-3 border-l pl-5 ml-2">
              {history.map((h: any) => (
                <li key={h.id} className="relative">
                  <div className="absolute -left-7 top-1 h-3 w-3 rounded-full bg-primary"></div>
                  <div className="font-medium text-sm">{(h.loan_statuses as any)?.stage_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                  {h.notes && <p className="text-xs mt-1">{h.notes}</p>}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">No status updates yet.</p>}
        </CardContent></Card>

        <Card id="documents"><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold">Required Documents</h2>
            <div className="text-xs text-muted-foreground">
              {mandatoryDone} of {mandatoryDocs.length} mandatory uploaded
            </div>
          </div>
          <div className="space-y-3">
            {requiredDocs.map((rd) => (
              <DocRow
                key={`${rd.source}-${rd.id}`}
                rd={rd}
                uploadedForRow={uploadedByKey(rd)}
                onFiles={(files) => handleFiles(files, rd)}
                disabled={uploadMut.isPending}
              />
            ))}
            {requiredDocs.length === 0 && <p className="text-sm text-muted-foreground">No specific required documents.</p>}
            <OtherRow onFiles={(files) => handleFiles(files, null)} disabled={uploadMut.isPending} />
          </div>

          {uploaded && uploaded.filter((u: any) => !u.loan_document_id && !u.document_request_id).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Other uploaded files</h3>
              <div className="space-y-1">
                {uploaded.filter((u: any) => !u.loan_document_id && !u.document_request_id).map((u: any) => (
                  <Button key={u.id} variant="ghost" className="h-auto w-full justify-start gap-2 p-2 text-sm" onClick={() => downloadDocument(u.file_url, u.document_name).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to download document"))}>
                    <Download className="h-3 w-3" />{u.document_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {currentOrder <= 2 && (
            <div className="mt-6 pt-4 border-t">
              <Button onClick={() => submitMut.mutate()} disabled={!canSubmit || submitMut.isPending} className="w-full" size="lg">
                <Send className="h-4 w-4 mr-2" />
                {submitMut.isPending ? "Submitting…" : "Submit application for review"}
              </Button>
              {!canSubmit && mandatoryDocs.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Upload all mandatory documents to enable submission.
                </p>
              )}
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}

function DocRow({
  rd, uploadedForRow, onFiles, disabled,
}: {
  rd: RequiredDoc;
  uploadedForRow: any[];
  onFiles: (files: FileList | null) => void;
  disabled: boolean;
}) {
  const inputId = useId();
  const formats = rd.allowed_formats ?? [];
  const hasUpload = uploadedForRow.length > 0;

  return (
    <div className={cn("p-3 border rounded", rd.source === "request" && "border-primary/40 bg-primary/5")}>
      <input
        id={inputId}
        type="file"
        multiple
        accept={BROAD_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {rd.document_name}
              {rd.is_mandatory && <span className="text-destructive ml-1">*</span>}
            </span>
            {rd.source === "request" && <Badge variant="secondary" className="text-[10px]">Requested by team</Badge>}
          </div>
          <div className="flex flex-wrap gap-1 mt-1 ml-6">
            {formats.map((f) => (
              <Badge key={f} variant="outline" className="text-[10px] uppercase">{f}</Badge>
            ))}
          </div>
        </div>

        <div className="flex-1 text-xs text-muted-foreground xl:max-w-xs xl:pt-1">
          {rd.description || "No specific instructions."}
        </div>

        <div className="flex w-full items-center gap-2 shrink-0 xl:w-auto">
          <label
            htmlFor={inputId}
            aria-disabled={disabled}
            className={cn(
              buttonVariants({ size: "sm", variant: hasUpload ? "outline" : "default" }),
              "w-full xl:w-auto cursor-pointer",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Upload className="h-3 w-3 mr-1" />
            {hasUpload ? "Add more" : "Upload"}
          </label>
        </div>
      </div>

      {hasUpload && (
        <div className="mt-3 ml-6 space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-success font-semibold">
            ✓ Uploaded ({uploadedForRow.length})
          </div>
          {uploadedForRow.map((u) => {
            const statusBg = u.status === "approved" ? "bg-success/10 border-success/30"
              : u.status === "rejected" ? "bg-destructive/10 border-destructive/30"
              : "bg-warning/10 border-warning/30";
            const Icon = u.status === "approved" ? Check : u.status === "rejected" ? X : Clock;
            const iconColor = u.status === "approved" ? "text-success" : u.status === "rejected" ? "text-destructive" : "text-warning";
            return (
              <Button key={u.id} variant="ghost" onClick={() => downloadDocument(u.file_url, u.document_name).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to download document"))} className={cn("flex h-auto w-full items-center justify-start gap-2 p-2 text-xs rounded border", statusBg)}>
                <Icon className={cn("h-3 w-3 shrink-0", iconColor)} />
                <Download className="h-3 w-3 shrink-0" />
                <span className="truncate flex-1">{u.document_name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(u.uploaded_at).toLocaleDateString()}</span>
                <span className={cn("text-[10px] uppercase font-semibold shrink-0", iconColor)}>{u.status}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OtherRow({ onFiles, disabled }: { onFiles: (files: FileList | null) => void; disabled: boolean }) {
  const inputId = useId();
  return (
    <div className="p-3 border border-dashed rounded flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
      <input
        id={inputId}
        type="file"
        multiple
        accept={BROAD_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />
      <div className="text-sm">
        <div className="font-medium">Other / supporting documents</div>
        <div className="text-xs text-muted-foreground">Upload any additional files. Multiple files allowed.</div>
      </div>
      <label
        htmlFor={inputId}
        aria-disabled={disabled}
        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full xl:w-auto cursor-pointer", disabled && "pointer-events-none opacity-50")}
      >
        <Upload className="h-4 w-4 mr-2" />Upload
      </label>
    </div>
  );
}
