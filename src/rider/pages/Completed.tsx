import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, MapPin, Flag, Route as RouteIcon, Clock, Calendar, Star, ArrowLeft } from "lucide-react";
import { Avatar } from "@/shared/components/kit/Primitives";
import { UserShell } from "@/rider/layouts/UserShell";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TRIP } from "@/shared/constants/zip-data";

function formatDuration(totalMins: number): string {
  if (totalMins < 60) {
    return `${totalMins} mins`;
  }
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const hrLabel = hrs === 1 ? "hr" : "hrs";
  if (mins === 0) {
    return `${hrs} ${hrLabel}`;
  }
  return `${hrs} ${hrLabel} ${mins} mins`;
}

export function Completed() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [ride, setRide] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompletedRide() {
      let rideId = localStorage.getItem("active_ride_id");
      
      try {
        let rideData: any = null;
        if (rideId) {
          const { data } = await supabase
            .from("rides")
            .select(`
              id,
              pickup_address,
              dropoff_address,
              fare,
              payment_method,
              payment_status,
              distance,
              estimated_duration,
              created_at,
              driver_id,
              driver:profiles!rides_driver_id_fkey(full_name, phone)
            `)
            .eq("id", rideId)
            .maybeSingle();
          rideData = data;
        }

        // Fallback: search latest completed ride for this rider
        if (!rideData && profile?.id) {
          const { data: latestRides } = await (supabase as any)
            .from("rides")
            .select(`
              id,
              pickup_address,
              dropoff_address,
              fare,
              payment_method,
              payment_status,
              distance,
              estimated_duration,
              created_at,
              driver_id,
              driver:profiles!rides_driver_id_fkey(full_name, phone)
            `)
            .eq("rider_id", profile.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1);

          if (latestRides && latestRides[0]) {
            rideData = latestRides[0];
          }
        }

        if (rideData) {
          setRide(rideData);
          if (rideData.driver_id) {
            localStorage.setItem("active_driver_id", rideData.driver_id);
            const { data: dProf } = await supabase
              .from("driver_profiles")
              .select("rating, profile_photo_url")
              .eq("id", rideData.driver_id)
              .maybeSingle();

            if (dProf) {
              localStorage.setItem("active_driver_rating", String(dProf.rating || 4.8));
            }

            const { data: vehicle } = await supabase
              .from("vehicles")
              .select("make, model, color, license_plate")
              .eq("driver_id", rideData.driver_id)
              .eq("is_active", true)
              .maybeSingle();

            setDriver({
              name: rideData.driver?.full_name || "Driver",
              rating: dProf?.rating || 4.8,
              car: vehicle ? `${vehicle.color || ""} ${vehicle.make} ${vehicle.model}` : "Swift Dzire White",
              plate: vehicle?.license_plate || "TN 72 AB 1234",
              avatar: dProf?.profile_photo_url || ""
            });
          }
        }
      } catch (err) {
        console.error("Failed to load completed ride:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCompletedRide();
  }, [profile?.id]);

  if (loading) {
    return (
      <UserShell width="narrow">
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground font-semibold">Loading ride summary...</p>
        </div>
      </UserShell>
    );
  }

  const fareVal = ride?.fare || 0;
  const payMethod = ride?.payment_method || "cash";

  const formattedDate = ride?.created_at
    ? new Date(ride.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  const rows = [
    { icon: MapPin, label: "From", value: ride?.pickup_address?.split(",")[0] || TRIP.from },
    { icon: Flag, label: "To", value: ride?.dropoff_address?.split(",")[0] || TRIP.to },
    { icon: RouteIcon, label: "Distance", value: ride?.distance ? `${ride.distance} km` : TRIP.km },
    { icon: Clock, label: "Duration", value: ride?.estimated_duration ? formatDuration(Math.ceil(ride.estimated_duration)) : TRIP.mins },
    { icon: Calendar, label: "Date", value: formattedDate },
  ];

  return (
    <UserShell width="narrow">
      <Link
        to="/dashboard"
        onClick={() => localStorage.removeItem("active_ride_id")}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-7 shadow-elevated"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success ring-8 ring-success/10"
        >
          <Check className="h-10 w-10" strokeWidth={3} />
        </motion.div>
        <h1 className="mt-5 text-center text-3xl font-extrabold">Ride Completed!</h1>
        <p className="text-center text-muted-foreground">Thank you for riding with ZipRide</p>

        <div className="my-6 text-center">
          <p className="text-5xl font-extrabold text-gradient">₹{fareVal}</p>
          <p className="mt-1 text-sm text-muted-foreground">Amount payable · {payMethod.toUpperCase()}</p>
        </div>

        <div className="rounded-2xl bg-secondary p-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <r.icon className="h-4 w-4" /> {r.label}
              </span>
              <span className="font-bold">{r.value}</span>
            </div>
          ))}
        </div>

        {driver && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-secondary p-4">
            <Avatar label={driver.name[0]} src={driver.avatar} className="h-11 w-11" />
            <div>
              <p className="font-bold">{driver.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" /> {driver.rating} ·{" "}
                {driver.car} · {driver.plate}
              </p>
            </div>
          </div>
        )}

        {payMethod === "wallet" ? (
          <div className="mt-6 p-4 rounded-2xl bg-success/10 text-success text-center font-bold text-sm border border-dashed border-success">
            ✓ Payment settled automatically via Wallet
          </div>
        ) : payMethod === "cash" ? (
          <div className="mt-6 p-4 rounded-2xl bg-primary/10 text-primary text-center font-bold text-sm border border-dashed border-primary">
            ✓ Pay ₹{fareVal} in Cash to Driver
          </div>
        ) : (
          <button
            onClick={() => {
              localStorage.setItem("payment_ride_id", ride?.id || "");
              localStorage.setItem("payment_amount", String(fareVal));
              navigate({ to: "/payment", replace: true });
            }}
            className="mt-6 w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow cursor-pointer hover:scale-[1.01] transition-transform"
          >
            Pay ₹{fareVal} Online
          </button>
        )}

        <button
          onClick={() => {
            navigate({ to: "/rating", replace: true });
          }}
          className="mt-4 block w-full rounded-2xl border border-border py-4 text-center font-bold cursor-pointer hover:bg-secondary transition-colors"
        >
          Rate Driver & Feedback
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("active_ride_id");
            navigate({ to: "/dashboard", replace: true });
          }}
          className="mt-3 block w-full rounded-2xl border border-border py-4 text-center font-bold cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Book Another Ride
        </button>
      </motion.div>
    </UserShell>
  );
}
