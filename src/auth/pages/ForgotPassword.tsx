import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AtSign, Lock, Phone, ArrowRight, ShieldCheck, Mail, Key } from "lucide-react";
import { LogoMark } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { setupRecaptcha, sendOtpToPhone } from "@/lib/firebase/auth";
import { apiFetch } from "@/lib/api";

// SHA-256 hash using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "zipride_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email/Phone, 2: OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // OTP digits
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Password reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const navigate = useNavigate();

  // Send OTP handler
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      // 1. Verify user exists with this Email and Phone in MySQL database
      const { data: profile, error: dbErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("email", email.trim().toLowerCase())
        .eq("phone", phone.trim())
        .maybeSingle();

      if (dbErr) throw dbErr;

      if (!profile) {
        alert("No account matches the provided Email and Phone number.");
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // 2. Setup Recaptcha and send OTP
      const appVerifier = setupRecaptcha("recaptcha-container");
      const result = await sendOtpToPhone(phone, appVerifier);
      setConfirmationResult(result);

      // Advance to OTP digit input step
      setStep(2);
    } catch (err: any) {
      alert("Error sending verification code: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm OTP digits handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const otpCode = digits.join("");
    if (otpCode.length !== 6) {
      alert("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    try {
      if (!confirmationResult) {
        throw new Error("No verification session found. Please try again.");
      }

      await confirmationResult.confirm(otpCode);
      
      // Advance to Password change step
      setStep(3);
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Change password handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      alert("Password must contain at least one letter, one number, and one special character.");
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(newPassword);

      // Call the backend reset-password endpoint directly
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          newPasswordHash: passwordHash
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to reset password.");
      }

      alert("Your password has been reset successfully! Please sign in with your new password.");
      navigate({ to: "/login" });
    } catch (err: any) {
      alert("Error resetting password: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const copy = [...digits];
    copy[i] = v;
    setDigits(copy);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div id="recaptcha-container" className="hidden" />
      <Reveal className="w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <div className="mb-6 flex justify-center">
            <LogoMark className="h-12 w-12" />
          </div>

          <h2 className="text-center text-3xl font-extrabold">Forgot Password</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {step === 1 && "Enter details to receive verification code"}
            {step === 2 && `Enter the 6-digit code sent to ${phone}`}
            {step === 3 && "Enter your new account password"}
          </p>

          {step === 1 && (
            <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="email">
                  Email Address
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent py-3.5 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="phone">
                  Phone Number
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+919876543210"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent py-3.5 outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Send Verification Code"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="mt-6 space-y-6" onSubmit={handleVerifyOtp}>
              {/* OTP Digits input code */}
              <div className="flex justify-between gap-2">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (refs.current[i] = el) as any}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    className="h-14 w-full rounded-2xl border border-input bg-background text-center text-xl font-bold shadow-soft outline-none focus:ring-2 focus:ring-ring"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? "Confirming..." : "Confirm OTP Code"}
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                Back to Details
              </button>
            </form>
          )}

          {step === 3 && (
            <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
              {/* New Password */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="newPassword">
                  New Password
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent py-3.5 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent py-3.5 outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? "Updating..." : "Reset Password"}
                <Key className="h-5 w-5" />
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </Reveal>
    </div>
  );
}
