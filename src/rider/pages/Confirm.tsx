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

  const [tripType, setTripType] = useState<"one_way" | "two_way">("one_way");
  const [isAc, setIsAc] = useState(false);

  const [pickupVal, setPickupVal] = useState(TRIP.from);
  const [dropoffVal, setDropoffVal] = useState(TRIP.to);
  const [distanceVal, setDistanceVal] = useState(4.2);
  const [durationVal, setDurationVal] = useState(17);

  const [pickupLatVal, setPickupLatVal] = useState(9.4522);
  const [pickupLonVal, setPickupLonVal] = useState(77.9626);
  const [dropoffLatVal, setDropoffLatVal] = useState(9.5022);
  const [dropoffLonVal, setDropoffLonVal] = useState(77.9026);

  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);

  const [pickupTimeStr, setPickupTimeStr] = useState("10:00 AM");
  const [dropoffTimeStr, setDropoffTimeStr] = useState("10:17 AM");

  // Dynamic Slab Fare Calculation Engine
  const calculateSlabFare = (dist: number, isRoundTrip: boolean, acEnabled: boolean) => {
    const effDist = isRoundTrip ? dist * 2 : dist;
    let distFare = 0;
    if (effDist <= 15) {
      distFare = effDist * 15;
    } else if (effDist <= 40) {
      distFare = (15 * 15) + ((effDist - 15) * 18);
    } else {
      distFare = (15 * 15) + (25 * 18) + ((effDist - 40) * 22);
    }
    const acFee = acEnabled ? effDist * 3 : 0;
    const base = 40;
    const timeFee = Math.round(dist * 4 * 2);
    const subtotal = base + distFare + acFee + timeFee;
    const tax = Math.round(subtotal * 0.05);
    return Math.round(subtotal + tax);
  };

  const fareVal = calculateSlabFare(distanceVal, tripType === "two_way", isAc);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pVal = localStorage.getItem("booking_pickup") || TRIP.from;
      const dVal = localStorage.getItem("booking_dropoff") || TRIP.to;
      const distVal = parseFloat(localStorage.getItem("booking_distance") || "4.2");
      const durVal = parseInt(localStorage.getItem("booking_duration") || Math.ceil(distVal * 4).toString());

      const pLat = parseFloat(localStorage.getItem("booking_pickup_lat") || "9.4522");
      const pLon = parseFloat(localStorage.getItem("booking_pickup_lon") || "77.9626");
      const dLat = parseFloat(localStorage.getItem("booking_dropoff_lat") || "9.5022");
      const dLon = parseFloat(localStorage.getItem("booking_dropoff_lon") || "77.9026");

      setPickupVal(pVal);
      setDropoffVal(dVal);
      setDistanceVal(distVal);
      setDurationVal(durVal);

      setPickupLatVal(pLat);
      setPickupLonVal(pLon);
      setDropoffLatVal(dLat);
      setDropoffLonVal(dLon);

      setPickupCoords([pLat, pLon]);
      setDropoffCoords([dLat, dLon]);

      const now = new Date();
      const pTime = new Date(now.getTime() + 3 * 60000);
      setPickupTimeStr(pTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      const dTime = new Date(pTime.getTime() + durVal * 60000);
      setDropoffTimeStr(dTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }, []);

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
      alert("Please log in to book a ride.");
      navigate({ to: "/login" });
      return;
    }

    setBooking(true);
    try {
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
        distance: tripType === "two_way" ? distanceVal * 2 : distanceVal,
        duration: durationVal,
        payment_method: "cash",
        payment_status: "pending" as const,
        otp: rideOtp,
        trip_type: tripType,
        is_ac: isAc
      };
      
      const { data: newRide, error } = await (supabase as any)
        .from("rides")
        .insert(ridePayload)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

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
          <div className="h-[200px] overflow-hidden rounded-3xl border border-border shadow-soft">
            <MapView
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              className="h-full w-full"
            />
          </div>

          {/* Selector 1: One-Way vs Two-Way (Round Trip) */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Trip Type</h2>
            <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border bg-card p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => setTripType("one_way")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition-all cursor-pointer",
                  tripType === "one_way"
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>➡️ One-Way Trip</span>
              </button>
              <button
                type="button"
                onClick={() => setTripType("two_way")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition-all cursor-pointer",
                  tripType === "two_way"
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>🔄 Two-Way (Round Trip)</span>
              </button>
            </div>
          </div>

          {/* Selector 2: AC vs Non-AC Vehicle Option */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Vehicle Comfort (AC / Non-AC)</h2>
            <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border bg-card p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => setIsAc(false)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition-all cursor-pointer",
                  !isAc
                    ? "bg-secondary text-foreground border border-border shadow-soft"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>🚘 Non-AC Vehicle</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAc(true)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition-all cursor-pointer",
                  isAc
                    ? "bg-sky-500 text-white shadow-glow"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>❄️ AC Vehicle</span>
              </button>
            </div>
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

          {/* Section: Cancellation Policy Notice */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <Tag className="h-4 w-4" />
              <span>Free Cancellation Policy</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              Cancelling before driver accepts is 100% free (₹0 fee). Cancellation fee is only charged if trip is confirmed by driver.
            </p>
          </div>

          {/* Section: Ride Details */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Ride Details</h2>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Distance</span>
                <p className="text-lg font-extrabold text-foreground">
                  {tripType === "two_way" ? `${distanceVal * 2} km (Round Trip)` : `${distanceVal} km`}
                </p>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Comfort</span>
                <p className="text-lg font-extrabold text-foreground">
                  {isAc ? "❄️ AC" : "🚘 Non-AC"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Section: Fare Summary */}
      <Reveal delay={0.08}>
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Fare Breakdown (Slab Rates)</h2>
          <div className="space-y-2 rounded-2xl bg-secondary p-4 text-sm">
            <Row label="Base Fare" value="₹40" />
            <Row label="Distance Fare" value={`₹${fareVal - (isAc ? Math.round((tripType === 'two_way' ? distanceVal * 2 : distanceVal) * 3) : 0) - 40}`} />
            {isAc && <Row label="AC Surcharge (₹3/km)" value={`+₹${Math.round((tripType === 'two_way' ? distanceVal * 2 : distanceVal) * 3)}`} />}
            <Row label="Platform Commission" value="₹0 (0% Fee)" />
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-extrabold text-foreground">
              <span>Total Final Fare</span>
              <span className="inline-block text-primary text-xl font-black">
                ₹{fareVal}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      <button
        onClick={handleConfirm}
        disabled={booking}
        className="mt-6 w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 hover:scale-[1.01] transition-transform cursor-pointer"
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
