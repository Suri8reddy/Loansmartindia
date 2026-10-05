import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/PortalShell";
import { LayoutDashboard, Users, Package, UserCheck, FileText, Workflow, DollarSign, Globe, BarChart3, Building2 } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  return (
    <ProtectedRoute allow="admin">
      <PortalShell
        title="Admin Panel"
        variant="dark"
        items={[
          { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/loan-types", label: "Loan Products", icon: Package },
          { to: "/admin/leads", label: "Leads", icon: UserCheck },
          { to: "/admin/applications", label: "Applications", icon: FileText },
          { to: "/admin/status-workflow", label: "Status Workflow", icon: Workflow },
          { to: "/admin/banks", label: "Banks", icon: Building2 },
          { to: "/admin/commissions", label: "Commissions", icon: DollarSign },
          { to: "/admin/website", label: "Website", icon: Globe },
          { to: "/admin/reports", label: "Reports", icon: BarChart3 },
        ]}
      >
        <Outlet />
      </PortalShell>
    </ProtectedRoute>
  );
}
