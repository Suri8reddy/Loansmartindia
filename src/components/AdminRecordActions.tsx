import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AdminRecordActions({ archived, label, pending, onArchive, onDelete }: {
  archived: boolean; label: string; pending?: boolean; onArchive: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-nowrap gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending}>
            {archived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
            {archived ? "Restore" : "Archive"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{archived ? "Restore" : "Archive"} {label}?</AlertDialogTitle>
            <AlertDialogDescription>{archived ? "This record will return to active lists." : "This record will be hidden from active lists, but its history will be kept."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onArchive}>{archived ? "Restore" : "Archive"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" className="h-8 w-8 shrink-0" variant="destructive" disabled={pending} title={`Delete ${label} permanently`} aria-label={`Delete ${label} permanently`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Permanently delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Linked operational records may also be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Delete permanently</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}