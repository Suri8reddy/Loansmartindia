import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, Eye, FileText, UserCheck, AlertCircle } from "lucide-react";
import { useCompanyContact } from "@/lib/company-info";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Loans Mart India" },
      {
        name: "description",
        content:
          "Read Loans Mart India's Privacy Policy. Learn how we securely protect, collect, and handle your loan application data in compliance with Indian IT and digital lending regulations.",
      },
      { property: "og:title", content: "Privacy Policy — Loans Mart India" },
      {
        property: "og:description",
        content:
          "How Loans Mart India safeguards your personal and financial information. 100% data confidentiality and zero unsolicited data selling.",
      },
      { property: "og:url", content: "https://loansmartindia.com/privacy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://loansmartindia.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const contact = useCompanyContact();
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />

      <main className="flex-1">
        <header className="border-b bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <ShieldCheck className="h-4 w-4" /> Data Protection & Privacy Commitment
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Effective Date: {lastUpdated}. At Loans Mart India (accessible from{" "}
              <a href={contact.siteUrl} className="text-primary underline">
                {contact.siteUrl}
              </a>
              ), we respect your privacy and are committed to protecting the personal and financial
              information you share with us.
            </p>
          </div>
        </header>

        <section className="container mx-auto px-4 py-12 max-w-4xl space-y-10 text-foreground/90 leading-relaxed">
          {/* Summary Box */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Lock className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-1">Our Privacy Pledge</h3>
                  <p className="text-sm text-muted-foreground">
                    Loans Mart India acts strictly as a loan facilitator and Direct Selling Agent (DSA).
                    We do <strong>not</strong> sell, rent, or trade your personal or financial data to
                    telemarketing agencies. Your data is used exclusively to evaluate your loan
                    eligibility and process your applications with RBI-registered Banks and NBFCs with
                    your explicit consent.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <UserCheck className="h-5 w-5 text-primary" /> 1. Information We Collect
            </h2>
            <p>
              When you submit a loan application or request a consultation on Loans Mart India, we
              may collect the following categories of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Identity and Contact Data:</strong> Full legal name, date of birth, mobile
                number, email address, residential address, and identity numbers (PAN, Aadhaar as
                voluntarily submitted for KYC).
              </li>
              <li>
                <strong>Employment and Financial Data:</strong> Employer/business name, monthly
                income, annual turnover, bank statements, salary slips, ITR documents, existing loan
                obligations, and credit profile indicators.
              </li>
              <li>
                <strong>Technical and Usage Data:</strong> IP address, browser type, device
                identifiers, operating system, and interaction records on our website.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Eye className="h-5 w-5 text-primary" /> 2. Purpose and Lawful Basis for Processing
            </h2>
            <p>We use your personal and financial information solely for genuine financial facilitation purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To determine pre-qualification and match your requirements with suitable loan products.</li>
              <li>To transmit KYC and income proofs to partner Banks and NBFCs you authorize.</li>
              <li>To communicate loan status updates, approval letters, and requirement checklists.</li>
              <li>To prevent fraudulent loan applications, identity theft, and duplicate submissions.</li>
              <li>To comply with regulatory guidelines issued by the Reserve Bank of India (RBI) and other statutory authorities.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" /> 3. Data Sharing and Disclosure
            </h2>
            <p>
              We maintain strict confidentiality standards. Your data is shared only under the
              following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Partner Banks and RBI-Registered NBFCs:</strong> Authorized lending
                institutions to whom you have agreed to submit your loan application.
              </li>
              <li>
                <strong>Encrypted Cloud Infrastructure:</strong> Cloud hosting and secure storage
                providers that comply with bank-grade security protocols (ISO 27001 / SOC 2).
              </li>
              <li>
                <strong>Regulatory and Law Enforcement Authorities:</strong> When required by court
                orders, subpoenas, or applicable Indian laws.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Lock className="h-5 w-5 text-primary" /> 4. Security & Document Access Control
            </h2>
            <p>
              Security is foundational to Loans Mart India. All loan documents and identity proofs are
              stored in private, access-controlled repositories. Documents are accessed only via
              short-lived cryptographically signed tokens. Unauthorized external access is prevented
              at both transport (TLS 1.3 encryption) and storage layers.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5 text-primary" /> 5. Your Rights & Grievance Redressal
            </h2>
            <p>
              Under the Digital Personal Data Protection Act and applicable Indian consumer laws, you
              have the right to access, rectify, or request deletion of your information, subject to
              statutory retention mandates required for loan documentation.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1 text-sm mt-3">
              <p className="font-semibold text-foreground">Grievance Redressal Officer</p>
              <p className="text-muted-foreground">Officer: Grievance Officer, Loans Mart India</p>
              <p className="text-muted-foreground">Email: {contact.grievanceEmail || contact.supportEmail}</p>
              <p className="text-muted-foreground">Address: {contact.address}, {contact.city}, {contact.state} - {contact.pincode}</p>
              <p className="text-muted-foreground">Hours: {contact.hours}</p>
            </div>
          </div>

          <div className="border-t pt-8 flex items-center justify-between text-sm text-muted-foreground">
            <span>Last reviewed: {lastUpdated}</span>
            <div className="space-x-4">
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              <Link to="/disclosures" className="text-primary hover:underline">Loan Disclosures</Link>
              <Link to="/contact" className="text-primary hover:underline">Contact Support</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
