import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AtSign, Lock, ArrowRight, ShieldCheck, Star, Eye, EyeOff } from "lucide-react";
import { LogoMark, Logo } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { registerSocketAuth } from "@/shared/lib/socket";

const FEATURES = [
  { title: "Live Driver Tracking", body: "Watch your ride approach in real-time" },
  { title: "Verified Drivers Only", body: "Background-checked and rated by riders" },
  { title: "Secure Payments", body: "Cash, UPI, wallet — your choice" },
];

// Simple SHA-256 hash via Web Crypto API (same as used during registration)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "zipride_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If "Remember Me" was previously checked, populate email/username
  useEffect(() => {
    const rememberedUser = localStorage.getItem("zipride_remembered_username");
    if (rememberedUser) {
      setUsername(rememberedUser);
      setRememberMe(true);
    }
  }, []);

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

      // Clear any prior session storage before logging in
      sessionStorage.removeItem("rider_session");
      sessionStorage.removeItem("driver_session");
      sessionStorage.removeItem("admin_session");

      // 1. Fetch profiles by matching username, email, or phone
      let profile: any = null;
      let fetchError: any = null;

      // Check by username
      const { data: usernameProfile, error: usernameError } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, role, account_status, username, email, phone")
        .eq("username", identifier)
        .eq("password_hash", passwordHash)
        .maybeSingle();

      if (usernameError) fetchError = usernameError;
      profile = usernameProfile;

      // Check by email
      if (!profile) {
        const { data: emailProfile, error: emailError } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, role, account_status, username, email, phone")
          .eq("email", identifier)
          .eq("password_hash", passwordHash)
          .maybeSingle();

        if (emailError) fetchError = emailError;
        profile = emailProfile;
      }

      // Check by phone
      if (!profile) {
        const { data: phoneProfile, error: phoneError } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, role, account_status, username, email, phone")
          .eq("phone", identifier)
          .eq("password_hash", passwordHash)
          .maybeSingle();

        if (phoneError) fetchError = phoneError;
        profile = phoneProfile;
      }

      if (fetchError) throw new Error(fetchError.message);

      if (!profile) {
        // Check if account has been deleted (exists in waste table)
        let deletedProfile = null;
        const { data: d1 } = await (supabase as any).from("waste").select("id").eq("username", identifier).maybeSingle();
        if (d1) deletedProfile = d1;
        if (!deletedProfile) {
          const { data: d2 } = await (supabase as any).from("waste").select("id").eq("email", identifier).maybeSingle();
          if (d2) deletedProfile = d2;
        }
        if (!deletedProfile) {
          const { data: d3 } = await (supabase as any).from("waste").select("id").eq("phone", identifier).maybeSingle();
          if (d3) deletedProfile = d3;
        }

        if (deletedProfile) {
          alert("This account was deleted.");
          setLoading(false);
          return;
        }

        // Look up by identifier again to see if user has been locked due to failed attempts
        let existingProfile = null;
        const { data: e1 } = await (supabase as any).from("profiles").select("id").eq("username", identifier).maybeSingle();
        if (e1) existingProfile = e1;
        if (!existingProfile) {
          const { data: e2 } = await (supabase as any).from("profiles").select("id").eq("email", identifier).maybeSingle();
          if (e2) existingProfile = e2;
        }
        if (!existingProfile) {
          const { data: e3 } = await (supabase as any).from("profiles").select("id").eq("phone", identifier).maybeSingle();
          if (e3) existingProfile = e3;
        }

        if (existingProfile) {
          // Trigger backend direct login with wrong password to hit lockout tracker and log failed attempt
          const res = await apiFetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: identifier, password: "wrong_password" })
          });
          const data = await res.json();
          if (res.status === 403) {
            alert(data.message);
            setLoading(false);
            return;
          }
        }
        alert("Invalid username or password. Please try again.");
        setLoading(false);
        return;
      }

      if (profile.account_status === "suspended" || profile.account_status === "banned") {
        alert("Your account has been suspended. Please contact support.");
        setLoading(false);
        return;
      }

      // 2. Driver verification check
      if (profile.role === "driver") {
        const { data: driverProfile, error: driverErr } = await (supabase as any)
          .from("driver_profiles")
          .select("verification_status")
          .eq("profile_id", profile.id)
          .maybeSingle();

        if (driverErr) throw new Error(driverErr.message);

        if (driverProfile) {
          if (driverProfile.verification_status !== "approved" && driverProfile.verification_status !== "Approved") {
            const sessionKey = `${profile.role}_session`;
            const sessionValue = JSON.stringify({
              id: profile.id,
              full_name: profile.full_name,
              role: profile.role,
              username: profile.username,
              email: profile.email,
              phone: profile.phone,
              profile_image: profile.avatar_url || ""
            });

            sessionStorage.setItem(sessionKey, sessionValue);

            if (rememberMe) {
              localStorage.setItem("zipride_remembered_username", username.trim());
              localStorage.setItem(`zipride_${profile.role}_session_backup`, sessionValue);
            } else {
              localStorage.removeItem("zipride_remembered_username");
              localStorage.removeItem(`zipride_${profile.role}_session_backup`);
            }

            // Hit login log route and navigate to verification screen
            await apiFetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: identifier, password })
            });

            navigate({ to: "/driver/verification", replace: true });
            setLoading(false);
            return;
          }
        }
      }

      // 3. Save session details
      const sessionKey = `${profile.role}_session`;
      const sessionValue = JSON.stringify({
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        profile_image: profile.avatar_url || ""
      });

      sessionStorage.setItem(sessionKey, sessionValue);
      localStorage.setItem("user_id", profile.id);
      localStorage.setItem("user_role", profile.role);
      registerSocketAuth(profile.id, profile.role);

      if (rememberMe) {
        localStorage.setItem("zipride_remembered_username", username.trim());
        localStorage.setItem(`zipride_${profile.role}_session_backup`, sessionValue);
      } else {
        localStorage.removeItem("zipride_remembered_username");
        localStorage.removeItem(`zipride_${profile.role}_session_backup`);
      }

      // 4. Hit server login route to write successful audit + capture JWT
      const loginRes = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password })
      });
      const loginData = await loginRes.json();
      // Store backend JWT for authenticated REST API calls (admin endpoints, etc.)
      if (loginData?.data?.token) {
        sessionStorage.setItem("jwt_token", loginData.data.token);
        localStorage.setItem("jwt_token", loginData.data.token);
      }

      // 5. Navigate to dashboard based on role (replace so back button doesn't return to login)
      if (profile.role === "rider") {
        navigate({ to: "/rider/home", replace: true });
      } else if (profile.role === "driver") {
        navigate({ to: "/driver/home", replace: true });
      } else if (profile.role === "admin") {
        navigate({ to: "/admin/dashboard", replace: true });
      }
    } catch (err: any) {
      alert("Login failed: " + err.message);
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
            <h2 className="mt-3 text-3xl font-extrabold">Welcome back to ZipRide</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage your wallet, rides, or dashboard settings
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              {/* Username/Email/Phone */}
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

              {/* Password */}
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

              {/* Remember Me */}
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              New to ZipRide?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Create a free account
              </Link>
            </p>

            {/* Quick Demo Accounts */}
            <div className="mt-5 border-t border-border pt-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                Quick Demo Accounts
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setUsername("rider@zipride.com");
                    setPassword("rider123");
                  }}
                  className="rounded-xl border border-border bg-secondary/50 py-2.5 hover:bg-secondary transition-colors cursor-pointer"
                >
                  👤 Rider
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("driver@zipride.com");
                    setPassword("driver123");
                  }}
                  className="rounded-xl border border-border bg-secondary/50 py-2.5 hover:bg-secondary transition-colors cursor-pointer"
                >
                  🚗 Driver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("admin@zipride.com");
                    setPassword("admin123");
                  }}
                  className="rounded-xl border border-border bg-secondary/50 py-2.5 hover:bg-secondary transition-colors cursor-pointer"
                >
                  ⚡ Admin
                </button>
              </div>
            </div>



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
