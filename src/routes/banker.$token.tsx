import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Eye, FileText, FileX, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import { getBankerShare } from "@/lib/banker-share.functions";

export const Route = createFileRoute("/banker/$token")({
  head: () => ({ meta: [
    { title: "Secure Banker Access | Loans Mart India" },
    { name: "description", content: "Securely review customer loan details and approved documents shared by Loans Mart India." },
    { property: "og:title", content: "Secure Banker Access | Loans Mart India" },
    { property: "og:description", content: "Securely review customer loan details and approved documents shared by Loans Mart India." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BankerView,
});

function BankerView() {
  const { token } = Route.useParams();
  const fetchShare = useServerFn(getBankerShare);
  const [preview, setPreview] = useState<{ name: string; url: string; extension: string } | null>(null);
  const { data: bundle, isLoading, error } = useQuery({
    queryKey: ["banker-bundle", token],
    queryFn: () => fetchShare({ data: { token } }),
    retry: 1,
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-muted/30 text-sm text-muted-foreground">Opening secure application…</div>;
  if (error) return <Unavailable title="Unable to open link" message="The secure link could not be loaded. Please try again in a moment." />;
  if (!bundle || bundle.status === "unavailable") return <Unavailable title="Link expired or invalid" message="Please request a fresh link from your loan consultant." />;

  const { application, customer, documents } = bundle;
  return (
    <div className="min-h-screen bg-muted/30">
      <BrandHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Loan application</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shared securely for review by Loans Mart India</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardContent className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Customer details</h2>
            <dl className="space-y-4 text-sm">
              <Detail icon={UserRound} label="Name" value={customer.name} />
              <Detail icon={Phone} label="Phone" value={customer.phone ?? "Not provided"} href={customer.phone ? `tel:${customer.phone}` : undefined} />
              <Detail icon={Mail} label="Email" value={customer.email ?? "Not provided"} href={customer.email ? `mailto:${customer.email}` : undefined} />
            </dl>
          </CardContent></Card>
          <Card><CardContent className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Loan details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
              <Summary label="Loan type" value={application.loanType} />
              <Summary label="Current status" value={application.loanStatus} />
              <Summary label="Amount requested" value={formatCurrency(application.amountRequested)} />
              <Summary label="Amount approved" value={formatCurrency(application.amountApproved)} />
              <Summary label="Amount disbursed" value={formatCurrency(application.amountDisbursed)} />
              <Summary label="Reference" value={`#${application.id.slice(0, 8).toUpperCase()}`} />
            </dl>
          </CardContent></Card>
        </div>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-semibold">Approved documents</h2><p className="mt-1 text-sm text-muted-foreground">{documents.length} document{documents.length === 1 ? "" : "s"} available</p></div>
            <p className="hidden text-xs text-muted-foreground sm:block">Access expires {new Date(bundle.expiresAt).toLocaleString()}</p>
          </div>
          {documents.length > 0 ? <div className="grid gap-3">{documents.map((document) => (
            <Card key={document.id}><CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.name}</p><p className="text-xs text-muted-foreground">Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p></div>
              {document.url ? <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" title="Preview document" onClick={() => setPreview({ name: document.name, url: document.url ?? "", extension: document.extension })}><Eye className="h-4 w-4" /><span className="sr-only">Preview {document.name}</span></Button>
                <Button asChild variant="ghost" size="icon"><a href={document.url} download={document.name} title="Download document"><Download className="h-4 w-4" /><span className="sr-only">Download {document.name}</span></a></Button>
              </div> : <span className="text-xs text-destructive">Unavailable</span>}
            </CardContent></Card>
          ))}</div> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No approved documents are available yet.</CardContent></Card>}
          <p className="mt-3 text-xs text-muted-foreground sm:hidden">Access expires {new Date(bundle.expiresAt).toLocaleString()}</p>
        </section>
      </main>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="flex h-[88vh] max-w-5xl flex-col p-4 sm:p-6">
          <DialogHeader><DialogTitle className="pr-8">{preview?.name ?? "Document"}</DialogTitle></DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md bg-muted">
            {preview && <DocumentViewer signedUrl={preview.url} extension={preview.extension} name={preview.name} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandHeader() {
  return <header className="border-b bg-background"><div className="mx-auto flex min-h-20 max-w-5xl items-center justify-between gap-4 px-4 py-3"><img src="/loansmart-india.png" alt="Loans Mart India" className="h-12 w-auto sm:h-14 object-contain" /><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Secure read-only access</div></div></header>;
}

function Unavailable({ title, message }: { title: string; message: string }) {
  return <div className="min-h-screen bg-muted/30"><BrandHeader /><main className="grid min-h-[calc(100vh-5rem)] place-items-center px-4 py-10"><Card className="w-full max-w-md"><CardContent className="p-8 text-center sm:p-10"><FileX className="mx-auto mb-4 h-12 w-12 text-destructive" /><h1 className="mb-2 text-2xl font-bold">{title}</h1><p className="text-muted-foreground">{message}</p></CardContent></Card></main></div>;
}

function Detail({ icon: Icon, label, value, href }: { icon: typeof UserRound; label: string; value: string; href?: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="flex min-w-0 flex-col"><span className="text-xs text-muted-foreground">{label}</span>{href ? <a href={href} className="break-words font-medium hover:text-primary">{value}</a> : <span className="break-words font-medium">{value}</span>}</div></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>;
}

function formatCurrency(value: number | null) {
  return value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
}
