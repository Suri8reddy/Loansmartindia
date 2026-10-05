import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Loans Mart India" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isTeam, loading, rolesLoading } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || rolesLoading || !user) return;
    const dest = isAdmin ? "/admin/dashboard" : isTeam ? "/team/dashboard" : "/customer/dashboard";
    navigate({ to: dest, replace: true });
  }, [user, isAdmin, isTeam, loading, rolesLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const identifier = loginId.trim();
    let email = identifier;
    if (!identifier.includes("@")) {
      const digits = identifier.replace(/\D/g, "");
      // Try synthetic mobile email first; fall back to raw phone-as-email if needed.
      email = `m${digits}@mobile.loanhub.local`;
    }
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    // Backward-compat: older accounts created with email-only and the mobile in profile.
    if (error && !identifier.includes("@")) {
      const res = await supabase.auth.signInWithPassword({ email: identifier, password });
      error = res.error;
    }
    setBusy(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-accent via-background to-background">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div><Label>Email or mobile number</Label><Input value={loginId} onChange={(e) => setLoginId(e.target.value)} required /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
            </form>
            <p className="text-sm text-center mt-6 text-muted-foreground">
              No account? <Link to="/register" className="text-primary font-medium">Register</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
