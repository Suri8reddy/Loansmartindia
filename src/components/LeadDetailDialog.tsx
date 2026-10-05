import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneLink } from "@/components/PhoneLink";
import { CalendarIcon, Trash2, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { Link as RouterLink } from "@tanstack/react-router";
import { convertLeadToApplication } from "@/lib/lead-conversion.functions";
import { manageRecordByAdmin } from "@/lib/admin-users.functions";
import { AdminRecordActions } from "@/components/AdminRecordActions";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  message?: string | null;
  notes?: string | null;
  status: string;
  assigned_to?: string | null;
  next_followup_at?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
  loan_types?: { name: string } | null;
  requirements?: string | null;
  amount_requested?: number | null;
  application_id?: string | null;
  loan_type_id?: string | null;
  archived_at?: string | null;
}

export function LeadDetailDialog({
  lead,
  onClose,
  onLeadUpdated,
}: {
  lead: Lead | null;
  onClose: () => void;
  onLeadUpdated?: (patch: Partial<Lead>) => void;
}) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [noteBody, setNoteBody] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [timeStr, setTimeStr] = useState("10:00");
  const [reqDraft, setReqDraft] = useState<string | null>(null);
  const [amtDraft, setAmtDraft] = useState<string | null>(null);

  const leadId = lead?.id;
  const canEditEnquiry = !!lead && isAdmin;
  const manageRecordFn = useServerFn(manageRecordByAdmin);

  const { data: loanTypes } = useQuery({
    queryKey: ["loan-types-active"],
    queryFn: async () => (await supabase.from("loan_types").select("id,name").eq("is_active", true).order("name")).data ?? [],
    enabled: !!lead,
  });

  const { data: notes } = useQuery({
    queryKey: ["lead-notes", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data } = await supabase
        .from("lead_notes" as any)
        .select("id, body, created_at, author_id")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as any[];
      const authorIds = [...new Set(rows.map((n) => n.author_id))];
      if (!authorIds.length) return rows;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", authorIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((n) => ({ ...n, author: byId.get(n.author_id) }));
    },
    enabled: !!leadId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead-notes", leadId] });
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
    qc.invalidateQueries({ queryKey: ["team-leads-full"] });
  };

  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteBody.trim() || !leadId || !user) return;
      const { error } = await supabase.from("lead_notes" as any).insert({
        lead_id: leadId,
        author_id: user.id,
        body: noteBody.trim(),
      });
      if (error) throw error;
      await supabase
        .from("leads")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", leadId);
    },
    onSuccess: () => {
      setNoteBody("");
      toast.success("Note added");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLead = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!leadId) return;
      const { error } = await (supabase.from("leads") as any).update(patch).eq("id", leadId);
      if (error) throw error;
      return patch;
    },
    onSuccess: (patch) => {
      if (patch) onLeadUpdated?.(patch as Partial<Lead>);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const manageRecord = useMutation({
    mutationFn: (action: "archive" | "restore" | "delete") => manageRecordFn({ data: { kind: "lead", id: leadId ?? "", action } }),
    onSuccess: (_result, action) => {
      toast.success(action === "delete" ? "Lead permanently deleted" : action === "archive" ? "Lead archived" : "Lead restored");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setFollowup = (date: Date | undefined) => {
    if (!date) return;
    const [h, m] = timeStr.split(":").map(Number);
    date.setHours(h || 0, m || 0, 0, 0);
    updateLead.mutate({ next_followup_at: date.toISOString(), followup_reminded_at: null });
    setDatePopoverOpen(false);
    toast.success("Follow-up scheduled");
  };

  const quickFollowup = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    updateLead.mutate({ next_followup_at: d.toISOString(), followup_reminded_at: null });
    toast.success(`Follow-up set for ${d.toLocaleDateString()}`);
  };

  const markContacted = () => {
    updateLead.mutate({
      last_contacted_at: new Date().toISOString(),
      status: lead?.status === "new" ? "contacted" : lead?.status,
    });
    toast.success("Marked as contacted");
  };

  const followupDate = lead?.next_followup_at ? new Date(lead.next_followup_at) : null;
  const overdue =
    followupDate &&
    followupDate < new Date() &&
    lead?.status !== "converted" &&
    lead?.status !== "lost";

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead?.name}</DialogTitle>
          <DialogDescription>
            Review enquiry details, follow-ups, notes, and conversion status.
          </DialogDescription>
        </DialogHeader>
        {lead && (
          <div className="space-y-6">
            {/* Info */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <EditableTextField label="Name" value={lead.name} canEdit={canEditEnquiry} onSave={(v) => updateLead.mutate({ name: v })} required />
              <EditableTextField label="Phone" value={lead.phone} canEdit={canEditEnquiry} onSave={(v) => updateLead.mutate({ phone: v })} required display={<PhoneLink phone={lead.phone} />} />
              <EditableTextField label="Email" value={lead.email} canEdit={canEditEnquiry} onSave={(v) => updateLead.mutate({ email: v || null })} type="email" />
              <div>
                <div className="text-muted-foreground text-xs mb-0.5">Loan Type</div>
                {canEditEnquiry ? (
                  <Select value={lead.loan_type_id ?? ""} onValueChange={(v) => updateLead.mutate({ loan_type_id: v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select loan" /></SelectTrigger>
                    <SelectContent>{loanTypes?.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <div className="font-medium">{lead.loan_types?.name ?? "—"}</div>
                )}
              </div>
              <EditableTextField label="Source" value={lead.source} canEdit={canEditEnquiry} onSave={(v) => updateLead.mutate({ source: v || null })} />
              <Field label="Status"><Badge variant="outline">{lead.status}</Badge></Field>
              <Field label="Created">{new Date(lead.created_at).toLocaleString()}</Field>
              <Field label="Amount Requested">
                {amtDraft === null ? (
                  <div className="flex items-center gap-2">
                    <span>{lead.amount_requested != null ? `₹${Number(lead.amount_requested).toLocaleString()}` : "—"}</span>
                    <Button size="sm" variant="ghost" onClick={() => setAmtDraft(lead.amount_requested != null ? String(lead.amount_requested) : "")}>Edit</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input className="h-8" type="number" value={amtDraft} onChange={(e) => setAmtDraft(e.target.value)} />
                    <Button size="sm" onClick={() => { updateLead.mutate({ amount_requested: amtDraft ? Number(amtDraft) : null }); setAmtDraft(null); }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAmtDraft(null)}>X</Button>
                  </div>
                )}
              </Field>
              {lead.message && (
                <div className="sm:col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Original enquiry</div>
                  <div className="rounded border p-2 bg-muted/30 whitespace-pre-wrap">{lead.message}</div>
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-muted-foreground text-xs">Requirements</div>
                  {reqDraft === null && (
                    <Button size="sm" variant="ghost" onClick={() => setReqDraft(lead.requirements ?? "")}>Edit</Button>
                  )}
                </div>
                {reqDraft === null ? (
                  <div className="rounded border p-2 bg-muted/30 whitespace-pre-wrap text-sm min-h-[2rem]">{lead.requirements || <span className="text-muted-foreground">No requirements captured yet.</span>}</div>
                ) : (
                  <div className="space-y-2">
                    <Textarea rows={3} value={reqDraft} onChange={(e) => setReqDraft(e.target.value)} placeholder="Tenure, purpose, eligibility notes…" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setReqDraft(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => { updateLead.mutate({ requirements: reqDraft }); setReqDraft(null); }}>Save</Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <ConvertSection lead={lead} onConverted={onClose} />

            {isAdmin && (
              <section className="border-t pt-4">
                <AdminRecordActions
                  archived={!!lead.archived_at}
                  label="lead"
                  pending={manageRecord.isPending}
                  onArchive={() => manageRecord.mutate(lead.archived_at ? "restore" : "archive")}
                  onDelete={() => manageRecord.mutate("delete")}
                />
              </section>
            )}

            {/* Follow-up */}
            <section className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Follow-up
                </h3>
                {overdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
              <div className="text-sm">
                Next follow-up:{" "}
                <span className={cn("font-medium", overdue && "text-destructive")}>
                  {followupDate ? followupDate.toLocaleString() : "—"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Last contacted:{" "}
                {lead.last_contacted_at
                  ? new Date(lead.last_contacted_at).toLocaleString()
                  : "Never"}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => quickFollowup(1)}>
                  +1 day
                </Button>
                <Button size="sm" variant="outline" onClick={() => quickFollowup(3)}>
                  +3 days
                </Button>
                <Button size="sm" variant="outline" onClick={() => quickFollowup(7)}>
                  +1 week
                </Button>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1" /> Pick date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                      <Input
                        type="time"
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                      />
                    </div>
                    <Calendar
                      mode="single"
                      onSelect={setFollowup}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={markContacted}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Mark contacted
                </Button>
                {lead.next_followup_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateLead.mutate({ next_followup_at: null })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </section>

            {/* Notes */}
            <section className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Notes & activity</h3>
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this lead…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => addNote.mutate()}
                    disabled={!noteBody.trim() || addNote.isPending}
                  >
                    Add note
                  </Button>
                </div>
              </div>
              <ScrollArea className="max-h-72">
                <div className="space-y-3 pr-2">
                  {notes && notes.length > 0 ? (
                    notes.map((n: any) => (
                      <div key={n.id} className="rounded border p-3 bg-muted/20">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium">
                            {n.author?.full_name ?? n.author?.email ?? "Unknown"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{new Date(n.created_at).toLocaleString()}</span>
                            {n.author_id === user?.id && (
                              <button
                                aria-label="Delete note"
                                className="text-destructive/70 hover:text-destructive"
                                onClick={() => deleteNote.mutate(n.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  )}
                </div>
              </ScrollArea>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function EditableTextField({
  label,
  value,
  canEdit,
  onSave,
  type = "text",
  required = false,
  display,
}: {
  label: string;
  value?: string | null;
  canEdit: boolean;
  onSave: (value: string) => void;
  type?: string;
  required?: boolean;
  display?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value || "—";

  if (!canEdit) return <Field label={label}>{display ?? shown}</Field>;

  return (
    <div>
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      {draft === null ? (
        <div className="flex items-center gap-2 font-medium">
          <span>{display ?? shown}</span>
          <Button size="sm" variant="ghost" onClick={() => setDraft(value ?? "")}>Edit</Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Input className="h-8" type={type} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button
            size="sm"
            disabled={required && !draft.trim()}
            onClick={() => {
              onSave(draft.trim());
              setDraft(null);
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>X</Button>
        </div>
      )}
    </div>
  );
}

function ConvertSection({ lead, onConverted }: { lead: Lead; onConverted: () => void }) {
  const qc = useQueryClient();
  const convertFn = useServerFn(convertLeadToApplication);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const convert = useMutation({
    mutationFn: async () => convertFn({ data: { lead_id: lead.id, password: password.trim() || undefined } }),
    onSuccess: (res: any) => {
      toast.success(res?.customerCreated ? "Customer login created & application started" : "Application created");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      qc.invalidateQueries({ queryKey: ["team-leads-full"] });
      onConverted();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lead.application_id) {
    return (
      <section className="border rounded-lg p-4 bg-success/5 border-success/30 flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm">
          <div className="font-semibold text-success">Converted to application</div>
          <div className="text-muted-foreground text-xs">The full enquiry timeline is preserved on the application.</div>
        </div>
        <Button asChild size="sm" variant="outline">
          <RouterLink to="/admin/applications/$id" params={{ id: lead.application_id }}>Open application</RouterLink>
        </Button>
      </section>
    );
  }

  const reasons: string[] = [];
  if (!lead.loan_type_id) reasons.push("loan product");
  const passwordInvalid = !!password && password.trim().length < 8;

  return (
    <section className="border rounded-lg p-4 bg-primary/5 border-primary/30 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="text-sm">
          <div className="font-semibold">Convert to application</div>
          <div className="text-muted-foreground text-xs">
            Instantly create the loan application — the enquiry, notes, and follow-ups stay on its timeline.
          </div>
          {!lead.email && !password && (
            <div className="text-xs text-muted-foreground mt-1">No email — add a password to create mobile login now, or leave blank and attach customer login later.</div>
          )}
          {reasons.length > 0 && (
            <div className="text-xs text-destructive mt-1">Add {reasons.join(" and ")} to the lead first.</div>
          )}
        </div>
        <Button size="sm" disabled={convert.isPending || reasons.length > 0 || passwordInvalid} onClick={() => convert.mutate()}>
          {convert.isPending ? "Converting…" : "Convert to Application"}
        </Button>
      </div>
      <div className="max-w-sm">
        <div className="text-muted-foreground text-xs mb-1">Client login password (optional)</div>
        <div className="flex gap-2">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? "Hide" : "Show"}
          </Button>
        </div>
        {passwordInvalid && <div className="text-xs text-destructive mt-1">Password must be at least 8 characters.</div>}
        {password && <div className="text-xs text-muted-foreground mt-1">Share this password with the client. They can sign in using their mobile number{lead.email ? " or email" : ""}.</div>}
      </div>
    </section>
  );
}

