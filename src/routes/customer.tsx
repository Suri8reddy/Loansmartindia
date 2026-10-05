import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/PortalShell";
import { LayoutDashboard, FileText, User } from "lucide-react";

export const Route = createFileRoute("/customer")({ component: CustomerLayout });

function CustomerLayout() {
  return (
    <ProtectedRoute allow={["customer", "admin"]}>
      <PortalShell
        title="Customer Portal"
        variant="light"
        items={[
          { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/customer/applications", label: "Applications", icon: FileText },
          { to: "/customer/profile", label: "Profile", icon: User },
        ]}
      >
        <Outlet />
      </PortalShell>
    </ProtectedRoute>
  );
}
