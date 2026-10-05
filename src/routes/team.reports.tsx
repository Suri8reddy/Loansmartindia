import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { CommissionsReportCard } from "@/components/CommissionsReportCard";
import { useReportAccess } from "@/hooks/useReportAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const searchSchema = z.object({ ...rangeSearchShape });

export const Route = createFileRoute("/team/reports")({
  component: TeamReports,
  validateSearch: zodValidator(searchSchema),
});

function TeamReports() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };
  const { allowed, loading } = useReportAccess();

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  if (!allowed) {
    return (
      <Card><CardContent className="p-10 text-center space-y-3">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Report access not enabled</h2>
        <p className="text-sm text-muted-foreground">An admin needs to grant you access to the Commissions Report.</p>
        <Button asChild variant="outline"><Link to="/team/dashboard">Back to dashboard</Link></Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Commissions Report</h1>
          <p className="text-sm text-muted-foreground">Scoped to data assigned to you</p>
        </div>
        <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
      </div>
      <CommissionsReportCard range={range} scope="self" />
    </div>
  );
}
