import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-20">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="group inline-block mb-3 transition-transform duration-300 active:scale-95">
            <img
              src="/logo.jpeg"
              alt="Loans Mart India"
              className="h-14 w-auto object-contain rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:brightness-110 group-hover:drop-shadow-[0_4px_16px_rgba(234,179,8,0.4)]"
            />
          </Link>
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
