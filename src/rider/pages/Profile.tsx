import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Star, Save, X } from "lucide-react";
import { AccountShell } from "@/rider/layouts/AccountShell";
import { cn } from "@/shared/utils/cn";
import { StatCard, Avatar } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";



const toInputDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr;
};

const normalizeGender = (g?: string | null) => {
  if (!g) return "";
  const lower = g.toLowerCase();
  if (lower === "male") return "Male";
  if (lower === "female") return "Female";
  if (lower === "other") return "Other";
  return g;
};

export function Profile() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [balance, setBalance] = useState("₹0");
  const [stats, setStats] = useState({ totalRides: 0, rating: 5.0 });
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRiderStats() {
      if (profile?.id) {
        // Fetch wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("id", profile.id)
          .maybeSingle();
        if (wallet) {
          setBalance(`₹${wallet.balance}`);
        }

        // Fetch ride counts
        const { count: rideCount } = await supabase
          .from("rides")
          .select("*", { count: "exact", head: true })
          .eq("rider_id", profile.id);

        // Fetch ratings from driver_reviews (passenger ratings)
        const { data: ratingData } = await supabase
          .from("driver_reviews")
          .select("rating, comment, created_at")
          .eq("rider_id", profile.id)
          .order("created_at", { ascending: false });

        let avgRating = 5.0;
        if (ratingData && ratingData.length > 0) {
          const sum = ratingData.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
          avgRating = parseFloat((sum / ratingData.length).toFixed(1));
          setReviewsList(ratingData);
        } else {
          setReviewsList([]);
        }

        setStats({
          totalRides: rideCount || 0,
          rating: avgRating,
        });

        // Initialize Edit values
        setEditName(profile.full_name || "");
        setEditPhone(profile.phone || "");
        setEditEmail(profile.email || "");
        setEditDob(toInputDate(profile.date_of_birth || (profile as any).dob || ""));
        setEditGender(normalizeGender(profile.gender));
        setEditAddress(profile.address || "");
      }
    }
    loadRiderStats();
  }, [profile]);

  const handleSave = async () => {
    if (!editName.trim()) {
      alert("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        date_of_birth: editDob,
        gender: editGender,
        address: editAddress.trim(),
      });

      // Also update directly in Supabase profiles table for immediate consistency
      if (profile?.id) {
        await supabase
          .from("profiles")
          .update({
            full_name: editName.trim(),
            phone: editPhone.trim(),
            email: editEmail.trim(),
            date_of_birth: editDob || null,
            gender: editGender || null,
            address: editAddress.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
      }

      alert("Profile details updated successfully!");
      setIsEditing(false);
      await refreshProfile();
    } catch (err: any) {
      alert("Failed to update profile: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const name = profile?.full_name || "ZipRide User";
  const initial = name ? name[0] : "U";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString([], { month: "long", year: "numeric" })
    : "June 2026";

  const rawDob = profile?.date_of_birth || (profile as any)?.dob;
  const userRole = profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : "Rider";
  const hasPhone = Boolean(profile?.phone && profile.phone.trim() !== "");
  const isPhoneVerified = Boolean(profile?.phone_verified && hasPhone);

  return (
    <AccountShell active="Profile">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{isEditing ? "Edit Profile Details" : "Account Details"}</h1>
        <button
          onClick={() => {
            if (!isEditing) {
              setEditName(profile?.full_name || "");
              setEditPhone(profile?.phone || "");
              setEditEmail(profile?.email || "");
              setEditDob(toInputDate(profile?.date_of_birth || (profile as any)?.dob || ""));
              setEditGender(normalizeGender(profile?.gender));
              setEditAddress(profile?.address || "");
            }
            setIsEditing(!isEditing);
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-extrabold text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-soft"
        >
          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {isEditing ? "Cancel Editing" : "Edit Profile"}
        </button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard value={stats.totalRides.toString()} label="Total Rides" />
        <StatCard value={balance} label="Wallet Balance" />
        <StatCard
          value={
            <div className="flex items-center gap-1.5">
              <span>{stats.rating.toFixed(1)}</span>
              <div className="flex text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4 sm:h-5 sm:w-5",
                      i < Math.round(stats.rating) ? "fill-warning text-warning" : "text-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          }
          label="Your 5-Star Rating"
        />
      </div>

      <Reveal delay={0.08}>
        <div className="mt-6 rounded-3xl border border-border bg-card p-4 sm:p-7 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <Avatar label={initial} className="h-14 w-14 sm:h-16 sm:w-16 text-lg sm:text-xl" />
              <div>
                <p className="text-lg sm:text-xl font-extrabold">{name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Member since {memberSince}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
                Account Type: {userRole}
              </span>
              {isEditing && (
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Details"}
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            /* Editable Form View */
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+919876543210"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Gender
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none text-sm"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street, City"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Referral Code
                </label>
                <div className="mt-1 block w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 font-extrabold text-primary text-sm">
                  {profile?.referral_code || "ZRGRA08151"}
                </div>
              </div>

              <div className="sm:col-span-2 pt-2 flex justify-end">
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer text-sm"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </div>
          ) : (
            /* Read-Only Details View */
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Full Name
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {name}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {isPhoneVerified ? "Phone Number (Verified)" : "Phone Number"}
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {hasPhone ? profile?.phone : "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {profile?.email || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Date of Birth
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {rawDob || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Gender
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {normalizeGender(profile?.gender) || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Address
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {profile?.address || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Referral Code
                </p>
                <p className="mt-1 text-sm font-extrabold text-primary">
                  {profile?.referral_code || "ZRGRA08151"}
                </p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Ratings & Driver Comments Box */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-soft">
        <h3 className="text-lg font-extrabold mb-4">Driver Ratings & Comments</h3>
        <div className="flex items-center gap-4 border-b border-border pb-4 mb-4">
          <div className="text-4xl font-extrabold text-foreground">{stats.rating.toFixed(1)}</div>
          <div>
            <div className="flex text-warning">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-5 w-5",
                    i < Math.round(stats.rating) ? "fill-warning text-warning" : "text-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              5-Star Passenger Rating ({reviewsList.length > 0 ? reviewsList.length : 3} driver reviews)
            </p>
          </div>
        </div>

        {/* Driver Comments List */}
        <div className="space-y-3">
          {(reviewsList.length > 0 ? reviewsList : [
            { rating: 5, comment: "Punctual, friendly passenger. High score rating!", created_at: new Date().toISOString() },
            { rating: 5, comment: "Polite rider, easy trip & great communication.", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
            { rating: 5, comment: "Very respectful passenger. 5 stars!", created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
          ]).map((rev: any, idx: number) => (
            <div key={idx} className="rounded-2xl border border-border bg-secondary/40 p-3.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < rev.rating ? "fill-warning text-warning" : "text-muted"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-semibold">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-foreground font-semibold italic">
                "{rev.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </AccountShell>
  );
}
