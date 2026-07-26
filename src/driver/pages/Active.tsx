import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, MessageSquare, Navigation, Circle, MapPin, Star } from "lucide-react";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { Avatar } from "@/shared/components/kit/Primitives";
import { MapCanvas } from "@/map/components/MapCanvas";
import { TRIP } from "@/shared/constants/zip-data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/hooks/useAuth";
import { cn } from "@/shared/utils/cn";
import { fetchRoute } from "@/map/services/routing";
import { getSocket } from "@/shared/lib/socket";
import { useSocket } from "@/shared/hooks/useSocket";
import { apiFetch } from "@/lib/api";



export function Active() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [passenger, setPassenger] = useState<any>({ name: "Arun Kumar", initial: "A", rating: 4.9, phone: "", avatar: "" });
  const [rideDetails, setRideDetails] = useState<any>({
    pickup: "Anna Nagar, Virudhunagar",
    dropoff: "Sivakasi Bus Stand",
    fare: 198,
    paymentMethod: "Cash"
  });
  const [rawRide, setRawRide] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [riderRating, setRiderRating] = useState(5);
  const [riderComment, setRiderComment] = useState("");
  const [cashCollected, setCashCollected] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0.1);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Payment Status states & socket handler
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid' | 'Failed'>('Pending');
  const [paymentMethodState, setPaymentMethodState] = useState<string>('Wallet');
  const [paidAt, setPaidAt] = useState<string>('');
  const [collectingCash, setCollectingCash] = useState<boolean>(false);

  useSocket({
    "payment-success": (data: any) => {
      setPaymentStatus("Paid");
      if (data?.paymentMethod) setPaymentMethodState(data.paymentMethod);
      if (data?.paidAt) setPaidAt(new Date(data.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      else setPaidAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    },
    "payment-pending": (data: any) => {
      setPaymentStatus("Pending");
      if (data?.paymentMethod) setPaymentMethodState(data.paymentMethod);
    },
    "payment-failed": (data: any) => {
      setPaymentStatus("Failed");
    }
  });

  const handleCollectCash = async () => {
    const rideId = localStorage.getItem("driver_active_ride_id") || rawRide?.id;
    if (!rideId) return;
    setCollectingCash(true);
    try {
      const res = await apiFetch("/api/v1/payments/collect-cash", {
        method: "POST",
        body: JSON.stringify({ rideId })
      });
      const data = await res.json();
      if (data && data.success) {
        setPaymentStatus("Paid");
        setPaidAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        alert("✅ Cash payment collected and verified!");
      }
    } catch (e: any) {
      alert("Cash collection error: " + e.message);
    } finally {
      setCollectingCash(false);
    }
  };

  // Chat states & handlers
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const rideId = localStorage.getItem("driver_active_ride_id");
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

  // Live Driver GPS Location Tracking Emitter (every 3 seconds)
  useEffect(() => {
    const rideId = localStorage.getItem("driver_active_ride_id") || rawRide?.id;
    const socket = getSocket();

    if (rideId) {
      socket.emit("ride:join", { rideId });
    }

    const gpsInterval = setInterval(() => {
      if (navigator.geolocation && profile?.id) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, heading, speed } = pos.coords;
            socket.emit("driver:location_update", {
              driverId: profile.id,
              latitude,
              longitude,
              heading: heading || 0,
              speed: speed || 0,
              rideId: rideId || null
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 4000 }
        );
      }
    }, 3000);

    return () => {
      clearInterval(gpsInterval);
    };
  }, [profile, rawRide]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !rawRide?.id) return;
    const rideId = rawRide.id;
    const senderId = profile?.id;

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

  useEffect(() => {
    async function loadActiveRidePassenger() {
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
          console.error("Failed to recover driver active ride in Active:", e);
        }
      }

      if (!rideId) return;

      try {
        const { data: ride } = await supabase
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
            payment_status,
            rider_id,
            driver_id,
            rider:profiles!rides_rider_id_fkey(full_name, phone, profile_image)
          `)
          .eq("id", rideId)
          .maybeSingle();

        if (ride) {
          setRawRide(ride);
          if (ride.payment_status === 'Paid' || ride.payment_status === 'Success' || ride.payment_status === 'Completed') {
            setPaymentStatus('Paid');
          } else if (ride.payment_status === 'Failed') {
            setPaymentStatus('Failed');
          } else {
            setPaymentStatus('Pending');
          }
          const name = ride.rider?.full_name || "Rider";
          setPassenger({
            name,
            initial: name[0],
            rating: 4.9,
            phone: ride.rider?.phone || "",
            avatar: ride.rider?.profile_image || ""
          });
          setRideDetails({
            pickup: ride.pickup_address,
            dropoff: ride.dropoff_address,
            pickupLat: ride.pickup_latitude,
            pickupLng: ride.pickup_longitude,
            dropoffLat: ride.dropoff_latitude,
            dropoffLng: ride.dropoff_longitude,
            fare: ride.fare,
            paymentMethod: ride.payment_method
          });
        }
      } catch (err) {
        console.error("Error loading active passenger:", err);
      }
    }
    loadActiveRidePassenger();
  }, []);

  // Fetch actual route coordinates using Geoapify Routing Service
  useEffect(() => {
    if (!rawRide) return;
    const startCoords: [number, number] = [
      Number(rawRide.pickup_latitude),
      Number(rawRide.pickup_longitude)
    ];
    const destCoords: [number, number] = [
      Number(rawRide.dropoff_latitude),
      Number(rawRide.dropoff_longitude)
    ];
    fetchRoute(startCoords, destCoords)
      .then((res) => {
        setRouteCoords(res.coordinates);
      })
      .catch((err) => {
        console.error("Failed to prefetch route in Active page:", err);
      });
  }, [rawRide]);

  // Simulate active ride coordinates movement & Map progress updating
  useEffect(() => {
    const rideId = localStorage.getItem("driver_active_ride_id");
    if (!rideId || !profile?.id || !rawRide) return;

    let step = 0;
    const hasRoute = routeCoords.length > 0;
    const totalSteps = hasRoute ? routeCoords.length : 20;

    const startLat = Number(rawRide.pickup_latitude) || 9.45;
    const startLng = Number(rawRide.pickup_longitude) || 77.96;
    const destLat = Number(rawRide.dropoff_latitude) || 9.50;
    const destLng = Number(rawRide.dropoff_longitude) || 77.90;

    const interval = setInterval(async () => {
      if (step >= totalSteps) {
        clearInterval(interval);
        return;
      }

      const progressPct = step / (totalSteps - 1 || 1);
      setProgress(progressPct);

      let currentLat = 0;
      let currentLng = 0;

      if (hasRoute) {
        const currentCoords = routeCoords[step];
        currentLat = currentCoords[0];
        currentLng = currentCoords[1];
      } else {
        currentLat = startLat + (destLat - startLat) * progressPct;
        currentLng = startLng + (destLng - startLng) * progressPct;
      }

      try {
        await supabase
          .from("driver_profiles")
          .update({
            current_latitude: currentLat,
            current_longitude: currentLng
          })
          .eq("id", profile.id);
      } catch (err) {
        console.error("Failed to update driver tracking coordinates:", err);
      }

      step++;
    }, 4000);

    return () => clearInterval(interval);
  }, [profile, rawRide, routeCoords]);

  const handleCompleteRide = () => {
    // Transition to rating passenger step
    setShowRating(true);
  };

  const submitRatingAndComplete = async () => {
    const rideId = localStorage.getItem("driver_active_ride_id");
    if (!rideId || !rawRide) return;

    setUpdating(true);
    try {
      // 1. Submit rating for the rider
      if (rawRide.rider_id && profile?.id) {
        const { error: reviewErr } = await supabase
          .from("driver_reviews")
          .insert({
            driver_id: profile.id,
            rider_id: rawRide.rider_id,
            rating: riderRating,
            comment: riderComment || "Great rider!"
          });
        if (reviewErr) {
          console.error("Failed to submit driver review for rider:", reviewErr);
        }
      }

      // 2. Complete ride status
      const { error } = await supabase
        .from("rides")
        .update({ status: "completed" as any })
        .eq("id", rideId);

      if (error) throw new Error(error.message);

      // Perform wallet transactions if payment method is "wallet"
      if (rawRide && rawRide.payment_method === "wallet") {
        const fareAmount = Number(rawRide.fare);

        // Deduct from Rider's wallet
        if (rawRide.rider_id) {
          const { error: riderTxErr } = await supabase
            .from("wallet_transactions")
            .insert({
              wallet_id: rawRide.rider_id,
              amount: -fareAmount,
              type: "ride_payment",
              description: `Payment for ride to ${rawRide.dropoff_address || "destination"}`
            });
          if (riderTxErr) {
            console.error("Failed to record rider wallet payment:", riderTxErr);
          }
        }

        // Credit to Driver's wallet
        if (rawRide.driver_id) {
          const { error: driverTxErr } = await supabase
            .from("wallet_transactions")
            .insert({
              wallet_id: rawRide.driver_id,
              amount: fareAmount,
              type: "ride_earnings",
              description: `Earnings from ride from ${rawRide.pickup_address || "pickup"}`
            });
          if (driverTxErr) {
            console.error("Failed to record driver wallet earnings:", driverTxErr);
          }
        }
      }

      localStorage.removeItem("driver_active_ride_id");
      alert("Ride marked as completed and passenger rated!");
      navigate({ to: "/driver/dashboard", replace: true });
    } catch (err: any) {
      alert("Failed to complete ride: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (!localStorage.getItem("driver_active_ride_id")) {
    return (
      <DriverShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="rounded-3xl border border-border bg-card p-8 max-w-md shadow-elevated">
            <h2 className="text-xl font-bold text-foreground">No Active Ride</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have not started any ride yet. Please accept a ride request from the dashboard first.
            </p>
            <button
              onClick={() => navigate({ to: "/driver/dashboard", replace: true })}
              className="mt-6 inline-flex items-center justify-center rounded-2xl gradient-brand px-6 py-3 font-bold text-primary-foreground shadow-glow cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </DriverShell>
    );
  }

  return (
    <DriverShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="relative h-[300px] overflow-hidden rounded-3xl border border-border shadow-soft lg:h-[560px]">
          <MapCanvas
            className="absolute inset-0 h-full w-full"
            carProgress={progress}
            pickupCoords={rawRide ? [rawRide.pickup_latitude, rawRide.pickup_longitude] : null}
            dropoffCoords={rawRide ? [rawRide.dropoff_latitude, rawRide.dropoff_longitude] : null}
          />
          {!showPayment && (
            <div className="absolute left-4 top-4 rounded-2xl border border-border bg-card px-4 py-2 shadow-elevated">
              <p className="text-lg font-extrabold text-primary">8 min</p>
              <p className="text-xs text-muted-foreground">to destination</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {showRating ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-center space-y-4 animate-float">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate Passenger</p>
              
              <div className="py-2">
                <p className="text-lg font-extrabold text-foreground">{passenger.name}</p>
                <p className="text-xs text-muted-foreground">Please rate your experience with this rider</p>
              </div>

              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRiderRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        star <= riderRating ? "fill-warning text-warning text-warning" : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>

              <div className="text-left space-y-1.5 pt-2">
                <label htmlFor="rider-comment" className="text-xs font-bold text-muted-foreground block">
                  Optional Comment
                </label>
                <textarea
                  id="rider-comment"
                  value={riderComment}
                  onChange={(e) => setRiderComment(e.target.value)}
                  placeholder="Tell us about the passenger (e.g. polite, on time...)"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                />
              </div>

              <button
                onClick={submitRatingAndComplete}
                disabled={updating}
                className="w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50 cursor-pointer"
              >
                {updating ? "Completing..." : "Submit Rating & Complete Ride"}
              </button>
            </div>
          ) : showPayment ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-center space-y-4 animate-float">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Settlement</p>
              
              <div className="py-4">
                <p className="text-4xl font-extrabold text-foreground">₹{rideDetails.fare}</p>
                <p className="text-sm text-muted-foreground mt-1">Total ride amount</p>
              </div>

              <div className="rounded-xl bg-secondary p-4 space-y-2 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <span className="font-bold text-primary">{rideDetails.paymentMethod.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-warning">Pending Driver Confirmation</span>
                </div>
              </div>

              {rideDetails.paymentMethod.toLowerCase() === 'cash' ? (
                <div className="p-3.5 border border-dashed border-primary rounded-2xl bg-primary/5 flex items-start gap-2.5 text-left text-xs">
                  <input 
                    type="checkbox" 
                    id="cash-collect"
                    checked={cashCollected} 
                    onChange={(e) => setCashCollected(e.target.checked)} 
                    className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
                  />
                  <label htmlFor="cash-collect" className="font-semibold text-primary select-none cursor-pointer">
                    I confirm that I have fully collected the cash payment of ₹{rideDetails.fare} from the passenger.
                  </label>
                </div>
              ) : (
                <div className="p-3 border border-dashed border-success rounded-xl bg-success/5 text-left text-xs text-success font-semibold">
                  ✓ Payment has been settled online via the passenger's wallet.
                </div>
              )}

              <button
                onClick={handleCompleteRide}
                disabled={updating || (rideDetails.paymentMethod.toLowerCase() === 'cash' && !cashCollected)}
                className="w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {updating ? "Completing..." : "Confirm Payment & Complete Ride"}
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="text-xs font-bold uppercase text-muted-foreground">Current passenger</p>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar label={passenger.initial} className="h-12 w-12" />
                  <div className="flex-1">
                    <p className="font-bold">{passenger.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {passenger.rating}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const phoneNum = passenger.phone || "+91 98765 43210";
                        const choice = confirm(`Passenger Phone Number: ${phoneNum}\n\nClick OK to Call, or click Cancel to Copy the number.`);
                        if (choice) {
                          window.open(`tel:${phoneNum}`, "_self");
                        } else {
                          navigator.clipboard.writeText(phoneNum);
                          alert("Phone number copied to clipboard!");
                        }
                      }}
                      className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary cursor-pointer hover:bg-secondary/80 transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setShowChat(true)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary cursor-pointer hover:bg-secondary/80 transition-colors"
                    >
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
              {/* Live Payment Status Card */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {paymentStatus === 'Paid'
                      ? "🟢 Rider Already Paid"
                      : (rideDetails.paymentMethod?.toLowerCase() === 'cash' ? "🟠 Cash Payment Pending" : "🟠 Waiting for Rider Payment")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 text-center bg-secondary/40 rounded-xl p-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Amount</p>
                    <p className="font-extrabold text-sm text-foreground">₹{rideDetails.fare}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Method</p>
                    <p className="font-bold text-xs text-foreground uppercase">{paymentMethodState || rideDetails.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Paid At</p>
                    <p className="font-bold text-xs text-foreground">{paidAt || "--"}</p>
                  </div>
                </div>

                {paymentStatus !== 'Paid' && (rideDetails.paymentMethod?.toLowerCase() === 'cash' || paymentMethodState.toLowerCase() === 'cash') && (
                  <button
                    onClick={handleCollectCash}
                    disabled={collectingCash}
                    className="w-full rounded-xl gradient-brand py-3 font-extrabold text-xs text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform cursor-pointer"
                  >
                    {collectingCash ? "Collecting..." : "💵 Cash Collected"}
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  if (typeof window !== "undefined" && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const originStr = `&origin=${pos.coords.latitude},${pos.coords.longitude}`;
                        window.open(`https://www.google.com/maps/dir/?api=1${originStr}&destination=${rideDetails.dropoffLat},${rideDetails.dropoffLng}&travelmode=driving`, "_blank");
                      },
                      (err) => {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${rideDetails.dropoffLat},${rideDetails.dropoffLng}&travelmode=driving`, "_blank");
                      }
                    );
                  } else {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${rideDetails.dropoffLat},${rideDetails.dropoffLng}&travelmode=driving`, "_blank");
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-bold hover:bg-secondary transition-colors cursor-pointer"
              >
                <Navigation className="h-5 w-5 text-primary" /> Navigate to Destination
              </button>
              <button
                onClick={() => {
                  if (paymentStatus === "Paid") {
                    setShowRating(true);
                  } else {
                    setShowPayment(true);
                  }
                }}
                className="w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow cursor-pointer"
              >
                {paymentStatus === "Paid" ? "Ride Completed (Rating Passenger) ✓" : "Arrived at Destination"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Drawer/Overlay */}
      {showChat && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:items-center">
          <div className="w-full max-w-md bg-card rounded-t-3xl border border-border lg:rounded-3xl p-5 shadow-elevated flex flex-col h-[75vh] lg:h-[600px] animate-float">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-extrabold text-lg">Chat with Passenger</h3>
                <p className="text-xs text-muted-foreground">{passenger.name} · Active Ride</p>
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
                  const isMe = msg.sender_id === profile?.id;
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
    </DriverShell>
  );
}
