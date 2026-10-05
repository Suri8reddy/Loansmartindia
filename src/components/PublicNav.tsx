import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logoFull from "@/assets/loansmart-logo-full.asset.json";

export function PublicNav() {
  const { user, isAdmin, isTeam } = useAuth();
  const portalLink = isAdmin ? "/admin/dashboard" : isTeam ? "/team/dashboard" : "/customer/dashboard";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <img src={logoFull.url} alt="Loans Mart India" className="h-14 md:h-16 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-foreground/70 hover:text-foreground">Home</Link>
          <Link to="/loans" className="text-foreground/70 hover:text-foreground">Loans</Link>
          <Link to="/apply" className="text-foreground/70 hover:text-foreground">Apply</Link>
          <Link to="/contact" className="text-foreground/70 hover:text-foreground">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm"><Link to={portalLink}>My Portal</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Login</Link></Button>
              <Button asChild size="sm"><Link to="/register">Get Started</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
