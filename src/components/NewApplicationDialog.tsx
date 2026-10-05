import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createApplicationForNewCustomer } from "@/lib/application-create.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, RefreshCw, Copy } from "lucide-react";

interface Props {
  /** If true, shows the "Assigned To" picker (admin only). */
  showAssignee?: boolean;
  onCreated?: (applicationId: string) => void;
}

function generatePassword() {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const syms = "!@#$%&*";
  const all = lower + upper + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pw = pick(lower) + pick(upper) + pick(nums) + pick(syms);
  for (let i = 0; i < 8; i++) pw += pick(all);
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

export function NewApplicationDialog({ showAssignee = false, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loanTypeId, setLoanTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const create = useServerFn(createApplicationForNewCustomer);
  const qc = useQueryClient();

  const { data: loanTypes } = useQuery({
    queryKey: ["loan-types-active"],
    queryFn: async () =>
      (await supabase.from("loan_types").select("id,name").eq("is_active", true).order("name")).data ?? [],
    enabled: open,
  });

  const { data: teamUsers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, profiles!user_roles_user_id_fkey(full_name,email)")
        .in("role", ["admin", "dsa", "rm", "team_leader", "loan_executive"]);
      return data ?? [];
    },
    enabled: open && showAssignee,
  });

  const reset = () => {
    setFullName(""); setEmail(""); setPhone(""); setPassword(""); setShowPw(false);
    setLoanTypeId(""); setAmount(""); setNotes(""); setAssignedTo("");
  };

  const submit = async () => {
    if (!fullName || !phone || !loanTypeId || !password) {
      toast.error("Please fill all required fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          fullName,
          email,
          phone,
          password,
          loanTypeId,
          amountRequested: amount ? Number(amount) : null,
          notes: notes || null,
          assignedTo: assignedTo || null,
        },
      });
      toast.success("Application created — share the login with the customer");
      setOpen(false);
      reset();
      qc.invalidateQueries();
      onCreated?.(res.applicationId);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create application");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCreds = async () => {
    await navigator.clipboard.writeText(`${email ? `Email: ${email}\n` : ""}Mobile: ${phone}\nPassword: ${password}`);
    toast.success("Login copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />New Application</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Application</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Customer Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <div><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>

            <div>
              <Label>Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => { setPassword(generatePassword()); setShowPw(true); }} title="Generate password">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={copyCreds} disabled={!phone || !password} title="Copy login">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Share these credentials with the customer so they can sign in using mobile number{email ? " or email" : ""}.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Loan Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loan Product *</Label>
                <Select value={loanTypeId} onValueChange={setLoanTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {loanTypes?.map((lt: any) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount Requested</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            </div>
            {showAssignee && (
              <div>
                <Label>Assign To (optional)</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Assign to current user" /></SelectTrigger>
                  <SelectContent>
                    {teamUsers?.map((u: any) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.profiles?.full_name ?? u.profiles?.email ?? u.user_id} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Creating..." : "Create Application"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
