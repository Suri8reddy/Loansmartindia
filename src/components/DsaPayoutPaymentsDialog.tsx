import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

type Props = {
  payoutId: string;
  expected: number;
  canRecord?: boolean;
  trigger: React.ReactNode;
};

export function DsaPayoutPaymentsDialog({ payoutId, expected, canRecord = false, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: payments } = useQuery({
    enabled: open,
    queryKey: ["dsa-payout-payments", payoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dsa_payout_payments")
        .select("*")
        .eq("payout_id", payoutId)
        .order("paid_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState<string>("bank");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const v = Number(amount);
      if (!v || v <= 0) throw new Error("Enter a valid amount");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("dsa_payout_payments").insert({
        payout_id: payoutId,
        amount: v,
        paid_on: paidOn,
        method,
        reference: reference || null,
        notes: notes || null,
        recorded_by: u.user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setAmount(""); setReference(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["dsa-payout-payments", payoutId] });
      qc.invalidateQueries({ queryKey: ["dsa-payouts-all"] });
      qc.invalidateQueries({ queryKey: ["my-dsa-payouts"] });
      qc.invalidateQueries({ queryKey: ["dsa-payout-app"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = (payments ?? []).reduce((s, p: any) => s + Number(p.amount), 0);
  const pending = Math.max(0, expected - total);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>DSA payout payments</DialogTitle></DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded border"><div className="text-xs text-muted-foreground">Expected</div><div className="text-lg font-bold">₹{expected.toLocaleString()}</div></div>
          <div className="p-3 rounded border"><div className="text-xs text-muted-foreground">Paid</div><div className="text-lg font-bold text-success">₹{total.toLocaleString()}</div></div>
          <div className="p-3 rounded border bg-warning/10"><div className="text-xs text-muted-foreground">Pending</div><div className="text-lg font-bold text-warning">₹{pending.toLocaleString()}</div></div>
        </div>

        <div className="border rounded max-h-64 overflow-auto">
          {(payments ?? []).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No payments recorded yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-2">Date</th><th className="p-2">Amount</th><th className="p-2">Method</th><th className="p-2">Reference</th><th className="p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{format(new Date(p.paid_on), "dd MMM yyyy")}</td>
                    <td className="p-2 font-medium">₹{Number(p.amount).toLocaleString()}</td>
                    <td className="p-2 capitalize">{p.method ?? "—"}</td>
                    <td className="p-2">{p.reference ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {canRecord && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-sm">Record a payout payment</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Amount (₹) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div><Label>Paid on</Label><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
              <div>
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>Add payment</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
