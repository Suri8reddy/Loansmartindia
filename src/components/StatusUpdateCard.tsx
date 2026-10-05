import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { CommissionPaymentsDialog } from "@/components/CommissionPaymentsDialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Status = { id: string; stage_name: string };
type App = {
  id: string;
  customer_id: string | null;
  assigned_to: string | null;
  amount_requested: number | null;
  amount_approved: number | null;
  amount_disbursed: number | null;
  commission_expected: number | null;
  commission_received: number | null;
};

export function StatusUpdateCard({
  app,
  statuses,
  userId,
  invalidateKey,
}: {
  app: App;
  statuses: Status[] | undefined;
  userId: string;
  invalidateKey: readonly unknown[];
}) {
  const qc = useQueryClient();
  const [newStatusId, setNewStatusId] = useState("");
  const [note, setNote] = useState("");
  const [approved, setApproved] = useState("");
  const [disbursed, setDisbursed] = useState("");
  const [commExp, setCommExp] = useState("");
  const [commRec, setCommRec] = useState("");

  const selected = statuses?.find((s) => s.id === newStatusId);
  const stageName = selected?.stage_name;
  const isApproved = stageName === "Approved";
  const isDisbursed = stageName === "Disbursed";

  const update = useMutation({
    mutationFn: async () => {
      if (!newStatusId) throw new Error("Pick a status");
      const patch: any = { status_id: newStatusId, updated_at: new Date().toISOString() };
      if (isApproved) {
        const a = Number(approved);
        if (!a || a <= 0) throw new Error("Enter approved amount");
        patch.amount_approved = a;
      }
      if (isDisbursed) {
        const d = Number(disbursed);
        const ce = Number(commExp);
        const cr = Number(commRec || 0);
        if (!d || d <= 0) throw new Error("Enter disbursed amount");
        if (!ce || ce <= 0) throw new Error("Enter expected commission");
        patch.amount_disbursed = d;
        patch.commission_expected = ce;
        patch.commission_received = cr;
      }
      const { error: e1 } = await supabase.from("loan_applications").update(patch).eq("id", app.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("application_status_history")
        .insert({ application_id: app.id, status_id: newStatusId, updated_by: userId, notes: note });
      if (e2) throw e2;
      if (isDisbursed) {
        const { data: existing } = await supabase.from("commissions").select("id").eq("application_id", app.id).maybeSingle();
        let commissionId = existing?.id as string | undefined;
        if (commissionId) {
          await supabase.from("commissions").update({
            expected_amount: Number(commExp),
            dsa_id: app.assigned_to,
          }).eq("id", commissionId);
        } else {
          const { data: inserted } = await supabase.from("commissions").insert({
            application_id: app.id,
            dsa_id: app.assigned_to,
            expected_amount: Number(commExp),
            received_amount: 0,
            status: "pending",
          }).select("id").single();
          commissionId = inserted?.id;
        }
        // Record initial payment if any. Trigger auto-updates totals + status.
        if (commissionId && Number(commRec || 0) > 0) {
          await supabase.from("commission_payments").insert({
            commission_id: commissionId,
            amount: Number(commRec),
            recorded_by: userId,
            notes: "Recorded on disbursement",
          });
        }
      }
      const recipients = new Set<string>();
      if (app.customer_id) recipients.add(app.customer_id);
      if (app.assigned_to && app.assigned_to !== userId) recipients.add(app.assigned_to);
      if (recipients.size > 0) {
        await supabase.from("notifications").insert(
          Array.from(recipients).map((uid) => ({
            user_id: uid,
            title: "Loan status updated",
            message: note || `Application is now ${stageName}.`,
            type: "status_update",
            link: uid === app.customer_id
              ? `/customer/applications/${app.id}`
              : `/team/applications/${app.id}`,
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Status updated");
      setNote(""); setApproved(""); setDisbursed(""); setCommExp(""); setCommRec("");
      qc.invalidateQueries({ queryKey: invalidateKey });
      qc.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Fetch existing commission row (if any) so we can open the payments dialog
  const { data: commissionRow } = useQuery({
    queryKey: ["commission-for-app", app.id],
    queryFn: async () => {
      const { data } = await supabase.from("commissions").select("id, expected_amount").eq("application_id", app.id).maybeSingle();
      return data;
    },
  });


  const summary = useMemo(() => {
    const exp = Number(app.commission_expected ?? 0);
    const rec = Number(app.commission_received ?? 0);
    return { exp, rec, pending: Math.max(0, exp - rec) };
  }, [app.commission_expected, app.commission_received]);

  const hasApprovedAmount = (app.amount_approved ?? 0) > 0;
  const hasDisbursedAmount = (app.amount_disbursed ?? 0) > 0;

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-6 space-y-3">
        <h2 className="font-semibold">Update Status</h2>
        <Select value={newStatusId} onValueChange={setNewStatusId}>
          <SelectTrigger><SelectValue placeholder="Pick a new status" /></SelectTrigger>
          <SelectContent>{statuses?.map((s) => <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>)}</SelectContent>
        </Select>

        {isApproved && (
          <div>
            <Label>Approved Amount (₹) *</Label>
            <Input type="number" value={approved} onChange={(e) => setApproved(e.target.value)} placeholder="e.g. 500000" />
          </div>
        )}

        {isDisbursed && (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Disbursed Amount (₹) *</Label>
                <Input type="number" value={disbursed} onChange={(e) => setDisbursed(e.target.value)}
                  placeholder={String(app.amount_approved ?? "")} />
              </div>
              <div>
                <Label>Expected Commission (₹) *</Label>
                <Input type="number" value={commExp} onChange={(e) => setCommExp(e.target.value)} />
              </div>
              <div>
                <Label>Commission Received (₹)</Label>
                <Input type="number" value={commRec} onChange={(e) => setCommRec(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="p-3 rounded border bg-warning/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pending commission (auto)</span>
              <span className="text-lg font-bold text-warning">
                ₹{Math.max(0, (Number(commExp) || 0) - (Number(commRec) || 0)).toLocaleString()}
              </span>
            </div>
          </>
        )}

        <div><Label>Internal note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
        <Button onClick={() => update.mutate()} disabled={update.isPending}>Update Status</Button>

        {(hasApprovedAmount || hasDisbursedAmount) && (
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            {hasApprovedAmount && (
              <span className="px-3 py-1.5 rounded bg-success/15 text-success font-medium">
                Approved: ₹{Number(app.amount_approved).toLocaleString()}
              </span>
            )}
            {hasDisbursedAmount && (
              <span className="px-3 py-1.5 rounded bg-primary/15 text-primary font-medium">
                Disbursed: ₹{Number(app.amount_disbursed).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </CardContent></Card>

      {hasDisbursedAmount && (
        <Card><CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">Commission Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded border">
              <div className="text-xs text-muted-foreground">Expected</div>
              <div className="text-lg font-bold">₹{summary.exp.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-xs text-muted-foreground">Received</div>
              <div className="text-lg font-bold text-success">₹{summary.rec.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded border bg-warning/10">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-lg font-bold text-warning">₹{summary.pending.toLocaleString()}</div>
            </div>
          </div>
          {commissionRow?.id && (
            <CommissionPaymentsDialog
              commissionId={commissionRow.id}
              expected={Number(commissionRow.expected_amount ?? app.commission_expected ?? 0)}
              canRecord
              trigger={<Button variant="outline">Record / view payments</Button>}
            />
          )}
        </CardContent></Card>
      )}
    </div>
  );
}
