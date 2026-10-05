import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PortalShell, type NavItem } from "@/components/PortalShell";
import { LayoutDashboard, UserCheck, FileText, Share2, Wallet, BarChart3 } from "lucide-react";
import { useReportAccess } from "@/hooks/useReportAccess";

export const Route = createFileRoute("/team")({ component: TeamLayout });

function TeamLayout() {
  return (
    <ProtectedRoute allow="team">
      <Inner />
    </ProtectedRoute>
  );
}

function Inner() {
  const { allowed } = useReportAccess();
  const items: NavItem[] = [
    { to: "/team/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/team/leads", label: "Leads", icon: UserCheck },
    { to: "/team/applications", label: "Applications", icon: FileText },
    { to: "/team/share-links", label: "Banker Links", icon: Share2 },
    { to: "/team/commissions", label: "My Commissions", icon: Wallet },
    ...(allowed ? [{ to: "/team/reports", label: "Reports", icon: BarChart3 } as NavItem] : []),
  ];
  return (
    <PortalShell title="Team Portal" variant="neutral" items={items}>
      <Outlet />
    </PortalShell>
  );
}
