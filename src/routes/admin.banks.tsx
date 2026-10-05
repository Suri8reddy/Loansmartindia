import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BankLogo } from "@/components/BankLogo";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/banks")({ component: BanksPage });

function BanksPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const { data: banks } = useQuery({
    queryKey: ["all-banks"],
    queryFn: async () => (await supabase.from("banks").select("*").order("name")).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Bank name required");
      const { error } = await supabase.from("banks").insert({
        name: name.trim(), short_code: code.trim() || null,
        contact_email: email.trim() || null, contact_phone: phone.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setCode(""); setEmail(""); setPhone(""); toast.success("Bank added"); qc.invalidateQueries({ queryKey: ["all-banks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => { const { error } = await supabase.from("banks").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-banks"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("banks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["all-banks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadLogo = useMutation({
    mutationFn: async ({ id, file, oldPath }: { id: string; file: File; oldPath?: string | null }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("bank-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("banks").update({ logo_url: path } as any).eq("id", id);
      if (error) throw error;
      if (oldPath) await supabase.storage.from("bank-logos").remove([oldPath]);
    },
    onSuccess: () => { toast.success("Logo uploaded"); qc.invalidateQueries({ queryKey: ["all-banks"] }); qc.invalidateQueries({ queryKey: ["bank-logo-signed"] }); qc.invalidateQueries({ queryKey: ["public-loan-banks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeLogo = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("bank-logos").remove([path]);
      const { error } = await supabase.from("banks").update({ logo_url: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Logo removed"); qc.invalidateQueries({ queryKey: ["all-banks"] }); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Banks</h1>
      <Card><CardContent className="p-6 space-y-3">
        <h2 className="font-semibold">Add a bank</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC Bank" /></div>
          <div><Label>Short code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HDFC" /></div>
          <div><Label>Contact email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Contact phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4 mr-1" />Add bank</Button>
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-2">
        {(banks ?? []).map((b: any) => (
          <BankRow
            key={b.id}
            bank={b}
            onToggle={(v: boolean) => update.mutate({ id: b.id, patch: { is_active: v } })}
            onDelete={() => del.mutate(b.id)}
            onUpload={(file: File) => uploadLogo.mutate({ id: b.id, file, oldPath: b.logo_url })}
            onRemoveLogo={() => b.logo_url && removeLogo.mutate({ id: b.id, path: b.logo_url })}
          />
        ))}
        {(banks ?? []).length === 0 && <p className="text-sm text-muted-foreground">No banks yet.</p>}
      </CardContent></Card>
    </div>
  );
}

function BankRow({ bank, onToggle, onDelete, onUpload, onRemoveLogo }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 border rounded p-3 flex-wrap">
      <div className="h-12 w-16 shrink-0 border rounded bg-muted/30 flex items-center justify-center overflow-hidden">
        <BankLogo path={bank.logo_url} alt={bank.name} className="max-h-12 max-w-16 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{bank.name} {bank.short_code && <span className="text-xs text-muted-foreground">({bank.short_code})</span>}</div>
        <div className="text-xs text-muted-foreground">{bank.contact_email || "—"} • {bank.contact_phone || "—"}</div>
      </div>
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" />{bank.logo_url ? "Replace" : "Logo"}</Button>
        {bank.logo_url && <Button size="icon" variant="ghost" onClick={onRemoveLogo} title="Remove logo"><X className="h-4 w-4" /></Button>}
        <Switch checked={bank.is_active} onCheckedChange={onToggle} />
        <span className="text-xs text-muted-foreground">{bank.is_active ? "Active" : "Inactive"}</span>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
}
