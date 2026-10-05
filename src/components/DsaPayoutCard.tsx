import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wallet, Eye } from "lucide-react";
import { toast } from "sonner";
import { DsaPayoutPaymentsDialog } from "./DsaPayoutPaymentsDialog";

type App = {
  id: string;
  assigned_to: string | null;
  amount_disbursed: number | null;
  amount_approved: number | null;
};

export function DsaPayoutCard({ app }: { app: App }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  // Only admin manages this card
  if (!isAdmin) return null;

  const dsaId = app.assigned_to;

  const { data: dsaProfile } = useQuery({
    enabled: !!dsaId,
    queryKey: ["dsa-profile", dsaId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").eq("id", dsaId!).maybeSingle();
      return data;
    },
  });

  const { data: settings } = useQuery({
    enabled: !!dsaId,
    queryKey: ["dsa-payout-settings", dsaId],
    queryFn: async () => {
      const { data } = await supabase.from("dsa_payout_settings").select("*").eq("dsa_id", dsaId!).maybeSingle();
      return data;
    },
  });

  const { data: payout, refetch } = useQuery({
    enabled: !!dsaId,
    queryKey: ["dsa-payout-app", app.id, dsaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("dsa_payouts")
        .select("*")
        .eq("application_id", app.id)
        .eq("dsa_id", dsaId!)
        .maybeSingle();
      return data;
    },
  });

  const [basis, setBasis] = useState<"manual" | "percentage">("manual");
  const [percentage, setPercentage] = useState<string>("");
  const [expected, setExpected] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (payout) {
      setBasis((payout as any).basis ?? "manual");
      setPercentage((payout as any).percentage?.toString() ?? "");
      setExpected((payout as any).expected_amount?.toString() ?? "");
      setNotes((payout as any).notes ?? "");
    } else if (settings) {
      const def = (settings as any).default_percentage;
      if (def) {
        setBasis("percentage");
        setPercentage(def.toString());
        const base = Number(app.amount_disbursed ?? app.amount_approved ?? 0);
        if (base > 0) setExpected(((base * Number(def)) / 100).toFixed(2));
      }
    }
  }, [payout, settings, app.amount_disbursed, app.amount_approved]);

  // Auto-calc expected when percentage changes
  useEffect(() => {
    if (basis === "percentage") {
      const base = Number(app.amount_disbursed ?? app.amount_approved ?? 0);
      const p = Number(percentage);
      if (base > 0 && p > 0) setExpected(((base * p) / 100).toFixed(2));
    }
  }, [basis, percentage, app.amount_disbursed, app.amount_approved]);

  const save = useMutation({
    mutationFn: async () => {
      if (!dsaId) throw new Error("Assign a DSA to this application first");
      const exp = Number(expected);
      if (!exp || exp <= 0) throw new Error("Enter a valid expected amount");
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        application_id: app.id,
        dsa_id: dsaId,
        basis,
        percentage: basis === "percentage" && percentage ? Number(percentage) : null,
        expected_amount: exp,
        notes: notes || null,
      };
      if (payout) {
        const { error } = await supabase.from("dsa_payouts").update(payload).eq("id", (payout as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dsa_payouts").insert({ ...payload, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Payout saved");
      qc.invalidateQueries({ queryKey: ["dsa-payout-app", app.id, dsaId] });
      qc.invalidateQueries({ queryKey: ["dsa-payouts-all"] });
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const dsaName = (dsaProfile as any)?.full_name ?? (dsaProfile as any)?.email ?? "—";
  const isVisible = (settings as any)?.payout_visible ?? false;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4" /> DSA Payout (admin → DSA)
          </h2>
          {dsaId && (
            <Badge variant={isVisible ? "default" : "outline"}>
              {isVisible ? "Visible to DSA" : "Hidden from DSA"}
            </Badge>
          )}
        </div>

        {!dsaId ? (
          <p className="text-sm text-muted-foreground">Assign a DSA to this application to set up a payout.</p>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              DSA: <span className="font-medium text-foreground">{dsaName}</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Basis</Label>
                <Select value={basis} onValueChange={(v) => setBasis(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual amount</SelectItem>
                    <SelectItem value="percentage">% of disbursed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {basis === "percentage" && (
                <div>
                  <Label>Percentage (%)</Label>
                  <Input type="number" step="0.001" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Expected amount (₹)</Label>
                <Input type="number" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {payout && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded border"><div className="text-xs text-muted-foreground">Expected</div><div className="font-bold">₹{Number((payout as any).expected_amount ?? 0).toLocaleString()}</div></div>
                <div className="p-3 rounded border"><div className="text-xs text-muted-foreground">Paid</div><div className="font-bold text-success">₹{Number((payout as any).paid_amount ?? 0).toLocaleString()}</div></div>
                <div className="p-3 rounded border bg-warning/10"><div className="text-xs text-muted-foreground">Pending</div><div className="font-bold text-warning">₹{Math.max(0, Number((payout as any).expected_amount ?? 0) - Number((payout as any).paid_amount ?? 0)).toLocaleString()}</div></div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {payout ? "Update payout" : "Create payout"}
              </Button>
              {payout && (
                <DsaPayoutPaymentsDialog
                  payoutId={(payout as any).id}
                  expected={Number((payout as any).expected_amount ?? 0)}
                  canRecord
                  trigger={<Button variant="outline"><Eye className="h-4 w-4 mr-1" />Payments</Button>}
                />
              )}
            </div>

            {!isVisible && (
              <p className="text-xs text-muted-foreground">
                Tip: enable "Show payouts to DSA" on this DSA from Users → Payout settings to let them see this in their portal.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
