import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, CheckCircle2, AlertTriangle, Building, ShieldAlert } from "lucide-react";
import { useCompanyContact } from "@/lib/company-info";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service & Loan Disclaimer — Loans Mart India" },
      {
        name: "description",
        content:
          "Read the Terms of Service for Loans Mart India. Understand our role as a loan facilitator and DSA, applicant responsibilities, interest rate conditions, and dispute resolution.",
      },
      { property: "og:title", content: "Terms of Service & Loan Disclaimer — Loans Mart India" },
      {
        property: "og:description",
        content:
          "Important terms and statutory disclaimers governing the use of Loans Mart India loan aggregation and facilitation services.",
      },
      { property: "og:url", content: "https://loansmartindia.com/terms" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://loansmartindia.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const contact = useCompanyContact();
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />

      <main className="flex-1">
        <header className="border-b bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Scale className="h-4 w-4" /> Legal Terms & Platform Agreements
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Last updated: {lastUpdated}. Please read these terms carefully before accessing or
              using the services provided by Loans Mart India (
              <a href={contact.siteUrl} className="text-primary underline">
                {contact.siteUrl}
              </a>
              ).
            </p>
          </div>
        </header>

        <section className="container mx-auto px-4 py-12 max-w-4xl space-y-10 text-foreground/90 leading-relaxed">
          {/* Statutory Disclaimers Card */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-lg">
                    Important Statutory Disclaimer: Intermediary Status
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>Loans Mart India is an online loan facilitator and Direct Selling Agent (DSA).</strong>{" "}
                    We are NOT a Bank, Non-Banking Financial Company (NBFC), or money lender. We do not
                    lend directly or make credit decisions. All credit appraisal, loan sanctions,
                    interest rate pricing, processing fees, repayment tenures, and loan agreements
                    are determined exclusively at the discretion of respective partner Banks and
                    RBI-registered NBFCs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Building className="h-5 w-5 text-primary" /> 1. Nature of Our Services
            </h2>
            <p>
              Loans Mart India provides a technology platform and consultation service that assists
              borrowers in discovering, comparing, and applying for loan products (including personal,
              business, home, and vehicle loans) through authorized partner banks and lenders.
            </p>
            <p>
              Our loan consultation and portal tracking services are offered to applicants without
              any advance fee charges. We never request cash payments, transfer of processing fees
              into personal accounts, or upfront guarantee deposits.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" /> 2. Eligibility & User Responsibilities
            </h2>
            <p>By using this website and submitting loan inquiries, you warrant and represent that:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You are an Indian citizen or resident aged 18 years or older with legal capacity to enter into binding contracts.</li>
              <li>All information, financial figures, and KYC documents provided by you are true, accurate, and up to date.</li>
              <li>You authorize Loans Mart India and partner lenders to verify your employment, income, and bank credentials.</li>
              <li>You will not submit falsified payslips, altered bank statements, or misrepresent credit obligations.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" /> 3. No Guarantee of Loan Approval
            </h2>
            <p>
              Submission of an inquiry or application on Loans Mart India does not guarantee loan
              sanction or disbursement. Approval is contingent on lender credit policies, credit bureau
              scores (CIBIL/Experian), internal risk assessment, income verification, and collateral
              checks.
            </p>
            <p>
              Loans Mart India shall not be held liable for any loan rejections, delays in bank
              processing, or variation between indicative rates and finalized bank sanction terms.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Scale className="h-5 w-5 text-primary" /> 4. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the laws of India.
              Any disputes arising out of or in connection with the platform shall be subject to the
              exclusive jurisdiction of the courts located in Mumbai, Maharashtra, India.
            </p>
          </div>

          <div className="border-t pt-8 flex items-center justify-between text-sm text-muted-foreground">
            <span>Effective: {lastUpdated}</span>
            <div className="space-x-4">
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link to="/disclosures" className="text-primary hover:underline">Regulatory Disclosures</Link>
              <Link to="/contact" className="text-primary hover:underline">Contact Us</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
