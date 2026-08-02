import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Circle, MapPin, X, Check } from "lucide-react";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { PageHeader, Pill, Avatar } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";



export function Requests() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [rejectCount, setRejectCount] = useState(0);

  const loadRequests = async () => {
    const isOnline = localStorage.getItem("driver_online_status") === "true";
    if (!isOnline) {
      setRequests([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("rides")
        .select(`
          id,
          pickup_address,
          dropoff_address,
          fare,
          distance,
          payment_method,
          ride_type,
          created_at,
          rider:profiles!rides_rider_id_fkey(full_name, phone, avatar_url)
        `)
        .eq("status", "searching")
        .order("created_at", { ascending: false });

      if (data) {
        setRequests(
          data.map((r: any) => ({
            id: r.id,
            rider: r.rider?.full_name || "Anonymous Passenger",
            avatar: r.rider?.avatar_url || "",
            phone: r.rider?.phone || "",
            rating: 4.8,
            completedTrips: 12,
            fare: r.fare,
            from: r.pickup_address,
            to: r.dropoff_address,
            km: `${r.distance || 0} km`,
            pickupAway: "1.2 km",
            eta: "4 min",
            pay: r.payment_method || "UPI",
            rideType: r.ride_type || "Sedan",
            pickupTime: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Immediate",
            coupon: "None",
            notes: "Please call on arrival",
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load requests:", e);
    }
  };

  useEffect(() => {
    loadRequests();
    
    // Poll for new requests every 3 seconds
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (rideId: string) => {
    if (!profile?.id) {
      alert("Driver session not found. Please log in.");
      return;
    }

    try {
      // 1. Assign driver and update status to accepted
      const { error } = await supabase
        .from("rides")
        .update({
          driver_id: profile.id,
          status: "accepted" as any
        })
        .eq("id", rideId);

      if (error) throw new Error(error.message);

      // Save active ride ID locally
      localStorage.setItem("driver_active_ride_id", rideId);
      alert("Ride accepted successfully! Heading to pickup.");
      navigate({ to: "/driver/arrived", replace: true });
    } catch (err: any) {
      alert("Failed to accept ride: " + err.message);
    }
  };

  const handleReject = async (rideId: string) => {
    if (rejectCount >= 2) {
      alert("Maximum 2 rejections allowed. Please accept a ride.");
      return;
    }

    try {
      // Update status to cancelled in database
      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" as any })
        .eq("id", rideId);

      if (error) throw new Error(error.message);

      setRejectCount(prev => prev + 1);
      alert(`Request rejected (${rejectCount + 1}/2).`);
      loadRequests();
    } catch (err: any) {
      alert("Failed to reject ride: " + err.message);
    }
  };

  return (
    <DriverShell>
      <PageHeader
        title="Ride Requests"
        subtitle={`Incoming trips near you · Rejections: ${rejectCount}/2`}
      />
      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.06}>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar label={r.rider[0]} src={r.avatar} className="h-12 w-12" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-foreground">{r.rider}</p>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                          ★ {r.rating}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.phone || "No phone"}</p>
                      <p className="text-[10px] text-primary/80 font-bold mt-0.5">{r.completedTrips} trips completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">₹{r.fare}</p>
                    <span className="inline-block text-[10px] font-bold text-success-foreground bg-success/20 px-2 py-0.5 rounded-full">{r.rideType}</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-secondary/50 rounded-xl p-3 border border-border/40">
                  <div>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Pickup Time</p>
                    <p className="font-semibold text-foreground">{r.pickupTime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Payment Method</p>
                    <p className="font-semibold text-foreground">{r.pay}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Driver Distance / ETA</p>
                    <p className="font-semibold text-foreground">{r.pickupAway} ({r.eta})</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Coupon Applied</p>
                    <p className="font-semibold text-foreground text-destructive">{r.coupon}</p>
                  </div>
                  <div className="col-span-2 border-t border-border/30 pt-2 mt-1">
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Notes to Driver</p>
                    <p className="font-semibold text-foreground text-primary italic">"{r.notes}"</p>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-3 text-sm border-t border-border/30 pt-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <Circle className="h-2.5 w-2.5 fill-success text-success" />
                    <span className="h-5 w-px bg-border" />
                    <MapPin className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="space-y-3">
                    <p className="font-semibold">{r.from}</p>
                    <p className="font-semibold">{r.to}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill>{r.km}</Pill>
                  <Pill>{r.pickupAway} pickup</Pill>
                  <Pill>{r.pay}</Pill>
                </div>
                <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                  <button
                    onClick={() => handleReject(r.id)}
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleAccept(r.id)}
                    className="flex items-center justify-center gap-2 rounded-2xl gradient-brand font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform"
                  >
                    <Check className="h-5 w-5" /> Accept Ride
                  </button>
                </div>
              </div>
            </Reveal>
          ))
        ) : (
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-soft">
              <p className="font-semibold">No active ride requests near you.</p>
              <p className="text-sm">New requests will appear here automatically.</p>
            </div>
          </Reveal>
        )}
      </div>
    </DriverShell>
  );
}
