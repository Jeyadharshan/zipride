import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

export function AdminSettings() {
  const [baseFare, setBaseFare] = useState("40");
  const [perKmRate, setPerKmRate] = useState("12");
  const [commission, setCommission] = useState("20");
  const [cancellationFee, setCancellationFee] = useState("25");
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
          if (settingsMap.per_km_rate) setPerKmRate(settingsMap.per_km_rate);
          if (settingsMap.commission) setCommission(settingsMap.commission);
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
        { key: "per_km_rate", value: perKmRate },
        { key: "commission", value: commission },
        { key: "cancellation_fee", value: cancellationFee },
      ];

      // Try backend API first
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
          console.warn("Backend settings API unreachable, falling back to DB:", e);
        }
      }

      // Always also upsert via Supabase proxy to keep DB in sync
      for (const item of payload) {
        const { error } = await (supabase as any)
          .from("platform_settings")
          .upsert(item);
        if (error) {
          console.warn(`Failed to upsert setting ${item.key}:`, error.message);
        }
      }

      alert("Platform settings saved successfully!");
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
    <AdminShell title="Platform Settings" subtitle="Configure ZipRide">
      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold text-lg">Pricing & Commission</h2>
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-semibold">Base fare (₹)</label>
            <input
              value={baseFare}
              onChange={(e) => setBaseFare(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-semibold">Per km rate (₹)</label>
            <input
              value={perKmRate}
              onChange={(e) => setPerKmRate(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-semibold">Commission (%)</label>
            <input
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-semibold">Cancellation fee (₹)</label>
            <input
              value={cancellationFee}
              onChange={(e) => setCancellationFee(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full rounded-2xl gradient-brand px-8 py-3.5 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Pricing Changes"}
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

