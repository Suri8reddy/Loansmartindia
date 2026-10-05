import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankLogo } from "@/components/BankLogo";
import { Plus, Edit, FileText, Trash2, Building2, X, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/loan-types")({ component: LoanTypes });

const ALL_FORMATS = ["pdf", "jpg", "png", "doc", "docx"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type FormState = {
  name: string;
  slug: string;
  description: string;
  long_description: string;
  eligibility_criteria: string;
  icon: string;
  is_active: boolean;
  features: string[];
  faqs: { q: string; a: string }[];
  interest_rate_min: string;
  interest_rate_max: string;
  tenure_min_months: string;
  tenure_max_months: string;
};

const emptyForm: FormState = {
  name: "", slug: "", description: "", long_description: "", eligibility_criteria: "",
  icon: "Wallet", is_active: true, features: [], faqs: [],
  interest_rate_min: "", interest_rate_max: "", tenure_min_months: "", tenure_max_months: "",
};

function LoanTypes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [docsFor, setDocsFor] = useState<any>(null);
  const [banksFor, setBanksFor] = useState<any>(null);

  const { data: types } = useQuery({
    queryKey: ["admin-loan-types"],
    queryFn: async () => (await supabase.from("loan_types").select("*").order("created_at")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      const payload: any = {
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        description: form.description || null,
        long_description: form.long_description || null,
        eligibility_criteria: form.eligibility_criteria || null,
        icon: form.icon || "Wallet",
        is_active: form.is_active,
        features: form.features.filter((f) => f.trim()),
        faqs: form.faqs.filter((f) => f.q.trim()),
        interest_rate_min: form.interest_rate_min ? Number(form.interest_rate_min) : null,
        interest_rate_max: form.interest_rate_max ? Number(form.interest_rate_max) : null,
        tenure_min_months: form.tenure_min_months ? Number(form.tenure_min_months) : null,
        tenure_max_months: form.tenure_max_months ? Number(form.tenure_max_months) : null,
      };
      if (editing) {
        const { error } = await supabase.from("loan_types").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loan_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-loan-types"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name ?? "",
      slug: t.slug ?? slugify(t.name ?? ""),
      description: t.description ?? "",
      long_description: t.long_description ?? "",
      eligibility_criteria: t.eligibility_criteria ?? "",
      icon: t.icon ?? "Wallet",
      is_active: t.is_active,
      features: Array.isArray(t.features) ? t.features : [],
      faqs: Array.isArray(t.faqs) ? t.faqs : [],
      interest_rate_min: t.interest_rate_min?.toString() ?? "",
      interest_rate_max: t.interest_rate_max?.toString() ?? "",
      tenure_min_months: t.tenure_min_months?.toString() ?? "",
      tenure_max_months: t.tenure_max_months?.toString() ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Loan Products</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Product</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {types?.map((t: any) => (
          <Card key={t.id}><CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                {t.slug && <p className="text-xs text-muted-foreground font-mono">/loans/{t.slug}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setBanksFor(t)} title="Partner banks"><Building2 className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setDocsFor(t)} title="Required documents"><FileText className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
            <div className="mt-3 text-xs">{t.is_active ? <span className="text-success">● Active</span> : <span className="text-muted-foreground">○ Inactive</span>}</div>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Loan Product</DialogTitle></DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="faqs">FAQs</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-3 pt-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
              <div><Label>URL Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="personal-loan" />
                <p className="text-xs text-muted-foreground mt-1">Page URL: /loans/{form.slug || "..."}</p></div>
              <div><Label>Short Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Icon (Wallet, Home, Briefcase, Car)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            </TabsContent>
            <TabsContent value="content" className="space-y-3 pt-3">
              <div><Label>Long Description</Label><Textarea rows={6} value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} placeholder="Detailed overview shown on the product page." /></div>
              <div><Label>Eligibility</Label><Textarea rows={3} value={form.eligibility_criteria} onChange={(e) => setForm({ ...form, eligibility_criteria: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Interest rate min (%)</Label><Input type="number" step="0.1" value={form.interest_rate_min} onChange={(e) => setForm({ ...form, interest_rate_min: e.target.value })} /></div>
                <div><Label>Interest rate max (%)</Label><Input type="number" step="0.1" value={form.interest_rate_max} onChange={(e) => setForm({ ...form, interest_rate_max: e.target.value })} /></div>
                <div><Label>Tenure min (months)</Label><Input type="number" value={form.tenure_min_months} onChange={(e) => setForm({ ...form, tenure_min_months: e.target.value })} /></div>
                <div><Label>Tenure max (months)</Label><Input type="number" value={form.tenure_max_months} onChange={(e) => setForm({ ...form, tenure_max_months: e.target.value })} /></div>
              </div>
            </TabsContent>
            <TabsContent value="features" className="space-y-2 pt-3">
              {form.features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={f} onChange={(e) => { const a = [...form.features]; a[i] = e.target.value; setForm({ ...form, features: a }); }} placeholder={`Feature ${i + 1}`} />
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, features: form.features.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, features: [...form.features, ""] })}><Plus className="h-4 w-4 mr-1" />Add feature</Button>
            </TabsContent>
            <TabsContent value="faqs" className="space-y-3 pt-3">
              {form.faqs.map((f, i) => (
                <div key={i} className="border rounded p-2 space-y-2">
                  <div className="flex justify-between items-center"><Label className="text-xs">Q{i + 1}</Label><Button size="icon" variant="ghost" onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button></div>
                  <Input placeholder="Question" value={f.q} onChange={(e) => { const a = [...form.faqs]; a[i] = { ...a[i], q: e.target.value }; setForm({ ...form, faqs: a }); }} />
                  <Textarea rows={2} placeholder="Answer" value={f.a} onChange={(e) => { const a = [...form.faqs]; a[i] = { ...a[i], a: e.target.value }; setForm({ ...form, faqs: a }); }} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, faqs: [...form.faqs, { q: "", a: "" }] })}><Plus className="h-4 w-4 mr-1" />Add FAQ</Button>
            </TabsContent>
          </Tabs>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full mt-4">Save</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docsFor} onOpenChange={(o) => !o && setDocsFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Required Documents — {docsFor?.name}</DialogTitle></DialogHeader>
          {docsFor && <DocsManager loanTypeId={docsFor.id} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!banksFor} onOpenChange={(o) => !o && setBanksFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Partner Banks — {banksFor?.name}</DialogTitle></DialogHeader>
          {banksFor && <PartnerBanksManager loanTypeId={banksFor.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartnerBanksManager({ loanTypeId }: { loanTypeId: string }) {
  const qc = useQueryClient();
  const { data: allBanks } = useQuery({
    queryKey: ["active-banks"],
    queryFn: async () => (await supabase.from("banks").select("*").eq("is_active", true).order("name")).data ?? [],
  });
  const { data: linked, refetch } = useQuery({
    queryKey: ["loan-type-banks", loanTypeId],
    queryFn: async () => (await supabase.from("loan_type_banks").select("*, banks(*)").eq("loan_type_id", loanTypeId).order("sort_order")).data ?? [],
  });
  const linkedIds = new Set((linked ?? []).map((l: any) => l.bank_id));

  const add = useMutation({
    mutationFn: async (bankId: string) => {
      const sort_order = (linked?.length ?? 0) + 1;
      const { error } = await supabase.from("loan_type_banks").insert({ loan_type_id: loanTypeId, bank_id: bankId, sort_order } as any);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["public-loan-banks"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("loan_type_banks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["public-loan-banks"] }); },
  });
  const move = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => { await supabase.from("loan_type_banks").update({ sort_order } as any).eq("id", id); },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["public-loan-banks"] }); },
  });

  const swap = (idx: number, dir: -1 | 1) => {
    const arr = [...(linked ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[idx], b = arr[j];
    move.mutate({ id: a.id, sort_order: b.sort_order });
    move.mutate({ id: b.id, sort_order: a.sort_order });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm mb-2">Selected banks ({linked?.length ?? 0})</h4>
        <div className="space-y-2">
          {(linked ?? []).map((row: any, i: number) => (
            <div key={row.id} className="flex items-center gap-3 border rounded p-2">
              <div className="h-10 w-14 border rounded bg-muted/30 flex items-center justify-center overflow-hidden">
                <BankLogo path={row.banks?.logo_url} alt={row.banks?.name} className="max-h-10 max-w-14 object-contain" />
              </div>
              <div className="flex-1 text-sm font-medium">{row.banks?.name}</div>
              <Button size="icon" variant="ghost" onClick={() => swap(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => swap(i, 1)} disabled={i === (linked?.length ?? 0) - 1}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(row.id)}><X className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(!linked || linked.length === 0) && <p className="text-sm text-muted-foreground">No banks selected yet.</p>}
        </div>
      </div>
      <div className="border-t pt-3">
        <h4 className="font-medium text-sm mb-2">Add a bank</h4>
        <div className="grid grid-cols-2 gap-2">
          {(allBanks ?? []).filter((b: any) => !linkedIds.has(b.id)).map((b: any) => (
            <Button key={b.id} variant="outline" size="sm" onClick={() => add.mutate(b.id)} className="justify-start gap-2">
              <BankLogo path={b.logo_url} alt={b.name} className="h-5 w-7 object-contain" />
              <span className="truncate">{b.name}</span>
            </Button>
          ))}
        </div>
        {(allBanks ?? []).filter((b: any) => !linkedIds.has(b.id)).length === 0 && <p className="text-xs text-muted-foreground">All active banks are linked.</p>}
      </div>
    </div>
  );
}

function DocsManager({ loanTypeId }: { loanTypeId: string }) {
  const qc = useQueryClient();
  const { data: docs } = useQuery({
    queryKey: ["loan-docs", loanTypeId],
    queryFn: async () => (await supabase.from("loan_documents").select("*").eq("loan_type_id", loanTypeId).order("sort_order")).data ?? [],
  });
  const [n, setN] = useState({ document_name: "", description: "", is_mandatory: true, allowed_formats: ["pdf", "jpg", "png"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!n.document_name.trim()) throw new Error("Document name required");
      if (n.allowed_formats.length === 0) throw new Error("Select at least one format");
      const sort_order = (docs?.length ?? 0) + 1;
      const { error } = await supabase.from("loan_documents").insert({ ...n, loan_type_id: loanTypeId, sort_order });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document added"); qc.invalidateQueries({ queryKey: ["loan-docs", loanTypeId] }); setN({ document_name: "", description: "", is_mandatory: true, allowed_formats: ["pdf", "jpg", "png"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("loan_documents").delete().eq("id", id); },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["loan-docs", loanTypeId] }); },
  });
  const toggleFmt = (f: string) => setN({ ...n, allowed_formats: n.allowed_formats.includes(f) ? n.allowed_formats.filter((x) => x !== f) : [...n.allowed_formats, f] });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {docs?.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="text-sm font-medium">{d.document_name}{d.is_mandatory && <span className="text-destructive ml-1">*</span>}</div>
              {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
              <div className="flex gap-1 mt-1">{(d.allowed_formats ?? []).map((f: string) => <Badge key={f} variant="outline" className="text-[10px] uppercase">{f}</Badge>)}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        {(!docs || docs.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No required documents yet</p>}
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium text-sm">Add required document</h4>
        <Input placeholder="Document name (e.g. PAN Card)" value={n.document_name} onChange={(e) => setN({ ...n, document_name: e.target.value })} />
        <Textarea rows={2} placeholder="Description / instructions (optional)" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
        <div>
          <Label className="text-xs">Allowed formats</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ALL_FORMATS.map((f) => (
              <button key={f} type="button" onClick={() => toggleFmt(f)} className={`text-xs px-2 py-1 rounded border uppercase ${n.allowed_formats.includes(f) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={n.is_mandatory} onCheckedChange={(v) => setN({ ...n, is_mandatory: v })} /><Label>Mandatory</Label></div>
        <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4 mr-1" /> Add document</Button>
      </div>
    </div>
  );
}
