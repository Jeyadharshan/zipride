import { useState } from "react";
import type { ReactNode } from "react";
import { Phone, Copy } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6 shadow-soft", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  value,
  label,
  icon,
  className,
}: {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl gradient-brand-soft text-primary [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      )}
      <div className="text-2xl font-extrabold text-gradient">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function Avatar({ label, src, className, onClick }: { label: string; src?: string; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src && !imgError);

  return (
    <span
      className={cn(
        "relative overflow-hidden grid shrink-0 place-items-center rounded-full gradient-brand font-bold text-primary-foreground shadow-glow",
        className,
      )}
      onClick={onClick}
    >
      {showImage ? (
        <img
          src={src}
          alt={label || "Avatar"}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        label || "U"
      )}
    </span>
  );
}

export function Pill({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "success" | "warning" | "destructive" | "brand";
}) {
  const tones: Record<string, string> = {
    muted: "bg-secondary text-secondary-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/12 text-destructive",
    brand: "bg-primary/12 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function InteractivePhone({ phone, className }: { phone: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy phone number:", err);
    }
  };

  if (!phone || phone === "—" || phone === "No phone") {
    return <span className={className}>{phone || "—"}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 group select-none", className)}>
      <a
        href={`tel:${phone}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 hover:text-primary transition-colors text-inherit cursor-pointer"
        title={`Call ${phone}`}
      >
        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-semibold underline decoration-dotted decoration-primary/40 hover:decoration-primary">{phone}</span>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="p-0.5 text-muted-foreground hover:text-primary rounded shrink-0 transition-colors"
        title="Copy phone number"
      >
        {copied ? (
          <span className="text-[10px] text-success font-bold">Copied!</span>
        ) : (
          <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    </span>
  );
}

