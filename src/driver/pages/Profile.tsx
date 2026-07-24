import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Star,
  Car,
  Phone,
  Mail,
  Pencil,
  LogOut,
  ShieldCheck,
  Calendar,
  MapPin,
  Save,
  X,
} from "lucide-react";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { StatCard, Avatar, InteractivePhone } from "@/shared/components/kit/Primitives";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { resolveAssetUrl } from "@/shared/utils/resolveAssetUrl";

const toInputDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr;
};

export function DriverProfile() {
  const { profile, driverProfile, updateProfile, refreshProfile, signOut } = useAuth();
  const [vehicle, setVehicle] = useState<any>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadVehicle() {
      if (profile?.id) {
        const { data } = await supabase
          .from("vehicles")
          .select("*")
          .eq("driver_id", profile.id)
          .maybeSingle();

        if (data) {
          setVehicle(data);
        }
      }
    }
    loadVehicle();
  }, [profile]);

  const startEditing = () => {
    setEditName(profile?.full_name || "");
    setEditEmail(profile?.email || "");
    setEditDob(toInputDate(profile?.date_of_birth || (profile as any)?.dob || ""));
    setEditAddress(profile?.address || "");
    setIsEditing(true);
  };

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
        address: editAddress,
      });
      alert("Driver profile updated successfully!");
      setIsEditing(false);
      await refreshProfile();
    } catch (err: any) {
      alert("Failed to update profile: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const rating = driverProfile?.rating || 5.0;
  const initial = profile?.full_name ? profile.full_name[0] : "D";
  const name = profile?.full_name || "Driver Partner";
  const avatarUrl = resolveAssetUrl(
    (driverProfile as any)?.profile_photo ||
    driverProfile?.profile_photo_url ||
    (profile as any)?.profile_image ||
    profile?.avatar_url
  );
  const statusLabel =
    driverProfile?.verification_status === "approved" ||
    driverProfile?.verification_status === "Approved"
      ? "Verified Driver"
      : "Pending Verification";

  const rawDob = profile?.date_of_birth || (profile as any)?.dob;
  const info = [
    ["Phone", profile?.phone || "No phone", Phone],
    ["Email", profile?.email || "No email", Mail],
    ["Address", profile?.address || "No address", MapPin],
    ["Date of Birth", rawDob || "Not specified", Calendar],
  ] as const;

  return (
    <DriverShell>
      <div className="rounded-3xl gradient-hero p-7 text-white shadow-elevated">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              label={initial}
              src={avatarUrl}
              className="h-20 w-20 text-2xl ring-4 ring-white/30"
            />
            <div>
              <p className="text-2xl font-extrabold">{name}</p>
              <p className="flex items-center gap-1 text-white/80">
                <Star className="h-4 w-4 fill-warning text-warning" /> {rating} ·{" "}
                {driverProfile?.completed_rides || 0} trips
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" /> {statusLabel}
              </span>
            </div>
          </div>
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 font-semibold backdrop-blur hover:bg-white/30 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={saving}
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl bg-white text-primary px-4 py-2.5 font-bold hover:bg-white/90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 font-semibold backdrop-blur hover:bg-white/30 transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard value={`₹${driverProfile?.total_earnings || 0}`} label="Total Earnings" />
        <StatCard value={(driverProfile?.completed_rides || 0).toString()} label="Total trips" />
        <StatCard value={rating.toString()} label="Rating" />
      </div>
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 font-extrabold">Account details</h2>
        {!isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {info.map(([label, value, Icon]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
                  {label === "Phone" ? (
                    <InteractivePhone
                      phone={value}
                      className="text-sm font-semibold text-foreground"
                    />
                  ) : (
                    <p className="font-semibold text-sm truncate">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-semibold text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-semibold text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-semibold text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Address
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-semibold text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>
      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-4 font-bold text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </DriverShell>
  );
}
