import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Car, Star, Clock, Power, ArrowRight, Zap, X, FileText, Upload, ShieldAlert } from "lucide-react";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { StatCard, PageHeader, Pill, Avatar } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { cn } from "@/shared/utils/cn";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { resolveAssetUrl } from "@/shared/utils/resolveAssetUrl";
import { apiFetch } from "@/lib/api";

export function DriverDashboard() {
  const navigate = useNavigate();
  const { profile, driverProfile, refreshProfile } = useAuth();
  const [online, setOnline] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  // Sync online status from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("driver_online_status");
    setOnline(stored === null ? true : stored === "true");
  }, []);
  const [onlineTime, setOnlineTime] = useState("0s");
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ earnings: 0, trips: 0 });
  const [liveRating, setLiveRating] = useState<number | null>(null);
  const [ratingSum, setRatingSum] = useState<number>(0);
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  // Auto-check for active ongoing ride for driver on mount or login
  useEffect(() => {
    if (!profile?.id) return;
    const profileId = profile.id;
    async function checkDriverActiveRide() {
      try {
        const { data: dProf } = await (supabase as any)
          .from("driver_profiles")
          .select("id")
          .eq("profile_id", profileId)
          .maybeSingle();

        if (dProf?.id) {
          const { data: activeRides } = await (supabase as any)
            .from("rides")
            .select("id, status")
            .eq("driver_id", dProf.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (activeRides && activeRides.length > 0) {
            const ride = activeRides[0];
            const s = (ride.status || "").toLowerCase();

            if (s === "driver accepted" || s === "accepted" || s === "driver arrived" || s === "arriving") {
              localStorage.setItem("driver_active_ride_id", String(ride.id));
              navigate({ to: "/driver/arrived", replace: true });
            } else if (s === "ride started" || s === "in_progress") {
              localStorage.setItem("driver_active_ride_id", String(ride.id));
              navigate({ to: "/driver/active", replace: true });
            }
          }
        }
      } catch (err) {
        console.error("Failed to check driver active ride:", err);
      }
    }
    checkDriverActiveRide();
  }, [profile?.id, navigate]);

  useEffect(() => {
    localStorage.setItem("driver_online_status", online.toString());

    if (!profile?.id) return;

    // Helper to format seconds for UI display
    const formatDisplay = (totalSecs: number) => {
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    };

    // 1. Check Date boundary for 24 hours daily reset
    const todayDate = new Date().toDateString();
    const storedDate = localStorage.getItem("driver_online_date");
    if (storedDate !== todayDate) {
      localStorage.setItem("driver_online_date", todayDate);
      localStorage.setItem("driver_online_seconds", "0");
      supabase
        .from("driver_profiles")
        .update({ online_seconds: 0 })
        .eq("id", profile.id)
        .catch(err => console.error("Error resetting daily online seconds:", err));
    }

    // Load initial seconds
    let seconds = parseInt(localStorage.getItem("driver_online_seconds") || "0", 10);

    if (!online) {
      setOnlineTime("Offline");
      // Sync immediately when going offline
      supabase
        .from("driver_profiles")
        .update({ online_seconds: seconds, status: "offline" })
        .eq("id", profile.id)
        .catch(err => console.error("Error updating offline status:", err));
      return;
    }

    // If online, sync status to online
    supabase
      .from("driver_profiles")
      .update({ status: "online" })
      .eq("id", profile.id)
      .catch(err => console.error("Error updating online status:", err));

    setOnlineTime(formatDisplay(seconds));

    let tickCount = 0;
    const interval = setInterval(() => {
      // Check date boundary within running session
      const currentToday = new Date().toDateString();
      if (localStorage.getItem("driver_online_date") !== currentToday) {
        localStorage.setItem("driver_online_date", currentToday);
        seconds = 0;
        localStorage.setItem("driver_online_seconds", "0");
        supabase
          .from("driver_profiles")
          .update({ online_seconds: 0 })
          .eq("id", profile.id)
          .catch(err => console.error("Error resetting daily online seconds:", err));
      }

      seconds += 1;
      localStorage.setItem("driver_online_seconds", seconds.toString());
      setOnlineTime(formatDisplay(seconds));

      // Periodically sync online_seconds to the database every 10 seconds
      tickCount += 1;
      if (tickCount >= 10) {
        tickCount = 0;
        supabase
          .from("driver_profiles")
          .update({ online_seconds: seconds })
          .eq("id", profile.id)
          .catch(err => console.error("Error syncing online seconds:", err));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      // Sync on unmount
      if (online) {
        supabase
          .from("driver_profiles")
          .update({ online_seconds: seconds })
          .eq("id", profile.id)
          .catch(err => console.error("Error syncing online seconds on unmount:", err));
      }
    };
  }, [online, profile?.id]);

  const driverName = profile?.full_name ? profile.full_name.split(" ")[0] : "Driver";
  const avgRating = liveRating !== null ? Number(liveRating).toFixed(2) : Number(driverProfile?.rating || 5.0).toFixed(2);
  const driverRating = `${avgRating}`;
  const avatarUrl = resolveAssetUrl(
    (driverProfile as any)?.profile_photo ||
    driverProfile?.profile_photo_url ||
    (profile as any)?.profile_image ||
    profile?.avatar_url
  );

  const loadDashboardData = async () => {
    if (!profile?.id) return;
    try {
      // 1. Fetch nearby searching requests (only if driver is online)
      if (online) {
        const { data: rideRequests } = await supabase
          .from("rides")
          .select(`
            id,
            pickup_address,
            dropoff_address,
            fare,
            distance,
            rider:profiles!rides_rider_id_fkey(full_name)
          `)
          .eq("status", "searching")
          .order("created_at", { ascending: false })
          .limit(3);

        if (rideRequests) {
          setRequests(
            rideRequests.map((r: any) => ({
              id: r.id,
              rider: r.rider?.full_name || "Passenger",
              from: r.pickup_address,
              to: r.dropoff_address,
              fare: r.fare,
              km: `${r.distance} km`,
              pickupAway: "1.2 km",
              pay: "UPI",
            }))
          );
        }
      } else {
        setRequests([]);
      }

      // 2. Fetch driver stats for today
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const { data: completedRides } = await supabase
        .from("rides")
        .select("fare")
        .eq("driver_id", profile.id)
        .eq("status", "completed")
        .gte("created_at", `${todayStr}T00:00:00.000Z`);

      if (completedRides) {
        const earnings = completedRides.reduce((sum: number, r: any) => sum + Number(r.fare || 0), 0);
        setStats({
          earnings,
          trips: completedRides.length,
        });
      }

      // 3. Fetch latest driver profile rating dynamically
      const { data: dProf } = await supabase
        .from("driver_profiles")
        .select("rating, id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (dProf) {
        setLiveRating(dProf.rating);
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("rating, comment, created_at")
          .eq("driver_id", dProf.id)
          .order("created_at", { ascending: false });
        if (ratingsData) {
          const sum = ratingsData.reduce((acc: number, r: any) => acc + Number(r.rating), 0);
          setRatingSum(sum);
          setReviewsList(ratingsData);
        }
      }
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    const status = (driverProfile?.verification_status || "").toLowerCase();
    if (status !== "approved" && status !== "verified" && online) {
      setOnline(false);
      localStorage.setItem("driver_online_status", "false");
    }
  }, [driverProfile?.verification_status]);

  const handleToggleOnline = () => {
    const status = (driverProfile?.verification_status || "").toLowerCase();
    if (status !== "approved" && status !== "verified") {
      alert(`Waiting for Admin Verification. Your account verification status is "${driverProfile?.verification_status || "Pending"}". You cannot go online or accept rides until an administrator verifies your account.`);
      return;
    }
    setOnline(!online);
  };

  const handleAccept = async (rideId: string) => {
    if (!profile?.id) return;
    const status = (driverProfile?.verification_status || "").toLowerCase();
    if (status !== "approved" && status !== "verified") {
      alert("Verification required. You must be verified by an admin before accepting rides.");
      return;
    }
    try {
      const { error } = await supabase
        .from("rides")
        .update({
          driver_id: profile.id,
          status: "accepted" as any,
        })
        .eq("id", rideId);

      if (error) throw new Error(error.message);

      localStorage.setItem("driver_active_ride_id", rideId);
      alert("Ride accepted! Heading to pickup.");
      navigate({ to: "/driver/arrived", replace: true });
    } catch (err: any) {
      alert("Failed to accept ride: " + err.message);
    }
  };

  const isVerified = (driverProfile?.verification_status || "").toLowerCase() === "verified" || (driverProfile?.verification_status || "").toLowerCase() === "approved";
  const isRejected = (driverProfile?.verification_status || "").toLowerCase() === "rejected";

  return (
    <DriverShell>
      {/* Verification Status Banner */}
      {!isVerified && (
        <div className={cn(
          "mb-6 rounded-2xl border p-5 text-sm shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
          isRejected ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          <div className="flex items-start gap-3">
            {isRejected ? <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5" /> : <Clock className="h-6 w-6 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold text-base">
                {isRejected ? "Document Verification Rejected" : "Waiting for Admin Verification"}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {isRejected
                  ? `Your document verification has been rejected. Reason: "${driverProfile?.rejection_reason || "Your document verification was rejected."}". Please review the reason and upload the required documents again.`
                  : "Your profile photo and driving licence are currently under review by our admin team. You cannot go online or accept ride requests until verified."
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowResubmitModal(true)}
              className="rounded-xl gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
            >
              {isRejected ? "Re-submit Documents" : "Upload Documents"}
            </button>
            <Link
              to="/driver/verification"
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
            >
              View Status
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Avatar
            label={driverName[0]}
            src={avatarUrl}
            className="h-14 w-14 text-lg border-2 border-primary shadow-soft"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Hi, {driverName}</h1>
            <p className="text-xs text-muted-foreground">
              {!isVerified ? "Status: Waiting for Admin Verification" : "Welcome back, let's make some trips today"}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleOnline}
          disabled={!isVerified}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2.5 font-bold text-white shadow-glow transition-colors",
            !isVerified ? "bg-muted cursor-not-allowed opacity-60" : (online ? "bg-success" : "bg-muted-foreground"),
          )}
        >
          <Power className="h-4 w-4" /> {online ? "Online" : "Offline"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          value={`₹${stats.earnings}`}
          label="Today's earnings"
          icon={<TrendingUp />}
        />
        <StatCard value={stats.trips} label="Trips today" icon={<Car />} />
        <StatCard value={onlineTime} label={online ? "Online time" : "Offline time"} icon={<Clock />} />
      </div>

      {/* Ratings & Reviews Box */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-lg font-extrabold mb-4">Ratings & Reviews</h3>
        <div className="flex items-center gap-4 border-b border-border pb-4 mb-4">
          <div className="text-4xl font-extrabold text-foreground">{avgRating}</div>
          <div>
            <div className="flex text-warning">
              {Array.from({ length: 5 }).map((_, i) => (
                <Zap
                  key={i}
                  className={cn(
                    "h-5 w-5",
                    i < Math.round(Number(avgRating)) ? "fill-warning text-warning" : "text-muted"
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
                      <Zap
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

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Nearby ride requests</h2>
        <Link to="/driver/requests" className="text-sm font-semibold text-primary">
          View all
        </Link>
      </div>
      <div className="mt-3 space-y-3">
        {requests.length > 0 ? (
          requests.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.05}>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{r.rider}</p>
                    <Pill tone="brand">{r.pickupAway} away</Pill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.from} → {r.to}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.km} · {r.pay}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-extrabold">₹{r.fare}</p>
                  <button
                    onClick={() => handleAccept(r.id)}
                    className="flex items-center gap-1.5 rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform"
                  >
                    Accept <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Reveal>
          ))
        ) : (
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-soft">
              No incoming ride requests nearby.
            </div>
          </Reveal>
        )}
      </div>

      {/* Re-submit Documents Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <button
              onClick={() => setShowResubmitModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground">Re-submit Documents</h3>
                <p className="text-xs text-muted-foreground">Upload new files and update license number for admin verification</p>
              </div>
            </div>

            {isRejected && (
              <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <span className="font-bold">Rejection Reason:</span> {driverProfile?.rejection_reason || "Document verification rejected."}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setResubmitting(true);
                try {
                  const photoEl = document.getElementById("dashResubmitPhoto") as HTMLInputElement;
                  const licenceEl = document.getElementById("dashResubmitLicence") as HTMLInputElement;
                  const numEl = document.getElementById("dashResubmitNum") as HTMLInputElement;

                  const photoFile = photoEl?.files?.[0];
                  const licenceFile = licenceEl?.files?.[0];
                  const licenceNum = numEl?.value;

                  if (photoFile) {
                    const minB = 10 * 1024; // 10 KB
                    const maxB = 2 * 1024 * 1024; // 2 MB
                    if (photoFile.size < minB || photoFile.size > maxB) {
                      alert(`Profile photo must be up to 2 MB. Size: ${(photoFile.size / (1024 * 1024)).toFixed(2)} MB`);
                      setResubmitting(false);
                      return;
                    }
                  }

                  const formData = new FormData();
                  if (photoFile) formData.append("profilePhoto", photoFile);
                  if (licenceFile) formData.append("licenseImage", licenceFile);
                  if (licenceNum) formData.append("drivingLicenceNumber", licenceNum);

                  const token = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || localStorage.getItem("zipride_jwt_token");
                  const res = await apiFetch("/api/v1/driver/upload-docs", {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: formData,
                  });

                  const json = await res.json();
                  if (res.ok) {
                    alert("Documents resubmitted successfully! Status updated to Pending.");
                    setShowResubmitModal(false);
                    if (refreshProfile) await refreshProfile();
                    window.location.reload();
                  } else {
                    alert("Resubmission failed: " + (json.message || "Unknown error"));
                  }
                } catch (err: any) {
                  alert("Failed to resubmit documents: " + err.message);
                } finally {
                  setResubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Driving Licence Number
                </label>
                <input
                  id="dashResubmitNum"
                  type="text"
                  placeholder="Enter driving licence number"
                  defaultValue={driverProfile?.license_number || driverProfile?.driving_licence_number || ""}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  New Profile Photo (Up to 2 MB, JPG/PNG/WEBP)
                </label>
                <input
                  id="dashResubmitPhoto"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  New Driving Licence Document (JPG/PNG/WEBP/PDF)
                </label>
                <input
                  id="dashResubmitLicence"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="flex-1 rounded-xl gradient-brand py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50"
                >
                  {resubmitting ? "Resubmitting..." : "Submit Documents"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DriverShell>
  );
}
