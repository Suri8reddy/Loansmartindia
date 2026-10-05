import { Navigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import type { ReactNode } from "react";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow: "any" | AppRole[] | "team" | "admin";
}) {
  const { user, roles, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" />;
  if (allow === "any") return <>{children}</>;
  if (allow === "admin" && !roles.includes("admin")) return <Navigate to="/" />;
  if (allow === "team") {
    const teamRoles: AppRole[] = ["admin", "dsa", "rm", "loan_executive", "team_leader"];
    if (!roles.some((r) => teamRoles.includes(r))) return <Navigate to="/" />;
  }
  if (Array.isArray(allow) && !roles.some((r) => allow.includes(r))) return <Navigate to="/" />;
  return <>{children}</>;
}
