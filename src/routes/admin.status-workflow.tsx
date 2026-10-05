import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/status-workflow")({ component: Workflow });

const GLOBAL = "__global__";

function Workflow() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [scope, setScope] = useState<string>(GLOBAL);

  const { data: products } = useQuery({
    queryKey: ["loan-types-all"],
    queryFn: async () => (await supabase.from("loan_types").select("id,name").order("name")).data ?? [],
  });

  const scopeId = scope === GLOBAL ? null : scope;

  const { data: statuses } = useQuery({
    queryKey: ["statuses", scope],
    queryFn: async () => {
      const q = supabase.from("loan_statuses").select("*").order("stage_order");
      const { data } = scopeId ? await q.eq("loan_type_id", scopeId) : await q.is("loan_type_id", null);
      return data ?? [];
    },
  });

  const { data: globalStatuses } = useQuery({
    queryKey: ["statuses", GLOBAL],
    queryFn: async () => (await supabase.from("loan_statuses").select("*").is("loan_type_id", null).order("stage_order")).data ?? [],
    enabled: scope !== GLOBAL,
  });

  const mut = useMutation({
    mutationFn: async (fn: () => any) => { const r = await fn(); if (r?.error) throw r.error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["statuses"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const seedFromGlobal = useMutation({
    mutationFn: async () => {
      if (!scopeId) return;
      if (!globalStatuses || globalStatuses.length === 0) throw new Error("No global stages to seed from");
      const rows = globalStatuses.map((s: any) => ({
        stage_name: s.stage_name, stage_order: s.stage_order, color: s.color, is_active: s.is_active, loan_type_id: scopeId,
      }));
      const { error } = await supabase.from("loan_statuses").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Seeded from global stages"); qc.invalidateQueries({ queryKey: ["statuses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Status Workflow</h1>
          <p className="text-sm text-muted-foreground">Define stages globally or per loan product. Per-product stages override the global list.</p>
        </div>
        <div className="min-w-[260px]">
          <Label className="text-xs">Scope</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL}>Global (fallback for all products)</SelectItem>
              {products?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {scope !== GLOBAL && (statuses?.length ?? 0) === 0 && (
        <Card><CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">This product uses the global flow. Create a custom one?</div>
          <Button size="sm" variant="outline" onClick={() => seedFromGlobal.mutate()} disabled={seedFromGlobal.isPending}>
            <Copy className="h-4 w-4 mr-1" />Copy global stages
          </Button>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-6 space-y-3">
        <div className="flex gap-2">
          <Input placeholder="New stage name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={() => {
            if (!newName.trim()) return;
            const order = (statuses?.length ?? 0) + 1;
            mut.mutate(() => supabase.from("loan_statuses").insert({ stage_name: newName, stage_order: order, color: "blue", loan_type_id: scopeId }));
            setNewName("");
          }}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="space-y-2">
          {statuses?.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 border rounded p-3">
              <span className="w-8 text-muted-foreground text-sm">{s.stage_order}</span>
              <span className="flex-1 font-medium">{s.stage_name}</span>
              <Switch checked={s.is_active} onCheckedChange={(v) => mut.mutate(() => supabase.from("loan_statuses").update({ is_active: v }).eq("id", s.id))} />
              <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => {
                const prev = statuses![i-1];
                mut.mutate(async () => {
                  await supabase.from("loan_statuses").update({ stage_order: prev.stage_order }).eq("id", s.id);
                  return supabase.from("loan_statuses").update({ stage_order: s.stage_order }).eq("id", prev.id);
                });
              }}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" disabled={i === (statuses!.length - 1)} onClick={() => {
                const next = statuses![i+1];
                mut.mutate(async () => {
                  await supabase.from("loan_statuses").update({ stage_order: next.stage_order }).eq("id", s.id);
                  return supabase.from("loan_statuses").update({ stage_order: s.stage_order }).eq("id", next.id);
                });
              }}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => mut.mutate(() => supabase.from("loan_statuses").delete().eq("id", s.id))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {(statuses?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No stages.</p>}
        </div>
      </CardContent></Card>
    </div>
  );
}
