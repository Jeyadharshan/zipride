import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Moon, Globe, Shield, MapPin, Smartphone, ChevronRight } from "lucide-react";
import { AccountShell } from "@/rider/layouts/AccountShell";
import { cn } from "@/shared/utils/cn";



function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        on ? "gradient-brand" : "bg-border",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function Settings() {
  const [toggles, setToggles] = useState({
    push: true,
    promo: false,
    location: true,
    dark: false,
  });
  const flip = (k: keyof typeof toggles) => setToggles((s) => ({ ...s, [k]: !s[k] }));

  return (
    <AccountShell active="Settings">
      <h1 className="mb-6 text-2xl font-extrabold">Settings</h1>

      <Section title="Notifications">
        <RowToggle
          icon={Bell}
          label="Push notifications"
          sub="Ride updates & alerts"
          on={toggles.push}
          onClick={() => flip("push")}
        />
        <RowToggle
          icon={Smartphone}
          label="Promotional offers"
          sub="Deals and discounts"
          on={toggles.promo}
          onClick={() => flip("promo")}
        />
      </Section>

      <Section title="Preferences">
        <RowToggle
          icon={MapPin}
          label="Location access"
          sub="For accurate pickups"
          on={toggles.location}
          onClick={() => flip("location")}
        />
        <RowToggle
          icon={Moon}
          label="Dark mode"
          sub="Easier on the eyes"
          on={toggles.dark}
          onClick={() => flip("dark")}
        />
        <RowLink icon={Globe} label="Language" value="English" />
      </Section>

      <Section title="Privacy & Security">
        <RowLink icon={Shield} label="Change password" />
        <RowLink icon={Shield} label="Two-factor authentication" value="Off" />
        <RowLink icon={Shield} label="Delete account" danger />
      </Section>

      <p className="mt-6 text-center text-sm text-muted-foreground">ZipRide v2.4.1</p>
    </AccountShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
        {children}
      </div>
    </div>
  );
}

function RowToggle({ icon: Icon, label, sub, on, onClick }: any) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

function RowLink({ icon: Icon, label, value, danger }: any) {
  return (
    <button className="flex w-full items-center gap-3 p-4 text-left">
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl bg-secondary",
          danger ? "text-destructive" : "text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className={cn("flex-1 font-semibold", danger && "text-destructive")}>{label}</p>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}
