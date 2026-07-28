import { useEffect, useState } from "react";
import {
  Star, Search, Phone, Mail, Car, CreditCard, User,
  FileText, Shield, ShieldOff, Trash2, RefreshCw, ChevronDown, ChevronUp, Image, X
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { Pill, Avatar, InteractivePhone } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { resolveAssetUrl } from "@/shared/utils/resolveAssetUrl";
import { apiFetch } from "@/lib/api";



function getAuthHeaders(): HeadersInit {
  const jwtToken = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token");
  return {
    "Content-Type": "application/json",
    ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
  };
}

const statusTone = (status: string) => {
  if (status === "Online") return "success";
  if (status === "On Trip") return "brand";
  if (status === "Approved") return "success";
  if (status === "Pending") return "warning";
  if (status === "Banned" || status === "Rejected") return "destructive";
  return "muted";
};

function formatOnlineTime(seconds: number | undefined | null): string {
  if (!seconds) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds % 60}s`;
}

export function DriverMgmt() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  const loadDrivers = async (search = "") => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiFetch(`/api/v1/admin/drivers${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        alert("Your session has expired. Please log in again.");
        sessionStorage.clear();
        localStorage.removeItem("zipride_admin_session_backup");
        localStorage.removeItem("jwt_token");
        window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDrivers(json.data);
      }
    } catch (err) {
      console.error("Error loading drivers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadDrivers(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Live update online drivers' time in real-time on dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers((prevDrivers) => {
        const hasOnline = prevDrivers.some((d) => d.is_online === 1 && !d.is_banned);
        if (!hasOnline) return prevDrivers;
        return prevDrivers.map((d) => {
          if (d.is_online === 1 && !d.is_banned) {
            return {
              ...d,
              online_seconds: (d.online_seconds || 0) + 1,
            };
          }
          return d;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleBanToggle = async (d: any) => {
    setActingId(d.driver_id);
    try {
      const action = d.is_banned ? "unblock" : "block";
      const res = await apiFetch(`/api/v1/admin/user/${d.profile_id}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok) {
        alert(`Driver has been ${d.is_banned ? "unblocked" : "blocked"} successfully.`);
        loadDrivers(searchTerm);
      } else {
        alert("Error: " + (json.message || "Action failed"));
      }
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (d: any) => {
    if (!window.confirm(`Permanently delete driver "${d.full_name}"? This cannot be undone.`)) return;
    setActingId(d.driver_id);
    try {
      const res = await apiFetch(`/api/v1/admin/driver/${d.driver_id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok) {
        alert("Driver has been permanently deleted.");
        loadDrivers(searchTerm);
      } else {
        alert("Error: " + (json.message || "Failed to delete driver"));
      }
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setActingId(null);
    }
  };

  const handleVerificationAction = async (d: any, action: "approve" | "reject") => {
    setActingId(d.driver_id);
    try {
      const res = await apiFetch(`/api/v1/admin/driver/${d.driver_id}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok) {
        alert(`Driver ${action === "approve" ? "approved" : "rejected"} successfully.`);
        loadDrivers(searchTerm);
      } else {
        alert("Error: " + (json.message || "Action failed"));
      }
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setActingId(null);
    }
  };

  const getStatus = (d: any) => {
    if (d.is_banned) return "Banned";
    const vs = (d.verification_status || "").toLowerCase();
    if (vs === "approved") {
      return d.is_online ? "Online" : "Offline";
    }
    if (vs === "rejected") return "Rejected";
    return "Pending";
  };

  return (
    <AdminShell
      title="Driver Management"
      subtitle={`${drivers.length} registered drivers`}
    >
      {/* Search + Refresh bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search by name, phone, email, license…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => loadDrivers(searchTerm)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading drivers…
        </div>
      )}

      {/* Driver Cards Grid */}
      {!loading && (
        <div className="space-y-4">
          {drivers.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No drivers found.</p>
            </div>
          )}

          {drivers.map((d, i) => {
            const status = getStatus(d);
            const isExpanded = expandedId === d.driver_id;
            const isPending = (d.verification_status || "").toLowerCase() === "pending";
            const isApproved = (d.verification_status || "").toLowerCase() === "approved";
            const photoUrl = resolveAssetUrl(d.profile_photo_url);
            const licenseUrl = resolveAssetUrl(d.license_image_url);
            const vehicle = d.vehicle_make
              ? `${d.vehicle_color || ""} ${d.vehicle_make} ${d.vehicle_model}`.trim()
              : "No vehicle";

            return (
              <Reveal key={d.driver_id} delay={i * 0.03}>
                <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
                  {/* Card Header — always visible */}
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : d.driver_id)}
                  >
                    <Avatar
                      label={(d.full_name || "U")[0].toUpperCase()}
                      src={photoUrl}
                      className="h-14 w-14 text-lg shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                      onClick={(e) => {
                        if (photoUrl) {
                          e.stopPropagation();
                          setPreviewImage({ url: photoUrl, label: `${d.full_name}'s Profile Photo` });
                        }
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base">{d.full_name || "Unknown Driver"}</p>
                        <Pill tone={statusTone(status) as any}>{status}</Pill>
                        {d.is_banned && <Pill tone="destructive">Banned</Pill>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <InteractivePhone phone={d.phone} className="text-xs text-muted-foreground" />
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {d.email || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="hidden sm:flex items-center gap-6 text-center shrink-0">
                      <div>
                        <p className="text-lg font-extrabold text-primary">{d.completed_rides ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Trips</p>
                      </div>
                      <div>
                        <p className="text-lg font-extrabold flex items-center gap-0.5">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          {parseFloat(d.rating || 5).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Rating</p>
                      </div>
                      <div>
                        <p className="text-lg font-extrabold">₹{Number(d.total_earnings || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Earnings</p>
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-brand">{formatOnlineTime(d.online_seconds)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Online Time</p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/20 px-5 py-5 space-y-5">
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoCard label="License No." value={d.license_number || "—"} />
                        <InfoCard label="Verification" value={d.verification_status || "Pending"} />
                        <InfoCard label="Total Rides" value={String(d.total_rides ?? 0)} />
                        <InfoCard label="Completed" value={String(d.completed_rides ?? 0)} />
                        <InfoCard label="Earnings" value={`₹${Number(d.total_earnings || 0).toLocaleString()}`} />
                        <InfoCard label="Rating" value={`★ ${parseFloat(d.rating || 5).toFixed(2)}`} />
                        <InfoCard label="Online Time" value={formatOnlineTime(d.online_seconds)} />
                        <InfoCard label="Joined" value={d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"} />
                      </div>

                      {/* Documents */}
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Verification Documents</p>
                        <div className="flex gap-3">
                          {/* Profile Photo */}
                           {photoUrl ? (
                            <div
                              onClick={() => setPreviewImage({ url: photoUrl, label: `${d.full_name}'s Profile Photo` })}
                              className="flex-1 group relative overflow-hidden rounded-xl border border-border max-w-[200px] cursor-zoom-in"
                            >
                              <img
                                src={photoUrl}
                                alt="Profile Photo"
                                className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1.5 flex items-center justify-center gap-1">
                                <User className="h-3 w-3" /> Profile Photo
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 max-w-[200px] h-36 flex flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground gap-2">
                              <Image className="h-6 w-6 opacity-30" />
                              <p className="text-xs">No photo</p>
                            </div>
                          )}

                          {/* License */}
                           {licenseUrl ? (
                            <div
                              onClick={() => setPreviewImage({ url: licenseUrl, label: `${d.full_name}'s Driving License` })}
                              className="flex-1 group relative overflow-hidden rounded-xl border border-border max-w-[200px] cursor-zoom-in"
                            >
                              <img
                                src={licenseUrl}
                                alt="Driving License"
                                className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1.5 flex items-center justify-center gap-1">
                                <FileText className="h-3 w-3" /> Driving License
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 max-w-[200px] h-36 flex flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground gap-2">
                              <FileText className="h-6 w-6 opacity-30" />
                              <p className="text-xs">No license</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-1">
                        {/* Verification actions (pending only) */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleVerificationAction(d, "approve")}
                              disabled={actingId === d.driver_id}
                              className="flex items-center gap-1.5 rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50"
                            >
                              <Shield className="h-4 w-4" /> Approve Driver
                            </button>
                            <button
                              onClick={() => handleVerificationAction(d, "reject")}
                              disabled={actingId === d.driver_id}
                              className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              <ShieldOff className="h-4 w-4" /> Reject
                            </button>
                          </>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(d)}
                          disabled={actingId === d.driver_id}
                          className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50 ml-auto"
                        >
                          <Trash2 className="h-4 w-4" /> Delete Driver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card border border-border rounded-3xl p-2 overflow-hidden shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.label}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain mx-auto"
            />
            <div className="text-center py-3 text-sm font-semibold text-muted-foreground">
              {previewImage.label}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}
