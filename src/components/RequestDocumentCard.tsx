import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FORMATS = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];

export function RequestDocumentCard({ applicationId }: { applicationId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [formats, setFormats] = useState<string[]>(["pdf", "jpg", "png"]);
  const [mandatory, setMandatory] = useState(true);

  const { data: requests } = useQuery({
    queryKey: ["doc-requests", applicationId],
    queryFn: async () => (await supabase.from("application_document_requests").select("*").eq("application_id", applicationId).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Document name required");
      if (formats.length === 0) throw new Error("Select at least one format");
      const { error } = await supabase.from("application_document_requests").insert({
        application_id: applicationId, document_name: name.trim(), description: desc.trim() || null,
        allowed_formats: formats, is_mandatory: mandatory, requested_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document requested — customer will be notified on next login");
      setName(""); setDesc(""); setFormats(["pdf", "jpg", "png"]); setMandatory(true);
      qc.invalidateQueries({ queryKey: ["doc-requests", applicationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_document_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Request removed"); qc.invalidateQueries({ queryKey: ["doc-requests", applicationId] }); },
  });

  const toggleFmt = (f: string) => setFormats((cur) => cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);

  return (
    <Card><CardContent className="p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Request additional document</h2>
        <p className="text-xs text-muted-foreground mt-1">Customer sees this in their upload checklist.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-1">
          <Label>Document name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Latest salary slip" />
        </div>
        <div className="sm:col-span-1 flex items-center gap-3 sm:pt-6">
          <Switch id="mand" checked={mandatory} onCheckedChange={setMandatory} />
          <Label htmlFor="mand" className="cursor-pointer">Mandatory</Label>
        </div>
        <div className="sm:col-span-2">
          <Label>Instructions (optional)</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Last 3 months, employer-stamped" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <Label>Allowed formats</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {FORMATS.map((f) => (
              <button key={f} type="button" onClick={() => toggleFmt(f)}
                className={cn("text-xs px-2 py-1 rounded border uppercase",
                  formats.includes(f) ? "bg-primary text-primary-foreground border-primary" : "bg-background")}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4 mr-1" />Add request</Button>

      {requests && requests.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          {requests.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm border rounded p-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{r.document_name}</span>
                  {r.is_mandatory && <Badge variant="outline" className="text-[10px]">Mandatory</Badge>}
                  {r.fulfilled_at
                    ? <span className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" />Uploaded</span>
                    : <span className="text-xs text-warning flex items-center gap-1"><Clock className="h-3 w-3" />Pending</span>}
                </div>
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)} title="Remove">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}
