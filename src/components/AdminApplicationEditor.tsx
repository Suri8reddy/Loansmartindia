import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateApplicationByAdmin } from "@/lib/admin-users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";
const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);

export function AdminApplicationEditor({ app, statuses, invalidateKey }: { app: any; statuses: any[]; invalidateKey: any[] }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateApplicationByAdmin);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: NONE, loan_type_id: "", status_id: NONE, assigned_to: NONE, amount_requested: "", amount_approved: "", amount_disbursed: "", notes: "" });
  const { data: loanTypes } = useQuery({ queryKey: ["admin-loan-types-edit"], queryFn: async () => (await supabase.from("loan_types").select("id,name").order("name")).data ?? [], enabled: open });
  const { data: team } = useQuery({ queryKey: ["admin-application-editor-members"], queryFn: async () => (await supabase.from("profiles").select("id,full_name,email").eq("is_active", true).is("archived_at", null).order("full_name")).data ?? [], enabled: open });
  const { data: customers } = useQuery({ queryKey: ["admin-customers-edit"], queryFn: async () => {
    const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "customer");
    const ids = (roleRows ?? []).map((row) => row.user_id);
    if (!ids.length) return [];
    return (await supabase.from("profiles").select("id,full_name,email").in("id", ids).is("archived_at", null).order("full_name")).data ?? [];
  }, enabled: open });

  useEffect(() => {
    if (!open) return;
    setForm({
      customer_id: app.customer_id ?? NONE, loan_type_id: app.loan_type_id,
      status_id: app.status_id ?? NONE,
      assigned_to: app.assigned_to ?? NONE,
      amount_requested: app.amount_requested == null ? "" : String(app.amount_requested),
      amount_approved: app.amount_approved == null ? "" : String(app.amount_approved),
      amount_disbursed: app.amount_disbursed == null ? "" : String(app.amount_disbursed),
      notes: app.notes ?? "",
    });
  }, [open, app]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: {
      application_id: app.id, customer_id: form.customer_id === NONE ? null : form.customer_id, loan_type_id: form.loan_type_id,
      status_id: form.status_id === NONE ? null : form.status_id,
      assigned_to: form.assigned_to === NONE ? null : form.assigned_to,
      amount_requested: numberOrNull(form.amount_requested), amount_approved: numberOrNull(form.amount_approved),
      amount_disbursed: numberOrNull(form.amount_disbursed), notes: form.notes.trim() || null,
    } }),
    onSuccess: () => { toast.success("Application updated"); setOpen(false); qc.invalidateQueries({ queryKey: invalidateKey }); qc.invalidateQueries({ queryKey: ["admin-all-apps"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline"><Pencil className="h-4 w-4 mr-1" />Edit application</Button></DialogTrigger>
    <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit application</DialogTitle></DialogHeader>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Customer</Label><Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>No customer</SelectItem>{customers?.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.full_name ?? v.email}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Loan product</Label><Select value={form.loan_type_id} onValueChange={(v) => setForm({ ...form, loan_type_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{loanTypes?.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Status</Label><Select value={form.status_id} onValueChange={(v) => setForm({ ...form, status_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>No status</SelectItem>{statuses.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.stage_name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Assigned to</Label><Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Unassigned</SelectItem>{team?.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.full_name ?? v.email}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Requested amount</Label><Input type="number" min="0" value={form.amount_requested} onChange={(e) => setForm({ ...form, amount_requested: e.target.value })} /></div>
        <div><Label>Approved amount</Label><Input type="number" min="0" value={form.amount_approved} onChange={(e) => setForm({ ...form, amount_approved: e.target.value })} /></div>
        <div><Label>Disbursed amount</Label><Input type="number" min="0" value={form.amount_disbursed} onChange={(e) => setForm({ ...form, amount_disbursed: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Internal application notes</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending || !form.loan_type_id}>Save changes</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}