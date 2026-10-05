import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BankLogo } from "@/components/BankLogo";
import { FaqSection, generalFaqs } from "@/components/FaqSection";
import { loanImage } from "@/lib/loan-images";
import { Wallet, Home, Briefcase, Car, ArrowRight, CheckCircle2, Percent, Clock, ShieldCheck } from "lucide-react";

const icons: Record<string, any> = { Wallet, Home, Briefcase, Car };

export const Route = createFileRoute("/loans/$slug")({
  component: LoanDetail,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — Loans Mart India` },
      { name: "description", content: `Apply for ${params.slug.replace(/-/g, " ")} with leading partner banks.` },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} — Loans Mart India` },
    ],
  }),
  errorComponent: ErrBoundary,
  notFoundComponent: () => (
    <div>
      <PublicNav />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-2">Product not found</h1>
        <p className="text-muted-foreground mb-6">We couldn't find this loan product.</p>
        <Button asChild><Link to="/loans">Back to products</Link></Button>
      </div>
      <PublicFooter />
    </div>
  ),
});

function ErrBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div>
      <PublicNav />
      <div className="container mx-auto px-4 py-16">
        <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded p-4 text-sm max-w-xl mx-auto">
          <div className="font-semibold mb-1">Failed to load product</div>
          <div className="font-mono text-xs whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</div>
          <Button size="sm" className="mt-3" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

function LoanDetail() {
  const { slug } = Route.useParams();

  const { data: loan, isLoading } = useQuery({
    queryKey: ["public-loan", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_types").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: banks } = useQuery({
    queryKey: ["public-loan-banks", loan?.id],
    enabled: !!loan?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_type_banks")
        .select("sort_order, banks!inner(id,name,short_code,logo_url,is_active)")
        .eq("loan_type_id", loan!.id)
        .eq("banks.is_active", true)
        .order("sort_order");
      if (error) return [];
      return data ?? [];
    },
  });

  if (isLoading) return (<div><PublicNav /><div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div><PublicFooter /></div>);
  if (!loan) throw notFound();

  const Icon = icons[loan.icon ?? ""] ?? Wallet;
  const features: string[] = Array.isArray(loan.features) ? (loan.features as any) : [];
  const faqs: { q: string; a: string }[] = Array.isArray(loan.faqs) ? (loan.faqs as any) : [];

  return (
    <div>
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-4">
            <Link to="/loans" className="text-sm text-muted-foreground hover:text-foreground">← All products</Link>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-7 w-7" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">{loan.name}</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">{loan.description}</p>
            <div className="flex gap-3 pt-2">
              <Button asChild size="lg"><Link to="/apply">Apply Now <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/contact">Talk to us</Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 overflow-hidden rounded-2xl border bg-muted">
              <img src={loanImage(loan.slug || loan.name)} alt={`${loan.name} illustration`} width={768} height={512} className="h-40 w-full object-cover" />
            </div>
            {(loan.interest_rate_min || loan.interest_rate_max) && (
              <Stat icon={Percent} label="Interest" value={`${loan.interest_rate_min ?? "—"}${loan.interest_rate_max ? ` – ${loan.interest_rate_max}` : ""}%`} />
            )}
            {(loan.tenure_min_months || loan.tenure_max_months) && (
              <Stat icon={Clock} label="Tenure" value={`${loan.tenure_min_months ?? "—"} – ${loan.tenure_max_months ?? "—"} mo`} />
            )}
            <Stat icon={ShieldCheck} label="Secure" value="Verified partners" />
            <Stat icon={CheckCircle2} label="Approval" value="Quick & easy" />
          </div>
        </div>
      </section>

      {/* About */}
      {loan.long_description && (
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl font-bold mb-4">About this product</h2>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{loan.long_description}</p>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl font-bold mb-6">Key features</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Eligibility */}
      {loan.eligibility_criteria && (
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl font-bold mb-4">Eligibility</h2>
          <Card><CardContent className="p-6 text-sm whitespace-pre-wrap leading-relaxed">{loan.eligibility_criteria}</CardContent></Card>
        </section>
      )}

      {/* Partner Banks */}
      {(banks?.length ?? 0) > 0 && (
        <section className="bg-muted/30 border-y">
          <div className="container mx-auto px-4 py-14 max-w-6xl">
            <h2 className="text-2xl font-bold mb-2 text-center">Our Banking Partners</h2>
            <p className="text-center text-muted-foreground mb-8">We work with leading banks and financial institutions to get you the best offers.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {banks!.map((row: any) => (
                <div key={row.banks?.id} className="bg-background border rounded-lg p-4 min-h-28 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow" title={row.banks?.name}>
                  <BankLogo path={row.banks?.logo_url} alt={row.banks?.name} className="h-10 max-w-full object-contain" />
                  <div className="text-xs text-muted-foreground text-center leading-tight break-words w-full">{row.banks?.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      <FaqSection faqs={[...faqs, ...generalFaqs]} subtitle={`Common questions about ${loan.name}.`} />

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to apply?</h2>
        <p className="text-muted-foreground mb-6">Start your application online — it only takes a few minutes.</p>
        <Button asChild size="lg"><Link to="/apply">Apply for {loan.name} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
      </section>

      <PublicFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4 bg-background">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
