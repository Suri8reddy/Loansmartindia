import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { FaqSection } from "@/components/FaqSection";
import { ProductCard } from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/loans")({
  head: () => ({ meta: [{ title: "Loan Products — Loans Mart India" }, { name: "description", content: "Browse all our loan products with eligibility and benefits." }] }),
  component: LoansRoute,
});

function LoansRoute() {
  const isDetailRoute = useRouterState({ select: (state) => state.matches.some((match) => match.routeId === "/loans/$slug") });
  return isDetailRoute ? <Outlet /> : <LoansPage />;
}

function LoansPage() {
  const { data: loans } = useQuery({
    queryKey: ["loans-public"],
    queryFn: async () => (await supabase.from("loan_types").select("*").eq("is_active", true)).data ?? [],
  });

  return (
    <div>
      <PublicNav />
      <section className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Loan Products</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">Compare our loan offerings and pick the one that fits your needs. Apply online in minutes.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans?.map((lt: any) => <ProductCard key={lt.id} loan={lt} />)}
        </div>
      </section>
      <FaqSection subtitle="Answers to the questions we hear most about our loan products." />
      <PublicFooter />
    </div>
  );
}
