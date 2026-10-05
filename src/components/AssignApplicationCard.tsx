import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export function AssignApplicationCard({
  applicationId,
  currentAssignee,
  invalidateKey,
}: {
  applicationId: string;
  currentAssignee: string | null;
  invalidateKey: any[];
}) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>(currentAssignee ?? "__none__");

  useEffect(() => {
    setSelected(currentAssignee ?? "__none__");
  }, [currentAssignee]);

  const { data: members } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "dsa", "rm", "loan_executive", "team_leader"]);
      const ids = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const roleMap = new Map<string, string[]>();
      for (const r of roleRows ?? []) {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as string);
        roleMap.set(r.user_id, arr);
      }
      return (profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
    enabled: isAdmin,
  });

  const currentName =
    members?.find((m) => m.id === currentAssignee)?.full_name ??
    members?.find((m) => m.id === currentAssignee)?.email ??
    null;

  const save = useMutation({
    mutationFn: async () => {
      const newId = selected === "__none__" ? null : selected;
      if (newId === currentAssignee) return;
      const fromName = currentName ?? null;
      const toName =
        newId === null
          ? null
          : members?.find((m) => m.id === newId)?.full_name ??
            members?.find((m) => m.id === newId)?.email ??
            null;

      const { error: updErr } = await supabase
        .from("loan_applications")
        .update({ assigned_to: newId })
        .eq("id", applicationId);
      if (updErr) throw updErr;

      const { error: logErr } = await supabase.from("audit_logs").insert({
        user_id: user!.id,
        action: "application_reassigned",
        entity_type: "loan_application",
        entity_id: applicationId,
        metadata: {
          from: currentAssignee,
          to: newId,
          from_name: fromName,
          to_name: toName,
        },
      } as any);
      if (logErr) throw logErr;

      if (newId) {
        await supabase.from("notifications").insert({
          user_id: newId,
          title: "Application assigned to you",
          message: `You've been assigned application #${applicationId.slice(0, 8)}`,
          type: "assignment",
          link: `/team/applications/${applicationId}`,
        } as any);
      }
    },
    onSuccess: () => {
      toast.success("Assignment updated");
      qc.invalidateQueries({ queryKey: invalidateKey });
      qc.invalidateQueries({ queryKey: ["activity-audit", applicationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <UserCog className="h-4 w-4" /> Assigned to
        </h2>
        <p className="text-sm text-muted-foreground">
          Current: <span className="font-medium text-foreground">{currentName ?? "Unassigned"}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <Label>Team member</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name ?? m.email} {(m.roles?.length ?? 0) > 0 && `· ${m.roles?.join(", ")}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || selected === (currentAssignee ?? "__none__")}
          >
            {currentAssignee ? "Reassign" : "Assign"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
