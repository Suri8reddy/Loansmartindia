import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createDocumentAccessUrl, downloadDocument } from "@/lib/document-storage";
import { toast } from "sonner";
import { DocumentViewer } from "@/components/DocumentViewer";

export function DocPreview({ open, onOpenChange, url, name }: { open: boolean; onOpenChange: (v: boolean) => void; url?: string; name?: string }) {
  const { data: signedUrl, isLoading, error } = useQuery({
    queryKey: ["document-preview-url", url],
    queryFn: () => createDocumentAccessUrl(url ?? ""),
    enabled: open && !!url,
    staleTime: 50 * 60 * 1000,
  });

  if (!url) return null;
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-6">
            <span className="truncate">{name ?? "Document"}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={!signedUrl}
              onClick={() => downloadDocument(url, name ?? "document").catch((downloadError) => toast.error(downloadError instanceof Error ? downloadError.message : "Unable to download document"))}
            >
              <Download className="h-3 w-3 mr-1" />Download
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted rounded">
          {isLoading ? (
            <div className="grid h-full place-items-center p-8 text-sm text-muted-foreground">Loading document…</div>
          ) : error ? (
            <div className="grid h-full place-items-center p-8 text-center text-sm text-destructive">
              {error instanceof Error ? error.message : "Unable to preview this document"}
            </div>
          ) : signedUrl ? <DocumentViewer signedUrl={signedUrl} extension={ext} name={name ?? "Document"} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
