import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Star, Wallet, CreditCard, HeartHandshake } from "lucide-react";
import { Logo } from "@/shared/components/brand/Logo";
import { Avatar } from "@/shared/components/kit/Primitives";
import { DRIVER } from "@/shared/constants/zip-data";
import { cn } from "@/shared/utils/cn";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/auth/hooks/useAuth";

const TAGS = ["Clean car", "Safe driving", "On time", "Friendly", "Great music", "Smooth ride"];
const TIPS = [10, 20, 50, 100];

export function Rating() {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tip, setTip] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [tipMethod, setTipMethod] = useState<"Wallet" | "Razorpay">("Wallet");
  const navigate = useNavigate();

  const [comment, setComment] = useState("");
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [driverName] = useState(localStorage.getItem("active_driver_name") || DRIVER.name);
  const [driverAvatar] = useState(localStorage.getItem("active_driver_avatar") || "");
  const [driverRating] = useState(localStorage.getItem("active_driver_rating") || "4.9");
  const driverInitial = driverName ? driverName[0].toUpperCase() : "D";

  const toggle = (t: string) =>
    setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const handleSubmitRating = async () => {
    if (submitting) return;
    setSubmitting(true);

    const rideId = localStorage.getItem("active_ride_id") || localStorage.getItem("payment_ride_id");
    const driverId = localStorage.getItem("active_driver_id");

    const finalTipAmount = customTip ? parseFloat(customTip) : (tip || 0);

    try {
      // Process tip if specified
      if (finalTipAmount > 0 && rideId) {
        if (tipMethod === "Razorpay") {
          const tipRes = await apiFetch("/api/v1/tips", {
            method: "POST",
            body: JSON.stringify({
              rideId,
              amount: finalTipAmount,
              payment_method: "Razorpay"
            })
          });

          if (tipRes && tipRes.action === "checkout" && tipRes.razorpay_order_id) {
            // Load Razorpay Script if needed
            if (!(window as any).Razorpay) {
              const script = document.createElement("script");
              script.src = "https://checkout.razorpay.com/v1/checkout.js";
              script.async = true;
              document.body.appendChild(script);
              await new Promise((res) => (script.onload = res));
            }

            const options = {
              key: tipRes.key_id || "rzp_live_THQ2isXoSiOoDg",
              amount: Math.round(finalTipAmount * 100),
              currency: "INR",
              name: "ZipRide Driver Tip",
              description: `Tip for Driver ${driverName}`,
              order_id: tipRes.razorpay_order_id,
              handler: async function (response: any) {
                await apiFetch("/api/v1/tips", {
                  method: "POST",
                  body: JSON.stringify({
                    rideId,
                    amount: finalTipAmount,
                    payment_method: "Razorpay",
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  })
                }).catch(() => {});
              }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          }
        } else {
          // Pay tip via Wallet
          const tipRes = await apiFetch("/api/v1/tips", {
            method: "POST",
            body: JSON.stringify({
              rideId,
              amount: finalTipAmount,
              payment_method: "Wallet"
            })
          });
          if (!tipRes || !tipRes.success) {
            if (tipRes?.error === "INSUFFICIENT_WALLET_BALANCE") {
              alert(`Insufficient Wallet balance to send ₹${finalTipAmount} tip. Please recharge wallet.`);
            } else {
              alert("Could not process tip: " + (tipRes?.message || "Error"));
            }
          }
        }
      }

      // Submit Rating to database
      if (rideId && profile?.id && driverId) {
        const fullComment = [comment, ...tags].filter(Boolean).join(" - ");
        await supabase.from("ratings").insert({
          ride_id: rideId,
          rater_id: profile.id,
          ratee_id: driverId,
          rating: rating,
          comment: fullComment
        }).catch(() => {});
      }

      // Clean up localStorage keys
      localStorage.removeItem("active_ride_id");
      localStorage.removeItem("payment_ride_id");
      localStorage.removeItem("active_driver_id");
      localStorage.removeItem("active_driver_name");
      localStorage.removeItem("active_driver_avatar");
      localStorage.removeItem("active_driver_rating");

      alert("Thank you for rating your driver!");
      navigate({ to: "/history", replace: true });
    } catch (err: any) {
      alert("Failed to submit feedback: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.removeItem("active_ride_id");
    localStorage.removeItem("payment_ride_id");
    localStorage.removeItem("active_driver_id");
    localStorage.removeItem("active_driver_name");
    localStorage.removeItem("active_driver_avatar");
    localStorage.removeItem("active_driver_rating");
    navigate({ to: "/dashboard", replace: true });
  };

  const activeTipVal = customTip ? parseFloat(customTip) || 0 : (tip || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-16 items-center justify-center border-b border-border glass">
        <Logo to="/dashboard" />
      </div>
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-7 text-center shadow-elevated">
          <Avatar label={driverInitial} src={driverAvatar} className="mx-auto h-20 w-20 text-2xl" />
          <h1 className="mt-4 text-2xl font-extrabold">How was your ride?</h1>
          <p className="text-muted-foreground">with {driverName}</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-warning bg-warning/5 border border-dashed border-warning/20 rounded-full px-3 py-1.5 w-fit mx-auto">
            ★ Driver Rating: {driverRating}
          </p>

          <div className="mt-6 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                whileTap={{ scale: 0.8 }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors cursor-pointer",
                    n <= (hover || rating)
                      ? "fill-warning text-warning"
                      : "fill-secondary text-border",
                  )}
                />
              </motion.button>
            ))}
          </div>
          <p className="mt-2 text-sm font-semibold text-primary">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][hover || rating]}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  tags.includes(t)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)"
            rows={2}
            className="mt-5 w-full resize-none rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Driver Tip Section */}
          <div className="mt-6 pt-5 border-t border-border text-left">
            <p className="text-xs font-extrabold uppercase text-muted-foreground flex items-center gap-1.5 mb-3">
              <HeartHandshake className="h-4 w-4 text-rose-500" /> Add a Tip for Driver
            </p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {TIPS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTip(tip === t ? null : t);
                    setCustomTip("");
                  }}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-bold transition-colors cursor-pointer",
                    tip === t && !customTip ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary/40",
                  )}
                >
                  ₹{t}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={customTip}
              onChange={(e) => {
                setCustomTip(e.target.value);
                setTip(null);
              }}
              placeholder="Enter custom tip amount (₹)"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />

            {/* Tip Payment Method */}
            {activeTipVal > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground">Pay Tip via:</span>
                <button
                  onClick={() => setTipMethod("Wallet")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer",
                    tipMethod === "Wallet" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  <Wallet className="h-3.5 w-3.5" /> Wallet
                </button>
                <button
                  onClick={() => setTipMethod("Razorpay")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer",
                    tipMethod === "Razorpay" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Razorpay
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmitRating}
            disabled={submitting}
            className="mt-6 w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Submitting..." : `Submit ${activeTipVal > 0 ? `· Tip ₹${activeTipVal}` : "Rating"}`}
          </button>
          <button 
            onClick={handleSkip} 
            className="mt-3 block w-full text-sm font-semibold text-muted-foreground cursor-pointer text-center hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

