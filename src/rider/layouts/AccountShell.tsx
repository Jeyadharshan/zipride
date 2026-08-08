import { Link, useRouterState } from "@tanstack/react-router";
import {
  User,
  CreditCard,
  Car,
  Gift,
  MapPin,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { UserTopNav, MobileBottomNav } from "./UserShell";
import { useAuth } from "@/auth/hooks/useAuth";
import { Avatar } from "@/shared/components/kit/Primitives";
import { cn } from "@/shared/utils/cn";

const ITEMS = [
  { label: "Profile", to: "/profile", icon: User },
  { label: "Payment Methods", to: "/wallet", icon: CreditCard },
  { label: "My Rides", to: "/history", icon: Car },
  { label: "Refer & Earn", to: "/profile", icon: Gift },
  { label: "Addresses", to: "/search", icon: MapPin },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

export function AccountShell({ children, active }: { children: ReactNode; active: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, signOut } = useAuth();
  
  const name = profile?.full_name || "ZipRide Rider";
  const initial = name ? name[0] : "U";
  const phone = profile?.phone || "";
  const email = profile?.email || "";

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      <UserTopNav />
      
      {/* Mobile Account Section Bar & Tabs (visible on small screens < lg) */}
      <div className="border-b border-border bg-card/60 glass lg:hidden px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar label={initial} className="h-9 w-9 text-xs" />
            <div>
              <p className="text-xs font-extrabold truncate max-w-[160px] leading-tight">{name}</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{phone || email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20 cursor-pointer"
          >
            <LogOut className="h-3 w-3" /> Logout
          </button>
        </div>

        {/* Horizontal scrollable navigation tabs without ugly scrollbars */}
        <nav className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {ITEMS.map((it) => {
            const isActive = active === it.label || pathname === it.to;
            return (
              <Link
                key={it.label}
                to={it.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className="h-3.5 w-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-8">
        {/* Desktop Sidebar (visible on screens >= lg) */}
        <aside className="hidden h-max rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24 lg:block">
          <div className="flex flex-col items-center border-b border-border pb-5 text-center">
            <Avatar label={initial} className="h-20 w-20 text-2xl" />
            <p className="mt-3 font-bold">{name}</p>
            {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
            {email && <p className="text-sm text-muted-foreground">{email}</p>}
          </div>
          <nav className="mt-4 space-y-1">
            {ITEMS.map((it) => {
              const isActive = active === it.label || pathname === it.to;
              return (
                <Link
                  key={it.label}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <it.icon className="h-5 w-5" />
                  {it.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border-t border-border px-3 pt-4 text-sm font-semibold text-destructive text-left hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </nav>
        </aside>

        {/* Main Content Area (Profile Info & Edit Profile) */}
        <main className="min-w-0 pb-28 lg:pb-0">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  );
}

