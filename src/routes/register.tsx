import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — Loans Mart India" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/customer/dashboard`,
        data: { full_name: form.full_name, phone: form.phone },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created! Check your email to confirm.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-accent via-background to-background">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-1">Create your account</h1>
            <p className="text-sm text-muted-foreground mb-6">Start your loan journey</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              <div><Label>Password</Label><Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating..." : "Create account"}</Button>
            </form>
            <p className="text-sm text-center mt-6 text-muted-foreground">
              Already have one? <Link to="/login" className="text-primary font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
