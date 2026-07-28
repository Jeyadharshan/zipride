import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AtSign, Lock, User, Phone, ArrowRight, ShieldCheck, Mail, Calendar, Upload, FileText } from "lucide-react";
import { LogoMark, Logo } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { setupRecaptcha, sendOtpToPhone, setPendingVerification } from "@/lib/firebase/auth";

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

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formattedPhone = `${countryCode}${rawPhone.trim().replace(/\D/g, "")}`;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const digitsOnly = rawPhone.replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length < 7) {
      alert("Mobile phone number is required (at least 7 to 10 digits).");
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
      // 1. Perform duplicate checks on Username, Email, and Phone
      const { data: dupEmail } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
      if (dupEmail) {
        alert("Email address already in use.");
        setLoading(false);
        return;
      }

      const { data: dupPhone } = await supabase.from("profiles").select("id").eq("phone", formattedPhone).maybeSingle();
      if (dupPhone) {
        alert("Phone number already registered.");
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
        const photoName = `profile_${Date.now()}_${profilePhotoFile!.name}`;
        const { data: photoData, error: photoErr } = await supabase.storage
          .from("driver_docs")
          .upload(photoName, profilePhotoFile!);
        if (photoErr) throw photoErr;
        profilePhotoUrl = photoData?.path ? `/uploads/${photoData.path}` : `/uploads/${photoName}`;

        const licenseName = `license_${Date.now()}_${licenseFile!.name}`;
        const { data: licenseData, error: licenseErr } = await supabase.storage
          .from("driver_docs")
          .upload(licenseName, licenseFile!);
        if (licenseErr) throw licenseErr;
        licenseImageUrl = licenseData?.path ? `/uploads/${licenseData.path}` : `/uploads/${licenseName}`;
      }

      // 3. Setup recaptcha and trigger Firebase OTP send
      const appVerifier = setupRecaptcha("recaptcha-container");
      const confirmationResult = await sendOtpToPhone(formattedPhone, appVerifier);

      // 4. Store verification payload globally
      setPendingVerification({
        confirmationResult,
        registrationDetails: {
          isNewUser: true,
          role,
          name: fullName,
          email,
          phone: formattedPhone,
          username,
          password,
          dob: dob || null,
          gender: gender || null,
          referralCode: referralCode || null,
          driverDetails: role === "driver" ? {
            profilePhoto: profilePhotoUrl,
            licenseImage: licenseImageUrl,
            licenseNumber: licenseNumber.trim() || ("DRV-LIC-" + Date.now().toString().slice(-8)),
            licenseExpiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
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
            <h2 className="mt-3 text-3xl font-extrabold">Create ZipRide Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please enter your details below to register
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="fullName">
                    Full Name
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Rahul Kumar"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-transparent py-3.5 outline-none text-sm"
                    />
                  </div>
                </div>

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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Mobile Number with Country Code Dropdown */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="rawPhone">
                    Mobile Number <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Country Code Picker */}
                    <div className="relative flex items-center rounded-2xl border border-input bg-muted/40 px-2.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring shrink-0">
                      <Phone className="h-4 w-4 text-muted-foreground mr-1 shrink-0" />
                      <select
                        id="countryCode"
                        aria-label="Country Code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground pr-1"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+65">🇸🇬 +65</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+94">🇱🇰 +94</option>
                        <option value="+977">🇳🇵 +977</option>
                        <option value="+880">🇧🇩 +880</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+974">🇶🇦 +974</option>
                        <option value="+60">🇲🇾 +60</option>
                        <option value="+49">🇩🇪 +49</option>
                        <option value="+33">🇫🇷 +33</option>
                      </select>
                    </div>

                    {/* Mobile Digits Input */}
                    <div className="flex-1 flex items-center rounded-2xl border border-input bg-background px-3 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring min-w-0">
                      <input
                        id="rawPhone"
                        name="rawPhone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="9876543210"
                        required
                        value={rawPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d\s-]/g, "");
                          setRawPhone(val);
                        }}
                        className="w-full bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    Format: <span className="font-bold text-primary">{formattedPhone}</span>
                  </p>
                </div>

                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="username">
                    Username
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
                      className="w-full bg-transparent py-3.5 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">
                    Password
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
                    Confirm Password
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

              {/* Role Selection Dropdown */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="role">
                  I want to register as a
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "rider" | "driver")}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="rider">Rider (Passenger)</option>
                  <option value="driver">Driver (verification required)</option>
                </select>
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
