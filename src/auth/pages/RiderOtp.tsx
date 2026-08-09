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
      if (!pending || !pending.registrationDetails) {
        throw new Error("No pending registration session found. Please fill the registration form again.");
      }

      const code = digits.join("");
      const reg = pending.registrationDetails;

      if (pending.otpType === "email" || reg.email) {
        // Verify code against backend Email OTP endpoint
        const verifyRes = await apiFetch("/api/auth/verify-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: reg.email, otp: code })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.message || "Invalid or expired verification code.");
        }
      } else if (pending.confirmationResult) {
        await pending.confirmationResult.confirm(code);
      }

      if (reg.isNewUser) {
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
            vehicleMake: details.vehicleMake || "Toyota",
            vehicleModel: details.vehicleModel || "Corolla",
            vehicleYear: details.vehicleYear || 2022,
            vehicleColor: details.vehicleColor || "White",
            vehiclePlate: details.vehiclePlate || ("DRV-TEMP-" + Date.now().toString().slice(-4)),
            vehicleType: "Economy"
          };

          const res = await apiFetch("/api/auth/register/driver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          
          const regData = await res.json();
          if (!res.ok) {
            throw new Error(regData.message || "Driver registration failed.");
          }

          if (regData?.data?.user) {
            const user = regData.data.user;
            sessionStorage.setItem("driver_session", JSON.stringify({
              id: user.id,
              full_name: user.fullName,
              role: "driver",
              username: user.username,
              email: user.email,
              phone: user.phone
            }));
            if (regData.data.token) {
              sessionStorage.setItem("jwt_token", regData.data.token);
              localStorage.setItem("jwt_token", regData.data.token);
            }
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
          
          const regData = await res.json();
          if (!res.ok) {
            throw new Error(regData.message || "Rider registration failed.");
          }

          if (regData?.data?.user) {
            const user = regData.data.user;
            sessionStorage.setItem("rider_session", JSON.stringify({
              id: user.id,
              full_name: user.fullName,
              role: "rider",
              username: user.username,
              email: user.email,
              phone: user.phone
            }));
            if (regData.data.token) {
              sessionStorage.setItem("jwt_token", regData.data.token);
              localStorage.setItem("jwt_token", regData.data.token);
            }
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
          to="/register"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Register
        </Link>
        <motion.div
          animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border bg-card p-8 text-center shadow-elevated"
        >
          <div className="mx-auto mb-5 w-max animate-float">
            <LogoMark className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-extrabold">Verify Email Address</h1>
          <p className="mt-2 text-muted-foreground">
            We sent a 6-digit verification code to{" "}
            <span className="font-semibold text-foreground">
              {pending?.registrationDetails?.email || pending?.email || "your email ID"}
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
            {loading ? "Verifying..." : "Verify & Create Account"} <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-5 text-sm text-muted-foreground">
            {timer > 0 ? (
              <>Resend code in 0:{timer.toString().padStart(2, "0")}</>
            ) : (
              <button
                disabled={loading}
                onClick={async () => {
                  setTimer(28);
                  if (pending?.registrationDetails?.email) {
                    try {
                      await apiFetch("/api/auth/send-email-otp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: pending.registrationDetails.email })
                      });
                      // OTP sent directly to registered email
                    } catch (e) {}
                  }
                }}
                className="font-semibold text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            )}
          </p>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Your information stays private & secure
          </p>
        </motion.div>
      </Reveal>
    </div>
  );
}
