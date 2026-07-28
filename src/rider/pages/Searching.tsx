import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Car, X } from "lucide-react";
import { MapCanvas } from "@/map/components/MapCanvas";
import { TRIP } from "@/shared/constants/zip-data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";
import { getSocket } from "@/shared/lib/socket";



export function Searching() {
  const navigate = useNavigate();
  const [fromAddress, setFromAddress] = useState(TRIP.from);
  const [toAddress, setToAddress] = useState(TRIP.to);

  const { profile } = useAuth();

  useEffect(() => {
    async function loadRideData() {
      let rideId = localStorage.getItem("active_ride_id");
      if (rideId) {
        getSocket().emit("ride:join", { rideId });
      }

      // Recover active ride ID from database if missing in localStorage
      if (!rideId && profile?.id) {
        try {
          const { data: dbRides } = await (supabase as any)
            .from("rides")
            .select("id")
            .eq("rider_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (dbRides && dbRides[0]) {
            rideId = dbRides[0].id;
            localStorage.setItem("active_ride_id", rideId!);
          }
        } catch (e) {
          console.error("Failed to recover active ride ID from DB:", e);
        }
      }

      if (!rideId) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      try {
        const { data } = await supabase
          .from("rides")
          .select("pickup_address, dropoff_address")
          .eq("id", rideId!)
          .maybeSingle();
        if (data) {
          setFromAddress(data.pickup_address);
          setToAddress(data.dropoff_address);
        }
      } catch (e) {
        console.error("Failed to load ride addresses:", e);
      }
    }
    loadRideData();

    // Poll the status of the ride in Supabase
    const interval = setInterval(async () => {
      const currentRideId = localStorage.getItem("active_ride_id");
      if (!currentRideId) return;
      try {
        const { data, error } = await supabase
          .from("rides")
          .select("status")
          .eq("id", currentRideId)
          .maybeSingle();

        if (data) {
          const s = (data.status || "").toLowerCase();
          // If status is accepted, arriving, in_progress, etc. -> navigate
          if (
            s === "accepted" ||
            s === "driver accepted" ||
            s === "assigned" ||
            s === "driver assigned" ||
            s === "arriving" ||
            s === "in_progress"
          ) {
            clearInterval(interval);
            navigate({ to: "/driver-assigned", replace: true });
          } else if (s === "cancelled") {
            clearInterval(interval);
            localStorage.removeItem("active_ride_id");
            navigate({ to: "/dashboard", replace: true });
          }
        }
      } catch (err) {
        console.error("Error polling ride status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="relative grid h-screen place-items-center overflow-hidden bg-background">
      <MapCanvas className="absolute inset-0 h-full w-full opacity-60" />
      <button
        onClick={async () => {
          const currentRideId = localStorage.getItem("active_ride_id");
          if (currentRideId) {
            try {
              await (supabase as any)
                .from("rides")
                .update({ status: "cancelled" })
                .eq("id", currentRideId);
            } catch (e) {
              console.error("Failed to cancel ride in DB:", e);
            }
          }
          localStorage.removeItem("active_ride_id");
          alert("Ride cancelled successfully.");
          navigate({ to: "/dashboard", replace: true });
        }}
        className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full glass shadow-soft hover:bg-black/10 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10 text-center">
        <div className="relative mx-auto grid h-44 w-44 place-items-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute h-44 w-44 rounded-full border-2 border-primary/40"
              animate={{ scale: [0.4, 1.4], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.66 }}
            />
          ))}
          <div className="grid h-24 w-24 place-items-center rounded-full gradient-brand text-primary-foreground shadow-glow">
            <Car className="h-11 w-11" />
          </div>
        </div>
        <h1 className="mt-8 text-2xl font-extrabold">Finding your driver…</h1>
        <p className="mt-2 text-muted-foreground">Connecting you with a nearby verified driver</p>
        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-sm shadow-soft">
          <span className="font-semibold">{fromAddress}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-semibold">{toAddress}</span>
        </div>
      </div>
    </div>
  );
}
