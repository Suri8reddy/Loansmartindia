import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { PartyPopper, CheckCircle2 } from "lucide-react";

type ApprovedApp = {
  id: string;
  amount_approved: number | null;
  amount_disbursed: number | null;
  loan_types?: { name?: string } | null;
  loan_statuses?: { stage_name?: string } | null;
};

const SEEN_KEY = "celebrated_approved_apps_v1";

function getSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
}
function markSeen(id: string) {
  const s = new Set(getSeen()); s.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
}

function fire() {
  const end = Date.now() + 1500;
  const colors = ["#1e40af", "#10b981", "#f59e0b", "#3b82f6"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors });
}

export function ApprovalCelebration({ apps }: { apps: ApprovedApp[] | undefined }) {
  const [celebrate, setCelebrate] = useState<ApprovedApp | null>(null);

  useEffect(() => {
    if (!apps) return;
    const seen = getSeen();
    const fresh = apps.find((a) => {
      const stage = a.loan_statuses?.stage_name;
      return (stage === "Approved" || stage === "Disbursed") && !seen.includes(a.id);
    });
    if (fresh) {
      setCelebrate(fresh);
      markSeen(fresh.id);
      setTimeout(fire, 250);
      setTimeout(fire, 900);
    }
  }, [apps]);

  if (!celebrate) return null;
  const isDisbursed = celebrate.loan_statuses?.stage_name === "Disbursed";
  const amount = Number(celebrate.amount_disbursed ?? celebrate.amount_approved ?? 0);

  return (
    <Dialog open onOpenChange={(o) => !o && setCelebrate(null)}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-4 animate-scale-in">
          <div className="h-20 w-20 rounded-full bg-success/15 text-success flex items-center justify-center">
            {isDisbursed ? <CheckCircle2 className="h-12 w-12" /> : <PartyPopper className="h-12 w-12" />}
          </div>
          <h2 className="text-2xl font-bold">
            🎉 Congratulations!
          </h2>
          <p className="text-muted-foreground">
            Your <span className="font-semibold text-foreground">{celebrate.loan_types?.name}</span> has been{" "}
            <span className="font-semibold text-success">{isDisbursed ? "disbursed" : "approved"}</span>.
          </p>
          {amount > 0 && (
            <div className="w-full p-4 rounded-lg bg-gradient-to-r from-primary/10 to-success/10 border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {isDisbursed ? "Disbursed Amount" : "Approved Amount"}
              </div>
              <div className="text-4xl font-bold text-primary mt-1">
                ₹{amount.toLocaleString()}
              </div>
            </div>
          )}
          <div className="flex gap-2 w-full pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCelebrate(null)}>Close</Button>
            <Button asChild className="flex-1" onClick={() => setCelebrate(null)}>
              <Link to="/customer/applications/$id" params={{ id: celebrate.id }}>View Details</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
