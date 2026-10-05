import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Loans Mart India — Smart Loans. Better Tomorrows." },
      { name: "description", content: "Loans Mart India — compare and apply for personal, home, business and car loans. Get approved fast." },
      { property: "og:title", content: "Loans Mart India — Smart Loans. Better Tomorrows." },
      { name: "twitter:title", content: "Loans Mart India — Smart Loans. Better Tomorrows." },
      { property: "og:description", content: "Compare and apply for personal, home, business and car loans. Get approved fast." },
      { name: "twitter:description", content: "Compare and apply for personal, home, business and car loans. Get approved fast." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: ({ children }: { children: ReactNode }) => (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  ),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-center">
      <div>
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">Page not found</p>
        <a href="/" className="text-primary mt-4 inline-block">Go home</a>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : String(error)}</p>
    </div>
  ),
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
