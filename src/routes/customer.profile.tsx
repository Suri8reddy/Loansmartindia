import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export const Route = createFileRoute("/customer/profile")({ component: Profile });

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
    enabled: !!user,
  });
  const [form, setForm] = useState({ full_name: "", phone: "" });
  useEffect(() => { if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" }); }, [profile]);

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone, updated_at: new Date().toISOString() }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile", user?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Use it next time you sign in.");
    setPw(""); setPw2("");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold">My Profile</h1>
      <Card><CardContent className="p-6 space-y-4">
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Save changes"}</Button>
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <h2 className="font-semibold">Change password</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          You're signed in, so you can set a new password directly — no email required.
        </p>
        <form className="space-y-3" onSubmit={changePassword}>
          <div>
            <Label>New password</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 8 characters" required />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type={showPw ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <Button type="submit" disabled={pwBusy}>{pwBusy ? "Updating..." : "Update password"}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
