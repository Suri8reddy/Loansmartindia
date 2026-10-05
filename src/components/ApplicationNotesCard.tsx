import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StickyNote, CalendarClock, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ApplicationNotesCard({ applicationId }: { applicationId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [followUp, setFollowUp] = useState("");

  const { data: notes } = useQuery({
    queryKey: ["app-notes", applicationId],
    queryFn: async () => (await supabase.from("application_notes")
      .select("*, profiles!application_notes_author_profile_fkey(full_name,email)")
      .eq("application_id", applicationId).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Note body required");
      const { error } = await supabase.from("application_notes").insert({
        application_id: applicationId, author_id: user!.id, body: body.trim(),
        follow_up_at: followUp ? new Date(followUp).toISOString() : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); setFollowUp(""); toast.success("Note added"); qc.invalidateQueries({ queryKey: ["app-notes", applicationId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("application_notes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-notes", applicationId] }),
  });

  return (
    <Card><CardContent className="p-6 space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><StickyNote className="h-4 w-4" />Internal notes</h2>
      <div className="space-y-2">
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add an internal note (not visible to customer)" />
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs flex items-center gap-1"><CalendarClock className="h-3 w-3" />Follow-up reminder (optional)</Label>
            <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>Add note</Button>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t">
        {(notes ?? []).map((n: any) => {
          const author = n.profiles?.full_name ?? n.profiles?.email ?? "—";
          const fu = n.follow_up_at ? new Date(n.follow_up_at) : null;
          const overdue = fu && fu < new Date() && !n.follow_up_notified_at;
          return (
            <div key={n.id} className="border-l-2 border-primary pl-3 py-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{author}</span> • {new Date(n.created_at).toLocaleString()}
                </div>
                {n.author_id === user?.id && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => del.mutate(n.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap mt-1">{n.body}</p>
              {fu && (
                <Badge variant={overdue ? "destructive" : "secondary"} className="mt-2 text-[10px]">
                  <CalendarClock className="h-3 w-3 mr-1" />
                  Follow-up: {fu.toLocaleString()}
                </Badge>
              )}
            </div>
          );
        })}
        {(notes ?? []).length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </div>
    </CardContent></Card>
  );
}
