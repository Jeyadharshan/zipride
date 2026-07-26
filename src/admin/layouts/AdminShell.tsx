import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Car,
  ShieldCheck,
  Route as RouteIcon,
  TrendingUp,
  Wallet,
  FileBarChart,
  Settings as SettingsIcon,
  LogOut,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { cn } from "@/shared/utils/cn";

const NAV = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Drivers", to: "/admin/drivers", icon: Car },
  { label: "Verifications", to: "/admin/verifications", icon: ShieldCheck },
  { label: "Rides", to: "/admin/rides", icon: RouteIcon },
  { label: "Revenue", to: "/admin/revenue", icon: TrendingUp },
  { label: "Wallet Panel", to: "/admin/wallet", icon: Wallet },
  { label: "Reports", to: "/admin/reports", icon: FileBarChart },
  { label: "Settings", to: "/admin/settings", icon: SettingsIcon },
];

import { useAuth } from "@/auth/hooks/useAuth";

export function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, signOut } = useAuth();
  
  const name = profile?.full_name || "Admin";
  const avatar = profile?.avatar_url || "";
  const label = name ? name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "AD";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-border bg-sidebar p-4 lg:sticky lg:top-0 lg:flex">
        <div className="px-2 py-3">
          <Logo to="/admin" />
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          {NAV.map((n) => {
            const active = n.to === "/admin" ? pathname === "/admin" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "gradient-brand text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 text-left cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border glass px-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold sm:text-xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Avatar label={label} src={avatar} className="h-10 w-10 text-sm" />
          </div>
        </header>
        {/* mobile admin nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:hidden">
          {NAV.map((n) => {
            const active = n.to === "/admin" ? pathname === "/admin" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold",
                  active
                    ? "gradient-brand text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
