import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/team/share-links")({
  head: () => ({ meta: [
    { title: "Banker Share Links | Loans Mart India" },
    { name: "description", content: "Create and manage secure banker access links." },
    { property: "og:title", content: "Banker Share Links | Loans Mart India" },
    { property: "og:description", content: "Create and manage secure banker access links." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ShareLinks,
});

const PUBLIC_SITE_URL = "https://loansmartindia.com";

function ShareLinks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [appId, setAppId] = useState("");
  const [hours, setHours] = useState("48");

  const { data: links } = useQuery({
    queryKey: ["share-links", user?.id],
    queryFn: async () => (await supabase.from("banker_share_links").select("*, loan_applications(loan_types(name))").eq("generated_by", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });
  const { data: apps } = useQuery({
    queryKey: ["link-apps", user?.id],
    queryFn: async () => (await supabase.from("loan_applications").select("id, loan_types(name)").eq("assigned_to", user!.id)).data ?? [],
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!appId) throw new Error("Pick an application");
      const token = crypto.randomUUID();
      const expires_at = new Date(Date.now() + Number(hours) * 3600 * 1000).toISOString();
      const { error } = await supabase.from("banker_share_links").insert({ application_id: appId, generated_by: user!.id, token, expires_at, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link created"); qc.invalidateQueries({ queryKey: ["share-links", user?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => { await supabase.from("banker_share_links").update({ is_active: false }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["share-links", user?.id] }),
  });

  const copy = (token: string) => {
    const url = `${PUBLIC_SITE_URL}/banker/${token}`;
    navigator.clipboard.writeText(url); toast.success("Link copied");
  };

  const shareOnWhatsApp = (token: string) => {
    const url = `${PUBLIC_SITE_URL}/banker/${token}`;
    const message = `Please review the customer loan details and approved documents from Loans Mart India:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Banker Share Links</h1>
      <Card><CardContent className="p-5 space-y-3">
        <h3 className="font-semibold">Generate new link</h3>
        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
          <Select value={appId} onValueChange={setAppId}>
            <SelectTrigger><SelectValue placeholder="Pick an application" /></SelectTrigger>
            <SelectContent>{apps?.map((a) => <SelectItem key={a.id} value={a.id}>{(a.loan_types as any)?.name} — #{a.id.slice(0,8)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="48">48 hours</SelectItem>
              <SelectItem value="168">7 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => create.mutate()}><Plus className="h-4 w-4 mr-1" /> Generate</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Application</TableHead><TableHead>Expires</TableHead><TableHead>Access Count</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {links?.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{((l.loan_applications as any)?.loan_types?.name) ?? "—"}</TableCell>
                <TableCell>{new Date(l.expires_at).toLocaleString()}</TableCell>
                <TableCell>{l.access_count}</TableCell>
                <TableCell>{l.is_active && new Date(l.expires_at) > new Date() ? "Active" : "Expired"}</TableCell>
                <TableCell className="space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => copy(l.token)}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  {l.is_active && new Date(l.expires_at) > new Date() && (
                    <Button size="sm" variant="ghost" onClick={() => shareOnWhatsApp(l.token)}>
                      <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                    </Button>
                  )}
                  {l.is_active && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(l.id)}>Revoke</Button>}
                </TableCell>
              </TableRow>
            ))}
            {(!links || links.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No links yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
