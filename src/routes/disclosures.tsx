import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calculator, Info, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useCompanyContact } from "@/lib/company-info";

export const Route = createFileRoute("/disclosures")({
  head: () => ({
    meta: [
      { title: "Financial & Regulatory Disclosures — Loans Mart India" },
      {
        name: "description",
        content:
          "Read Loans Mart India's statutory loan disclosures, RBI digital lending compliance, APR range, tenure, representative loan calculation, and lending partners.",
      },
      { property: "og:title", content: "Financial & Regulatory Disclosures — Loans Mart India" },
      {
        property: "og:description",
        content:
          "Full regulatory disclosures, representative APR, loan tenure, partner banks list, and borrower protection guidelines.",
      },
      { property: "og:url", content: "https://loansmartindia.com/disclosures" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://loansmartindia.com/disclosures" }],
  }),
  component: DisclosuresPage,
});

function DisclosuresPage() {
  const contact = useCompanyContact();

  const partnerBanks = [
    "HDFC Bank",
    "ICICI Bank",
    "State Bank of India (SBI)",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "Bank of Baroda",
    "Punjab National Bank",
    "Tata Capital Financial Services",
    "Bajaj Finance",
    "Aditya Birla Finance",
    "Piramal Capital & Housing Finance",
    "IDFC FIRST Bank",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />

      <main className="flex-1">
        <header className="border-b bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <ShieldCheck className="h-4 w-4" /> RBI Compliance & Transparency Guidelines
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Regulatory & Loan Disclosures
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Transparency and ethical lending are core to Loans Mart India. This page provides key
              statutory disclosures in alignment with Reserve Bank of India (RBI) guidelines for
              digital loan sourcing and consumer financial protection.
            </p>
          </div>
        </header>

        <section className="container mx-auto px-4 py-12 max-w-4xl space-y-10 text-foreground/90 leading-relaxed">
          {/* Statutory Status */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Building2 className="h-5 w-5 text-primary" /> 1. Business Identity & Operational Role
            </h2>
            <p>
              <strong>Loans Mart India</strong> operates as a technology platform and authorized Direct
              Selling Agent (DSA) / Loan Sourcing Partner. We connect prospective borrowers with
              reputable, RBI-licensed Scheduled Commercial Banks and Non-Banking Financial Companies (NBFCs).
            </p>
            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-4">
              <strong>Notice:</strong> Loans Mart India is NOT an NBFC or a bank and does NOT directly lend,
              disburse, or originate credit from its own balance sheet. All loan sanctions, interest rate
              determinations, processing fees, documentation requirements, and disbursals are made
              solely at the discretion of respective lending institutions.
            </p>
          </div>

          {/* Loan Pricing & Terms Disclosure */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Calculator className="h-5 w-5 text-primary" /> 2. Annual Percentage Rate (APR) & Tenure Disclosure
            </h2>
            <p>
              In accordance with Google Financial Services policies and RBI Fair Practice Codes, below
              are the standard parameters applicable across our partner lenders:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground font-medium mb-1">Repayment Tenure</div>
                  <div className="text-2xl font-bold text-foreground">6 Months to 84 Months</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Minimum repayment period is 6 months. Maximum tenure can extend up to 84 months for personal/business loans and up to 30 years for home loans.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground font-medium mb-1">Annual Percentage Rate (APR)</div>
                  <div className="text-2xl font-bold text-foreground">10.50% to 36.00% p.a.</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    APR includes interest rate plus processing fees and charges determined by partner banks based on credit score, income, and lender evaluation.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Representative Example */}
            <Card className="border-primary/20 bg-muted/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg text-foreground">Representative Personal Loan Example</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Loan Principal</span>
                    <span className="font-semibold text-foreground text-base">₹1,00,000</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Loan Tenure</span>
                    <span className="font-semibold text-foreground text-base">12 Months</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Interest Rate (Reducing)</span>
                    <span className="font-semibold text-foreground text-base">12.00% p.a.</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Monthly EMI</span>
                    <span className="font-semibold text-foreground text-base">₹8,885</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Total Interest Payable</span>
                    <span className="font-semibold text-foreground text-base">₹6,619</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Processing Fee (1.5% + GST)</span>
                    <span className="font-semibold text-foreground text-base">₹1,770</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Total Repayment Amount</span>
                    <span className="font-semibold text-foreground text-base">₹1,08,389</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Effective APR</span>
                    <span className="font-semibold text-foreground text-base">15.18%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  *Note: The illustrative example above is for informational purposes. Actual terms,
                  rates, and fees offered by partner banks may vary based on applicant risk profile.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lending Partners */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" /> 3. Authorized Partner Banks & RBI-Registered NBFCs
            </h2>
            <p className="text-muted-foreground">
              Loans Mart India collaborates with premier Indian banking and NBFC institutions to ensure
              applicants receive competitive, compliant credit options:
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {partnerBanks.map((bank) => (
                <Badge key={bank} variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                  {bank}
                </Badge>
              ))}
            </div>
          </div>

          {/* Fair Practice & Zero Upfront Fee Guarantee */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" /> 4. Borrower Protection & Zero Advance Fee Guarantee
            </h2>
            <p>
              Loans Mart India strictly adheres to the RBI Fair Practices Code.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>No Advance Cash or Consultation Fees:</strong> Loans Mart India never asks
                borrowers for cash or online payments into personal accounts for loan approvals or file charges.
              </li>
              <li>
                <strong>Transparent Deductions:</strong> Any legitimate processing fees required by
                lending institutions are deducted directly from the loan sanction amount by the bank,
                or paid directly via official bank payment gateway links.
              </li>
              <li>
                <strong>No Coercive Sourcing:</strong> All credit bureau checks and formal applications
                occur only with the applicant's explicit consent.
              </li>
            </ul>
          </div>

          {/* Grievance Redressal */}
          <div className="space-y-3 border-t pt-8">
            <h3 className="text-xl font-bold text-foreground">Customer Support & Grievances</h3>
            <p className="text-sm text-muted-foreground">
              For any queries or grievances regarding loan consultation, contact our Grievance Officer:
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <p className="font-medium text-foreground">{contact.brandName} Grievance Desk</p>
              <p className="text-muted-foreground">Email: {contact.grievanceEmail || contact.supportEmail}</p>
              <p className="text-muted-foreground">Helpline: {contact.phone}</p>
              <p className="text-muted-foreground">Corporate Office: {contact.address}, {contact.city}, {contact.state} - {contact.pincode}</p>
            </div>
          </div>

          <div className="border-t pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/loans" className="text-primary hover:underline">Explore Loan Products</Link>
            <Link to="/apply" className="text-primary hover:underline">Apply Online</Link>
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
