import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
export function PublicNav() {
  const { user, isAdmin, isTeam } = useAuth();
  const portalLink = isAdmin ? "/admin/dashboard" : isTeam ? "/team/dashboard" : "/customer/dashboard";

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-800 via-primary to-slate-900 text-white text-xs md:text-sm font-bold py-2.5 px-4 text-center tracking-widest uppercase border-b shadow-sm">
        — SMART LOANS. BETTER TOMORROWS. —
      </div>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-xs">
        <div className="container mx-auto flex h-20 md:h-24 items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center">
            <img src="/loansmart-india.png" alt="Loans Mart India" className="h-16 md:h-20 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-base font-semibold">
            <Link to="/" className="text-foreground/80 hover:text-primary transition-colors">Home</Link>
            <Link to="/loans" className="text-foreground/80 hover:text-primary transition-colors">Loans</Link>
            <Link to="/apply" className="text-foreground/80 hover:text-primary transition-colors">Apply</Link>
            <Link to="/contact" className="text-foreground/80 hover:text-primary transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="lg" className="px-6 font-semibold shadow-sm"><Link to={portalLink}>My Portal</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="default" className="px-4 font-semibold"><Link to="/login">Login</Link></Button>
                <Button asChild size="default" className="px-6 font-semibold shadow-sm rounded-lg"><Link to="/register">Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
