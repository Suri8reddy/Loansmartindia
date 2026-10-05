import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Save, Eye } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/website")({ component: Website });

function Website() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Website Management</h1>
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noreferrer"><Eye className="h-4 w-4 mr-1" /> Preview site</a>
        </Button>
      </div>
      <Tabs defaultValue="banners">
        <TabsList>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
        </TabsList>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="homepage"><HomepageTab /></TabsContent>
        <TabsContent value="testimonials"><TestimonialsTab /></TabsContent>
        <TabsContent value="contact"><ContactTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Banners ----------
function BannersTab() {
  const qc = useQueryClient();
  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => (await supabase.from("website_banners").select("*").order("position")).data ?? [],
  });
  const [n, setN] = useState({ title: "", subtitle: "", cta_label: "", link_url: "", image_url: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!n.title.trim()) throw new Error("Title is required");
      const pos = (banners?.length ?? 0) + 1;
      const { error } = await supabase.from("website_banners").insert({ ...n, position: pos, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Banner added"); qc.invalidateQueries({ queryKey: ["admin-banners"] }); setN({ title: "", subtitle: "", cta_label: "", link_url: "", image_url: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => { await supabase.from("website_banners").update({ is_active: active }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("website_banners").delete().eq("id", id); },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-banners"] }); },
  });

  return (
    <div className="space-y-4 mt-4">
      <Card><CardContent className="p-5 space-y-3">
        <h3 className="font-semibold">Add new banner</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Title" value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
          <Input placeholder="Subtitle" value={n.subtitle} onChange={(e) => setN({ ...n, subtitle: e.target.value })} />
          <Input placeholder="CTA label" value={n.cta_label} onChange={(e) => setN({ ...n, cta_label: e.target.value })} />
          <Input placeholder="Link URL" value={n.link_url} onChange={(e) => setN({ ...n, link_url: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Image URL (optional)" value={n.image_url} onChange={(e) => setN({ ...n, image_url: e.target.value })} />
        </div>
        <Button onClick={() => add.mutate()}><Plus className="h-4 w-4 mr-1" /> Add Banner</Button>
      </CardContent></Card>

      {banners?.map((b) => (
        <Card key={b.id}><CardContent className="p-4 flex items-center gap-4">
          {b.image_url && <img src={b.image_url} alt="" className="h-14 w-24 object-cover rounded" />}
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">{b.title} <Badge variant={b.is_active ? "default" : "outline"}>{b.is_active ? "Published" : "Draft"}</Badge></div>
            <div className="text-sm text-muted-foreground">{b.subtitle}</div>
            {b.link_url && <a href={b.link_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">{b.cta_label || "Open"} <ExternalLink className="h-3 w-3" /></a>}
          </div>
          <Switch checked={b.is_active} onCheckedChange={(v) => toggle.mutate({ id: b.id, active: v })} />
          <Button size="icon" variant="ghost" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </CardContent></Card>
      ))}
      {(!banners || banners.length === 0) && <p className="text-center text-muted-foreground py-8">No banners yet</p>}
    </div>
  );
}

// ---------- Section helper ----------
function useSection(section: string) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["website_content", section],
    queryFn: async () => (await supabase.from("website_content").select("*").eq("section", section).maybeSingle()).data,
  });
  const save = useMutation({
    mutationFn: async (content_json: any) => {
      const { error } = await supabase.from("website_content").upsert({ section, content_json, updated_at: new Date().toISOString() }, { onConflict: "section" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved & published"); qc.invalidateQueries({ queryKey: ["website_content", section] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return { data, save };
}

// ---------- Homepage ----------
function HomepageTab() {
  const { data, save } = useSection("hero");
  const [f, setF] = useState({ headline: "", subheadline: "", primary_cta: "", primary_cta_link: "", secondary_cta: "", secondary_cta_link: "" });
  useEffect(() => { if (data?.content_json) setF({ ...f, ...(data.content_json as any) }); /* eslint-disable-next-line */ }, [data]);

  return (
    <Card className="mt-4"><CardContent className="p-5 space-y-4">
      <h3 className="font-semibold">Hero Section</h3>
      <div className="grid gap-3">
        <div><Label>Headline</Label><Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} /></div>
        <div><Label>Sub-headline</Label><Textarea rows={2} value={f.subheadline} onChange={(e) => setF({ ...f, subheadline: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Primary CTA</Label><Input value={f.primary_cta} onChange={(e) => setF({ ...f, primary_cta: e.target.value })} /></div>
          <div><Label>Primary CTA Link</Label><Input value={f.primary_cta_link} onChange={(e) => setF({ ...f, primary_cta_link: e.target.value })} /></div>
          <div><Label>Secondary CTA</Label><Input value={f.secondary_cta} onChange={(e) => setF({ ...f, secondary_cta: e.target.value })} /></div>
          <div><Label>Secondary CTA Link</Label><Input value={f.secondary_cta_link} onChange={(e) => setF({ ...f, secondary_cta_link: e.target.value })} /></div>
        </div>
      </div>
      <Button onClick={() => save.mutate(f)}><Save className="h-4 w-4 mr-1" /> Save & Publish</Button>
    </CardContent></Card>
  );
}

// ---------- Testimonials ----------
type Testimonial = { name: string; role: string; quote: string; rating: number; image_url?: string };
function TestimonialsTab() {
  const { data, save } = useSection("testimonials");
  const [list, setList] = useState<Testimonial[]>([]);
  const [n, setN] = useState<Testimonial>({ name: "", role: "", quote: "", rating: 5, image_url: "" });
  useEffect(() => { if (data?.content_json) setList(((data.content_json as any).items ?? []) as Testimonial[]); }, [data]);

  const add = () => {
    if (!n.name.trim() || !n.quote.trim()) { toast.error("Name & quote required"); return; }
    setList([...list, n]);
    setN({ name: "", role: "", quote: "", rating: 5, image_url: "" });
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4 mt-4">
      <Card><CardContent className="p-5 space-y-3">
        <h3 className="font-semibold">Add testimonial</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Name" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <Input placeholder="Role / Company" value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })} />
          <Input placeholder="Photo URL (optional)" value={n.image_url} onChange={(e) => setN({ ...n, image_url: e.target.value })} />
          <Input type="number" min={1} max={5} placeholder="Rating 1-5" value={n.rating} onChange={(e) => setN({ ...n, rating: Number(e.target.value) })} />
          <Textarea className="sm:col-span-2" rows={2} placeholder="Quote" value={n.quote} onChange={(e) => setN({ ...n, quote: e.target.value })} />
        </div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add to list</Button>
      </CardContent></Card>

      {list.map((t, i) => (
        <Card key={i}><CardContent className="p-4 flex items-start gap-4">
          {t.image_url && <img src={t.image_url} alt="" className="h-12 w-12 rounded-full object-cover" />}
          <div className="flex-1">
            <div className="font-medium">{t.name} <span className="text-muted-foreground text-sm">— {t.role}</span></div>
            <div className="text-sm italic">"{t.quote}"</div>
            <div className="text-xs text-yellow-500">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </CardContent></Card>
      ))}
      {list.length === 0 && <p className="text-center text-muted-foreground py-4">No testimonials yet</p>}

      <Button onClick={() => save.mutate({ items: list })}><Save className="h-4 w-4 mr-1" /> Save & Publish All</Button>
    </div>
  );
}

// ---------- Contact Info ----------
function ContactTab() {
  const { data, save } = useSection("contact");
  const [f, setF] = useState({ phone: "", email: "", address: "", whatsapp: "", facebook: "", instagram: "", linkedin: "", twitter: "", hours: "" });
  useEffect(() => { if (data?.content_json) setF({ ...f, ...(data.content_json as any) }); /* eslint-disable-next-line */ }, [data]);

  return (
    <Card className="mt-4"><CardContent className="p-5 space-y-4">
      <h3 className="font-semibold">Contact Information</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>WhatsApp</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Business Hours</Label><Input value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><Label>Facebook URL</Label><Input value={f.facebook} onChange={(e) => setF({ ...f, facebook: e.target.value })} /></div>
        <div><Label>Instagram URL</Label><Input value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} /></div>
        <div><Label>LinkedIn URL</Label><Input value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} /></div>
        <div><Label>Twitter URL</Label><Input value={f.twitter} onChange={(e) => setF({ ...f, twitter: e.target.value })} /></div>
      </div>
      <Button onClick={() => save.mutate(f)}><Save className="h-4 w-4 mr-1" /> Save & Publish</Button>
    </CardContent></Card>
  );
}
