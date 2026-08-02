import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, MessageSquare, MapPin, Circle, Navigation } from "lucide-react";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { Avatar } from "@/shared/components/kit/Primitives";
import { MapCanvas } from "@/map/components/MapCanvas";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";



export function ArrivedAtPassenger() {
  const navigate = useNavigate();
  const [passenger, setPassenger] = useState({ name: "Passenger", initial: "P", rating: 4.8, avatar: "", phone: "" });
  const [rideDetails, setRideDetails] = useState<any>({
    pickup: "Anna Nagar, Virudhunagar",
    dropoff: "Sivakasi Bus Stand",
    fare: 198,
    paymentMethod: "Cash"
  });
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driverCoords, setDriverCoords] = useState<[number, number]>([9.445, 77.98]);

  const { profile } = useAuth();

  useEffect(() => {
    async function loadActiveRide() {
      let rideId = localStorage.getItem("driver_active_ride_id");

      if (!rideId && profile?.id) {
        try {
          const { data: dProf } = await (supabase as any)
            .from("driver_profiles")
            .select("id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          if (dProf?.id) {
            const { data: activeRides } = await (supabase as any)
              .from("rides")
              .select("id")
              .eq("driver_id", dProf.id)
              .order("created_at", { ascending: false })
              .limit(1);

            if (activeRides && activeRides[0]) {
              rideId = String(activeRides[0].id);
              localStorage.setItem("driver_active_ride_id", rideId);
            }
          }
        } catch (e) {
          console.error("Failed to recover driver active ride:", e);
        }
      }

      if (!rideId) {
        navigate({ to: "/driver/dashboard", replace: true });
        return;
      }

      try {
        const { data: ride, error: queryError } = await supabase
          .from("rides")
          .select(`
            id,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            dropoff_address,
            dropoff_latitude,
            dropoff_longitude,
            fare,
            payment_method,
            rider_name,
            rider_phone,
            rider_avatar
          `)
          .eq("id", rideId)
          .maybeSingle();

        if (queryError) {
          throw new Error(queryError.message);
        }

        if (!ride) {
          navigate({ to: "/driver/dashboard", replace: true });
          return;
        }

        const riderName = ride.rider_name || ride.rider?.full_name || "Passenger";
        setPassenger({
          name: riderName,
          initial: riderName[0].toUpperCase(),
          rating: 4.8,
          avatar: ride.rider_avatar || ride.rider?.avatar_url || "",
          phone: ride.rider_phone || ride.rider?.phone || "",
        });

        const pLat = Number(ride.pickup_latitude);
        const pLng = Number(ride.pickup_longitude);

        setRideDetails({
          pickup: ride.pickup_address,
          dropoff: ride.dropoff_address,
          pickupLat: pLat,
          pickupLng: pLng,
          dropoffLat: ride.dropoff_latitude,
          dropoffLng: ride.dropoff_longitude,
          fare: ride.fare,
          paymentMethod: ride.payment_method,
        });

        // Set dynamic fallback driver coords offset from pickup point
        if (pLat && pLng) {
          setDriverCoords([pLat - 0.008, pLng + 0.008]);
        }
      } catch (err) {
        console.error("Failed to load active ride details:", err);
        setError("Failed to load ride details. Please refresh or try again.");
      }
    }
    
    loadActiveRide();

    // Use Geolocation if available to get actual driver location
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("Geolocation load failed, using fallback offset.");
        }
      );
    }
  }, []);

  const handleArrived = async () => {
    const rideId = localStorage.getItem("driver_active_ride_id");
    if (!rideId) {
      alert("No active ride selected. Please accept a ride first.");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("rides")
        .update({ status: "arriving" as any })
        .eq("id", rideId);

      if (error) throw new Error(error.message);

      alert("Rider notified that you have arrived!");
      navigate({ to: "/driver/otp", replace: true });
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <DriverShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="relative h-[300px] overflow-hidden rounded-3xl border border-border shadow-soft lg:h-[560px]">
          <MapCanvas
            className="absolute inset-0 h-full w-full"
            carProgress={0.2}
            dashed
            mode="pickup"
            pickupCoords={driverCoords}
            dropoffCoords={rideDetails.pickupLat && rideDetails.pickupLng ? [rideDetails.pickupLat, rideDetails.pickupLng] : null}
          />
          <div className="absolute left-4 top-4 rounded-2xl border border-border bg-card px-4 py-2 shadow-elevated">
            <p className="text-lg font-extrabold text-primary">3 min</p>
            <p className="text-xs text-muted-foreground">to pickup point</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-xs font-bold uppercase text-muted-foreground">Pickup Passenger</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar label={passenger.initial} src={passenger.avatar} className="h-12 w-12" />
              <div className="flex-1">
                <p className="font-bold">{passenger.name}</p>
                <p className="text-xs text-muted-foreground">Rating: {passenger.rating} ★ · {passenger.phone || "No phone"}</p>
              </div>
              <div className="flex gap-2">
                <a href={passenger.phone ? `tel:${passenger.phone}` : "#"} className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                  <Phone className="h-5 w-5" />
                </a>
                <button className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                  <MessageSquare className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start gap-3 text-sm">
              <div className="flex flex-col items-center gap-1 pt-1">
                <Circle className="h-2.5 w-2.5 fill-success text-success" />
                <span className="h-6 w-px bg-border" />
                <MapPin className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="space-y-4 flex-1 min-w-0">
                <p className="font-semibold truncate">{rideDetails.pickup}</p>
                <p className="font-semibold truncate">{rideDetails.dropoff}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between rounded-xl bg-secondary p-3 text-sm">
              <span className="text-muted-foreground">Fare</span>
              <span className="font-bold">
                ₹{rideDetails.fare} · Pay by {rideDetails.paymentMethod.toUpperCase()}
              </span>
            </div>
          </div>
          {error ? (
            <div className="rounded-2xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <button
            onClick={() => {
              if (rideDetails.pickupLat && rideDetails.pickupLng) {
                const originStr = driverCoords ? `&origin=${driverCoords[0]},${driverCoords[1]}` : "";
                window.open(`https://www.google.com/maps/dir/?api=1${originStr}&destination=${rideDetails.pickupLat},${rideDetails.pickupLng}&travelmode=driving`, "_blank");
              } else {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rideDetails.pickup)}`, "_blank");
              }
            }}
            disabled={!!error}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-bold hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Navigation className="h-5 w-5 text-primary" /> Navigate to Pickup
          </button>
          <button
            onClick={handleArrived}
            disabled={updating || !!error}
            className="w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {updating ? "Processing..." : "Arrived at Pickup"}
          </button>
        </div>
      </div>
    </DriverShell>
  );
}
