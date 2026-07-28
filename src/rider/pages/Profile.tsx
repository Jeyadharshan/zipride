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
        setEditEmail(profile.email || "");
        setEditDob(toInputDate(profile.date_of_birth || (profile as any).dob || ""));
        setEditGender(normalizeGender(profile.gender));
        setEditAddress(profile.address || "");
      }
    }
    loadRiderStats();
  }, [profile]);

  const startEditing = () => {
    setEditName(profile?.full_name || "");
    setEditEmail(profile?.email || "");
    setEditDob(toInputDate(profile?.date_of_birth || (profile as any)?.dob || ""));
    setEditGender(normalizeGender(profile?.gender));
    setEditAddress(profile?.address || "");
    setIsEditing(true);
  };

  const name = profile?.full_name || "ZipRide Rider";
  const initial = name ? name[0] : "U";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString([], { month: "long", year: "numeric" })
    : "June 2026";

  const handleSave = async () => {
    if (!editName.trim()) {
      alert("Name is mandatory.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: editName,
        email: editEmail,
        date_of_birth: editDob,
        gender: editGender,
        address: editAddress,
      });
      alert("Profile updated successfully!");
      setIsEditing(false);
      await refreshProfile();
    } catch (err: any) {
      alert("Failed to update profile: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const rawDob = profile?.date_of_birth || (profile as any)?.dob;
  const info = [
    ["Full Name", name],
    ["Phone Number", profile?.phone || "No phone number"],
    ["Email", profile?.email || "No email address"],
    ["Date of Birth", rawDob || "Not specified"],
    ["Gender", normalizeGender(profile?.gender) || "Not specified"],
    ["Address", profile?.address || "Not specified"],
    ["Referral Code", profile?.referral_code || "None"],
  ];

  return (
    <AccountShell active="Profile">
      <h1 className="mb-6 text-2xl font-extrabold">Profile Information</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard value={stats.totalRides.toString()} label="Total Rides" />
        <StatCard value={balance} label="Wallet Balance" />
        <StatCard
          value={
            <span className="inline-flex items-center gap-1">
              {stats.rating.toString()} <Star className="h-5 w-5 fill-warning text-warning" />
            </span>
          }
          label="Your Rating"
        />
      </div>

      <Reveal delay={0.08}>
        <div className="mt-6 rounded-3xl border border-border bg-card p-7 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <Avatar label={initial} className="h-16 w-16 text-xl" />
              <div>
                <p className="text-xl font-extrabold">{name}</p>
                <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
              </div>
            </div>
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-semibold transition-colors hover:border-primary"
              >
                <Pencil className="h-4 w-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-semibold transition-colors hover:border-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {info.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className={`mt-1 font-bold ${label === "Referral Code" ? "text-primary" : ""}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Phone Number (Verified)
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.phone || ""}
                  className="mt-1 block w-full rounded-xl border border-input bg-muted px-4 py-2.5 font-bold text-muted-foreground cursor-not-allowed focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none"
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
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Gender
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none"
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
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-input bg-background px-4 py-2.5 font-bold transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Ratings & Reviews Box */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-7 shadow-soft">
        <h3 className="text-lg font-extrabold mb-4">Ratings & Reviews</h3>
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
            <p className="text-xs text-muted-foreground mt-1">Average rating score ({reviewsList.length} reviews)</p>
          </div>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {reviewsList.length > 0 ? (
            reviewsList.map((rev: any, idx: number) => (
              <div key={idx} className="rounded-xl bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < rev.rating ? "fill-warning text-warning" : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xxs text-muted-foreground">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>
                {rev.comment && (
                  <p className="mt-1.5 text-xs text-foreground font-medium italic">
                    "{rev.comment}"
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews received yet.</p>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
