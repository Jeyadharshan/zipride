import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

export function AdminSettings() {
  const [baseFare, setBaseFare] = useState("40");
  const [slab015, setSlab015] = useState("15");
  const [slab1540, setSlab1540] = useState("18");
  const [slab40Plus, setSlab40Plus] = useState("22");
  const [acSurcharge, setAcSurcharge] = useState("3");
  const [cancellationFee, setCancellationFee] = useState("20");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await (supabase as any).from("platform_settings").select("*");
        if (data && data.length > 0) {
          const settingsMap = data.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
          }, {});

          if (settingsMap.base_fare) setBaseFare(settingsMap.base_fare);
          if (settingsMap.slab_0_15_rate) setSlab015(settingsMap.slab_0_15_rate);
          if (settingsMap.slab_15_40_rate) setSlab1540(settingsMap.slab_15_40_rate);
          if (settingsMap.slab_40_plus_rate) setSlab40Plus(settingsMap.slab_40_plus_rate);
          if (settingsMap.ac_surcharge_rate) setAcSurcharge(settingsMap.ac_surcharge_rate);
          if (settingsMap.cancellation_fee) setCancellationFee(settingsMap.cancellation_fee);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = [
        { key: "base_fare", value: baseFare },
        { key: "slab_0_15_rate", value: slab015 },
        { key: "slab_15_40_rate", value: slab1540 },
        { key: "slab_40_plus_rate", value: slab40Plus },
        { key: "ac_surcharge_rate", value: acSurcharge },
        { key: "commission", value: "0" },
        { key: "cancellation_fee", value: cancellationFee },
      ];

      const token =
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("jwt_token");

      if (token) {
        try {
          await apiFetch("/api/v1/admin/settings/bulk", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ settings: payload }),
          });
        } catch (e) {
          console.warn("Backend settings API unreachable:", e);
        }
      }

      for (const item of payload) {
        await (supabase as any)
          .from("platform_settings")
          .upsert(item)
          .catch(() => {});
      }

      alert("Distance Slab Rates & Pricing saved successfully!");
    } catch (err: any) {
      alert("Failed to save settings: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = async (type: 'mysql' | 'mongo') => {
    try {
      const token = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || "";
      const res = await apiFetch(`/api/v1/admin/backup/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download backup");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zipride_${type}_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    } catch (err: any) {
      alert("Backup failed: " + err.message);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Are you sure you want to restore database from this backup file? Existing records may be updated.")) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const token = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || "";
      const res = await apiFetch("/api/v1/admin/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert("Database restored successfully!");
      } else {
        alert("Restore failed: " + data.message);
      }
    } catch (err: any) {
      alert("Invalid backup file: " + err.message);
    }
  };

  return (
    <AdminShell title="Platform Settings" subtitle="Configure ZipRide Slab Rates & Policies">
      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold text-lg">Kilometer-wise Slab Rates (AC & Non-AC)</h2>
          
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">Base Fare (₹)</label>
            <input
              value={baseFare}
              onChange={(e) => setBaseFare(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">0 - 15 KM Slab Rate (₹/KM)</label>
            <input
              value={slab015}
              onChange={(e) => setSlab015(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-bold text-primary"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">15 - 40 KM Slab Rate (₹/KM)</label>
            <input
              value={slab1540}
              onChange={(e) => setSlab1540(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-bold text-primary"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">40+ KM Slab Rate (₹/KM)</label>
            <input
              value={slab40Plus}
              onChange={(e) => setSlab40Plus(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-bold text-primary"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">AC Surcharge Rate (₹/KM add-on)</label>
            <input
              value={acSurcharge}
              onChange={(e) => setAcSurcharge(e.target.value)}
              className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 font-bold text-sky-600"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">Cancellation Fee (₹)</label>
            <input
              value={cancellationFee}
              onChange={(e) => setCancellationFee(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              ⚠️ Note: Cancellation fee is only added if rider cancels after driver accepts/confirms.
            </p>
          </div>

          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600">
            ✅ Platform Commission: 0% (Driver keeps 100% of final fare)
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 w-full rounded-2xl gradient-brand px-8 py-3.5 font-bold text-primary-foreground shadow-glow disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save Slab Rates & Pricing"}
          </button>
        </div>

        {/* Database Backup & Recovery Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex flex-col justify-between">
          <div>
            <h2 className="mb-2 font-extrabold text-lg">Database Backup & Recovery</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Export live MySQL and MongoDB database snapshots or restore system state from a previous JSON backup file.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleDownloadBackup('mysql')}
                className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-left font-bold hover:bg-secondary transition-colors flex items-center justify-between text-sm"
              >
                <span>📦 Export Daily MySQL Backup</span>
                <span className="text-xs text-primary font-semibold">Download JSON</span>
              </button>

              <button
                onClick={() => handleDownloadBackup('mongo')}
                className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-left font-bold hover:bg-secondary transition-colors flex items-center justify-between text-sm"
              >
                <span>🍃 Export MongoDB Logs Snapshot</span>
                <span className="text-xs text-primary font-semibold">Download JSON</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <label className="block text-xs font-extrabold uppercase text-muted-foreground mb-2">
              Restore System Backup
            </label>
            <label className="w-full cursor-pointer rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 px-4 py-3 text-center text-sm font-bold text-primary block transition-colors">
              <span>Upload Backup File (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

