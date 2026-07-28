import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Car, Wallet, Tag, Bell, CheckCheck } from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { PageHeader } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { NOTIFICATIONS } from "@/shared/constants/zip-data";
import { cn } from "@/shared/utils/cn";



const ICONS = { ride: Car, wallet: Wallet, promo: Tag } as const;
const FILTERS = ["All", "Rides", "Wallet", "Offers"];

export function Notifications() {
  const [filter, setFilter] = useState("All");

  const filtered = NOTIFICATIONS.filter((n) => {
    if (filter === "All") return true;
    if (filter === "Rides") return n.type === "ride";
    if (filter === "Wallet") return n.type === "wallet";
    if (filter === "Offers") return n.type === "promo";
    return true;
  });

  const groupNotifications = (list: typeof NOTIFICATIONS) => {
    const groups: { [key: string]: typeof NOTIFICATIONS } = {
      Today: [],
      Yesterday: [],
      Earlier: []
    };

    list.forEach(n => {
      const t = n.time.toLowerCase();
      if (t.includes("min") || t.includes("hr") || t.includes("today") || t.includes("now")) {
        groups.Today.push(n);
      } else if (t.includes("yesterday")) {
        groups.Yesterday.push(n);
      } else {
        groups.Earlier.push(n);
      }
    });

    return groups;
  };

  const grouped = groupNotifications(filtered);

  return (
    <UserShell width="narrow">
      <PageHeader
        title="Notifications"
        action={
          <button className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        }
      />
      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([heading, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={heading} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                {heading}
              </h3>
              <div className="space-y-2">
                {items.map((n, i) => {
                  const Icon = ICONS[n.type as keyof typeof ICONS] ?? Bell;
                  return (
                    <Reveal key={n.id} delay={i * 0.04}>
                      <div
                        className={cn(
                          "flex gap-3 rounded-2xl border p-4 shadow-soft",
                          n.unread ? "border-primary/30 bg-primary/[0.04]" : "border-border bg-card",
                        )}
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-brand-soft text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{n.title}</p>
                            {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{n.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </UserShell>
  );
}
