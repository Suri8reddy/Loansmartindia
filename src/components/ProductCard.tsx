import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { loanImage } from "@/lib/loan-images";

export function productSlug(loan: any) {
  return (
    loan?.slug ||
    String(loan?.name ?? "loan").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
}

export function ProductCard({ loan }: { loan: any }) {
  const slug = productSlug(loan);
  const img = loanImage(loan?.slug || loan?.name);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      <Link
        to="/loans/$slug"
        params={{ slug }}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View ${loan?.name} details`}
      />
      <div className="relative overflow-hidden bg-muted">
        <img
          src={img}
          alt={`${loan?.name} illustration`}
          loading="lazy"
          width={768}
          height={512}
          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {(loan?.interest_rate_min || loan?.interest_rate_max) && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow">
            From {loan.interest_rate_min ?? loan.interest_rate_max}% p.a.
          </span>
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col p-5 pointer-events-none">
        <h3 className="text-lg font-bold text-foreground mb-1.5">{loan?.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{loan?.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3">
          {loan?.tenure_max_months ? (
            <span className="text-xs text-muted-foreground">Up to {loan.tenure_max_months} months</span>
          ) : (
            <span />
          )}
          <div className="pointer-events-auto flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/loans/$slug" params={{ slug }}>Details</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/apply">Apply <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
