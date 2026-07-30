import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, CheckCircle2, Clock, FileText, Image, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/shared/components/brand/Logo";
import { Reveal } from "@/shared/components/kit/Reveal";
import { InteractivePhone } from "@/shared/components/kit/Primitives";
import { resolveAssetUrl } from "@/shared/utils/resolveAssetUrl";
import { apiFetch } from "@/lib/api";

type VerificationStatus = "approved" | "pending" | "rejected";

interface VerificationState {
  status: VerificationStatus;
  fullName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  vehicle: string;
  driverCode: string;
  submittedAt: string;
  profilePhotoUrl: string;
  licenseImageUrl: string;
}

const EMPTY_STATE: VerificationState = {
  status: "pending",
  fullName: "",
  phone: "",
  email: "",
  licenseNumber: "",
  vehicle: "",
  driverCode: "",
  submittedAt: "",
  profilePhotoUrl: "",
  licenseImageUrl: "",
};



function normalizeStatus(value?: string | null): VerificationStatus {
  const status = (value || "pending").toLowerCase();
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DocCard({ url, label, icon: Icon }: { url: string; label: string; icon: any }) {
  if (!url) {
    return (
      <div className="flex-1 min-h-[160px] rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center text-muted-foreground">
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <Icon className="h-6 w-6 opacity-40" />
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs opacity-70">Not uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex-1 overflow-hidden rounded-2xl border border-border shadow-soft"
    >
      <img
        src={url}
        alt={label}
        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={(event: any) => {
          event.target.style.display = "none";
          event.target.nextSibling.style.display = "flex";
        }}
      />
      <div
        style={{ display: "none" }}
        className="flex h-40 w-full flex-col items-center justify-center bg-secondary/70 text-muted-foreground"
      >
        <Icon className="h-6 w-6 opacity-40" />
        <p className="mt-2 text-xs">Image unavailable</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent py-2 text-xs font-semibold text-white">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
    </a>
  );
}

export function Verification() {
  const { profile, driverProfile, loading: authLoading } = useAuth();
  const [verification, setVerification] = useState<VerificationState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVerification = async () => {
      if (!profile || profile.role !== "driver") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: driverData, error: driverError } = await supabase
          .from("driver_profiles")
          .select("*")
          .eq("profile_id", profile.id)
          .maybeSingle();

        if (driverError) throw driverError;

        let documentRow: any = null;
        if (driverData?.id) {
          const { data, error } = await supabase
            .from("driver_documents")
            .select("*")
            .eq("driver_id", driverData.id)
            .maybeSingle();

          if (error) throw error;
          documentRow = data;
        }

        const rawPhoto = documentRow?.profile_photo || documentRow?.profile_photo_url || documentRow?.profilePhoto || driverData?.profile_photo || driverData?.driving_licence_image;
        const rawLicense = documentRow?.license_photo || documentRow?.license_image_url || documentRow?.drivingLicense || driverData?.driving_licence_image || driverData?.license_image_url;

        setVerification({
          status: normalizeStatus(driverData?.verification_status ?? driverProfile?.verification_status),
          fullName: profile.full_name || "Unknown Driver",
          phone: profile.phone || "—",
          email: profile.email || "—",
          licenseNumber: driverData?.license_number || "Not provided",
          vehicle: driverData?.vehicle_type || "Not provided",
          driverCode: driverData?.driver_code || "—",
          submittedAt: formatDate(driverData?.created_at || driverProfile?.created_at),
          profilePhotoUrl: resolveAssetUrl(rawPhoto),
          licenseImageUrl: resolveAssetUrl(rawLicense),
        });
      } catch (err: any) {
        console.error("Verification page load error:", err);
        setError(err.message || "Unable to load verification details.");
      } finally {
        setLoading(false);
      }
    };

    loadVerification();
  }, [profile, driverProfile]);

  const isApproved = verification.status === "approved";
  const isPending = verification.status === "pending";
  const isRejected = verification.status === "rejected";

  const heading = isApproved
    ? "Verification complete"
    : isRejected
      ? "Verification needs attention"
      : "Verification in progress";

  const description = isApproved
    ? "Your driver verification has been approved and your details are ready to use."
    : isRejected
      ? "Your documents were rejected. Please re-submit the required details and try again."
      : "We are reviewing your submitted documents. This usually takes 24–48 hours.";

  const statusIcon = isApproved ? <CheckCircle2 className="h-10 w-10" /> : <Clock className="h-10 w-10" />;
  const statusTone = isApproved ? "bg-success/15 text-success" : isPending ? "bg-warning/20 text-warning-foreground" : "bg-destructive/10 text-destructive";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
      <Reveal className="w-full max-w-3xl">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
          <LogoMark className="mx-auto mb-5 h-12 w-12" />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mx-auto grid h-20 w-20 place-items-center rounded-full ring-8 ${statusTone} ${isApproved ? "ring-success/10" : isRejected ? "ring-destructive/10" : "ring-warning/10"}`}
          >
            {statusIcon}
          </motion.div>

          <h1 className="mt-5 text-2xl font-extrabold">{heading}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>

          {(loading || authLoading) && (
            <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              Loading your verification details…
            </div>
          )}

          {error && !loading && (
            <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-6 space-y-5 text-left">
              {isRejected && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
                  <p className="font-extrabold text-sm uppercase tracking-wider">Rejection Reason</p>
                  <p className="mt-1 text-sm">{driverProfile?.rejection_reason || "Your document verification was rejected by administrator."}</p>
                  <p className="mt-2 text-xs font-semibold">Please upload updated documents below and click Resubmit for Verification.</p>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {isApproved ? "Verification complete details" : isRejected ? "Submission details" : "Submitted details"}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{verification.fullName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusTone}`}>
                    {isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InfoField label="Phone" value={<InteractivePhone phone={verification.phone} />} icon={User} />
                  <InfoField label="Email" value={verification.email} icon={User} />
                  <InfoField label="License No." value={verification.licenseNumber} icon={FileText} />
                  <InfoField label="Submitted" value={verification.submittedAt} icon={Clock} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {isApproved ? "Submitted documents" : "Verification documents"}
                </p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <DocCard url={verification.profilePhotoUrl} label="Profile Photo" icon={User} />
                  <DocCard url={verification.licenseImageUrl} label="Driving License" icon={FileText} />
                </div>
              </div>

              {/* Resubmit form if rejected */}
              {isRejected && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                  <p className="font-extrabold text-sm text-primary">Resubmit Verification Documents</p>
                  
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Driving Licence Number</label>
                    <input
                      type="text"
                      placeholder="e.g. TN7220200012345"
                      defaultValue={verification.licenseNumber}
                      id="resubmitLicenceNum"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">New Profile Photo (1 MB – 2 MB, JPG/PNG/WEBP)</label>
                      <input
                        type="file"
                        id="resubmitProfilePhoto"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">New Driving Licence (JPG/PNG/WEBP/PDF)</label>
                      <input
                        type="file"
                        id="resubmitLicenceDoc"
                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const photoEl = document.getElementById("resubmitProfilePhoto") as HTMLInputElement;
                        const licenceEl = document.getElementById("resubmitLicenceDoc") as HTMLInputElement;
                        const numEl = document.getElementById("resubmitLicenceNum") as HTMLInputElement;

                        const photoFile = photoEl?.files?.[0];
                        const licenceFile = licenceEl?.files?.[0];
                        const licenceNum = numEl?.value;

                        if (photoFile) {
                          const minB = 10 * 1024; // 10 KB
                          const maxB = 2 * 1024 * 1024; // 2 MB
                          if (photoFile.size < minB || photoFile.size > maxB) {
                            alert(`Profile photo must be up to 2 MB. Size: ${(photoFile.size / (1024 * 1024)).toFixed(2)} MB`);
                            return;
                          }
                        }

                        const formData = new FormData();
                        if (photoFile) formData.append("profilePhoto", photoFile);
                        if (licenceFile) formData.append("licenseImage", licenceFile);
                        const token = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || localStorage.getItem("zipride_jwt_token");
                        const res = await apiFetch("/api/v1/driver/upload-docs", {
                          method: "POST",
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                        });

                        const json = await res.json();
                        if (res.ok) {
                          alert("Documents resubmitted successfully! Waiting for admin verification.");
                          window.location.reload();
                        } else {
                          alert("Resubmission failed: " + (json.message || "Unknown error"));
                        }
                      } catch (err: any) {
                        alert("Failed to resubmit: " + err.message);
                      }
                    }}
                    className="w-full rounded-xl gradient-brand py-3 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform"
                  >
                    Resubmit Documents
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Your documents are encrypted & secure
          </p>
          <Link
            to="/driver/dashboard"
            className="mt-6 block w-full rounded-2xl gradient-brand py-4 font-bold text-primary-foreground shadow-glow"
          >
            Continue to Dashboard
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

function InfoField({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: any }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-background/70 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
