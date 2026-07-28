import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { getPendingVerification } from "@/lib/firebase/auth";
import { motion } from "motion/react";
import { apiFetch } from "@/lib/api";



// SHA-256 hash using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "zipride_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Otp() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(28);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const pending = getPendingVerification();

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const set = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const copy = [...digits];
    copy[i] = v;
    setDigits(copy);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const filled = digits.every((d) => d !== "");

  const handleVerify = async () => {
    if (!filled || loading) return;
    setLoading(true);

    try {
      if (!pending || !pending.confirmationResult) {
        throw new Error("No pending OTP verification session found. Please request OTP again.");
      }

      const code = digits.join("");
      const result = await pending.confirmationResult.confirm(code);
      const firebaseUser = result.user;
      
      console.log("[Firebase OTP Verify Result] Firebase UID:", firebaseUser.uid, "Phone:", firebaseUser.phoneNumber);

      if (pending.registrationDetails?.isNewUser) {
        const reg = pending.registrationDetails;
        const passwordHash = reg.password ? await hashPassword(reg.password) : "";

        if (reg.role === "driver" && reg.driverDetails) {
          const details = reg.driverDetails;
          const body = {
            email: reg.email,
            passwordHash: passwordHash,
            fullName: reg.name,
            phone: reg.phone,
            dob: reg.dob,
            gender: reg.gender,
            username: reg.username,
            licenseNumber: details.licenseNumber,
            licenseExpiry: details.licenseExpiry,
            profilePhotoUrl: details.profilePhoto,
            licenseImageUrl: details.licenseImage,
            vehicleMake: "Toyota",
            vehicleModel: "Corolla",
            vehicleYear: 2022,
            vehicleColor: "White",
            vehiclePlate: "DRV-TEMP-" + Date.now().toString().slice(-4),
            vehicleType: "Economy"
          };

          const res = await apiFetch("/api/auth/register/driver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Driver registration failed.");
          }

          navigate({ to: "/driver/verification", replace: true });
          return;
        } else {
          const body = {
            email: reg.email,
            passwordHash: passwordHash,
            fullName: reg.name,
            phone: reg.phone,
            dob: reg.dob,
            gender: reg.gender,
            username: reg.username,
            referralCode: reg.referralCode
          };

          const res = await apiFetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Rider registration failed.");
          }

          navigate({ to: "/rider/home", replace: true });
          return;
        }
      }

      // Existing user redirection
      if (pending.registrationDetails?.role === "driver") {
        navigate({ to: "/driver/home", replace: true });
      } else {
        navigate({ to: "/rider/home", replace: true });
      }
    } catch (err: any) {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      alert("Verification Failed: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
      <Reveal className="w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <motion.div
          animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border bg-card p-8 text-center shadow-elevated"
        >
          <div className="mx-auto mb-5 w-max animate-float">
            <LogoMark className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-extrabold">Verify your number</h1>
          <p className="mt-2 text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-foreground">
              {pending?.registrationDetails?.phone || "your number"}
            </span>
          </p>

          <div className="mt-8 flex justify-center gap-2 sm:gap-3">
            {digits.map((d, i) => (
              <motion.input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={loading}
                onChange={(e) => set(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
                }}
                whileFocus={{ scale: 1.05 }}
                className="h-14 w-12 rounded-2xl border-2 border-input bg-background text-center text-2xl font-bold outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={!filled || loading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform enabled:hover:scale-[1.01] disabled:opacity-40"
          >
            {loading ? "Verifying..." : "Verify & Continue"} <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-5 text-sm text-muted-foreground">
            {timer > 0 ? (
              <>Resend code in 0:{timer.toString().padStart(2, "0")}</>
            ) : (
              <button
                disabled={loading}
                onClick={() => setTimer(28)}
                className="font-semibold text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            )}
          </p>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Your number stays private & secure
          </p>
        </motion.div>
      </Reveal>
    </div>
  );
}
