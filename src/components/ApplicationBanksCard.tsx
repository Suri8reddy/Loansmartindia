import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

type Bank = { id: string; name: string; short_code: string | null };
type AppBank = {
  id: string; bank_id: string; status_id: string | null;
  approved_amount: number | null; notes: string | null;
  submitted_at: string; updated_at: string;
  banks: Bank | null;
  loan_statuses: { stage_name: string; color: string } | null;
};

export function ApplicationBanksCard({
  applicationId, loanTypeId, readOnly = false,
}: { applicationId: string; loanTypeId: string; readOnly?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickBank, setPickBank] = useState("");

  const { data: banks } = useQuery({
    queryKey: ["banks-active"],
    queryFn: async () => (await supabase.from("banks").select("id,name,short_code").eq("is_active", true).order("name")).data ?? [],
  });
  const { data: rows } = useQuery({
    queryKey: ["app-banks", applicationId],
    queryFn: async () => (await supabase.from("application_banks")
      .select("*, banks(id,name,short_code), loan_statuses(stage_name,color)")
      .eq("application_id", applicationId).order("submitted_at")).data as unknown as AppBank[] ?? [],
  });
  const { data: statuses } = useQuery({
    queryKey: ["statuses-for-type", loanTypeId],
    queryFn: async () => {
      const { data } = await supabase.from("loan_statuses").select("id,stage_name,stage_order")
        .eq("is_active", true).or(`loan_type_id.eq.${loanTypeId},loan_type_id.is.null`).order("stage_order");
      const all = data ?? [];
      const scoped = all.filter((s: any) => (s as any).loan_type_id === loanTypeId);
      return scoped.length > 0 ? scoped : all;
    },
    enabled: !!loanTypeId,
  });

  const addBank = useMutation({
    mutationFn: async () => {
      if (!pickBank) throw new Error("Pick a bank");
      const { error } = await supabase.from("application_banks").insert({
        application_id: applicationId, bank_id: pickBank, updated_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { setPickBank(""); toast.success("Bank added"); qc.invalidateQueries({ queryKey: ["app-banks", applicationId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBank = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("application_banks").update({ ...patch, updated_by: user!.id, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["app-banks", applicationId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeBank = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("application_banks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["app-banks", applicationId] }); },
  });

  const usedIds = new Set((rows ?? []).map((r) => r.bank_id));
  const available = (banks ?? []).filter((b) => !usedIds.has(b.id));

  return (
    <Card><CardContent className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Banks submitted to</h2>
        <span className="text-xs text-muted-foreground">{rows?.length ?? 0} bank{(rows?.length ?? 0) === 1 ? "" : "s"}</span>
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Select value={pickBank} onValueChange={setPickBank}>
            <SelectTrigger className="flex-1"><SelectValue placeholder={available.length ? "Add a bank…" : "All banks added"} /></SelectTrigger>
            <SelectContent>{available.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}{b.short_code ? ` (${b.short_code})` : ""}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => addBank.mutate()} disabled={!pickBank || addBank.isPending}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      )}

      <div className="space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-medium">{r.banks?.name ?? "—"}</div>
              <div className="flex items-center gap-2">
                {r.loan_statuses && <StatusBadge label={r.loan_statuses.stage_name} color={r.loan_statuses.color} />}
                {!readOnly && (
                  <Button size="icon" variant="ghost" onClick={() => removeBank.mutate(r.id)} title="Remove">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
            {readOnly ? (
              <div className="text-xs text-muted-foreground">
                {r.approved_amount && <>Approved: ₹{Number(r.approved_amount).toLocaleString()} • </>}
                Submitted {new Date(r.submitted_at).toLocaleDateString()}
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={r.status_id ?? ""} onValueChange={(v) => updateBank.mutate({ id: r.id, patch: { status_id: v } })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
                    <SelectContent>{statuses?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Approved Amount</Label>
                  <Input type="number" defaultValue={r.approved_amount ?? ""} className="h-8"
                    onBlur={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      if (v !== (r.approved_amount ?? null)) updateBank.mutate({ id: r.id, patch: { approved_amount: v } });
                    }} />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input defaultValue={r.notes ?? ""} className="h-8" placeholder="Optional"
                    onBlur={(e) => { if (e.target.value !== (r.notes ?? "")) updateBank.mutate({ id: r.id, patch: { notes: e.target.value || null } }); }} />
                </div>
              </div>
            )}
          </div>
        ))}
        {(rows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No banks added yet.</p>}
      </div>
    </CardContent></Card>
  );
}
