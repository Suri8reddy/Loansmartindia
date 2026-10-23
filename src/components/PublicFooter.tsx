import { Link } from "@tanstack/react-router";
import { useCompanyContact } from "@/lib/company-info";
import { Phone, Mail, MapPin, Clock, ShieldCheck } from "lucide-react";

export function PublicFooter() {
  const contact = useCompanyContact();

  return (
    <footer className="border-t bg-muted/40 mt-20 text-foreground">
      <div className="container mx-auto px-4 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-3">
          <Link to="/" className="inline-block mb-1" aria-label="Loans Mart India Home">
            <img
              src="/loansmart-india.png"
              alt="Loans Mart India - Smart Loans. Better Tomorrows."
              className="h-20 md:h-24 w-auto object-contain"
            />
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {contact.tagline} Loans Mart India is a premier digital loan distribution platform
            connecting borrowers with 50+ leading RBI-registered banks and NBFCs across India.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md">
            <ShieldCheck className="h-4 w-4" /> Authorized Direct Selling Partner (DSA)
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm tracking-wide">Loan Products</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/loans/$slug" params={{ slug: "personal-loan" }} className="hover:text-primary transition-colors">Personal Loan</Link></li>
            <li><Link to="/loans/$slug" params={{ slug: "home-loan" }} className="hover:text-primary transition-colors">Home Loan</Link></li>
            <li><Link to="/loans/$slug" params={{ slug: "business-loan" }} className="hover:text-primary transition-colors">Business Loan</Link></li>
            <li><Link to="/loans/$slug" params={{ slug: "car-loan" }} className="hover:text-primary transition-colors">Car Loan</Link></li>
            <li><Link to="/loans" className="hover:text-primary transition-colors font-medium text-foreground">All Loan Products →</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm tracking-wide">Trust & Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/disclosures" className="hover:text-primary transition-colors">Regulatory Disclosures</Link></li>
            <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">Grievance Redressal</Link></li>
            <li><Link to="/apply" className="hover:text-primary transition-colors">Apply Online</Link></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold mb-3 text-sm tracking-wide">Contact Us</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="hover:text-primary transition-colors">
                {contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                {contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="text-xs leading-normal">{contact.address}</span>
            </li>
            <li className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{contact.hours}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Statutory Disclaimer Bar */}
      <div className="border-t bg-muted/70 py-6">
        <div className="container mx-auto px-4 space-y-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground text-justify sm:text-left">
            <strong>Statutory Disclaimer:</strong> Loans Mart India (loansmartindia.com) is an online loan
            marketplace and authorized Direct Selling Agent (DSA) / Business Correspondent. Loans Mart
            India is NOT a Bank or Non-Banking Financial Company (NBFC) and does not directly lend or
            issue credit cards. All loan sanctions, approval decisions, interest rates, tenure, and
            disbursals are at the sole discretion of respective partner Banks and RBI-registered NBFCs.
            Loans Mart India does not charge any upfront application or file approval fees to borrowers.
            Never transfer processing fees to individual bank accounts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 gap-2">
            <span>© {new Date().getFullYear()} Loans Mart India. All rights reserved.</span>
            <div className="flex items-center gap-4 text-xs">
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <Link to="/terms" className="hover:underline">Terms</Link>
              <Link to="/disclosures" className="hover:underline">Disclosures</Link>
              <Link to="/contact" className="hover:underline">Support</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

