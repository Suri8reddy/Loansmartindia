import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function DsaPayoutSettingsDialog({ dsaId, trigger }: { dsaId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    enabled: open,
    queryKey: ["dsa-payout-settings", dsaId],
    queryFn: async () => {
      const { data } = await supabase.from("dsa_payout_settings").select("*").eq("dsa_id", dsaId).maybeSingle();
      return data;
    },
  });

  const [visible, setVisible] = useState(false);
  const [reportAccess, setReportAccess] = useState(false);
  const [pct, setPct] = useState<string>("");

  useEffect(() => {
    if (settings) {
      setVisible((settings as any).payout_visible);
      setReportAccess(!!(settings as any).report_access);
      setPct((settings as any).default_percentage?.toString() ?? "");
    } else {
      setVisible(false);
      setReportAccess(false);
      setPct("");
    }
  }, [settings, open]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        dsa_id: dsaId,
        payout_visible: visible,
        report_access: reportAccess,
        default_percentage: pct ? Number(pct) : null,
        updated_by: u.user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("dsa_payout_settings").upsert(payload as any, { onConflict: "dsa_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["dsa-payout-settings", dsaId] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Team member settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between border rounded p-3">
            <div>
              <div className="font-medium text-sm">Show payouts to DSA</div>
              <div className="text-xs text-muted-foreground">When off, the DSA cannot see any payout data in their portal.</div>
            </div>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </div>
          <div className="flex items-center justify-between border rounded p-3">
            <div>
              <div className="font-medium text-sm">Commissions Report access</div>
              <div className="text-xs text-muted-foreground">When on, this team member sees the Reports page in their portal (scoped to their own data).</div>
            </div>
            <Switch checked={reportAccess} onCheckedChange={setReportAccess} />
          </div>
          <div>
            <Label>Default payout % (optional)</Label>
            <Input type="number" step="0.001" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="e.g. 1.5" />
            <p className="text-xs text-muted-foreground mt-1">Pre-fills the % on new payouts for this DSA.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
