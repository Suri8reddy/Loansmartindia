import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useMemo } from "react";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DateRangeFilter, rangeSearchShape } from "@/components/DateRangeFilter";
import { inRange } from "@/lib/date-range";
import { CommissionsReportCard } from "@/components/CommissionsReportCard";

const searchSchema = z.object({ ...rangeSearchShape });

export const Route = createFileRoute("/admin/reports")({
  component: Reports,
  validateSearch: zodValidator(searchSchema),
});

function Reports() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = { range: search.range, from: search.from, to: search.to };

  const { data: appsAll } = useQuery({
    queryKey: ["report-apps"],
    queryFn: async () => (await supabase.from("loan_applications").select("*, loan_types(name), loan_statuses(stage_name), profiles!loan_applications_customer_profile_fkey(full_name,email)")).data ?? [],
  });
  const apps = useMemo(() => (appsAll ?? []).filter((a: any) => inRange(a.created_at, range)), [appsAll, range]);

  const exportCSV = () => {
    if (!apps?.length) return;
    const rows = apps.map((a: any) => ({
      id: a.id, customer: a.profiles?.full_name, email: a.profiles?.email,
      loan: a.loan_types?.name, status: a.loan_statuses?.stage_name,
      amount: a.amount_requested, date: a.created_at,
    }));
    const csv = [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).map((v) => `"${v ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `applications-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Reports</h1>
        <DateRangeFilter value={range} onChange={(v) => navigate({ search: (s: any) => ({ ...s, ...v }), replace: true })} />
      </div>

      <Card><CardContent className="p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold mb-1">Applications Report</h3>
          <p className="text-sm text-muted-foreground">{apps.length} applications in selected range (of {appsAll?.length ?? 0} total)</p>
        </div>
        <Button onClick={exportCSV} disabled={!apps.length}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </CardContent></Card>

      <div>
        <h2 className="text-2xl font-bold mb-3">Commissions Report</h2>
        <CommissionsReportCard range={range} scope="all" />
      </div>
    </div>
  );
}
