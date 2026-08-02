import { formatDateIN } from "@/shared/utils/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Circle, MapPin, RotateCcw, Loader2 } from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { PageHeader, Pill } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { cn } from "@/shared/utils/cn";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";

const RANGES = ["All Time", "This Month", "Last Month", "Custom Range"];

export function History() {
  const { profile } = useAuth();
  const [range, setRange] = useState("All Time");
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    async function fetchRideHistory() {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("rides")
          .select("*")
          .eq("rider_id", profile.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRides(data || []);
      } catch (err) {
        console.error("Failed to load ride history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRideHistory();
  }, [profile]);

  const filteredRides = rides.filter((r) => {
    const bookingDate = new Date(r.created_at || r.booking_time);
    if (isNaN(bookingDate.getTime())) return true;
    const now = new Date();

    if (range === "This Month") {
      return (
        bookingDate.getFullYear() === now.getFullYear() && bookingDate.getMonth() === now.getMonth()
      );
    }

    if (range === "Last Month") {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        bookingDate.getFullYear() === lastMonthDate.getFullYear() &&
        bookingDate.getMonth() === lastMonthDate.getMonth()
      );
    }

    if (range === "Custom Range") {
      if (customStart && new Date(customStart) > bookingDate) return false;
      if (customEnd) {
        const endExclusive = new Date(customEnd);
        endExclusive.setDate(endExclusive.getDate() + 1);
        if (bookingDate >= endExclusive) return false;
      }
      return true;
    }

    return true;
  });

  return (
    <UserShell>
      <PageHeader title="My Rides" subtitle="Your complete ride history" />

      <div className="mb-5 flex flex-wrap gap-2 items-center">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              range === r
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {range === "Custom Range" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {(customStart || customEnd) && (
            <button
              onClick={() => {
                setCustomStart("");
                setCustomEnd("");
              }}
              className="mt-4 text-xs font-semibold text-muted-foreground hover:text-foreground underline"
            >
              Clear dates
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading your ride history...</span>
        </div>
      ) : filteredRides.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <p className="text-lg font-semibold text-muted-foreground">No completed rides found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your completed trips will appear here.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-block rounded-2xl gradient-brand px-6 py-3 font-bold text-primary-foreground shadow-glow cursor-pointer"
          >
            Book a Ride
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRides.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.04}>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1.5">
                      <Circle className="h-2.5 w-2.5 fill-success text-success" />
                      <span className="h-6 w-px bg-border" />
                      <MapPin className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{formatDateIN(r.created_at)}</p>
                      <p className="font-bold truncate max-w-[200px] sm:max-w-md">
                        {r.pickup_address}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-md">
                        → {r.dropoff_address}
                      </p>
                      <div className="mt-3">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                          Ride Details
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <Pill>Taxi</Pill>
                          <Pill>{r.distance} km</Pill>
                          <Pill>{r.duration} mins</Pill>
                          <Pill className="uppercase">{r.payment_method}</Pill>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-extrabold">₹{r.fare}</p>
                    <Pill tone="success">Completed</Pill>
                    <Link
                      to="/dashboard"
                      className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Book Again
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </UserShell>
  );
}
