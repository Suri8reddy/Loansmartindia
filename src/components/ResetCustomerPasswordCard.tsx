import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { resetCustomerPassword } from "@/lib/password-reset.functions";

export function ResetCustomerPasswordCard({
  applicationId,
  hasCustomer,
}: {
  applicationId: string;
  hasCustomer: boolean;
}) {
  const reset = useServerFn(resetCustomerPassword);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = () => {
    const pw =
      Math.random().toString(36).slice(2, 8) +
      Math.random().toString(36).slice(2, 6).toUpperCase() +
      "!" +
      Math.floor(Math.random() * 90 + 10);
    setPassword(pw);
    setShow(true);
  };

  const submit = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await reset({ data: { application_id: applicationId, password } });
      toast.success("Password reset. Share it with the customer.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <h2 className="font-semibold">Reset customer login password</h2>
        </div>
        {!hasCustomer ? (
          <p className="text-sm text-muted-foreground">
            No customer account is linked to this application yet.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Set a new password for the customer's mobile/email login. Share it securely with them.
            </p>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label>New password</Label>
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShow((v) => !v)}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={generate}>
                Generate
              </Button>
              {password && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(password);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              )}
              <Button onClick={submit} disabled={busy || !password}>
                {busy ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
