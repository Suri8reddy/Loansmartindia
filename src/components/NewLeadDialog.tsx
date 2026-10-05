import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function NewLeadDialog({ assignToSelf = false, invalidateKeys = [] as string[][] }: { assignToSelf?: boolean; invalidateKeys?: string[][] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", loan_type_id: "", source: "manual", amount_requested: "", requirements: "", message: "" });

  const { data: loanTypes } = useQuery({
    queryKey: ["loan-types-active"],
    queryFn: async () => (await supabase.from("loan_types").select("id,name").eq("is_active", true).order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.phone.trim()) throw new Error("Name and phone are required");
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        loan_type_id: form.loan_type_id || null,
        source: form.source || "manual",
        amount_requested: form.amount_requested ? Number(form.amount_requested) : null,
        requirements: form.requirements.trim() || null,
        message: form.message.trim() || null,
        status: "new",
        created_by: user?.id ?? null,
        assigned_to: assignToSelf ? user?.id ?? null : null,
      };
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead created");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", loan_type_id: "", source: "manual", amount_requested: "", requirements: "", message: "" });
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create a new lead</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone *"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Source"><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="manual, call, walk-in…" /></Field>
          <Field label="Loan Product">
            <Select value={form.loan_type_id} onValueChange={(v) => setForm({ ...form, loan_type_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{loanTypes?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Amount Requested"><Input type="number" value={form.amount_requested} onChange={(e) => setForm({ ...form, amount_requested: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Requirements"><Textarea rows={2} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Tenure, purpose, eligibility notes…" /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Message / Initial enquiry"><Textarea rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Create lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
