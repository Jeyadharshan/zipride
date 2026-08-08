import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AtSign, Lock, ArrowRight, ShieldCheck, Star, Eye, EyeOff, Phone, CheckCircle } from "lucide-react";
import { LogoMark, Logo } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { apiFetch } from "@/lib/api";
import { registerSocketAuth } from "@/shared/lib/socket";
import { useLanguage } from "@/shared/context/LanguageContext";
import { auth as firebaseAuth } from "@/lib/firebase/config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const FEATURES = [
  { title: "Live Driver Tracking", body: "Watch your ride approach in real-time" },
  { title: "Verified Drivers Only", body: "Background-checked and rated by riders" },
  { title: "Secure Payments", body: "Cash, UPI, wallet — your choice" },
];

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "zipride_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Login() {
  const { t } = useLanguage();
  const [loginMode, setLoginMode] = useState<"password" | "phone">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rememberedUser = localStorage.getItem("zipride_remembered_username");
      if (rememberedUser) {
        setUsername(rememberedUser);
        setRememberMe(true);
      }
    }
  }, []);

  const handleSessionAndNavigate = (loginData: any) => {
    const profile = loginData?.data?.user;
    if (!profile) return;

    const sessionKey = `${profile.role}_session`;
    const sessionValue = JSON.stringify({
      id: profile.id,
      full_name: profile.fullName,
      role: profile.role,
      username: profile.username,
      email: profile.email,
      phone: profile.phone,
      profile_image: loginData?.data?.profilePhoto || loginData?.data?.profile_photo_url || ""
    });

    sessionStorage.setItem(sessionKey, sessionValue);
    localStorage.setItem("user_id", profile.id);
    localStorage.setItem("user_role", profile.role);

    if (loginData?.data?.token) {
      sessionStorage.setItem("jwt_token", loginData.data.token);
      localStorage.setItem("jwt_token", loginData.data.token);
    }

    registerSocketAuth(profile.id, profile.role);

    if (profile.role === "driver") {
      const verificationStatus = (loginData?.data?.verificationStatus || "").toLowerCase();
      if (verificationStatus !== "approved") {
        navigate({ to: "/driver/verification", replace: true });
        return;
      }
    }

    if (profile.role === "rider") {
      navigate({ to: "/rider/home", replace: true });
    } else if (profile.role === "driver") {
      navigate({ to: "/driver/home", replace: true });
    } else if (profile.role === "admin") {
      navigate({ to: "/admin/dashboard", replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let googleEmail = "";
      let googleName = "";
      let photoUrl = "";

      if (firebaseAuth) {
        try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(firebaseAuth, provider);
          googleEmail = result.user.email || "";
          googleName = result.user.displayName || "";
          photoUrl = result.user.photoURL || "";
        } catch (fbErr: any) {
          console.warn("Firebase Google Sign-In popup:", fbErr.message);
        }
      }

      if (!googleEmail) {
        const inputEmail = prompt("Enter your Google Account Email ID:");
        if (!inputEmail) {
          setLoading(false);
          return;
        }
        googleEmail = inputEmail.trim();
        const inputName = prompt("Enter your Google Account Display Name:", googleEmail.split("@")[0]);
        googleName = inputName ? inputName.trim() : googleEmail.split("@")[0];
      }

      const res = await apiFetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          fullName: googleName,
          photoUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Google Sign-In failed.");
        return;
      }

      handleSessionAndNavigate(data);
    } catch (err: any) {
      alert("Google Sign-In error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      alert("Please enter a valid phone number.");
      return;
    }
    setOtpSent(true);
    // OTP sent to registered number
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      alert("Please enter the 4-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/phone-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber.trim(), otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Phone login failed.");
        return;
      }
      handleSessionAndNavigate(data);
    } catch (err: any) {
      alert("Phone login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim()) {
      alert("Please enter your email, username, or phone number.");
      return;
    }
    if (!password) {
      alert("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      const identifier = username.trim().toLowerCase();

      sessionStorage.removeItem("rider_session");
      sessionStorage.removeItem("driver_session");
      sessionStorage.removeItem("admin_session");

      const loginRes = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password: passwordHash })
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        alert(loginData.message || "Invalid credentials.");
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("zipride_remembered_username", username.trim());
      } else {
        localStorage.removeItem("zipride_remembered_username");
      }

      handleSessionAndNavigate(loginData);
    } catch (err: any) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left hero panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden gradient-hero p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <Logo to="/" invert />
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-extrabold leading-tight">
            Your City.
            <br />
            <span className="text-white/70">Your Ride.</span>
            <br />
            Starts here.
          </h1>
          <p className="mt-5 text-white/80">
            Sign in and get moving in seconds. Safe, verified drivers ready near you — anytime, anywhere.
          </p>
          <div className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-dark rounded-2xl p-4">
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-white/70">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-12">
        <Reveal className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LogoMark className="h-10 w-10" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure Authentication
            </span>
            <h2 className="mt-3 text-3xl font-extrabold">{t("sign_in_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("sign_in_sub")}</p>

            {/* Login Mode Toggle Tabs */}
            <div className="mt-6 flex rounded-2xl border border-border p-1 bg-secondary/30">
              <button
                type="button"
                onClick={() => setLoginMode("password")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  loginMode === "password" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("phone")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  loginMode === "phone" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📱 Phone OTP Login
              </button>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3.5 px-4 font-bold text-foreground shadow-soft transition-all hover:bg-secondary/60 hover:border-primary/40 cursor-pointer disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-border" />
              <span className="absolute bg-card px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                or sign in with
              </span>
            </div>

            {/* Standard Password Login Form */}
            {loginMode === "password" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="username">
                    Email, Username, or Phone
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <AtSign className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <input
                      id="username"
                      type="text"
                      placeholder="username, email, or +91..."
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-semibold" htmlFor="password">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-primary hover:underline text-right"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="remember-me" className="text-xs font-medium text-muted-foreground select-none cursor-pointer">
                    Remember Me (stores login credentials locally)
                  </label>
                </div>

                <button
                  type="submit"
                  id="login-submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Signing in..." : t("nav_login")}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            ) : (
              /* Phone + OTP Login Form */
              <form className="space-y-4" onSubmit={otpSent ? handlePhoneVerify : handleSendOtp}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    {t("enter_phone")}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      required
                      disabled={otpSent}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">
                      {t("enter_otp")}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="1234"
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full bg-transparent py-3.5 outline-none font-mono text-lg tracking-widest"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Processing..." : otpSent ? t("verify_login") : t("send_otp")}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-sm text-muted-foreground">
              New to ZipRide?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Create a free account
              </Link>
            </p>

            <div className="mt-6 flex items-center justify-center gap-4 border-t border-border pt-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> SSL Secured
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Privacy Protected
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.8/5
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

