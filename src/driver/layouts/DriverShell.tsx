import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Bell, Navigation, Wallet, User, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { DRIVER } from "@/shared/constants/zip-data";
import { cn } from "@/shared/utils/cn";
import { useAuth } from "@/auth/hooks/useAuth";
import { NotificationCenter } from "@/shared/components/NotificationCenter";

const NAV = [
  { label: "Dashboard", to: "/driver/dashboard", icon: LayoutDashboard },
  { label: "Requests", to: "/driver/requests", icon: Bell },
  { label: "Active", to: "/driver/active", icon: Navigation },
  { label: "Earnings", to: "/driver/earnings", icon: Wallet },
  { label: "Settlements", to: "/driver/settlements", icon: ArrowUpRight },
  { label: "Profile", to: "/driver/profile", icon: User },
];

export function DriverShell({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, driverProfile } = useAuth();
  const driverName = profile?.full_name || "Driver";
  const avatarUrl = driverProfile?.profile_photo_url || profile?.avatar_url || "";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to="/driver/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-success" /> Online
            </span>
            <NotificationCenter />
            <Link to="/driver/profile">
              <Avatar label={driverName[0]} src={avatarUrl} className="h-10 w-10 text-sm" />
            </Link>
          </div>
        </div>
      </header>
      <main className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6", className)}>{children}</main>
      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border glass md:hidden">
        {NAV.map((n) => {
          const active = pathname === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
