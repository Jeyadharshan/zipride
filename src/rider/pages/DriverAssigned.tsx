import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Star, Phone, MessageSquare, Car, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { MapCanvas } from "@/map/components/MapCanvas";
import { DRIVER, TRIP } from "@/shared/constants/zip-data";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";
import { getSocket } from "@/shared/lib/socket";



export function DriverAssigned() {
  const navigate = useNavigate();
  const [rideOtp, setRideOtp] = useState("4291");
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [fareVal, setFareVal] = useState(TRIP.fare);
  const [payMethod, setPayMethod] = useState(TRIP.pay);

  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const latP = localStorage.getItem("booking_pickup_lat");
      const lonP = localStorage.getItem("booking_pickup_lon");
      if (latP && lonP) setPickupCoords([Number(latP), Number(lonP)]);

      const latD = localStorage.getItem("booking_dropoff_lat");
      const lonD = localStorage.getItem("booking_dropoff_lon");
      if (latD && lonD) setDropoffCoords([Number(latD), Number(lonD)]);
    }
  }, []);

  const fetchOtpAndDriver = async (rideId: string) => {
    try {
      const { data: ride } = await (supabase as any)
        .from("rides")
        .select(`
          otp,
          status,
          fare,
          payment_method,
          driver_id,
          pickup_latitude,
          pickup_longitude,
          dropoff_latitude,
          dropoff_longitude,
          driver_name,
          driver_phone
        `)
        .eq("id", rideId)
        .maybeSingle();

      if (ride) {
        if (ride.otp) setRideOtp(ride.otp);
        if (ride.fare) setFareVal(Number(ride.fare));
        if (ride.payment_method) setPayMethod(ride.payment_method);
        if (ride.pickup_latitude && ride.pickup_longitude) {
          setPickupCoords([Number(ride.pickup_latitude), Number(ride.pickup_longitude)]);
        }
        if (ride.dropoff_latitude && ride.dropoff_longitude) {
          setDropoffCoords([Number(ride.dropoff_latitude), Number(ride.dropoff_longitude)]);
        }
        if (ride.status === "arriving" || ride.status === "in_progress" || ride.status === "completed") {
          navigate({ to: "/tracking", replace: true });
        }

        if (ride.driver_id) {
          const { data: dProf } = await supabase
            .from("driver_profiles")
            .select("rating, profile_photo_url")
            .eq("id", ride.driver_id)
            .maybeSingle();

          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("make, model, color, license_plate")
            .eq("driver_id", ride.driver_id)
            .eq("is_active", true)
            .maybeSingle();

          if (dProf?.profile_photo_url) {
            localStorage.setItem("active_driver_avatar", dProf.profile_photo_url);
          }

          setDriverDetails({
            name: ride.driver_name || ride.driver?.full_name || DRIVER.name,
            rating: dProf?.rating || 4.8,
            car: vehicle ? `${vehicle.color || ""} ${vehicle.make} ${vehicle.model}` : "Swift Dzire White",
            plate: vehicle?.license_plate || "TN 72 AB 1234",
            phone: ride.driver_phone || ride.driver?.phone || DRIVER.phone,
            avatar: dProf?.profile_photo_url || ""
          });
        }
      }
    } catch (e) {
      console.error("Error fetching OTP and driver:", e);
    }
  };

  const { profile } = useAuth();

  useEffect(() => {
    async function initDriverAssigned() {
      let rideId = localStorage.getItem("active_ride_id");
      if (rideId) {
        getSocket().emit("ride:join", { rideId });
      }

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
          console.error("Error recovering ride ID in DriverAssigned:", e);
        }
      }

      if (!rideId) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      fetchOtpAndDriver(rideId);
    }

    initDriverAssigned();

    const rideId = localStorage.getItem("active_ride_id");
    const interval = setInterval(async () => {
      const currentRideId = localStorage.getItem("active_ride_id") || rideId;
      if (!currentRideId) return;
      try {
        const { data } = await (supabase as any)
          .from("rides")
          .select("status, driver_id")
          .eq("id", currentRideId)
          .maybeSingle();
        if (data) {
          const s = (data.status || "").toLowerCase();
          if (s === "arriving" || s === "in_progress" || s === "completed") {
            clearInterval(interval);
            navigate({ to: "/tracking", replace: true });
          } else if (s === "cancelled") {
            clearInterval(interval);
            localStorage.removeItem("active_ride_id");
            navigate({ to: "/dashboard", replace: true });
          }
          if (data.driver_id && !driverDetails) {
            fetchOtpAndDriver(currentRideId);
          }
        }
      } catch (err) {
        console.error("Error polling ride status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [navigate, driverDetails, profile?.id]);

  const displayName = driverDetails?.name || DRIVER.name;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Map occupies the full page */}
      <MapCanvas
        className="absolute inset-0 h-full w-full z-0"
        carProgress={0.35}
        dashed
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
      />

      {/* Floating Top Bar / Home button */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="grid h-11 w-11 place-items-center rounded-full glass text-foreground shadow-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="glass rounded-full px-4 py-2 shadow-soft">
          <Logo to="/dashboard" size="sm" />
        </div>
      </div>

      {/* Floating bottom sheet details panel */}
      <div className="absolute inset-x-4 bottom-4 lg:left-6 lg:bottom-6 lg:right-auto lg:w-[400px] z-20 flex flex-col justify-end pointer-events-none">
        <div className="w-full pointer-events-auto rounded-3xl border border-border bg-card p-6 shadow-elevated">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success"
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.div>
          <h1 className="text-center text-2xl font-extrabold">Driver assigned!</h1>
          <p className="text-center text-muted-foreground">Arriving in 3 minutes</p>

          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-secondary p-4">
            <Avatar label={displayName[0]} src={driverDetails?.avatar} className="h-14 w-14 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{displayName}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {driverDetails?.rating || DRIVER.rating} · {DRIVER.trips} trips
              </p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Car className="h-3.5 w-3.5" /> {driverDetails?.car || DRIVER.car} · {driverDetails?.plate || DRIVER.plate}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="grid h-11 w-11 place-items-center rounded-full bg-card text-primary shadow-soft">
                <a href={`tel:${driverDetails?.phone || DRIVER.phone}`}><Phone className="h-5 w-5" /></a>
              </button>
              <button className="grid h-11 w-11 place-items-center rounded-full bg-card text-primary shadow-soft">
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border p-4 text-sm">
            <span className="text-muted-foreground">OTP for driver</span>
            <div className="flex gap-1.5">
              {rideOtp.split("").map((d, i) => (
                <span
                  key={i}
                  className="grid h-9 w-8 place-items-center rounded-lg gradient-brand-soft font-bold text-primary"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                const rideId = localStorage.getItem("active_ride_id");
                if (rideId) {
                  await (supabase as any).from("rides").update({ status: "cancelled" }).eq("id", rideId);
                }
                localStorage.removeItem("active_ride_id");
                alert("Ride cancelled successfully.");
                navigate({ to: "/dashboard", replace: true });
              }}
              className="rounded-2xl border border-destructive/30 py-3.5 text-center font-bold text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => navigate({ to: "/tracking", replace: true })}
              className="flex items-center justify-center gap-1.5 rounded-2xl gradient-brand py-3.5 font-bold text-primary-foreground shadow-glow"
            >
              Track Ride <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Fare ₹{fareVal} · Pay by {payMethod.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
