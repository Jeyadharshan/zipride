import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Banknote,
  Smartphone,
  Wallet,
  CreditCard,
  Check,
  ShieldCheck,
} from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { Reveal } from "@/shared/components/kit/Reveal";
import { TRIP } from "@/shared/constants/zip-data";
import { cn } from "@/shared/utils/cn";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const METHODS = [
  { id: "cash", label: "Cash", sub: "Pay driver directly", icon: Banknote },
  { id: "upi", label: "UPI", sub: "arun@upi", icon: Smartphone },
  { id: "wallet", label: "ZipWallet", sub: "₹1,250 balance", icon: Wallet },
  { id: "card", label: "Credit / Debit Card", sub: "•••• 4242", icon: CreditCard },
];

export function Payment() {
  const [method, setMethod] = useState("card");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [rideId] = useState(localStorage.getItem("payment_ride_id") || localStorage.getItem("active_ride_id") || "");
  const [fare, setFare] = useState(Number(localStorage.getItem("payment_amount") || TRIP.fare));
  const [rideDetails, setRideDetails] = useState<any>(null);

  useEffect(() => {
    async function fetchRide() {
      if (!rideId) return;
      try {
        const { data } = await supabase
          .from("rides")
          .select(`
            id,
            pickup_address,
            dropoff_address,
            fare,
            payment_method,
            driver_id,
            driver:profiles!rides_driver_id_fkey(full_name, phone)
          `)
          .eq("id", rideId)
          .maybeSingle();

        if (data) {
          setRideDetails(data);
          setFare(data.fare || TRIP.fare);
        }
      } catch (err) {
        console.error("Failed to load payment ride details:", err);
      }
    }
    fetchRide();
  }, [rideId]);

  const pay = async () => {
    if (method === "cash") {
      setPaid(true);
      setTimeout(() => navigate({ to: "/rating", replace: true }), 1400);
      return;
    }

    setLoading(true);
    try {
      const activeRideId = rideId || "e95df18e-4a6c-486d-9be2-44161f30206a";
      const actualFare = fare;

      // Load Razorpay Script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay SDK. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // Create Order on Backend
      const jwtToken = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || "";
      const orderRes = await apiFetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          rideId: activeRideId,
          amount: actualFare,
          paymentMethod: "razorpay"
        })
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        throw new Error(orderJson.message || "Failed to initiate payment.");
      }

      const razorpayOrderId = orderJson.razorpay_order_id || orderJson.data?.razorpay_order_id;
      const razorpayKeyId = orderJson.key_id || orderJson.data?.key_id || "rzp_live_THQ2isXoSiOoDg";

      if (!razorpayOrderId) {
        throw new Error("Razorpay Order ID was not returned by server.");
      }

      // Open Razorpay Modal
      const options = {
        key: razorpayKeyId,
        amount: Math.round(actualFare * 100),
        currency: "INR",
        name: "ZipRide Payment",
        description: `Payment for Ride ZR-${activeRideId.slice(0, 8)}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          setLoading(true);
          try {
            const verifyRes = await apiFetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || razorpayOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                rideId: activeRideId
              })
            });

            const verifyJson = await verifyRes.json();
            if (verifyJson.success && verifyJson.verified) {
              setPaid(true);
              localStorage.removeItem("active_ride_id");
              localStorage.removeItem("payment_ride_id");
              localStorage.removeItem("payment_amount");
              setTimeout(() => navigate({ to: "/rating", replace: true }), 1500);
            } else {
              alert("Payment verification failed: " + (verifyJson.message || "Invalid signature"));
            }
          } catch (err: any) {
            alert("Verification error: " + err.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        },
        prefill: {
          name: sessionStorage.getItem("user_name") || "Rider",
          email: sessionStorage.getItem("user_email") || "rider@zipride.com",
        },
        theme: {
          color: "#22c55e"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("Payment initiation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserShell width="narrow">
      <Link
        to="/completed"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Reveal>
        <h1 className="text-2xl font-extrabold">Payment</h1>
        <div className="mt-4 rounded-3xl gradient-hero p-6 text-white shadow-elevated">
          <p className="text-sm text-white/80">Amount to pay</p>
          <p className="text-4xl font-extrabold">₹{fare}.00</p>
          {rideDetails ? (
            <p className="mt-2.5 text-xs text-white/80 font-medium leading-relaxed">
              <span className="font-bold">Trip:</span> {rideDetails.pickup_address?.split(",")[0]} → {rideDetails.dropoff_address?.split(",")[0]}
              {rideDetails.driver?.full_name && (
                <>
                  <br />
                  <span className="font-bold">Driver:</span> {rideDetails.driver.full_name}
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/80">{TRIP.from} → AAA College</p>
          )}
        </div>
      </Reveal>

      {rideDetails?.driver && (
        <Reveal delay={0.04}>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-secondary p-4 text-sm border border-border">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-bold text-foreground truncate">{rideDetails.driver.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{rideDetails.driver.phone || "Driver Contact"}</p>
            </div>
            <button
              onClick={() => {
                const phoneNum = rideDetails.driver.phone || "+91 98765 43210";
                const choice = confirm(`Driver Phone Number: ${phoneNum}\n\nClick OK to Call, or click Cancel to Copy the number.`);
                if (choice) {
                  window.open(`tel:${phoneNum}`, "_self");
                } else {
                  navigator.clipboard.writeText(phoneNum);
                  alert("Phone number copied to clipboard!");
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2 font-semibold text-xs transition-colors cursor-pointer"
            >
              Call Driver
            </button>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <p className="mb-2 mt-6 text-xs font-bold uppercase text-muted-foreground">
          Choose payment method
        </p>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors cursor-pointer",
                method === m.id ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
              {method === m.id && (
                <span className="ml-auto inline-grid h-5 w-5 place-items-center rounded-full gradient-brand text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      </Reveal>

      <button
        onClick={pay}
        disabled={loading}
        className="mt-6 w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 cursor-pointer hover:scale-[1.01] transition-transform"
      >
        {loading ? "Processing..." : `Pay ₹${fare}`}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> 100% secure payment
      </p>

      <AnimatePresence>
        {paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-3xl bg-card p-8 text-center shadow-elevated"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>
              <p className="mt-4 text-xl font-extrabold">Payment successful</p>
              <p className="text-muted-foreground">₹{fare} paid</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UserShell>
  );
}
