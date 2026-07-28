import { useEffect, useState } from "react";
import {
  FileText, Check, X, User, Phone, Mail, CreditCard,
  Calendar, RefreshCw, Image, Car, Shield, ShieldOff,
  ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Download, Eye
} from "lucide-react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { Pill, Avatar, InteractivePhone } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { resolveAssetUrl } from "@/shared/utils/resolveAssetUrl";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const jwtToken = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token");
  return {
    "Content-Type": "application/json",
    ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
  };
}

function DocBox({
  url,
  label,
  icon: Icon,
  onPreview
}: {
  url: string;
  label: string;
  icon: any;
  onPreview?: (url: string, label: string) => void;
}) {
  if (!url) {
    return (
      <div className="flex-1 h-44 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/30 text-muted-foreground gap-2 p-3">
        <Icon className="h-7 w-7 opacity-30" />
        <p className="text-xs font-medium">Not uploaded</p>
        <p className="text-[10px] opacity-60">{label}</p>
      </div>
    );
  }
  return (
    <div className="flex-1 group relative flex flex-col overflow-hidden rounded-2xl border border-border shadow-soft bg-card">
      <div
        onClick={(e) => {
          if (onPreview) {
            e.preventDefault();
            onPreview(url, label);
          }
        }}
        className="relative h-36 w-full overflow-hidden cursor-zoom-in bg-black/5"
      >
        <img
          src={url}
          alt={label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e: any) => {
            e.target.style.display = "none";
            if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
          }}
        />
        <div
          style={{ display: "none" }}
          className="w-full h-full flex flex-col items-center justify-center bg-secondary text-muted-foreground gap-1"
        >
          <Icon className="h-6 w-6 opacity-40" />
          <p className="text-xs">Document File</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-[11px] font-semibold px-2 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 truncate"><Icon className="h-3 w-3" /> {label}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 p-2 bg-muted/30 border-t border-border">
        <button
          type="button"
          onClick={() => onPreview && onPreview(url, label)}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-2 rounded-xl border border-border bg-background hover:bg-secondary transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> View Image
        </button>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function Verifications() {
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [acting, setActing] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  const loadVerifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/admin/verifications", {
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAll(
          json.data.map((d: any) => ({
            id: d.driver_id,
            profileId: d.profile_id,
            name: d.full_name || "Unknown Driver",
            phone: d.phone || "—",
            email: d.email || "—",
            licenseNumber: d.license_number || "Not provided",
            driverCode: d.driver_code || "—",
            car: d.vehicle_make
              ? `${d.vehicle_color || ""} ${d.vehicle_make} ${d.vehicle_model}`.trim()
              : null,
            plate: d.license_plate || null,
            verificationStatus: (d.verification_status || "Pending"),
            profilePhotoUrl: resolveAssetUrl(d.profile_photo_url),
            licenseImageUrl: resolveAssetUrl(d.license_image_url),
            submittedAt: d.created_at
              ? new Date(d.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—",
          }))
        );
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: any) {
      console.error("Verifications load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setActing(id);
    try {
      const reason = rejectReasons[id];
      const res = await apiFetch(`/api/v1/admin/driver/${id}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const json = await res.json();
      if (res.ok) {
        await loadVerifications();
        setExpandedId(null);
      } else {
        alert("Action failed: " + (json.message || "Unknown error"));
      }
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setActing(null);
    }
  };

  const statusOf = (v: any) => {
    const s = (v.verificationStatus || "").toLowerCase();
    if (s === "approved") return "approved";
    if (s === "rejected") return "rejected";
    return "pending";
  };

  const filtered = all.filter((v) => {
    const s = statusOf(v);
    if (tab === "all") return true;
    if (tab === "verified") return s === "approved";
    return s === tab;
  });

  const counts = {
    pending: all.filter((v) => statusOf(v) === "pending").length,
    verified: all.filter((v) => statusOf(v) === "approved").length,
    rejected: all.filter((v) => statusOf(v) === "rejected").length,
    all: all.length,
  };

  const TAB_CFG = [
    { key: "pending", label: "Pending", icon: Clock, color: "text-warning" },
    { key: "verified", label: "Verified", icon: CheckCircle2, color: "text-success" },
    { key: "rejected", label: "Rejected", icon: XCircle, color: "text-destructive" },
    { key: "all", label: "All", icon: User, color: "text-primary" },
  ] as const;

  return (
    <AdminShell
      title="Driver Verifications"
      subtitle={`${counts.pending} pending · ${counts.verified} approved · ${all.length} total`}
    >
      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        {TAB_CFG.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === key
                ? "gradient-brand text-primary-foreground shadow-glow"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icon className={`h-4 w-4 ${tab === key ? "text-primary-foreground" : color}`} />
            {label}
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === key ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {counts[key]}
            </span>
          </button>
        ))}

        <button
          onClick={loadVerifications}
          disabled={loading}
          className="ml-auto flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 mb-4 text-destructive text-sm font-medium">
          ⚠️ Failed to load verifications: {error}
          <button
            onClick={loadVerifications}
            className="ml-3 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-32" />
                  <div className="h-3 bg-secondary rounded w-24" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 h-36 bg-secondary rounded-xl" />
                <div className="flex-1 h-36 bg-secondary rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card py-20 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-lg">No {tab} verifications</p>
          <p className="text-sm mt-1 opacity-70">
            {tab === "pending"
              ? "All driver applications have been reviewed."
              : "Nothing here yet."}
          </p>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((v, i) => {
            const status = statusOf(v);
            const isExpanded = expandedId === v.id;

            return (
              <Reveal key={v.id} delay={i * 0.04}>
                <div
                  className={`rounded-2xl border bg-card shadow-soft overflow-hidden transition-all ${
                    status === "approved"
                      ? "border-success/30"
                      : status === "rejected"
                      ? "border-destructive/20"
                      : "border-warning/30"
                  }`}
                >
                  {/* ── Card Header ─────────────────────────────── */}
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  >
                    <Avatar
                      label={v.name[0].toUpperCase()}
                      src={v.profilePhotoUrl}
                      className="h-14 w-14 text-lg shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                      onClick={(e) => {
                        if (v.profilePhotoUrl) {
                          e.stopPropagation();
                          setPreviewImage({ url: v.profilePhotoUrl, label: `${v.name}'s Profile Photo` });
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base truncate">{v.name}</p>
                        <Pill
                          tone={
                            status === "approved"
                              ? "success"
                              : status === "rejected"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {status === "approved"
                            ? "✓ Verified"
                            : status === "rejected"
                            ? "✗ Rejected"
                            : "⏳ Pending"}
                        </Pill>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Submitted {v.submittedAt}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  {/* ── VERIFIED: Full Detail View ───────────────── */}
                  {status === "approved" && isExpanded && (
                    <div className="border-t border-success/20 bg-success/5 px-5 py-5 space-y-4">
                      <div className="flex items-center gap-2 text-success font-bold text-sm">
                        <CheckCircle2 className="h-5 w-5" />
                        Verification Complete — All Details
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoBox label="Full Name" value={v.name} icon={User} />
                        <InfoBox label="Phone" value={<InteractivePhone phone={v.phone} />} icon={Phone} />
                        <InfoBox label="Email" value={v.email} icon={Mail} />
                        <InfoBox label="License No." value={v.licenseNumber} icon={CreditCard} />
                        <InfoBox label="Submitted" value={v.submittedAt} icon={Calendar} />
                      </div>

                      {/* Documents */}
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-3">
                          Submitted Documents
                        </p>
                        <div className="flex gap-3">
                          <DocBox url={v.profilePhotoUrl} label="Profile Photo" icon={User} onPreview={(url, label) => setPreviewImage({ url, label })} />
                          <DocBox url={v.licenseImageUrl} label="Driving License" icon={FileText} onPreview={(url, label) => setPreviewImage({ url, label })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PENDING: Review View ────────────────────── */}
                  {status === "pending" && isExpanded && (
                    <div className="border-t border-warning/20 bg-warning/5 px-5 py-5 space-y-4">
                      <div className="flex items-center gap-2 text-warning font-bold text-sm">
                        <Clock className="h-5 w-5" />
                        Pending Verification — Submitted Details
                      </div>

                      {/* Submitted info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoBox label="Full Name" value={v.name} icon={User} />
                        <InfoBox label="Phone" value={<InteractivePhone phone={v.phone} />} icon={Phone} />
                        <InfoBox label="Email" value={v.email} icon={Mail} />
                        <InfoBox label="License No." value={v.licenseNumber} icon={CreditCard} />
                        <InfoBox label="Submitted" value={v.submittedAt} icon={Calendar} />
                      </div>

                      {/* Both documents */}
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-3">
                          Verification Documents
                        </p>
                        <div className="flex gap-3">
                          <DocBox url={v.profilePhotoUrl} label="Profile Photo" icon={User} onPreview={(url, label) => setPreviewImage({ url, label })} />
                          <DocBox url={v.licenseImageUrl} label="Driving License" icon={FileText} onPreview={(url, label) => setPreviewImage({ url, label })} />
                        </div>
                      </div>

                      {/* Rejection reason */}
                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                          Rejection Reason (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Documents unclear, license expired…"
                          value={rejectReasons[v.id] || ""}
                          onChange={(e) =>
                            setRejectReasons((prev) => ({
                              ...prev,
                              [v.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleAction(v.id, "reject")}
                          disabled={acting === v.id}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-3 font-bold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          {acting === v.id ? "Processing…" : "Reject"}
                        </button>
                        <button
                          onClick={() => handleAction(v.id, "approve")}
                          disabled={acting === v.id}
                          className="flex items-center justify-center gap-1.5 rounded-xl gradient-brand py-3 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          {acting === v.id ? "Processing…" : "Approve Driver"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── REJECTED: Details View ──────────────────── */}
                  {status === "rejected" && isExpanded && (
                    <div className="border-t border-destructive/20 bg-destructive/5 px-5 py-5 space-y-4">
                      <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                        <XCircle className="h-5 w-5" />
                        Rejected Application — Submitted Details
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoBox label="Full Name" value={v.name} icon={User} />
                        <InfoBox label="Phone" value={<InteractivePhone phone={v.phone} />} icon={Phone} />
                        <InfoBox label="Email" value={v.email} icon={Mail} />
                        <InfoBox label="License No." value={v.licenseNumber} icon={CreditCard} />
                      </div>

                      <div className="flex gap-3">
                        <DocBox url={v.profilePhotoUrl} label="Profile Photo" icon={User} onPreview={(url, label) => setPreviewImage({ url, label })} />
                        <DocBox url={v.licenseImageUrl} label="Driving License" icon={FileText} onPreview={(url, label) => setPreviewImage({ url, label })} />
                      </div>

                      {/* Option to re-approve */}
                      <button
                        onClick={() => handleAction(v.id, "approve")}
                        disabled={acting === v.id}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl gradient-brand py-3 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50"
                      >
                        <Shield className="h-4 w-4" />
                        {acting === v.id ? "Processing…" : "Re-Approve Driver"}
                      </button>
                    </div>
                  )}

                  {/* Collapsed indicator for non-pending */}
                  {!isExpanded && (
                    <div className="px-5 pb-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <InteractivePhone phone={v.phone} className="text-xs text-muted-foreground" />
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> {v.licenseNumber}
                      </span>
                      <span className="ml-auto text-[10px] opacity-60">Click to expand</span>
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground leading-tight">
          {label}
        </p>
        <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}
