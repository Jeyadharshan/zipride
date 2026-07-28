import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Zap, MapPin, Clock, ArrowRight, ShieldCheck, Car, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";
import { motion, AnimatePresence } from "motion/react";

export function ActiveRideBanner() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeRide, setActiveRide] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [driverName, setDriverName] = useState<string>("");

  useEffect(() => {
    if (!profile?.id) {
      setActiveRide(null);
      return;
    }

    const riderId = profile.id;

    async function checkActiveRide() {
      try {
        const { data: dbRides } = await (supabase as any)
          .from("rides")
          .select(`
            id,
            status,
            created_at,
            booking_time,
            pickup_address,
            dropoff_address,
            fare,
            driver_id,
            driver:profiles!rides_driver_id_fkey(full_name)
          `)
          .eq("rider_id", riderId)
          .in("status", [
            "searching", "pending", "Searching",
            "driver assigned", "assigned", "driver accepted", "accepted", "Driver Assigned", "Driver Accepted",
            "driver arrived", "arriving", "ride started", "in_progress", "Driver Arrived", "Ride Started"
          ])
          .order("created_at", { ascending: false })
          .limit(1);

        if (dbRides && dbRides.length > 0) {
          const ride = dbRides[0];
          setActiveRide(ride);
          localStorage.setItem("active_ride_id", ride.id);

          if (ride.driver?.full_name) {
            setDriverName(ride.driver.full_name);
          } else if (ride.driver_id) {
            // Fallback fetch driver name
            const { data: dProf } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", ride.driver_id)
              .maybeSingle();
            if (dProf?.full_name) setDriverName(dProf.full_name);
          }
        } else {
          setActiveRide(null);
          localStorage.removeItem("active_ride_id");
        }
      } catch (err) {
        console.error("ActiveRideBanner poll error:", err);
      }
    }

    checkActiveRide();
    const interval = setInterval(checkActiveRide, 3000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  // Elapsed timer calculation
  useEffect(() => {
    if (!activeRide) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = activeRide.created_at || activeRide.booking_time
      ? new Date(activeRide.created_at || activeRide.booking_time).getTime()
      : Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeRide?.id, activeRide?.created_at, activeRide?.booking_time]);

  if (!activeRide) return null;

  const s = (activeRide.status || "").toLowerCase();
  const isSearching = s === "searching" || s === "pending";
  const isAssigned = s === "driver assigned" || s === "assigned" || s === "driver accepted" || s === "accepted";
  const isArriving = s === "driver arrived" || s === "arriving";
  const isInProgress = s === "ride started" || s === "in_progress";

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const targetPath = isSearching
    ? "/searching"
    : isAssigned
    ? "/driver-assigned"
    : "/tracking";

  let statusLabel = "Ride in Progress";
  let statusBadgeColor = "bg-primary/10 text-primary border-primary/20";

  if (isSearching) {
    statusLabel = "Searching for Driver";
    statusBadgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
  } else if (isAssigned) {
    statusLabel = `Driver Assigned ${driverName ? `(${driverName})` : ""}`;
    statusBadgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
  } else if (isArriving) {
    statusLabel = "Driver Arrived at Pickup";
    statusBadgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  } else if (isInProgress) {
    statusLabel = "Ride In Progress";
    statusBadgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full bg-gradient-to-r from-primary/10 via-accent/15 to-primary/10 border-b border-primary/20 py-2.5 px-4 shadow-sm"
      >
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          {/* Status & Timer */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>

            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadgeColor}`}>
              <Car className="h-3.5 w-3.5" />
              {statusLabel}
            </span>

            <div className="flex items-center gap-1 font-mono font-bold text-foreground bg-card/80 px-2.5 py-0.5 rounded-md border border-border shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{timeFormatted}</span>
            </div>
          </div>

          {/* Route Summary */}
          <div className="hidden md:flex items-center gap-2 text-muted-foreground text-xs font-medium truncate max-w-md">
            <span className="truncate max-w-[140px] font-semibold text-foreground">{activeRide.pickup_address || "Pickup"}</span>
            <span>➔</span>
            <span className="truncate max-w-[140px] font-semibold text-foreground">{activeRide.dropoff_address || "Dropoff"}</span>
            {activeRide.fare && <span className="font-bold text-primary ml-1">₹{activeRide.fare}</span>}
          </div>

          {/* Track Live Button */}
          <Link
            to={targetPath}
            className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-soft transition-transform hover:scale-105"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Track Live Map
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
