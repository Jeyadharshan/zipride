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

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (firebaseAuth) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          const result = await signInWithPopup(firebaseAuth, provider);
          if (result?.user?.email) {
            const res = await apiFetch("/api/auth/google-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: result.user.email,
                fullName: result.user.displayName || result.user.email.split("@")[0],
                photoUrl: result.user.photoURL || "",
                firebaseUid: result.user.uid || ""
              })
            });
            const data = await res.json();
            if (res.ok) {
              handleSessionAndNavigate(data);
              return;
            }
          }
        } catch (fbErr: any) {
          if (fbErr.code === "auth/popup-closed-by-user") {
            setLoading(false);
            return;
          }
          if (fbErr.code === "auth/popup-blocked") {
            alert("Sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
            setLoading(false);
            return;
          }
          console.warn("Firebase Google Sign-In notice:", fbErr.code || fbErr.message);
        }
      }

      // Prompt fallback for Google Email if popup unavailable
      const userEmail = prompt("Enter your Google Account email to register:");
      if (!userEmail) {
        setLoading(false);
        return;
      }
      const userName = prompt("Enter your Display Name:", userEmail.split("@")[0]) || userEmail.split("@")[0];
      const res = await apiFetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail.trim(),
          fullName: userName.trim(),
          photoUrl: ""
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Google Sign-In failed.");
        return;
      }
      handleSessionAndNavigate(data);
    } catch (err: any) {
      alert("Unable to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel - Gradients & Info */}
      <div className="relative hidden flex-col justify-between overflow-hidden gradient-hero p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <Logo to="/" invert />
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-extrabold leading-tight">
            Join the
            <br />
            <span className="text-white/70">ZipRide Network.</span>
            <br />
            Earn or Ride.
          </h1>
          <p className="mt-5 text-white/80">
            Sign up now. Experience top-tier urban mobility. Make wallets payments, track status, or drive to generate income.
          </p>
        </div>
        <div className="relative z-10 flex gap-4 text-xs font-semibold text-white/60">
          <span>© 2026 ZipRide Technologies Inc.</span>
        </div>
      </div>

      {/* Right panel - Dynamic Form */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-12">
        <div id="recaptcha-container" className="hidden" />
        <Reveal className="w-full max-w-lg">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LogoMark className="h-10 w-10" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Fast Setup
            </span>
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
                or register manually
              </span>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="username">
                    Username <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="username"
                      type="text"
                      placeholder="rahul_kumar"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="email">
                    Email Address <span className="text-destructive">*</span>
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
                      className="w-full bg-transparent py-3.5 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      placeholder="Min 6 characters"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="confirmPassword">
                    Confirm Password <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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

                {/* Role Selection Dropdown */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="role">
                    Register as <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "rider" | "driver")}
                    className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                  >
                    <option value="rider">Rider (Passenger)</option>
                    <option value="driver">Driver (verification required)</option>
                  </select>
                </div>
              </div>

              {/* Conditional rendering for Rider field inputs */}
              {role === "rider" && (
                <div className="space-y-4 rounded-2xl bg-muted/20 p-4 border border-border">
                  <p className="text-xs font-bold text-muted-foreground">Rider Account Details (Optional)</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* DOB */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="dob">
                        Date of Birth
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 outline-none">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          id="dob"
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full bg-transparent py-2.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="gender">
                        Gender
                      </label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs outline-none"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="referralCode">
                      Referral Code
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 outline-none">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id="referralCode"
                        type="text"
                        placeholder="Enter referrer username"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        className="w-full bg-transparent py-2.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional rendering for Driver documents uploads */}
              {role === "driver" && (
                <div className="space-y-4 rounded-2xl bg-muted/20 p-4 border border-border">
                  <p className="text-xs font-bold text-muted-foreground">Driver Information & Verification Documents (Required)</p>
                  
                  {/* Driving License Number */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="licenseNumber">
                      Driving License Number
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 outline-none">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
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
                  
                  {/* Profile Photo File Upload */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-muted-foreground">
                        Profile Photo (Required: 1 MB – 2 MB, JPG/PNG/WEBP)
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                        <Upload className="h-4 w-4" /> Upload Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            if (f) {
                              const minB = 10 * 1024; // 10 KB
                              const maxB = 2 * 1024 * 1024; // 2 MB
                              if (f.size < minB || f.size > maxB) {
                                alert(`Profile Photo must be up to 2 MB. Uploaded file size: ${(f.size / (1024 * 1024)).toFixed(2)} MB`);
                                e.target.value = "";
                                setProfilePhotoFile(null);
                                return;
                              }
                            }
                            setProfilePhotoFile(f);
                          }}
                        />
                      </label>
                      <span className="text-xs text-muted-foreground truncate">
                        {profilePhotoFile ? `${profilePhotoFile.name} (${(profilePhotoFile.size / (1024 * 1024)).toFixed(2)}MB)` : "No file selected"}
                      </span>
                    </div>
                  </div>

                  {/* Driving License File Upload */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-muted-foreground">
                        Driving License Document (JPG, PNG, WEBP, PDF)
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                        <FileText className="h-4 w-4" /> Upload License
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            if (f) {
                              const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
                              if (!allowed.includes(f.type)) {
                                alert("Invalid licence document format. Accepted formats: JPG, PNG, WEBP, PDF.");
                                e.target.value = "";
                                setLicenseFile(null);
                                return;
                              }
                            }
                            setLicenseFile(f);
                          }}
                        />
                      </label>
                      <span className="text-xs text-muted-foreground truncate">
                        {licenseFile ? licenseFile.name : "No file selected"}
                      </span>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="space-y-3 rounded-xl bg-background/50 p-3 border border-border/60">
                    <p className="text-xs font-bold text-muted-foreground">Vehicle Details (Optional)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="vehicleMake">
                          Car Make <span className="text-muted-foreground/60">(e.g. Honda)</span>
                        </label>
                        <input
                          id="vehicleMake"
                          type="text"
                          placeholder="Toyota"
                          value={vehicleMake}
                          onChange={(e) => setVehicleMake(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="vehicleModel">
                          Car Model <span className="text-muted-foreground/60">(e.g. City)</span>
                        </label>
                        <input
                          id="vehicleModel"
                          type="text"
                          placeholder="Corolla"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="vehicleYear">
                          Year of Manufacture
                        </label>
                        <input
                          id="vehicleYear"
                          type="number"
                          min={1990}
                          max={new Date().getFullYear() + 1}
                          placeholder="2022"
                          value={vehicleYear}
                          onChange={(e) => setVehicleYear(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="vehicleColor">
                          Vehicle Color
                        </label>
                        <input
                          id="vehicleColor"
                          type="text"
                          placeholder="White"
                          value={vehicleColor}
                          onChange={(e) => setVehicleColor(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor="vehiclePlate">
                        License Plate Number
                      </label>
                      <input
                        id="vehiclePlate"
                        type="text"
                        placeholder="TN 01 AB 1234"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="register-submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? "Registering & Sending OTP..." : "Register & Get OTP"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
