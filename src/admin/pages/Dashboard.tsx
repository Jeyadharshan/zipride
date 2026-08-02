import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, Car, TrendingUp, Route as RouteIcon, Wifi, WifiOff,
  Clock, CheckCircle, XCircle, Wallet, AlertCircle, Star, CreditCard
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { StatCard, Pill } from "@/shared/components/kit/Primitives";
import { supabase } from "@/lib/supabase";

import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

interface DashStats {
  totalUsers: number;
  totalDrivers: number;
  driversOnline: number;
  driversOffline: number;
  pendingDriverApprovals: number;
  totalRides: number;
  todayRides: number;
  completedToday: number;
  cancelledToday: number;
  activeRides: number;
  pendingPayments: number;
  totalRevenue: number;
  todayRevenue: number;
  platformWalletBalance: number;
  averageDriverRating: number;
  activeRiders: number;
  topDrivers: any[];
  topRiders: any[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashStats>({
    totalUsers: 0, totalDrivers: 0, driversOnline: 0, driversOffline: 0,
    pendingDriverApprovals: 0, totalRides: 0, todayRides: 0, completedToday: 0,
    cancelledToday: 0, activeRides: 0, pendingPayments: 0, totalRevenue: 0,
    todayRevenue: 0, platformWalletBalance: 0, averageDriverRating: 0,
    activeRiders: 0, topDrivers: [], topRiders: [],
  });
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [rideSplit, setRideSplit] = useState<any[]>([]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        // Counts
        const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "rider");
        const { count: driverApproved } = await supabase.from("driver_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved");
        const { count: driverOnline } = await supabase.from("driver_profiles").select("*", { count: "exact", head: true }).eq("status", "online");
        const { count: pendingVerif } = await supabase.from("driver_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending");
        const { count: activeRides } = await supabase.from("rides").select("*", { count: "exact", head: true }).in("status", ["searching", "accepted", "arriving", "in_progress"]);
        const { count: pendingPay } = await supabase.from("rides").select("*", { count: "exact", head: true }).eq("payment_status", "Pending").eq("status", "completed");

        // Revenue from completed rides
        const { data: completedRides } = await supabase.from("rides").select("fare, created_at").eq("status", "completed");
        const totalRevenue = completedRides?.reduce((s: number, r: any) => s + Number(r.fare || 0), 0) || 0;

        // Today's rides & revenue
        const today = new Date().toISOString().split("T")[0];
        const { data: todayRideData } = await supabase.from("rides").select("fare, created_at, status").gte("created_at", `${today}T00:00:00`);
        const todayRides = todayRideData?.length || 0;
        const todayRevenue = todayRideData?.filter((r: any) => r.status === "completed").reduce((s: number, r: any) => s + Number(r.fare || 0), 0) || 0;
        const completedToday = todayRideData?.filter((r: any) => r.status === "completed").length || 0;
        const cancelledToday = todayRideData?.filter((r: any) => r.status === "cancelled").length || 0;

        // Wallet balance (sum all wallets)
        const { data: wallets } = await supabase.from("wallets").select("balance");
        const walletTotal = wallets?.reduce((s: number, w: any) => s + Number(w.balance || 0), 0) || 0;

        // Active riders (rode in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: activeRiderData } = await supabase.from("rides").select("rider_id").gte("created_at", thirtyDaysAgo);
        const activeRiders = new Set(activeRiderData?.map((r: any) => r.rider_id)).size;

        // Avg driver rating
        const { data: driverRatings } = await supabase.from("driver_profiles").select("rating").eq("verification_status", "approved");
        const avgRating = driverRatings && driverRatings.length > 0
          ? driverRatings.reduce((s: number, d: any) => s + Number(d.rating || 5), 0) / driverRatings.length
          : 0;

        // Top 5 drivers by completed rides
        const { data: topDriversData } = await supabase.from("driver_profiles")
          .select("rating, profile:profiles(full_name)")
          .eq("verification_status", "approved")
          .order("rating", { ascending: false })
          .limit(5);
        const topDrivers = topDriversData?.map((d: any) => ({
          name: d.profile?.full_name || "Unknown",
          rating: d.rating || 5,
        })) || [];

        // Top 5 riders
        const { data: topRidersData } = await supabase.from("profiles")
          .select("full_name, id")
          .eq("role", "rider")
          .limit(5);
        const topRiders = topRidersData?.map((r: any) => ({ name: r.full_name || "Unknown" })) || [];

        setStats({
          totalUsers: userCount || 0,
          totalDrivers: driverApproved || 0,
          driversOnline: driverOnline || 0,
          driversOffline: Math.max(0, (driverApproved || 0) - (driverOnline || 0)),
          pendingDriverApprovals: pendingVerif || 0,
          totalRides: completedRides?.length || 0,
          todayRides,
          completedToday,
          cancelledToday,
          activeRides: activeRides || 0,
          pendingPayments: pendingPay || 0,
          totalRevenue,
          todayRevenue,
          platformWalletBalance: walletTotal,
          averageDriverRating: avgRating,
          activeRiders,
          topDrivers,
          topRiders,
        });

        // Revenue trend (last 6 months)
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const currentMonthIdx = new Date().getMonth();
        const trendMap: Record<string, number> = {};
        for (let i = Math.max(0, currentMonthIdx - 5); i <= currentMonthIdx; i++) {
          trendMap[months[i]] = 0;
        }
        completedRides?.forEach((r: any) => {
          const d = new Date(r.created_at);
          const m = months[d.getMonth()];
          if (trendMap[m] !== undefined) trendMap[m] += Number(r.fare || 0) / 1000;
        });
        setRevenueTrend(Object.keys(trendMap).map(m => ({ month: m, revenue: parseFloat(trendMap[m].toFixed(2)) })));

        // Ride type split
        const { data: dbVehicles } = await supabase.from("vehicles").select("vehicle_type");
        const vehicleMap: Record<string, number> = { "Taxi": 0, "Sedan": 0, "SUV": 0, "Auto": 0 };
        dbVehicles?.forEach((v: any) => { const t = v.vehicle_type || "Taxi"; if (vehicleMap[t] !== undefined) vehicleMap[t]++; });
        const splitData = Object.keys(vehicleMap).map(k => ({ name: k, value: vehicleMap[k] })).filter(x => x.value > 0);
        setRideSplit(splitData.length > 0 ? splitData : [{ name: "Taxi", value: 1 }]);

        // Recent rides
        const { data: rides } = await supabase
          .from("rides")
          .select("id, pickup_address, dropoff_address, fare, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (rides && rides.length > 0) {
          setRecentRides(rides.map((r: any) => ({
            id: String(r.id).substring(0, 8).toUpperCase(),
            route: `${(r.pickup_address || "?").split(",")[0]} → ${(r.dropoff_address || "?").split(",")[0]}`,
            time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            fare: r.fare || 0,
            status: r.status === "completed" ? "Completed" : r.status === "cancelled" ? "Cancelled" : "Ongoing",
          })));
        } else {
          setRecentRides([]);
        }
      } catch (err) {
        console.error("Error loading admin dashboard stats:", err);
      }
    }
    loadAdminData();
    const interval = setInterval(loadAdminData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const statRows = [
    { value: `₹${Number(stats.todayRevenue).toLocaleString()}`, label: "Today's Revenue", icon: <TrendingUp /> },
    { value: stats.todayRides.toString(), label: "Today's Rides", icon: <RouteIcon /> },
    { value: stats.driversOnline.toString(), label: "Drivers Online", icon: <Wifi /> },
    { value: stats.driversOffline.toString(), label: "Drivers Offline", icon: <WifiOff /> },
    { value: stats.activeRiders.toString(), label: "Active Riders (30d)", icon: <Users /> },
    { value: stats.completedToday.toString(), label: "Completed Today", icon: <CheckCircle /> },
    { value: stats.cancelledToday.toString(), label: "Cancelled Today", icon: <XCircle /> },
    { value: `₹${Number(stats.platformWalletBalance).toLocaleString()}`, label: "Wallet Balance", icon: <Wallet /> },
    { value: stats.pendingDriverApprovals.toString(), label: "Pending Verifications", icon: <AlertCircle /> },
    { value: stats.pendingPayments.toString(), label: "Pending Payments", icon: <CreditCard /> },
    { value: Number(stats.averageDriverRating).toFixed(1), label: "Avg Driver Rating", icon: <Star /> },
    { value: `₹${Number(stats.totalRevenue).toLocaleString()}`, label: "Total Revenue", icon: <TrendingUp /> },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Live platform overview">
      {/* 12-stat grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {statRows.map((s) => (
          <StatCard key={s.label} value={s.value} label={s.label} icon={s.icon} />
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold">Revenue trend (₹ thousands)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold">Rides by vehicle</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rideSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {rideSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Drivers & Riders */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold">Top Drivers</h2>
          {stats.topDrivers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topDrivers.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{d.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" /> {Number(d.rating || 5).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold">Top Riders</h2>
          {stats.topRiders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topRiders.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Rides */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 font-extrabold">Recent rides</h2>
        <div className="divide-y divide-border">
          {recentRides.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No rides yet.</p>
          ) : recentRides.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-bold">{r.id} · {r.route}</p>
                <p className="text-xs text-muted-foreground">{r.time}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">₹{r.fare}</span>
                <Pill tone={r.status === "Completed" ? "success" : r.status === "Ongoing" ? "brand" : "destructive"}>
                  {r.status}
                </Pill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
