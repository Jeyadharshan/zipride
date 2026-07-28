import { geocodeLocation } from "@/map/services/geocoding";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Circle, MapPin, Crosshair, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { MapView } from "@/map/components/MapView";
import { Logo } from "@/shared/components/brand/Logo";
import { TRIP } from "@/shared/constants/zip-data";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";



export function MapPage() {
  const navigate = useNavigate();
  
  const [fromLoc, setFromLoc] = useState(localStorage.getItem("booking_pickup") || TRIP.from);
  const [toLoc, setToLoc] = useState(localStorage.getItem("booking_dropoff") || TRIP.to);
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState(4.2);
  const [duration, setDuration] = useState(18);
  const [fare, setFare] = useState(Number(localStorage.getItem("booking_fare") || TRIP.fare));
  
  const [pricingSettings, setPricingSettings] = useState({ baseFare: 40, perKmRate: 12, maintenanceMode: false });

  useEffect(() => {
    async function loadPricing() {
      try {
        const { data } = await (supabase as any).from("platform_settings").select("*");
        if (data && data.length > 0) {
          const settingsMap = data.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
          }, {});
          setPricingSettings({
            baseFare: parseFloat(settingsMap.base_fare || "40"),
            perKmRate: parseFloat(settingsMap.per_km_rate || "12"),
            maintenanceMode: settingsMap.maintenance_mode === "true",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadPricing();
  }, []);

  // Geocode pickup and dropoff on mount
  useEffect(() => {
    async function geocodeLocations() {
      try {
        const pickup = await geocodeLocation(fromLoc);
        if (pickup) {
          setPickupCoords(pickup);
        }
        const dropoff = await geocodeLocation(toLoc);
        if (dropoff) {
          setDropoffCoords(dropoff);
        }
      } catch (err) {
        console.error("Geocoding search locations error:", err);
      }
    }
    geocodeLocations();
  }, [fromLoc, toLoc]);

  const handleConfirm = () => {
    if (pricingSettings.maintenanceMode) {
      alert("Online booking is temporarily disabled for maintenance. Please try again later.");
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

    localStorage.setItem("booking_pickup", fromLoc);
    localStorage.setItem("booking_dropoff", toLoc);
    localStorage.setItem("booking_fare", fare.toString());
    localStorage.setItem("booking_distance", distance.toString());
    localStorage.setItem("booking_duration", duration.toString());
    if (pickupCoords) {
      localStorage.setItem("booking_pickup_lat", pickupCoords[0].toString());
      localStorage.setItem("booking_pickup_lon", pickupCoords[1].toString());
    }
    if (dropoffCoords) {
      localStorage.setItem("booking_dropoff_lat", dropoffCoords[0].toString());
      localStorage.setItem("booking_dropoff_lon", dropoffCoords[1].toString());
    }
    navigate({ to: "/ride-type" });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <MapView
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
        onRouteCalculated={(dist, dur) => {
          setDistance(dist);
          setDuration(dur);
          const computedFare = Math.floor(pricingSettings.baseFare + dist * pricingSettings.perKmRate);
          setFare(computedFare);
        }}
        onDropoffSelected={(address, lat, lon) => {
          setDropoffCoords([lat, lon]);
          setToLoc(address);
          localStorage.setItem("booking_dropoff", address);
        }}
        onUserLocationDetected={(address, lat, lon) => {
          if (!pickupCoords) {
            setPickupCoords([lat, lon]);
            setFromLoc(address);
            localStorage.setItem("booking_pickup", address);
          }
        }}
        className="absolute inset-0 h-full w-full"
      />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4">
        <Link
          to="/search"
          className="grid h-11 w-11 place-items-center rounded-full glass text-foreground shadow-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="glass rounded-full px-4 py-2 shadow-soft">
          <Logo to="/dashboard" size="sm" />
        </div>
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                setPickupCoords(coords);
              });
            }
          }}
          className="grid h-11 w-11 place-items-center rounded-full glass text-primary shadow-soft"
        >
          <Crosshair className="h-5 w-5" />
        </button>
      </div>

      {/* bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-border bg-card p-6 shadow-elevated">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        <p className="text-xs font-bold uppercase text-muted-foreground">Confirm your trip</p>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <Circle className="h-3 w-3 fill-success text-success" />
            <p className="font-semibold">{fromLoc}</p>
          </div>
          <div className="ml-1.5 h-4 w-px bg-border" />
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-destructive" />
            <p className="font-semibold">{toLoc}</p>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {distance > 0 && (
            <motion.div
              key={`${distance}-${fare}`}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mt-4 flex justify-between items-center rounded-2xl bg-secondary p-4 text-xs font-semibold text-muted-foreground border border-border/40 shadow-soft"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-0.5 font-bold">Distance</span>
                <span className="text-sm font-extrabold text-foreground">{distance} km</span>
              </div>
              <div className="flex flex-col items-center px-4 border-x border-border/60">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-0.5 font-bold">Duration</span>
                <span className="text-sm font-extrabold text-foreground">{duration} mins</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-0.5 font-bold">Est. Fare</span>
                <span className="text-sm font-extrabold text-primary">₹{fare}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pricingSettings.maintenanceMode ? (
          <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5 text-center text-xs font-semibold text-destructive">
            ⚠️ Online booking is temporarily paused for maintenance.
          </div>
        ) : null}

        <button
          onClick={handleConfirm}
          disabled={pricingSettings.maintenanceMode}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pricingSettings.maintenanceMode ? "Under Maintenance" : "Confirm Location"} <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
