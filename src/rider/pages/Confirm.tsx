import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Circle, MapPin, Tag } from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { Reveal } from "@/shared/components/kit/Reveal";
import { TRIP } from "@/shared/constants/zip-data";
import { cn } from "@/shared/utils/cn";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import { MapView } from "@/map/components/MapView";



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

export function Confirm() {
  const { profile } = useAuth();
  const [pay, setPay] = useState("cash");
  const [booking, setBooking] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const navigate = useNavigate();

  const pickupVal = localStorage.getItem("booking_pickup") || TRIP.from;
  const dropoffVal = localStorage.getItem("booking_dropoff") || TRIP.to;
  const fareVal = parseInt(localStorage.getItem("booking_fare") || TRIP.fare.toString());
  const distanceVal = parseFloat(localStorage.getItem("booking_distance") || "4.2");

  const pickupLatVal = parseFloat(localStorage.getItem("booking_pickup_lat") || "9.4522");
  const pickupLonVal = parseFloat(localStorage.getItem("booking_pickup_lon") || "77.9626");
  const dropoffLatVal = parseFloat(localStorage.getItem("booking_dropoff_lat") || "9.5022");
  const dropoffLonVal = parseFloat(localStorage.getItem("booking_dropoff_lon") || "77.9026");

  const [pickupCoords] = useState<[number, number] | null>(
    pickupLatVal && pickupLonVal ? [pickupLatVal, pickupLonVal] : null
  );
  const [dropoffCoords] = useState<[number, number] | null>(
    dropoffLatVal && dropoffLonVal ? [dropoffLatVal, dropoffLonVal] : null
  );

  // Calculate distinct pickup and dropoff times
  const now = new Date();
  const pickupTime = new Date(now.getTime() + 3 * 60000);
  const pickupTimeStr = pickupTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const durationVal = parseInt(localStorage.getItem("booking_duration") || Math.ceil(distanceVal * 4).toString());
  const dropoffTime = new Date(pickupTime.getTime() + durationVal * 60000);
  const dropoffTimeStr = dropoffTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // If user has an active ride, redirect them away from confirm to the active ride
  useEffect(() => {
    if (!profile?.id) return;
    const riderId = profile.id;
    async function checkActiveRide() {
      try {
        const { data: activeRides } = await (supabase as any)
          .from("rides")
          .select("id, status, payment_status")
          .eq("rider_id", riderId)
          .in("status", [
            "searching", "pending", "Searching",
            "driver assigned", "assigned", "driver accepted", "accepted", "Driver Assigned", "Driver Accepted",
            "driver arrived", "arriving", "ride started", "in_progress", "Driver Arrived", "Ride Started"
          ])
          .order("created_at", { ascending: false })
          .limit(1);

        if (activeRides && activeRides.length > 0) {
          const ride = activeRides[0];
          const s = (ride.status || "").toLowerCase();
          
          if (s === "searching" || s === "pending") {
            localStorage.setItem("active_ride_id", ride.id);
            navigate({ to: "/searching", replace: true });
          } else if (s === "driver assigned" || s === "assigned" || s === "driver accepted" || s === "accepted") {
            localStorage.setItem("active_ride_id", ride.id);
            navigate({ to: "/driver-assigned", replace: true });
          } else if (s === "driver arrived" || s === "arriving" || s === "ride started" || s === "in_progress") {
            localStorage.setItem("active_ride_id", ride.id);
            navigate({ to: "/tracking", replace: true });
          } else {
            localStorage.removeItem("active_ride_id");
          }
        } else {
          localStorage.removeItem("active_ride_id");
        }
      } catch (err) {
        console.error("Failed to check active ride in confirm:", err);
      }
    }
    checkActiveRide();
  }, [profile?.id, navigate]);

  useEffect(() => {
    async function loadWallet() {
      if (profile?.id) {
        try {
          const { data } = await supabase
            .from("wallets")
            .select("balance")
            .eq("id", profile.id)
            .maybeSingle();
          if (data) {
            setWalletBalance(Number(data.balance));
          }
        } catch (e) {
          console.error("Error loading wallet balance:", e);
        }
      }
    }
    loadWallet();
  }, [profile]);



  const handleConfirm = async () => {
    if (!profile?.id) {
      alert("User profile not loaded. Please wait or log in.");
      return;
    }
    // Tamil Nadu location verification check
    if (pickupCoords && (pickupCoords[0] < 8.0 || pickupCoords[0] > 14.0 || pickupCoords[1] < 76.0 || pickupCoords[1] > 80.5)) {
      alert("ZipRide only operates within Tamil Nadu, India. Please select a pickup location in Tamil Nadu.");
      return;
    }
    if (dropoffCoords && (dropoffCoords[0] < 8.0 || dropoffCoords[0] > 14.0 || dropoffCoords[1] < 76.0 || dropoffCoords[1] > 80.5)) {
      alert("ZipRide only operates within Tamil Nadu, India. Please select a dropoff location in Tamil Nadu.");
      return;
    }
    setBooking(true);
    try {
      // Prevent duplicate active rides
      const { data: existingActive } = await (supabase as any)
        .from("rides")
        .select("id, status")
        .eq("rider_id", profile.id)
        .in("status", [
          "searching", "pending", "Searching",
          "driver assigned", "assigned", "driver accepted", "accepted", "Driver Assigned", "Driver Accepted",
          "driver arrived", "arriving", "ride started", "in_progress", "Driver Arrived", "Ride Started"
        ])
        .limit(1);

      if (existingActive && existingActive.length > 0) {
        alert("You already have an active ride in progress! Please complete your current ride before booking a new one.");
        localStorage.setItem("active_ride_id", existingActive[0].id);
        navigate({ to: "/tracking", replace: true });
        setBooking(false);
        return;
      }

      console.log("[Confirm Ride Page] Creating ride request for rider:", profile.id);
      
      const rideOtp = Math.floor(1000 + Math.random() * 9000).toString();
      
      const ridePayload = {
        rider_id: profile.id,
        status: "searching" as const,
        pickup_address: pickupVal,
        pickup_latitude: pickupLatVal,
        pickup_longitude: pickupLonVal,
        dropoff_address: dropoffVal,
        dropoff_latitude: dropoffLatVal,
        dropoff_longitude: dropoffLonVal,
        fare: fareVal,
        distance: distanceVal,
        duration: durationVal,
        payment_method: "cash",
        payment_status: "pending" as const,
        otp: rideOtp,
      };
      
      console.log("Ride Payload", ridePayload);

      const { data: newRide, error } = await (supabase as any)
        .from("rides")
        .insert(ridePayload)
        .select()
        .single();

      if (error) {
        console.error("Supabase Error Code:", error?.code);
        console.error("Supabase Error Message:", error?.message);
        console.error("Supabase Error Details:", error?.details);
        console.error("Supabase Error Hint:", error?.hint);
        console.error("Full Error Object:", JSON.stringify(error, null, 2));
        throw new Error(error.message);
      }

      console.log("[Confirm Ride Page] Created ride successfully:", newRide);
      localStorage.setItem("active_ride_id", newRide.id);
      navigate({ to: "/searching", replace: true });
    } catch (err: any) {
      alert("Failed to confirm booking: " + err.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <UserShell width="narrow">
      <Link
        to="/ride-type"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Reveal>
        <h1 className="text-2xl font-extrabold">Confirm booking</h1>

        <div className="mt-5 space-y-5">
          {/* Map route preview */}
          <div className="h-[220px] overflow-hidden rounded-3xl border border-border shadow-soft">
            <MapView
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              className="h-full w-full"
            />
          </div>

          {/* Section: Trip Route */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Trip Route</h2>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start gap-3 text-sm">
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <Circle className="h-2.5 w-2.5 fill-success text-success animate-pulse" />
                  <span className="h-8 w-px bg-border" />
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                </div>
                <div className="space-y-4 flex-1 min-w-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pickup Point</span>
                      <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-dashed border-primary/20">{pickupTimeStr}</span>
                    </div>
                    <p className="font-semibold text-foreground truncate mt-1">{pickupVal}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Dropoff Point</span>
                      <span className="text-xs font-bold text-destructive bg-destructive/5 px-2 py-0.5 rounded-md border border-dashed border-destructive/20">{dropoffTimeStr}</span>
                    </div>
                    <p className="font-semibold text-foreground truncate mt-1">{dropoffVal}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Selected Vehicle */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Selected Vehicle</h2>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-3xl animate-float">
                🚕
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">Taxi · ZipRide</p>
                <p className="text-xs text-muted-foreground mt-0.5">Arrives in 3 min</p>
              </div>
            </div>
          </div>

          {/* Section: Ride Details */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Ride Details</h2>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Distance</span>
                <p className="text-lg font-extrabold text-foreground">
                  <motion.span
                    key={distanceVal}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="inline-block font-extrabold text-foreground"
                  >
                    {distanceVal} km
                  </motion.span>
                </p>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Est. Time</span>
                <p className="text-lg font-extrabold text-foreground">
                  <motion.span
                    key={distanceVal}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="inline-block font-extrabold text-foreground"
                  >
                    {formatDuration(durationVal)}
                  </motion.span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
          <Tag className="h-5 w-5 text-primary" />
          <input
            placeholder="Add promo code"
            className="w-full bg-transparent text-sm outline-none"
          />
          <button className="text-sm font-semibold text-primary">Apply</button>
        </div>

        {/* Section: Fare Summary */}
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Fare Summary</h2>
          <div className="space-y-2 rounded-2xl bg-secondary p-4 text-sm">
            <Row label="Ride fare" value={`₹${fareVal - 8}`} />
            <Row label="Booking fee" value="₹8" />
            <Row label="Promo discount" value="−₹0" />
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-extrabold text-foreground">
              <span>Total Amount</span>
              <motion.span
                key={fareVal}
                initial={{ scale: 0.8, color: "var(--success)" }}
                animate={{ scale: 1, color: "inherit" }}
                transition={{ type: "spring", stiffness: 350, damping: 12 }}
                className="inline-block text-primary"
              >
                ₹{fareVal}
              </motion.span>
            </div>
          </div>
        </div>
      </Reveal>

      <button
        onClick={handleConfirm}
        disabled={booking}
        className="mt-6 w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 hover:scale-[1.01] transition-transform"
      >
        {booking ? "Confirming Booking..." : `Confirm Booking · ₹${fareVal}`}
      </button>
    </UserShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
