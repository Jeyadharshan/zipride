import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  MapPin,
  Circle,
  Zap,
  ShieldCheck,
  Wallet,
  Clock,
  ArrowRight,
} from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { Reveal } from "@/shared/components/kit/Reveal";
import { TRIP } from "@/shared/constants/zip-data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";
import { MapView } from "@/map/components/MapView";
import { LocationInput } from "@/rider/components/LocationInput";



const FEATURES = [
  { icon: Zap, title: "Quick Booking", body: "Book in just a few clicks" },
  { icon: MapPin, title: "Live Tracking", body: "Track your driver in real-time" },
  { icon: ShieldCheck, title: "Trusted Drivers", body: "Verified & experienced" },
  { icon: Wallet, title: "Secure Payments", body: "Multiple payment options" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const riderName = profile?.full_name ? profile.full_name.split(" ")[0] : "Rider";

  // Coordinates
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);

  // Input text
  const [pickupVal, setPickupVal] = useState("");
  const [dropoffVal, setDropoffVal] = useState("");

  // Distance & Estimations
  const [distanceVal, setDistanceVal] = useState(4.2);
  const [durationVal, setDurationVal] = useState(18);
  const [fareVal, setFareVal] = useState(TRIP.fare);

  // Pricing configuration
  const [pricingSettings, setPricingSettings] = useState({ baseFare: 40, perKmRate: 12, maintenanceMode: false });

  // Active ride state
  const [activeRide, setActiveRide] = useState<any>(null);

  // Check for any active/ongoing ride on mount
  useEffect(() => {
    if (!profile?.id) return;
    const riderId = profile.id;
    async function checkActiveRide() {
      try {
        const { data: activeRides } = await (supabase as any)
          .from("rides")
          .select("id, status, pickup_address, dropoff_address, fare, created_at, booking_time")
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
          setActiveRide(ride);
          localStorage.setItem("active_ride_id", ride.id);
        } else {
          setActiveRide(null);
          localStorage.removeItem("active_ride_id");
        }
      } catch (err) {
        console.error("Failed to check active rider ride:", err);
      }
    }
    checkActiveRide();
    const interval = setInterval(checkActiveRide, 3000);
    return () => clearInterval(interval);
  }, [profile?.id]);

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
        console.error("Failed to load platform settings:", err);
      }
    }
    loadPricing();
  }, []);

  const handleBookRide = () => {
    if (activeRide) {
      alert("You already have an active ride in progress! Please complete your current ride before booking a new one.");
      return;
    }
    if (pricingSettings.maintenanceMode) {
      alert("Online booking is temporarily disabled for maintenance. Please try again later.");
      return;
    }
    if (!pickupVal.trim() || !dropoffVal.trim()) {
      alert("Please specify both pickup and dropoff locations.");
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

    // Save active booking parameters
    localStorage.setItem("booking_pickup", pickupVal);
    localStorage.setItem("booking_dropoff", dropoffVal);
    localStorage.setItem("booking_fare", fareVal.toString());
    localStorage.setItem("booking_distance", distanceVal.toString());
    localStorage.setItem("booking_duration", durationVal.toString());

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
    <UserShell width="wide">
      <div className="flex flex-col gap-6">
        {/* Header Greeting */}
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" /> Fast · Safe · Affordable
          </span>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Hello {riderName}, <span className="text-gradient">where to today?</span>
          </h1>
        </Reveal>

        {/* Map & Booking Overlay Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Map view container */}
          <Reveal delay={0.06} className="h-[320px] overflow-hidden rounded-3xl border border-border shadow-soft lg:h-[480px]">
            <MapView
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              onUserLocationDetected={(address, lat, lon) => {
                if (!pickupCoords) {
                  setPickupVal(address);
                  setPickupCoords([lat, lon]);
                }
              }}
              onRouteCalculated={(dist, duration) => {
                setDistanceVal(dist);
                setDurationVal(duration);
                const computedFare = Math.floor(pricingSettings.baseFare + dist * pricingSettings.perKmRate);
                setFareVal(computedFare);
              }}
              className="h-full w-full"
            />
          </Reveal>

          {/* Booking inputs card */}
          <Reveal delay={0.12}>
            <div className="flex flex-col h-full rounded-3xl border border-border bg-card p-6 shadow-elevated justify-between">
              <div>
                <h2 className="text-lg font-extrabold">Book Your Ride</h2>
                <p className="text-xs text-muted-foreground mb-4">Set your route on the map to get started</p>
                
                {activeRide ? (
                  <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-500 mb-1">
                      <Zap className="h-4 w-4 animate-pulse" />
                      Active Ride In Progress
                    </div>
                    <p className="text-foreground/90 font-medium mb-3">
                      You currently have an active ride running. Please complete your current ride before booking a new one.
                    </p>
                    <button
                      onClick={() => {
                        const s = (activeRide.status || "").toLowerCase();
                        if (s === "searching" || s === "pending") navigate({ to: "/searching" });
                        else if (s === "driver assigned" || s === "assigned" || s === "driver accepted" || s === "accepted") navigate({ to: "/driver-assigned" });
                        else navigate({ to: "/tracking" });
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 px-3 text-xs font-bold text-primary-foreground shadow-soft hover:scale-[1.01] transition-transform"
                    >
                      Track Active Ride Map <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : pricingSettings.maintenanceMode ? (
                  <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-semibold text-destructive">
                    ⚠️ ZipRide is currently under maintenance. Online booking is temporarily paused.
                  </div>
                ) : null}
                
                <div className="space-y-3 opacity-100 disabled:opacity-50">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1.5">
                      Pickup location
                    </label>
                    <LocationInput
                      value={pickupVal}
                      onChange={setPickupVal}
                      placeholder="Enter pickup location"
                      onSelect={(address, lat, lon) => {
                        if (activeRide) return;
                        setPickupVal(address);
                        setPickupCoords([lat, lon]);
                      }}
                      icon={<Circle className="h-4 w-4 shrink-0 fill-success text-success" />}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1.5">
                      Drop location
                    </label>
                    <LocationInput
                      value={dropoffVal}
                      onChange={setDropoffVal}
                      placeholder="Enter drop location"
                      onSelect={(address, lat, lon) => {
                        if (activeRide) return;
                        setDropoffVal(address);
                        setDropoffCoords([lat, lon]);
                      }}
                      icon={<MapPin className="h-4 w-4 shrink-0 text-destructive" />}
                    />
                  </div>
                </div>

                {/* Estimates info overlay */}
                {pickupCoords && dropoffCoords && !activeRide && (
                  <div className="mt-5 flex items-center justify-around rounded-2xl bg-secondary px-4 py-3.5 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Est. Time</p>
                      <p className="font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" /> {durationVal} mins</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Distance</p>
                      <p className="font-bold">{distanceVal} km</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleBookRide}
                disabled={Boolean(activeRide) || pricingSettings.maintenanceMode}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeRide ? "Ride in Progress" : pricingSettings.maintenanceMode ? "Under Maintenance" : "Book Ride"} <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </Reveal>
        </div>

        {/* features list */}
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-brand-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </UserShell>
  );
}
