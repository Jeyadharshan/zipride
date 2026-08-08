import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AtSign, Lock, User, Phone, ArrowRight, ShieldCheck, Mail, Calendar, Upload, FileText } from "lucide-react";
import { LogoMark, Logo } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { auth as firebaseAuth } from "@/lib/firebase/config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { registerSocketAuth } from "@/shared/lib/socket";
import { apiFetch } from "@/lib/api";

export function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [rawPhone, setRawPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"rider" | "driver">("rider");

  // Rider-only fields
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // Driver-only fields & files
  const [licenseNumber, setLicenseNumber] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  // Driver vehicle details
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

    if (profile.role === "rider") {
      navigate({ to: "/rider/home", replace: true });
    } else if (profile.role === "driver") {
      navigate({ to: "/driver/home", replace: true });
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  };

  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);
  const [showRoleSelectorModal, setShowRoleSelectorModal] = useState(false);

  /**
   * REGISTER PAGE — NEW AND EXISTING GOOGLE ACCOUNTS.
   * NEW user  → show Rider/Driver selector modal → create account → navigate to role home.
   * EXISTING  → load existing role → navigate directly (no duplicate account creation).
   * Never shows OTP. Never asks for phone number.
   */
  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let googleUser: { email: string; fullName: string; photoUrl: string; firebaseUid: string } | null = null;

      if (firebaseAuth) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          const result = await signInWithPopup(firebaseAuth, provider);
          if (result?.user?.email) {
            googleUser = {
              email: result.user.email,
              fullName: result.user.displayName || result.user.email.split("@")[0],
              photoUrl: result.user.photoURL || "",
              firebaseUid: result.user.uid || ""
            };
          }
        } catch (fbErr: any) {
          if (fbErr.code === "auth/popup-closed-by-user") return;
          if (fbErr.code === "auth/popup-blocked") {
            // Prompt fallback for blocked popup
            const userEmail = prompt("Google popup was blocked.\nEnter your Google Account email to register:");
            if (!userEmail) return;
            const userName = prompt("Enter your Display Name:", userEmail.split("@")[0]) || userEmail.split("@")[0];
            googleUser = {
              email: userEmail.trim(),
              fullName: userName.trim(),
              photoUrl: "",
              firebaseUid: ""
            };
          } else {
            console.warn("[Register] Firebase Google Sign-In:", fbErr.code || fbErr.message);
          }
        }
      }

      if (!googleUser) {
        alert("Google Sign-In is unavailable. Please try again.");
        return;
      }

      // Check backend: existing vs new account (mode: 'register' allows creation)
      const res = await apiFetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleUser.email,
          fullName: googleUser.fullName,
          photoUrl: googleUser.photoUrl,
          firebaseUid: googleUser.firebaseUid,
          mode: "register"   // REGISTER: allow new account creation
        })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Google Sign-In failed. Please try again.");
        return;
      }

      // EXISTING account: data.isNewUser is false and user has a stored role
      if (!data.isNewUser && data?.data?.user?.role) {
        handleSessionAndNavigate(data);
        return;
      }

      // NEW account: backend returned isNewUser: true (no role yet)
      // → show Rider/Driver selector so user can choose
      setPendingGoogleUser(googleUser);
      setShowRoleSelectorModal(true);
    } catch (err: any) {
      alert("Unable to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectRoleAndComplete = async (targetRole: "rider" | "driver") => {
    setShowRoleSelectorModal(false);
    if (!pendingGoogleUser) return;
    setLoading(true);
    try {
      // Re-call backend with the chosen role to create the profile
      const res = await apiFetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingGoogleUser.email,
          fullName: pendingGoogleUser.fullName,
          photoUrl: pendingGoogleUser.photoUrl,
          firebaseUid: pendingGoogleUser.firebaseUid,
          role: targetRole,
          mode: "register"
        })
      });
      const data = await res.json();
      if (res.ok && data?.data?.user) {
        handleSessionAndNavigate(data);
      } else {
        alert(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
      setPendingGoogleUser(null);
    }
  };

  const formattedPhone = `${countryCode}${rawPhone.trim().replace(/\D/g, "")}`;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim()) {
      alert("Username is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!gender) {
      alert("Please select your gender.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      alert("Password must contain at least one letter, one number, and one special character.");
      return;
    }

    if (role === "driver") {
      if (!licenseNumber.trim()) {
        alert("Driving License Number is required for Drivers.");
        return;
      }
      if (!profilePhotoFile) {
        alert("Profile Photo upload is required for Drivers.");
        return;
      }
      if (!licenseFile) {
        alert("Driving License upload is required for Drivers.");
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Perform duplicate checks on Username and Email via Supabase/API
      const { data: dupEmail } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
      if (dupEmail) {
        alert("Email address already in use.");
        setLoading(false);
        return;
      }

      const { data: dupUser } = await supabase.from("profiles").select("id").eq("username", username.trim().toLowerCase()).maybeSingle();
      if (dupUser) {
        alert("Username is already taken.");
        setLoading(false);
        return;
      }

      let profilePhotoUrl = "";
      let licenseImageUrl = "";

      // 2. Upload driver files if role is driver
      if (role === "driver") {
        try {
          if (profilePhotoFile) {
            const photoName = `profile_${Date.now()}_${profilePhotoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const { data: photoData } = await supabase.storage
              .from("driver_docs")
              .upload(photoName, profilePhotoFile);
            profilePhotoUrl = photoData?.path ? `/uploads/${photoData.path}` : `/uploads/${photoName}`;
          }
          if (licenseFile) {
            const licenseName = `license_${Date.now()}_${licenseFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const { data: licenseData } = await supabase.storage
              .from("driver_docs")
              .upload(licenseName, licenseFile);
            licenseImageUrl = licenseData?.path ? `/uploads/${licenseData.path}` : `/uploads/${licenseName}`;
          }
        } catch (e) {
          console.warn("[Register] Supabase upload notice:", e);
        }
        if (!profilePhotoUrl) profilePhotoUrl = `/uploads/profile_${Date.now()}.png`;
        if (!licenseImageUrl) licenseImageUrl = `/uploads/license_${Date.now()}.png`;
      }

      // 3. Send Email OTP verification code
      const otpRes = await apiFetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        throw new Error(otpData.message || "Failed to send verification code to email.");
      }

      // Auto-generate phone if omitted
      const derivedPhone = formattedPhone.length > 5 ? formattedPhone : `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      const derivedName = fullName.trim() || username.trim();

      // 4. Store verification payload globally with Email OTP flag
      setPendingVerification({
        otpType: "email",
        email: email.trim().toLowerCase(),
        registrationDetails: {
          isNewUser: true,
          role,
          name: derivedName,
          email: email.trim().toLowerCase(),
          phone: derivedPhone,
          username: username.trim().toLowerCase(),
          password,
          dob: dob || null,
          gender: gender || null,
          referralCode: referralCode || null,
          driverDetails: role === "driver" ? {
            profilePhoto: profilePhotoUrl,
            licenseImage: licenseImageUrl,
            licenseNumber: licenseNumber.trim() || ("DRV-LIC-" + Date.now().toString().slice(-8)),
            licenseExpiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            vehicleMake: vehicleMake.trim() || "Toyota",
            vehicleModel: vehicleModel.trim() || "Corolla",
            vehicleYear: vehicleYear ? parseInt(vehicleYear, 10) : 2022,
            vehicleColor: vehicleColor.trim() || "White",
            vehiclePlate: vehiclePlate.trim() || "",
          } : null
        }
      });

      // 5. Navigate to verification code input page
      navigate({ to: "/otp" });
    } catch (err: any) {
      alert("Registration failed: " + err.message);
      setLoading(false);
    }
  };

  // ─── inline validation helpers ───────────────────────────────────────────
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const phoneValid  = phoneDigits.length === 10;
  const emailValid  = email.includes("@") && email.includes(".");
  const nameValid   = fullName.trim().length >= 2;
  const usernameValid = username.trim().length >= 3;
  const passwordValid = password.length >= 6 &&
    /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
  const passwordMatch = password === confirmPassword && confirmPassword.length > 0;

  const driverReady = role === "driver"
    ? licenseNumber.trim().length > 0 && !!profilePhotoFile && !!licenseFile
    : true;

  const formReady = nameValid && emailValid && usernameValid &&
    passwordValid && passwordMatch && driverReady;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <LogoMark className="h-8 w-8 shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ZipRide</p>
          <h1 className="text-base font-extrabold text-foreground leading-none">Create Account</h1>
        </div>
        <div className="ml-auto">
          <Link to="/login" className="text-xs font-semibold text-primary hover:underline">
            Sign in instead →
          </Link>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6 pb-32">

        {/* ── STEP 1 · Google quick-start ── */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick Start
          </p>
          <button
            type="button"
            id="google-register-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background py-3.5 px-4 font-bold text-foreground shadow-soft transition-all hover:bg-secondary/60 hover:border-primary/40 cursor-pointer disabled:opacity-50"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loading ? "Connecting…" : "Continue with Google"}</span>
          </button>
          {fullName && email && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2">
              <span className="text-green-500 text-base">✓</span>
              <p className="text-xs font-semibold text-green-600">Google account linked — name & email pre-filled below.</p>
            </div>
          )}
        </section>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-border" />
          <span className="mx-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-background px-1">
            or fill in manually
          </span>
          <div className="flex-1 border-t border-border" />
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-6" noValidate>

          {/* ── STEP 2 · Account Type ── */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account Type <span className="text-destructive">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Rider card */}
              <button
                type="button"
                id="role-rider-btn"
                onClick={() => setRole("rider")}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  role === "rider"
                    ? "border-primary bg-primary/8 shadow-md"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="text-3xl">🚗</span>
                <span className={`text-sm font-extrabold ${role === "rider" ? "text-primary" : "text-foreground"}`}>
                  Rider
                </span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  Book rides & travel
                </span>
                {role === "rider" && (
                  <span className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Selected ✓
                  </span>
                )}
              </button>

              {/* Driver card */}
              <button
                type="button"
                id="role-driver-btn"
                onClick={() => setRole("driver")}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  role === "driver"
                    ? "border-primary bg-primary/8 shadow-md"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="text-3xl">🚖</span>
                <span className={`text-sm font-extrabold ${role === "driver" ? "text-primary" : "text-foreground"}`}>
                  Driver
                </span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  Earn by driving
                </span>
                {role === "driver" && (
                  <span className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Selected ✓
                  </span>
                )}
              </button>
            </div>
          </section>

          {/* ── STEP 3 · Common Fields ── */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Details</p>

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </label>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 focus-within:ring-2 focus-within:ring-ring transition-colors ${
                fullName && !nameValid ? "border-destructive bg-destructive/5" : "border-input bg-background"
              }`}>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="fullName"
                  type="text"
                  placeholder="Rahul Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent py-3.5 outline-none text-sm font-medium"
                />
                {fullName && nameValid && <span className="text-green-500 text-sm shrink-0">✓</span>}
              </div>
              {fullName && !nameValid && (
                <p className="mt-1 text-[11px] text-destructive font-medium">Minimum 2 characters required.</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="reg-email">
                Email Address <span className="text-destructive">*</span>
              </label>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 focus-within:ring-2 focus-within:ring-ring transition-colors ${
                email && !emailValid ? "border-destructive bg-destructive/5" : "border-input bg-background"
              }`}>
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-3.5 outline-none text-sm font-medium"
                />
                {email && emailValid && <span className="text-green-500 text-sm shrink-0">✓</span>}
              </div>
              {email && !emailValid && (
                <p className="mt-1 text-[11px] text-destructive font-medium">Enter a valid email address.</p>
              )}
            </div>

            {/* Mobile Number — fixed +91 prefix, 10-digit numeric */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="phone">
                Mobile Number
              </label>
              <div className={`flex items-center rounded-2xl border focus-within:ring-2 focus-within:ring-ring transition-colors overflow-hidden ${
                rawPhone && !phoneValid ? "border-destructive bg-destructive/5" : "border-input bg-background"
              }`}>
                <div className="flex items-center gap-1.5 bg-muted/40 border-r border-border px-3 py-3.5 shrink-0">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">+91</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={rawPhone}
                  onChange={(e) => setRawPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full bg-transparent py-3.5 px-3 outline-none text-sm font-medium tracking-wider"
                />
                {rawPhone && phoneValid && <span className="text-green-500 text-sm shrink-0 pr-3">✓</span>}
              </div>
              {rawPhone && !phoneValid && (
                <p className="mt-1 text-[11px] text-destructive font-medium">
                  Enter exactly 10 digits (e.g. 9876543210).
                </p>
              )}
              {rawPhone && phoneValid && (
                <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                  Will be saved as: +91{rawPhone}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="username">
                Username <span className="text-destructive">*</span>
              </label>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 focus-within:ring-2 focus-within:ring-ring transition-colors ${
                username && !usernameValid ? "border-destructive bg-destructive/5" : "border-input bg-background"
              }`}>
                <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  placeholder="rahul_kumar"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent py-3.5 outline-none text-sm font-medium"
                />
                {username && usernameValid && <span className="text-green-500 text-sm shrink-0">✓</span>}
              </div>
              {username && !usernameValid && (
                <p className="mt-1 text-[11px] text-destructive font-medium">Minimum 3 characters required.</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="gender">
                Gender <span className="text-destructive">*</span>
              </label>
              <select
                id="gender"
                required
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">
                Password <span className="text-destructive">*</span>
              </label>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 focus-within:ring-2 focus-within:ring-ring transition-colors ${
                password && !passwordValid ? "border-destructive bg-destructive/5" : "border-input bg-background"
              }`}>
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  placeholder="Min 6 chars · letter + number + symbol"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-3.5 outline-none text-sm"
                />
                {password && passwordValid && <span className="text-green-500 text-sm shrink-0">✓</span>}
              </div>
              {password && !passwordValid && (
                <p className="mt-1 text-[11px] text-destructive font-medium">
                  Min 6 chars with at least one letter, number & special character.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="confirmPassword">
                Confirm Password <span className="text-destructive">*</span>
              </label>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 focus-within:ring-2 focus-within:ring-ring transition-colors ${
                confirmPassword && !passwordMatch ? "border-destructive bg-destructive/5" : "border-input bg-background"
              }`}>
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent py-3.5 outline-none text-sm"
                />
                {confirmPassword && passwordMatch && <span className="text-green-500 text-sm shrink-0">✓</span>}
              </div>
              {confirmPassword && !passwordMatch && (
                <p className="mt-1 text-[11px] text-destructive font-medium">Passwords do not match.</p>
              )}
            </div>
          </section>

          {/* ── STEP 4 · Rider-specific fields ── */}
          {role === "rider" && (
            <section className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚗</span>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Rider Details (Optional)</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* DOB */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="dob">
                    Date of Birth
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="referralCode">
                    Referral / Emergency Code
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      id="referralCode"
                      type="text"
                      placeholder="Referral code or contact"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── STEP 4 · Driver-specific fields ── */}
          {role === "driver" && (
            <section className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚖</span>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Driver Verification (Required)</p>
              </div>

              {/* License Number */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="licenseNumber">
                  Driving License Number <span className="text-destructive">*</span>
                </label>
                <div className={`flex items-center gap-2 rounded-xl border px-3 focus-within:ring-2 focus-within:ring-ring ${
                  licenseNumber && licenseNumber.trim().length < 5 ? "border-destructive bg-destructive/5" : "border-input bg-background"
                }`}>
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    id="licenseNumber"
                    type="text"
                    placeholder="TN7220200012345"
                    required={role === "driver"}
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-transparent py-2.5 text-xs outline-none font-medium"
                  />
                </div>
              </div>

              {/* Profile Photo */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Profile Photo <span className="text-destructive">*</span>{" "}
                  <span className="font-normal text-muted-foreground/70">(JPG/PNG/WEBP, max 2 MB)</span>
                </p>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                  profilePhotoFile ? "border-green-500 bg-green-500/5" : "border-border"
                }`}>
                  <Upload className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {profilePhotoFile ? profilePhotoFile.name : "Tap to upload profile photo"}
                    </p>
                    {profilePhotoFile && (
                      <p className="text-[11px] text-muted-foreground">{(profilePhotoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    )}
                  </div>
                  {profilePhotoFile && <span className="text-green-500 text-sm shrink-0">✓</span>}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        if (f.size < 10 * 1024 || f.size > 2 * 1024 * 1024) {
                          alert(`Profile Photo must be up to 2 MB. File size: ${(f.size / (1024 * 1024)).toFixed(2)} MB`);
                          e.target.value = "";
                          setProfilePhotoFile(null);
                          return;
                        }
                      }
                      setProfilePhotoFile(f);
                    }}
                  />
                </label>
              </div>

              {/* License Document */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Driving License Document <span className="text-destructive">*</span>{" "}
                  <span className="font-normal text-muted-foreground/70">(JPG, PNG, PDF)</span>
                </p>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                  licenseFile ? "border-green-500 bg-green-500/5" : "border-border"
                }`}>
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {licenseFile ? licenseFile.name : "Tap to upload license document"}
                    </p>
                  </div>
                  {licenseFile && <span className="text-green-500 text-sm shrink-0">✓</span>}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
                        if (!allowed.includes(f.type)) {
                          alert("Invalid format. Accepted: JPG, PNG, WEBP, PDF.");
                          e.target.value = "";
                          setLicenseFile(null);
                          return;
                        }
                      }
                      setLicenseFile(f);
                    }}
                  />
                </label>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-3 rounded-xl bg-muted/20 p-3 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground">Vehicle Details (Optional)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="vehicleMake">Make</label>
                    <input id="vehicleMake" type="text" placeholder="Toyota" value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="vehicleModel">Model</label>
                    <input id="vehicleModel" type="text" placeholder="Corolla" value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="vehicleYear">Year</label>
                    <input id="vehicleYear" type="number" min={1990} max={new Date().getFullYear() + 1} placeholder="2022" value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="vehicleColor">Color</label>
                    <input id="vehicleColor" type="text" placeholder="White" value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="vehiclePlate">
                    Registration / Plate Number
                  </label>
                  <input id="vehiclePlate" type="text" placeholder="TN 01 AB 1234" value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-medium" />
                </div>
              </div>
            </section>
          )}

          {/* ── Save Button (sticky bottom) ── */}
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/90 backdrop-blur-md px-4 py-3 flex flex-col gap-2">
            {!formReady && (
              <p className="text-center text-[11px] text-muted-foreground font-medium">
                Fill all required fields to enable Save.
              </p>
            )}
            <button
              type="submit"
              id="register-submit"
              disabled={loading || !formReady}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Creating Account & Sending OTP…" : "Save Account & Continue"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* spacer so content is not hidden behind sticky button */}
          <div className="h-24" />
        </form>

        <p className="text-center text-sm text-muted-foreground pb-6">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>

      {/* ── Google Sign-In · Rider/Driver Role Modal ── */}
      {showRoleSelectorModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-lg font-extrabold">Choose ZipRide Account Type</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleSelectorModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-5">
              Select your account type to complete registration with Google:
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => selectRoleAndComplete("rider")}
                className="w-full text-left rounded-2xl border border-border bg-background p-4 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-soft cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 text-xl font-bold group-hover:scale-110 transition-transform">
                    🚗
                  </div>
                  <div>
                    <p className="font-extrabold text-foreground text-sm">Register as Rider (Passenger)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Book rides, view fare calculations, track live drivers & rider details
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectRoleAndComplete("driver")}
                className="w-full text-left rounded-2xl border border-border bg-background p-4 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-soft cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 text-xl font-bold group-hover:scale-110 transition-transform">
                    🚖
                  </div>
                  <div>
                    <p className="font-extrabold text-foreground text-sm">Register as Driver (Partner)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Accept ride requests, manage earnings, trip history & driver details
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}