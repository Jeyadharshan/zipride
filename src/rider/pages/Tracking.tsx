import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Phone,
  MessageSquare,
  Share2,
  Star,
  Car,
  ShieldCheck,
  Circle,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { MapCanvas } from "@/map/components/MapCanvas";
import { DRIVER, TRIP } from "@/shared/constants/zip-data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";
import { useSocket } from "@/shared/hooks/useSocket";
import { motion } from "motion/react";



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

export function Tracking() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0.2);
  const [started, setStarted] = useState(false);
  const [ride, setRide] = useState<any>(null);
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const arrived = ride?.status === "arriving";

  // Chat states & handlers
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const rideId = localStorage.getItem("active_ride_id");
    if (!rideId || !showChat) return;

    const fetchMessages = async () => {
      try {
        const { data } = await supabase
          .from("ride_chats")
          .select("*")
          .eq("ride_id", rideId)
          .order("id", { ascending: true });
        if (data) {
          setChatMessages(data);
        }
      } catch (err) {
        console.error("Failed to load chat messages:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [showChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ride?.id) return;
    const rideId = ride.id;
    const senderId = ride.rider_id;

    try {
      const msg = newMessage;
      setNewMessage("");
      const { error } = await supabase.from("ride_chats").insert({
        ride_id: rideId,
        sender_id: senderId,
        message: msg
      });
      if (error) throw error;

      const { data } = await supabase
        .from("ride_chats")
        .select("*")
        .eq("ride_id", rideId)
        .order("id", { ascending: true });
      if (data) setChatMessages(data);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const [liveDriverCoords, setLiveDriverCoords] = useState<[number, number] | null>(null);
  const [liveEta, setLiveEta] = useState<number | null>(null);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);

  // Live Socket.IO Tracking Listener
  useSocket({
    "driver:location_changed": (data: any) => {
      if (data?.latitude && data?.longitude) {
        setLiveDriverCoords([data.latitude, data.longitude]);
        if (data.eta !== undefined && data.eta !== null) setLiveEta(data.eta);
        if (data.remainingKm !== undefined && data.remainingKm !== null) setLiveDistanceKm(data.remainingKm);
      }
    },
    "ride:driver_arrived": () => {
      setRide((prev: any) => ({ ...prev, status: "arriving" }));
    },
    "ride-completed": () => {
      navigate({ to: "/completed", replace: true });
    }
  });

  const { profile } = useAuth();

  useEffect(() => {
    async function initTracking() {
      let rideId = localStorage.getItem("active_ride_id");

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
          console.error("Error recovering ride ID in Tracking:", e);
        }
      }

      if (!rideId) return;
    }
    initTracking();

    const rideId = localStorage.getItem("active_ride_id");

    const checkInterval = setInterval(async () => {
      const currentRideId = localStorage.getItem("active_ride_id") || rideId;
      if (!currentRideId) return;
      try {
        const { data: rideData } = await (supabase as any)
          .from("rides")
          .select(`
            id,
            status,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            dropoff_address,
            dropoff_latitude,
            dropoff_longitude,
            fare,
            payment_method,
            distance,
            otp,
            rider_id,
            driver_id,
            driver:profiles!rides_driver_id_fkey(full_name, phone)
          `)
          .eq("id", currentRideId)
          .maybeSingle();

        if (rideData) {
          setRide(rideData);
          const s = (rideData.status || "").toLowerCase();
          if (s === "in_progress" || s === "ride started") {
            setStarted(true);
          } else if (s === "completed" || s === "ride completed") {
            clearInterval(checkInterval);
            navigate({ to: "/completed", replace: true });
          } else if (s === "cancelled") {
            clearInterval(checkInterval);
            localStorage.removeItem("active_ride_id");
            alert("Ride was cancelled.");
            navigate({ to: "/dashboard", replace: true });
          }

          if (rideData.driver_id) {
            const { data: dProf } = await supabase
              .from("driver_profiles")
              .select("rating, profile_photo_url, current_latitude, current_longitude")
              .eq("id", rideData.driver_id)
              .maybeSingle();

            const { data: vehicle } = await supabase
              .from("vehicles")
              .select("make, model, color, license_plate")
              .eq("driver_id", rideData.driver_id)
              .eq("is_active", true)
              .maybeSingle();

            if (rideData.driver?.full_name) {
              localStorage.setItem("active_driver_name", rideData.driver.full_name);
            }

            if (dProf?.profile_photo_url) {
              localStorage.setItem("active_driver_avatar", dProf.profile_photo_url);
            }

            setDriverDetails({
              name: rideData.driver?.full_name || "Ramesh Kumar",
              rating: dProf?.rating || 4.8,
              car: vehicle ? `${vehicle.color || ""} ${vehicle.make} ${vehicle.model}` : "Swift Dzire White",
              plate: vehicle?.license_plate || "TN 72 AB 1234",
              phone: rideData.driver?.phone || "+91 98765 43210",
              currentLat: dProf?.current_latitude,
              currentLng: dProf?.current_longitude,
              avatar: dProf?.profile_photo_url || ""
            });

            if (dProf?.current_latitude && dProf?.current_longitude && rideData) {
              const startLat = Number(rideData.pickup_latitude);
              const destLat = Number(rideData.dropoff_latitude);
              let pct = 0.5;
              if (Math.abs(destLat - startLat) > 0.0001) {
                pct = (dProf.current_latitude - startLat) / (destLat - startLat);
              }
              const clampedPct = Math.max(0.01, Math.min(pct, 0.99));
              setProgress(clampedPct);
            }
          }
        }
      } catch (err) {
        console.error("Error checking ride updates:", err);
      }
    }, 3000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [navigate]);

  const displayName = driverDetails?.name || DRIVER.name;
  const displayRating = driverDetails?.rating || DRIVER.rating;
  const displayCar = driverDetails?.car || DRIVER.car;
  const displayPlate = driverDetails?.plate || DRIVER.plate;
  const displayPickup = ride?.pickup_address || TRIP.from;
  const displayDropoff = ride?.dropoff_address || TRIP.to;
  const displayDistance = ride?.distance ? `${ride.distance} km` : TRIP.km;
  const displayTime = ride?.distance ? formatDuration(Math.ceil(ride.distance * 4)) : TRIP.mins;
  const displayFare = ride?.fare ? `₹${ride.fare}` : `₹${TRIP.fare}`;
  const displayPay = (ride?.payment_method || TRIP.pay).toUpperCase();

  // Dynamic distinct pickup and dropoff times for Tracking page
  const now = new Date();
  const pickupTime = ride?.created_at ? new Date(ride.created_at) : new Date(now.getTime() - 5 * 60000);
  const pickupTimeStr = pickupTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const dist = ride?.distance || 4.2;
  const durationMins = Math.ceil(dist * 4);
  const dropoffTime = started 
    ? new Date(now.getTime() + 8 * 60000) 
    : new Date(pickupTime.getTime() + (3 + durationMins) * 60000);
  const dropoffTimeStr = dropoffTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Map occupies the full page */}
      <MapCanvas
        className="absolute inset-0 h-full w-full z-0"
        carProgress={progress}
        dashed={!started}
        mode={started ? "dropoff" : "pickup"}
        pickupCoords={!started && driverDetails?.currentLat && driverDetails?.currentLng
          ? [driverDetails.currentLat, driverDetails.currentLng]
          : (ride ? [ride.pickup_latitude, ride.pickup_longitude] : null)
        }
        dropoffCoords={!started
          ? (ride ? [ride.pickup_latitude, ride.pickup_longitude] : null)
          : (ride ? [ride.dropoff_latitude, ride.dropoff_longitude] : null)
        }
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

      {/* Floating Time and Distance Panel */}
      <div className="absolute right-4 top-4 z-20 flex gap-4 rounded-2xl border border-border bg-card px-5 py-3 shadow-elevated">
        <div>
          <p className="text-lg font-extrabold text-primary">
            <motion.span
              key={started ? "started" : arrived ? "arrived" : "arriving"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="inline-block text-primary"
            >
              {started ? "8 min" : arrived ? "Arrived" : "3 min"}
            </motion.span>
          </p>
          <p className="text-xs text-muted-foreground">
            {started ? "to destination" : arrived ? "at pickup" : "to pickup"}
          </p>
        </div>
        <div className="border-l border-border pl-4">
          <p className="text-lg font-extrabold">
            <motion.span
              key={displayDistance}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="inline-block font-extrabold text-foreground"
            >
              {displayDistance}
            </motion.span>
          </p>
          <p className="text-xs text-muted-foreground">total distance</p>
        </div>
      </div>

      {/* Floating sidebar / bottom sheet details panel */}
      <div className="absolute inset-x-4 bottom-4 lg:left-6 lg:bottom-6 lg:top-20 lg:right-auto lg:w-[400px] z-20 flex flex-col justify-end pointer-events-none">
        <div className="w-full max-h-[60vh] lg:max-h-[calc(100vh-120px)] overflow-y-auto pointer-events-auto rounded-3xl border border-border bg-card p-6 shadow-elevated scrollbar-none">
          <h1 className="text-2xl font-extrabold">
            {started ? "Ride in progress" : arrived ? "Driver has arrived!" : "Driver is on the way"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {started ? "You're on your way to the destination" : arrived ? "Give the OTP to the driver to start the ride" : "Heading to your pickup point"}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground animate-pulse">
            {started ? `${displayTime} to destination` : arrived ? "Driver is waiting" : "Arriving in 3 mins"}
          </span>

          <div className="mt-5 rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar label={displayName[0]} src={driverDetails?.avatar} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{displayName}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {displayRating} · {DRIVER.trips} trips
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> {displayCar} · {displayPlate}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const phoneNum = driverDetails?.phone || "+91 98765 43210";
                  const choice = confirm(`Driver Phone Number: ${phoneNum}\n\nClick OK to Call, or click Cancel to Copy the number.`);
                  if (choice) {
                    window.open(`tel:${phoneNum}`, "_self");
                  } else {
                    navigator.clipboard.writeText(phoneNum);
                    alert("Phone number copied to clipboard!");
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <Phone className="h-4 w-4" /> Call
              </button>

              <button
                onClick={() => setShowChat(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" /> Chat
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Ride tracking link copied to clipboard!");
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          {(!started || ride?.otp) && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-primary bg-primary/5 p-4 shadow-soft"
            >
              <div>
                <p className="text-xs font-bold text-primary">SHARE OTP WITH DRIVER</p>
                <p className="text-xs text-muted-foreground mt-0.5">Provide this 4-digit code to start the ride</p>
              </div>
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-xl font-extrabold tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl inline-block shadow-sm"
              >
                {ride?.otp || "4291"}
              </motion.span>
            </motion.div>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-sm font-medium text-primary">
            <ShieldCheck className="h-5 w-5 animate-pulse" /> Your ride is monitored for safety
          </div>

          <p className="mb-2 mt-5 text-xs font-bold uppercase text-muted-foreground">Trip details</p>
          <div className="flex items-start gap-3 text-sm">
            <div className="flex flex-col items-center gap-1.5 pt-1.5 animate-float">
              <Circle className="h-2.5 w-2.5 fill-success text-success" />
              <span className="h-10 w-px bg-border" />
              <MapPin className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="space-y-4 flex-1 min-w-0">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pickup Point</span>
                  <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-dashed border-primary/20">{pickupTimeStr}</span>
                </div>
                <p className="font-semibold text-foreground truncate mt-0.5">{displayPickup}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Dropoff Point</span>
                  <span className="text-xs font-bold text-destructive bg-destructive/5 px-2 py-0.5 rounded-md border border-dashed border-destructive/20">{dropoffTimeStr}</span>
                </div>
                <p className="font-semibold text-foreground truncate mt-0.5">{displayDropoff}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 rounded-2xl bg-secondary p-4 text-sm">
            <Row label="Distance" value={displayDistance} />
            <Row label="Time" value={`~${displayTime}`} />
            <Row label="Fare" value={displayFare} />
            <Row label="Payment" value={displayPay} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className={`rounded-2xl bg-destructive py-3.5 font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors ${started ? "col-span-2" : ""}`}>
              🆘 Emergency SOS
            </button>
            {!started && (
              <button
                onClick={async () => {
                  const rideId = localStorage.getItem("active_ride_id");
                  if (rideId) {
                    await (supabase as any)
                      .from("rides")
                      .update({ status: "cancelled" as any })
                      .eq("id", rideId);
                  }
                  localStorage.removeItem("active_ride_id");
                  alert("Ride cancelled successfully.");
                  navigate({ to: "/dashboard", replace: true });
                }}
                className="rounded-2xl gradient-brand py-3.5 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform"
              >
                Cancel Ride
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Drawer/Overlay */}
      {showChat && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:items-center">
          <div className="w-full max-w-md bg-card rounded-t-3xl border border-border lg:rounded-3xl p-5 shadow-elevated flex flex-col h-[75vh] lg:h-[600px] animate-float">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-extrabold text-lg">Chat with Driver</h3>
                <p className="text-xs text-muted-foreground">{displayName} · Active Ride</p>
              </div>
              <button 
                onClick={() => setShowChat(false)}
                className="rounded-full bg-secondary hover:bg-secondary/80 p-2 text-sm font-bold w-10 h-10 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-none">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm my-10">
                  No messages yet. Say hello to start the conversation!
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isMe = msg.sender_id === ride?.rider_id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-secondary text-foreground rounded-tl-none"
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-border">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button
                type="submit"
                className="rounded-xl gradient-brand px-5 py-2.5 font-bold text-primary-foreground text-sm shadow-glow cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
