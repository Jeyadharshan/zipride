import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, Clock, Check, ArrowRight, Circle, MapPin } from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { Reveal } from "@/shared/components/kit/Reveal";
import { VEHICLES, TRIP } from "@/shared/constants/zip-data";
import { cn } from "@/shared/utils/cn";
import { motion } from "motion/react";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export function RideType() {
  const [sel, setSel] = useState("taxi");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const chosen = VEHICLES.find((v) => v.id === sel)!;
  const fareVal = parseInt(localStorage.getItem("booking_fare") || "198");
  const pickupVal = localStorage.getItem("booking_pickup") || TRIP.from;
  const dropoffVal = localStorage.getItem("booking_dropoff") || TRIP.to;
  const distanceVal = localStorage.getItem("booking_distance") || "4.2";

  useEffect(() => {
    if (!profile?.id) return;
    const riderId = profile.id;
    async function checkActiveRide() {
      try {
        const { data: existingActive } = await (supabase as any)
          .from("rides")
          .select("id, status")
          .eq("rider_id", riderId)
          .in("status", [
            "searching", "pending", "Searching",
            "driver assigned", "assigned", "driver accepted", "accepted", "Driver Assigned", "Driver Accepted",
            "driver arrived", "arriving", "ride started", "in_progress", "Driver Arrived", "Ride Started"
          ])
          .limit(1);

        if (existingActive && existingActive.length > 0) {
          alert("You already have an active ride in progress! Complete your current ride before booking a new one.");
          localStorage.setItem("active_ride_id", existingActive[0].id);
          navigate({ to: "/tracking", replace: true });
        }
      } catch (err) {
        console.error("Active ride check failed in RideType:", err);
      }
    }
    checkActiveRide();
  }, [profile?.id, navigate]);

  return (
    <UserShell width="narrow">
      <Link
        to="/map"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Reveal>
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-soft">
          <div className="flex flex-col items-center gap-1 pt-1">
            <Circle className="h-2.5 w-2.5 fill-success text-success" />
            <span className="h-5 w-px bg-border" />
            <MapPin className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <p className="font-semibold truncate">{pickupVal}</p>
            <p className="font-semibold truncate">{dropoffVal}</p>
          </div>
          <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold shrink-0">
            <motion.span
              key={distanceVal}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="inline-block font-bold text-foreground"
            >
              {distanceVal} km
            </motion.span>
          </span>
        </div>
        <h1 className="text-2xl font-extrabold">Choose your ride</h1>
      </Reveal>

      <div className="mt-4 space-y-3">
        {VEHICLES.map((v, i) => (
          <Reveal key={v.id} delay={i * 0.05}>
            <button
              onClick={() => setSel(v.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all",
                sel === v.id
                  ? "border-primary shadow-glow ring-1 ring-primary"
                  : "border-border shadow-soft hover:border-primary/40",
              )}
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl">
                {v.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{v.name}</p>
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {v.seats}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                  <Clock className="h-3 w-3" /> {v.eta} away
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold">
                  <motion.span
                    key={fareVal}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="inline-block"
                  >
                    ₹{fareVal}
                  </motion.span>
                </p>
                {sel === v.id && (
                  <span className="ml-auto mt-1 inline-grid h-5 w-5 place-items-center rounded-full gradient-brand text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          </Reveal>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6">
        <button
          onClick={() => navigate({ to: "/confirm" })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow"
        >
          Book {chosen.name} · <motion.span key={fareVal} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-block">₹{fareVal}</motion.span> <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </UserShell>
  );
}
