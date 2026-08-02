import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Circle,
  MapPin,
  Clock,
  Star,
  Home,
  Briefcase,
  Search as SearchIcon,
} from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { Reveal } from "@/shared/components/kit/Reveal";
import { TRIP } from "@/shared/constants/zip-data";
import { supabase } from "@/lib/supabase";



const SAVED = [
  { icon: Home, label: "Home", sub: "12, Anna Nagar, Virudhunagar" },
  { icon: Briefcase, label: "Work", sub: "AAA College of Engineering, Sivakasi" },
];
const RECENT = [
  "Virudhunagar Bus Stand",
  "Sivakasi Bus Stand",
  "Rajapalayam Main Road",
  "Virudhunagar Railway Station",
];

export function SearchPage() {
  const navigate = useNavigate();
  const [fromLoc, setFromLoc] = useState(localStorage.getItem("booking_pickup") || TRIP.from);
  const [toLoc, setToLoc] = useState(localStorage.getItem("booking_dropoff") || TRIP.to);
  const [pricingSettings, setPricingSettings] = useState({ baseFare: 40, perKmRate: 12, maintenanceMode: false });

  useEffect(() => {
    async function loadSettings() {
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
    loadSettings();
  }, []);

  const handleSearchClick = () => {
    if (pricingSettings.maintenanceMode) {
      alert("Online booking is temporarily disabled for maintenance. Please try again later.");
      return;
    }
    if (!fromLoc.trim() || !toLoc.trim()) {
      alert("Please enter both pickup and dropoff locations.");
      return;
    }
    
    // Simulate pricing based on location length and settings
    const basePrice = pricingSettings.baseFare;
    const distanceSim = Math.max(2.1, parseFloat(((fromLoc.length + toLoc.length) * 0.15).toFixed(1)));
    const calculatedFare = Math.floor(basePrice + distanceSim * pricingSettings.perKmRate);
    
    localStorage.setItem("booking_pickup", fromLoc.trim());
    localStorage.setItem("booking_dropoff", toLoc.trim());
    localStorage.setItem("booking_fare", calculatedFare.toString());
    localStorage.setItem("booking_distance", distanceSim.toString());
    
    console.log("[Search Page] Storing booking details:", {
      pickup: fromLoc.trim(),
      dropoff: toLoc.trim(),
      fare: calculatedFare,
      distance: distanceSim
    });

    navigate({ to: "/map" });
  };

  const handleSavedSelect = (label: string, address: string) => {
    if (pricingSettings.maintenanceMode) {
      alert("Online booking is temporarily disabled for maintenance. Please try again later.");
      return;
    }
    setFromLoc(TRIP.from);
    setToLoc(address);
    localStorage.setItem("booking_pickup", TRIP.from);
    localStorage.setItem("booking_dropoff", address);
    
    const distanceSim = 4.8;
    const calculatedFare = Math.floor(pricingSettings.baseFare + distanceSim * pricingSettings.perKmRate);
    localStorage.setItem("booking_fare", calculatedFare.toString());
    localStorage.setItem("booking_distance", distanceSim.toString());

    navigate({ to: "/map" });
  };

  return (
    <UserShell width="narrow">
      <Link
        to="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Reveal>
        <h1 className="text-2xl font-extrabold">Where to?</h1>
        {pricingSettings.maintenanceMode ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-semibold text-destructive">
            ⚠️ ZipRide is currently under maintenance. Online booking is temporarily paused.
          </div>
        ) : null}
        <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <Circle className="h-3 w-3 fill-success text-success" />
            <input
              value={fromLoc}
              onChange={(e) => setFromLoc(e.target.value)}
              placeholder="Enter pickup location"
              className="w-full bg-transparent font-semibold outline-none"
            />
          </div>
          <div className="flex items-center gap-3 pt-3">
            <MapPin className="h-4 w-4 text-destructive" />
            <input
              autoFocus
              value={toLoc}
              onChange={(e) => setToLoc(e.target.value)}
              placeholder="Enter drop location"
              className="w-full bg-transparent font-semibold outline-none"
            />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mb-2 mt-7 text-xs font-bold uppercase text-muted-foreground">Saved places</p>
        <div className="space-y-2">
          {SAVED.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSavedSelect(s.label, s.sub)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-brand-soft text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{s.label}</p>
                <p className="truncate text-sm text-muted-foreground">{s.sub}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-7 text-xs font-bold uppercase text-muted-foreground">
          Recent searches
        </p>
        <div className="space-y-1">
          {RECENT.map((r) => (
            <button
              key={r}
              onClick={() => {
                if (pricingSettings.maintenanceMode) {
                  alert("Online booking is temporarily disabled for maintenance. Please try again later.");
                  return;
                }
                setToLoc(r);
                localStorage.setItem("booking_dropoff", r);
                const distanceSim = Math.max(2.1, parseFloat(((fromLoc.length + r.length) * 0.15).toFixed(1)));
                const calculatedFare = Math.floor(pricingSettings.baseFare + distanceSim * pricingSettings.perKmRate);
                localStorage.setItem("booking_pickup", fromLoc);
                localStorage.setItem("booking_fare", calculatedFare.toString());
                localStorage.setItem("booking_distance", distanceSim.toString());
                navigate({ to: "/map" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{r}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <button
        onClick={handleSearchClick}
        disabled={pricingSettings.maintenanceMode}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SearchIcon className="h-5 w-5" /> Set on map
      </button>
    </UserShell>
  );
}
