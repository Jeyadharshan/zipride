import { Link, useRouterState } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { useAuth } from "@/auth/hooks/useAuth";
import { cn } from "@/shared/utils/cn";
import { ActiveRideBanner } from "@/rider/components/ActiveRideBanner";
import { NotificationCenter } from "@/shared/components/NotificationCenter";

const NAV = [
  { label: "Home", to: "/dashboard" },
  { label: "Bookings", to: "/history" },
  { label: "Wallet", to: "/wallet" },
  { label: "Payments", to: "/payment-history" },
  { label: "Help", to: "/help" },
];

export function UserTopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useAuth();
  const name = profile?.full_name || "User";
  const initial = name ? name[0] : "U";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo to="/dashboard" />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <Link to="/profile">
            <Avatar label={initial} className="h-10 w-10 text-sm" />
          </Link>
        </div>
      </div>
      <ActiveRideBanner />
    </header>
  );
}

export function UserShell({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "narrow" | "wide";
}) {
  const max = width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-7xl" : "max-w-6xl";
  return (
    <div className="min-h-screen bg-background">
      <UserTopNav />
      <main className={cn("mx-auto px-4 py-8 sm:px-6", max, className)}>{children}</main>
    </div>
  );
}
