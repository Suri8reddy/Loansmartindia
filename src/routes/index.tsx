import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { BannerCarousel } from "@/components/BannerCarousel";
import { FaqSection } from "@/components/FaqSection";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ShieldCheck, Zap, Users, BadgeCheck } from "lucide-react";
import homeHero from "@/assets/home-hero.jpg";
import stepRequirement from "@/assets/step-requirement.jpg";
import stepCompare from "@/assets/step-compare.jpg";
import stepDocuments from "@/assets/step-documents.jpg";
import stepDisbursal from "@/assets/step-disbursal.jpg";
import whyFast from "@/assets/why-fast.jpg";
import whySecure from "@/assets/why-secure.jpg";
import whyDsa from "@/assets/why-dsa.jpg";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loans Mart India — Smart Loans. Better Tomorrows." },
      { name: "description", content: "Compare and apply for personal, home, business and car loans. Get approved fast." },
      { property: "og:title", content: "Loans Mart India — Smart Loans. Better Tomorrows." },
      { property: "og:description", content: "Compare and apply for personal, home, business and car loans. Get approved fast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "/loansmart-india.png" },
      { name: "twitter:image", content: "/loansmart-india.png" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => (await supabase.from("website_banners").select("*").eq("is_active", true).order("position")).data ?? [],
  });
  const { data: loanTypes } = useQuery({
    queryKey: ["loan-types-home"],
    queryFn: async () => (await supabase.from("loan_types").select("*").eq("is_active", true)).data ?? [],
  });
  const { data: heroSection } = useQuery({
    queryKey: ["website_content", "hero"],
    queryFn: async () => (await supabase.from("website_content").select("*").eq("section", "hero").maybeSingle()).data,
  });
  const { data: testimonialsSection } = useQuery({
    queryKey: ["website_content", "testimonials"],
    queryFn: async () => (await supabase.from("website_content").select("*").eq("section", "testimonials").maybeSingle()).data,
  });

  const heroContent = (heroSection?.content_json ?? {}) as { headline?: string; subheadline?: string; primary_cta?: string; primary_cta_link?: string; secondary_cta?: string; secondary_cta_link?: string };
  const testimonials = ((testimonialsSection?.content_json as any)?.items ?? []) as { name: string; role: string; quote: string; rating: number; image_url?: string }[];
  const hero = banners?.[0];
  const headline = heroContent.headline || hero?.title || "Loans Made Simple";
  const subheadline = heroContent.subheadline || hero?.subtitle || "Compare, apply and get approved for loans — all in one place. Minimal paperwork. Fast disbursal.";
  const primaryCta = heroContent.primary_cta || "Apply Now";
  const primaryCtaLink = heroContent.primary_cta_link || "/apply";
  const secondaryCta = heroContent.secondary_cta || "Explore Loans";
  const secondaryCtaLink = heroContent.secondary_cta_link || "/loans";

  return (
    <div>
      <PublicNav />

      {/* Hero */}
      <section className="relative min-h-[620px] overflow-hidden border-b" aria-label="Hero">
        <img src={homeHero} alt="Indian family discussing a loan with their financial advisor" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/75 to-foreground/10" />
        <div className="container relative z-10 mx-auto flex min-h-[620px] items-center px-4 py-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-background/25 bg-foreground/40 px-3 py-1.5 text-xs font-semibold text-background backdrop-blur-md">
              <BadgeCheck className="h-4 w-4 text-brand-yellow" /> Trusted by 50,000+ borrowers
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-background md:text-6xl lg:text-7xl">{headline}</h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-background/90 md:text-lg">{subheadline}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand-yellow font-semibold text-foreground shadow-xl hover:bg-brand-yellow/90">
                <a href={primaryCtaLink}>{primaryCta} <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-background/50 bg-background/10 text-background backdrop-blur hover:bg-background hover:text-foreground">
                <a href={secondaryCtaLink}>{secondaryCta}</a>
              </Button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[['₹5Cr+', 'Disbursed'], ['50+', 'Bank partners'], ['4.8★', 'Customer rating']].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-background/20 bg-background/10 p-3 backdrop-blur-md">
                  <div className="text-xl font-bold text-background md:text-2xl">{value}</div>
                  <div className="text-xs text-background/75">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Marquee trust strip */}
      <div className="border-y bg-muted/40 overflow-hidden">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">50+ bank & NBFC partners</span>
          <span>•</span><span>Zero customer fees</span>
          <span>•</span><span>Approval in 24-48 hours</span>
          <span>•</span><span>100% digital tracking</span>
          <span>•</span><span>RBI-registered lenders</span>
        </div>
      </div>

      {/* Services */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Our Loan Products</h2>
          <p className="text-muted-foreground">Find the right loan for your needs</p>
        </div>
        <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loanTypes?.map((lt) => <ProductCard key={lt.id} loan={lt} />)}
        </div>
        <div className="text-center mt-10">
          <Button asChild variant="outline" size="lg"><Link to="/loans">View all products <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/40">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground">From application to disbursal in four simple steps</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
            {[
              { n: "01", title: "Share your requirement", desc: "Tell us the loan type, amount and tenure you need.", img: stepRequirement },
              { n: "02", title: "Compare offers", desc: "Your consultant shortlists the best rates across partner banks.", img: stepCompare },
              { n: "03", title: "Upload documents", desc: "Submit your KYC and income proofs securely in your portal.", img: stepDocuments },
              { n: "04", title: "Get disbursed", desc: "Track bank-wise approval live until the money hits your account.", img: stepDisbursal },
            ].map((s) => (
              <Card key={s.n} className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl lg:col-span-3 first:lg:col-span-4 last:lg:col-span-4">
                <div className="relative h-48 overflow-hidden">
                  <img src={s.img} alt={s.title} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/80 text-sm font-bold text-brand-yellow shadow-lg backdrop-blur">{s.n}</div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Rotating offer banners */}
      <BannerCarousel banners={banners as any} />

      {/* Why */}
      <section className="border-y bg-background">
        <div className="container mx-auto px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Loans Mart India</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: "Fast Approval", desc: "Get pre-approved in minutes, disbursed in days.", img: whyFast },
              { icon: ShieldCheck, title: "Secure & Trusted", desc: "Bank-grade security, RBI-registered partners.", img: whySecure },
              { icon: Users, title: "Dedicated DSA", desc: "Personal loan consultant from start to finish.", img: whyDsa },
            ].map((f) => (
              <Card key={f.title} className="group overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-56 overflow-hidden">
                  <img src={f.img} alt={f.title} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-3 left-4 flex h-12 w-12 items-center justify-center rounded-full border bg-background text-primary shadow-lg">
                    <f.icon className="h-6 w-6" />
                  </div>
                </div>
                <CardContent className="p-6 pt-8 text-center">
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">What Our Customers Say</h2>
            <p className="text-muted-foreground">Real stories from real borrowers</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="text-yellow-500 mb-3">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
                  <p className="text-sm italic mb-4">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    {t.image_url && <img src={t.image_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />}
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* FAQs */}
      <FaqSection subtitle="Everything you need to know before you borrow." />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">Submit your details and our team will reach out within 30 minutes.</p>
        <Button asChild size="lg"><Link to="/apply">Apply Now</Link></Button>
      </section>

      <PublicFooter />
    </div>
  );
}
