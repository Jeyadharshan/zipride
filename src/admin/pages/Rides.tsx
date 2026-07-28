import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { Pill } from "@/shared/components/kit/Primitives";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/rides")({
  component: RideMgmt,
});

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Pending", value: "pending" },
];

const statusTone = (s: string) => {
  const sl = s?.toLowerCase() || "";
  if (sl.includes("complet")) return "success";
  if (sl.includes("cancel")) return "destructive";
  if (sl.includes("search") || sl.includes("accept") || sl.includes("arriv") || sl.includes("start") || sl.includes("assigned") || sl.includes("otp")) return "brand";
  return "warning";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    "Ride Completed": "Completed",
    "Cancelled": "Cancelled",
    "Searching": "Searching",
    "Driver Assigned": "Assigned",
    "Driver Accepted": "Accepted",
    "Driver Arrived": "Arrived",
    "OTP Verified": "OTP ✓",
    "Ride Started": "In Progress",
  };
  return map[s] || s || "Unknown";
};

export function RideMgmt() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    async function loadRides() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("rides")
          .select(`
            id,
            ride_code,
            pickup_address,
            dropoff_address,
            fare,
            final_fare,
            status,
            payment_method,
            payment_status,
            ride_type,
            created_at,
            completed_time
          `)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          setRides(
            data.map((r: any) => ({
              id: r.id,
              code: r.ride_code || String(r.id).substring(0, 8).toUpperCase(),
              route: `${(r.pickup_address || "?").split(",")[0]} → ${(r.dropoff_address || "?").split(",")[0]}`,
              pickup: r.pickup_address || "—",
              dropoff: r.dropoff_address || "—",
              fare: r.final_fare || r.fare || 0,
              payment: r.payment_method || "Cash",
              paymentStatus: r.payment_status || "Pending",
              rideType: r.ride_type || "Sedan",
              time: new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
              date: r.created_at,
              status: r.status || "Searching",
            }))
          );
        } else {
          setRides([]);
        }
      } catch (err) {
        console.error("Error loading rides:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRides();
  }, []);

  const filtered = useMemo(() => {
    let result = [...rides];

    // Search filter
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(r =>
        (r.code || "").toLowerCase().includes(q) ||
        (r.pickup || "").toLowerCase().includes(q) ||
        (r.dropoff || "").toLowerCase().includes(q) ||
        (r.payment || "").toLowerCase().includes(q) ||
        (r.rideType || "").toLowerCase().includes(q)
      );
    }

    // Date/status filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (dateFilter === "today") {
      result = result.filter(r => r.date && new Date(r.date) >= today);
    } else if (dateFilter === "week") {
      result = result.filter(r => r.date && new Date(r.date) >= weekAgo);
    } else if (dateFilter === "month") {
      result = result.filter(r => r.date && new Date(r.date) >= monthAgo);
    } else if (dateFilter === "completed") {
      result = result.filter(r => (r.status || "").toLowerCase().includes("complet"));
    } else if (dateFilter === "cancelled") {
      result = result.filter(r => (r.status || "").toLowerCase().includes("cancel"));
    } else if (dateFilter === "active") {
      result = result.filter(r => {
        const st = (r.status || "").toLowerCase();
        return !st.includes("complet") && !st.includes("cancel");
      });
    } else if (dateFilter === "pending") {
      result = result.filter(r => {
        const st = (r.status || "").toLowerCase();
        return st.includes("search") || st.includes("pend") || st.includes("req") || st.includes("assign");
      });
    }

    return result;
  }, [rides, search, dateFilter]);

  return (
    <AdminShell
      title="Ride Management"
      subtitle={`${filtered.length} of ${rides.length} rides`}
    >
      {/* Search + Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Ride ID, pickup, payment method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  dateFilter === f.value
                    ? "gradient-brand text-primary-foreground shadow-glow"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Ride ID", "Type", "Route", "Fare", "Payment", "Pay Status", "Time", "Status"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-bold text-xs text-muted-foreground uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">Loading rides...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">No rides found.</td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary text-xs">{r.code}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{r.rideType}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-xs">{r.route}</p>
                  </td>
                  <td className="px-4 py-3 font-bold">₹{Number(r.fare).toFixed(0)}</td>
                  <td className="px-4 py-3 text-xs">{r.payment}</td>
                  <td className="px-4 py-3">
                    <Pill tone={r.paymentStatus === "Paid" ? "success" : r.paymentStatus === "Failed" ? "destructive" : "warning"}>
                      {r.paymentStatus}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.time}</td>
                  <td className="px-4 py-3">
                    <Pill tone={statusTone(r.status) as any}>{statusLabel(r.status)}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
