import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-xl gradient-brand text-primary-foreground shadow-glow",
        className,
      )}
    >
      <Zap className="h-1/2 w-1/2 fill-current" strokeWidth={2.5} />
    </span>
  );
}

export function Logo({
  to = "/",
  className,
  size = "md",
  invert = false,
}: {
  to?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  invert?: boolean;
}) {
  const mark = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-2.5 font-extrabold tracking-tight", className)}
    >
      <LogoMark className={mark} />
      <span className={cn(text, invert ? "text-white" : "text-foreground")}>
        Zip<span className="text-yellow">Ride</span>
      </span>
    </Link>
  );
}
