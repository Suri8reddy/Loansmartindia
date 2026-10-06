import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-20">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <img src="/logo.jpeg" alt="Loans Mart India" className="h-14 w-auto mb-3 object-contain" />
          <p className="text-sm text-muted-foreground">Smart Loans. Better Tomorrows. Your trusted partner for hassle-free loans across India.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Products</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/loans">Personal Loan</Link></li>
            <li><Link to="/loans">Home Loan</Link></li>
            <li><Link to="/loans">Business Loan</Link></li>
            <li><Link to="/loans">Car Loan</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/apply">Apply Now</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>+91 98765 43210</li>
            <li>hello@loansmartindia.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Loans Mart India. All rights reserved.</div>
    </footer>
  );
}
