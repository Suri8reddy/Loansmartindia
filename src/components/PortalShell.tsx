import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";
import { LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function PortalShell({
  items,
  title,
  variant = "light",
  children,
}: {
  items: NavItem[];
  title: string;
  variant?: "light" | "dark" | "neutral";
  children: ReactNode;
}) {
  const { signOut, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarBg =
    variant === "dark"
      ? "bg-[oklch(0.2_0.04_265)] text-white"
      : variant === "neutral"
        ? "bg-muted text-foreground"
        : "bg-sidebar text-sidebar-foreground";

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {items.map((it) => {
        const active = pathname === it.to || pathname.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
              active ? "bg-primary text-primary-foreground" : "hover:bg-foreground/5"
            }`}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className={`hidden md:flex w-64 flex-col border-r ${sidebarBg}`}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10 font-semibold">
          <img src="/logo.jpeg" alt="Loans Mart India" className="h-8 w-8 rounded-md object-contain" />
          <span>{title}</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-xs opacity-70 mb-2 truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="h-14 border-b flex items-center justify-between px-4 gap-2 bg-background sticky top-0 z-10">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={`p-0 w-72 flex flex-col ${sidebarBg}`}>
              <SheetTitle className="sr-only">{title} navigation</SheetTitle>
              <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10 font-semibold">
                <img src="/logo.jpeg" alt="Loans Mart India" className="h-8 w-8 rounded-md object-contain" />
                <span>{title}</span>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>
              <div className="p-3 border-t border-white/10">
                <div className="text-xs opacity-70 mb-2 truncate">{user?.email}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="md:hidden font-semibold truncate">{title}</div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
