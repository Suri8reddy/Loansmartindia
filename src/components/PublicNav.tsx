import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
export function PublicNav() {
  const { user, isAdmin, isTeam } = useAuth();
  const portalLink = isAdmin ? "/admin/dashboard" : isTeam ? "/team/dashboard" : "/customer/dashboard";

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-700 via-primary to-slate-900 text-white text-xs md:text-sm font-bold py-2.5 px-4 text-center tracking-widest uppercase border-b shadow-sm">
        — SMART LOANS. BETTER TOMORROWS. —
      </div>
      <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-28 md:h-32 items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center">
            <img src="/loansmart-india.png" alt="Loans Mart India" className="h-24 md:h-28 lg:h-30 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-base font-semibold">
            <Link to="/" className="text-foreground/80 hover:text-primary transition-colors">Home</Link>
            <Link to="/loans" className="text-foreground/80 hover:text-primary transition-colors">Loans</Link>
            <Link to="/apply" className="text-foreground/80 hover:text-primary transition-colors">Apply</Link>
            <Link to="/contact" className="text-foreground/80 hover:text-primary transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="lg"><Link to={portalLink}>My Portal</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="md"><Link to="/login">Login</Link></Button>
                <Button asChild size="md" className="font-semibold"><Link to="/register">Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
