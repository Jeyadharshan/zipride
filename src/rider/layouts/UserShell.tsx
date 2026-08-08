import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Car,
  Wallet,
  User,
  HelpCircle,
  Menu,
  X,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { useAuth } from "@/auth/hooks/useAuth";
import { cn } from "@/shared/utils/cn";
import { ActiveRideBanner } from "@/rider/components/ActiveRideBanner";
import { NotificationCenter } from "@/shared/components/NotificationCenter";

const TOP_NAV = [
  { label: "Home", to: "/dashboard" },
  { label: "Your Rides", to: "/history" },
  { label: "Wallet", to: "/wallet" },
  { label: "Payments", to: "/payment-history" },
  { label: "Help", to: "/help" },
];

const BOTTOM_NAV = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Your Rides", to: "/history", icon: Car },
  { label: "Wallet", to: "/wallet", icon: Wallet },
  { label: "Profile", to: "/profile", icon: User },
  { label: "Help", to: "/help", icon: HelpCircle },
];

export function UserTopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const name = profile?.full_name || "User";
  const initial = name ? name[0] : "U";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to="/dashboard" />
          
          <nav className="hidden items-center gap-1 md:flex">
            {TOP_NAV.map((n) => {
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

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationCenter />
            
            <Link to="/profile" className="hidden sm:block">
              <Avatar label={initial} className="h-10 w-10 text-sm" />
            </Link>

            {/* Mobile menu drawer trigger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <ActiveRideBanner />
      </header>

      {/* Mobile Drawer Menu Slideout */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Logo to="/dashboard" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* User Info Header Box */}
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <Avatar label={initial} className="h-12 w-12 text-base" />
                <div>
                  <p className="font-extrabold text-foreground">{name}</p>
                  <p className="text-xs text-primary font-semibold">View Profile & Edit</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Main Menu
            </p>
            <nav className="space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/dashboard"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Home className="h-5 w-5" />
                Home
              </Link>
              <Link
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/history"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <span className="flex items-center gap-3">
                  <Car className="h-5 w-5" />
                  Your Rides
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  History
                </span>
              </Link>
              <Link
                to="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/wallet"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Wallet className="h-5 w-5" />
                Wallet & Add Money
              </Link>
              <Link
                to="/payment-history"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/payment-history"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <CreditCard className="h-5 w-5" />
                Payment History
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/profile"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <User className="h-5 w-5" />
                Profile Information
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/settings"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
              <Link
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  pathname === "/help"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </Link>
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
    </>
  );
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-16 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur-md md:hidden shadow-lg">
      {BOTTOM_NAV.map((n) => {
        const active = pathname === n.to;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold transition-colors",
              active
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute top-0 h-1 w-8 rounded-b-full bg-primary" />
            )}
            <n.icon className={cn("h-5 w-5 shrink-0", active ? "scale-110 text-primary transition-transform" : "")} />
            <span className="truncate max-w-[68px] text-center leading-tight">{n.label}</span>
          </Link>
        );
      })}
    </nav>
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
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <UserTopNav />
      <main className={cn("mx-auto px-4 py-6 sm:px-6 sm:py-8 pb-32 md:pb-8", max, className)}>{children}</main>
      <MobileBottomNav />
    </div>
  );
}

