import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bell,
  Navigation,
  Wallet,
  User,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { cn } from "@/shared/utils/cn";
import { useAuth } from "@/auth/hooks/useAuth";
import { NotificationCenter } from "@/shared/components/NotificationCenter";

const TOP_NAV = [
  { label: "Dashboard", to: "/driver/dashboard", icon: LayoutDashboard },
  { label: "Requests", to: "/driver/requests", icon: Bell },
  { label: "Active", to: "/driver/active", icon: Navigation },
  { label: "Earnings", to: "/driver/earnings", icon: Wallet },
  { label: "Settlements", to: "/driver/settlements", icon: ArrowUpRight },
  { label: "Profile", to: "/driver/profile", icon: User },
];

const BOTTOM_NAV = [
  { label: "Home", to: "/driver/dashboard", icon: LayoutDashboard },
  { label: "Requests", to: "/driver/requests", icon: Bell },
  { label: "Active", to: "/driver/active", icon: Navigation },
  { label: "Earnings", to: "/driver/earnings", icon: Wallet },
  { label: "Profile", to: "/driver/profile", icon: User },
];

export function DriverShell({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, driverProfile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const driverName = profile?.full_name || "Driver";
  const avatarUrl = driverProfile?.profile_photo_url || profile?.avatar_url || "";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-40 border-b border-border/70 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to="/driver/dashboard" />

          <nav className="hidden items-center gap-1 md:flex">
            {TOP_NAV.map((n) => {
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

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Online
            </span>
            <NotificationCenter />
            
            <Link to="/driver/profile" className="hidden sm:block">
              <Avatar label={driverName[0]} src={avatarUrl} className="h-10 w-10 text-sm" />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary md:hidden"
              aria-label="Toggle driver menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Driver Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Logo to="/driver/dashboard" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <Link
              to="/driver/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <Avatar label={driverName[0]} src={avatarUrl} className="h-12 w-12 text-base" />
              <div>
                <p className="font-extrabold text-foreground">{driverName}</p>
                <p className="text-xs text-primary font-semibold">Driver Partner Profile</p>
              </div>
            </Link>

            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Driver Menu
            </p>
            <nav className="space-y-1">
              {TOP_NAV.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <n.icon className="h-5 w-5" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 border-t border-border pt-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={cn("mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8", className)}>{children}</main>

      {/* Driver Mobile Bottom Nav (5 clean items) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur-md md:hidden shadow-lg">
        {BOTTOM_NAV.map((n) => {
          const active = pathname === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors",
                active
                  ? "text-primary font-bold border-t-2 border-primary -mt-[2px]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <n.icon className={cn("h-5 w-5", active ? "scale-110 text-primary transition-transform" : "")} />
              <span className="truncate max-w-[64px] text-center">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

