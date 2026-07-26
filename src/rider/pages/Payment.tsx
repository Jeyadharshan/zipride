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
  const [method, setMethod] = useState<"wallet" | "razorpay">("wallet");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [insufficientModal, setInsufficientModal] = useState(false);
  const navigate = useNavigate();

  const [rideId] = useState(localStorage.getItem("payment_ride_id") || localStorage.getItem("active_ride_id") || "");
  const [fare, setFare] = useState(Number(localStorage.getItem("payment_amount") || TRIP.fare));
  const [rideDetails, setRideDetails] = useState<any>(null);

  const fetchWallet = async () => {
    try {
      const res = await apiFetch("/api/v1/wallet");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.data) {
          setWalletBalance(Number(data.data.available_balance ?? data.data.balance ?? 0));
        }
      }
    } catch (e) {}
  };

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
    fetchWallet();
  }, [rideId]);

  const handleAddMoneyInModal = async (topupAmount: number) => {
    try {
      const res = await apiFetch("/api/v1/wallet/add-money", {
        method: "POST",
        body: JSON.stringify({ amount: topupAmount })
      });
      const data = await res.json();
      if (!data || !data.razorpay_order_id) throw new Error("Could not create Razorpay order.");

      const { razorpay_order_id, amount: orderAmt, currency, key_id } = data;

      if (!(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((res) => (script.onload = res));
      }

      const options = {
        key: key_id || "rzp_live_THQ2isXoSiOoDg",
        amount: Math.round(orderAmt * 100),
        currency: currency || "INR",
        name: "ZipRide Wallet Topup",
        description: `Add ₹${orderAmt} to ZipRide Wallet`,
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          const verifyRes = await apiFetch("/api/v1/wallet/verify-payment", {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: orderAmt
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData && verifyData.success) {
            alert(`✅ ₹${orderAmt} added to Wallet!`);
            setInsufficientModal(false);
            fetchWallet();
          }
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      alert("Topup error: " + e.message);
    }
  };

  const pay = async () => {
    const activeRideId = rideId || "e95df18e-4a6c-486d-9be2-44161f30206a";
    const actualFare = fare;

    if (method === "wallet") {
      setLoading(true);
      try {
        const res = await apiFetch("/api/v1/wallet/pay", {
          method: "POST",
          body: JSON.stringify({
            rideId: activeRideId,
            amount: actualFare
          })
        });
        const resData = await res.json();

        if (resData && resData.success) {
          setPaid(true);
          setTimeout(() => navigate({ to: "/rating", replace: true }), 1400);
        } else if (resData?.error === "INSUFFICIENT_WALLET_BALANCE") {
          setInsufficientModal(true);
        } else {
          alert("Wallet payment failed: " + (res?.message || "Error"));
        }
      } catch (err: any) {
        alert("Wallet error: " + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Razorpay direct payment
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay SDK. Please check your internet connection.");
        setLoading(false);
        return;
      }

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
          color: "#0284c7"
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
          <p className="text-xs uppercase font-bold text-white/80">Amount to pay</p>
          <p className="text-4xl font-extrabold">₹{fare}.00</p>
          {rideDetails ? (
            <p className="mt-2.5 text-xs text-white/80 font-medium leading-relaxed">
              <span className="font-bold">Trip:</span> {rideDetails.pickup_address?.split(",")[0]} → {rideDetails.dropoff_address?.split(",")[0]}
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/80">{TRIP.from} → {TRIP.to}</p>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mb-2 mt-6 text-xs font-bold uppercase text-muted-foreground">
          Choose payment method
        </p>
        <div className="space-y-3">
          {/* Option 1: ZipRide Wallet */}
          <button
            onClick={() => setMethod("wallet")}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors cursor-pointer",
              method === "wallet" ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">ZipRide Wallet</p>
              <p className="text-xs text-muted-foreground">
                Available Balance: <span className="font-bold text-primary">₹{walletBalance ?? "0"}</span>
              </p>
            </div>
            {method === "wallet" && (
              <span className="inline-grid h-5 w-5 place-items-center rounded-full gradient-brand text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>

          {/* Option 2: Razorpay (UPI, Credit/Debit Card, Netbanking) */}
          <button
            onClick={() => setMethod("razorpay")}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors cursor-pointer",
              method === "razorpay" ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Razorpay Online</p>
              <p className="text-xs text-muted-foreground">UPI, Cards, Netbanking, GPay, PhonePe</p>
            </div>
            {method === "razorpay" && (
              <span className="inline-grid h-5 w-5 place-items-center rounded-full gradient-brand text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        </div>
      </Reveal>

      <button
        onClick={pay}
        disabled={loading}
        className="mt-6 w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 cursor-pointer hover:scale-[1.01] transition-transform"
      >
        {loading ? "Processing..." : `Pay ₹${fare} with ${method === "wallet" ? "Wallet" : "Razorpay"}`}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> 100% secure payment
      </p>

      {/* Insufficient Wallet Balance Modal */}
      {insufficientModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-elevated border border-border">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-500 mb-3">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground">Insufficient Wallet Balance</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Your wallet balance (₹{walletBalance ?? 0}) is insufficient for ₹{fare} fare. Please add money to continue.
            </p>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => handleAddMoneyInModal(Math.max(500, fare - (walletBalance || 0)))}
                className="w-full rounded-xl gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow"
              >
                Add Money (Razorpay)
              </button>
              <button
                onClick={() => setMethod("razorpay")}
                className="w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Switch to Direct Razorpay Payment
              </button>
              <button
                onClick={() => setInsufficientModal(false)}
                className="w-full text-xs font-semibold text-muted-foreground py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p className="mt-4 text-xl font-extrabold">Payment Successful</p>
              <p className="text-muted-foreground">₹{fare} paid via {method === "wallet" ? "ZipRide Wallet" : "Razorpay"}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UserShell>
  );
}
