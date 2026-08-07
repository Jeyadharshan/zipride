import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Wallet, Route as RouteIcon, Percent } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { StatCard } from "@/shared/components/kit/Primitives";
import { supabase } from "@/lib/supabase";



export function Revenue() {
  const [financials, setFinancials] = useState({
    totalRevenue: 0,
    commission: 0,
    payouts: 0,
    avgFare: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    async function loadFinancialData() {
      try {
        const { data, error } = await supabase
          .from("rides")
          .select("fare, created_at")
          .eq("status", "completed");

        if (error) throw new Error(error.message);

        const totalRevenue = data?.reduce((sum: number, r: any) => sum + Number(r.fare || 0), 0) || 0;
        const count = data?.length || 0;
        const avgFare = count > 0 ? Math.round(totalRevenue / count) : 0;
        const commission = Math.round(totalRevenue * 0.2); // 20% commission
        const payouts = totalRevenue - commission;

        setFinancials({
          totalRevenue,
          commission,
          payouts,
          avgFare,
        });

        // Calculate dynamic trend data
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonthIdx = new Date().getMonth();
        const monthlyStats: Record<string, { revenue: number; rides: number }> = {};

        for (let i = Math.max(0, currentMonthIdx - 5); i <= currentMonthIdx; i++) {
          monthlyStats[months[i]] = { revenue: 0, rides: 0 };
        }

        if (data) {
          data.forEach((r: any) => {
            const d = new Date(r.created_at);
            const m = months[d.getMonth()];
            if (monthlyStats[m]) {
              monthlyStats[m].revenue += Number(r.fare || 0) / 1000; // in thousands
              monthlyStats[m].rides += 1;
            }
          });
        }

        setTrendData(
          Object.keys(monthlyStats).map((m) => ({
            month: m,
            revenue: parseFloat(monthlyStats[m].revenue.toFixed(2)),
            rides: monthlyStats[m].rides,
          }))
        );

      } catch (err) {
        console.error("Failed to load financials:", err);
      }
    }
    loadFinancialData();
  }, []);

  return (
    <AdminShell title="Revenue Dashboard" subtitle="Financial performance">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={`₹${financials.totalRevenue.toLocaleString()}`} label="Total revenue" icon={<TrendingUp />} />
        <StatCard value={`₹${financials.commission.toLocaleString()}`} label="Commission (20%)" icon={<Percent />} />
        <StatCard value={`₹${financials.payouts.toLocaleString()}`} label="Driver payouts (80%)" icon={<Wallet />} />
        <StatCard value={`₹${financials.avgFare}`} label="Avg fare" icon={<RouteIcon />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold">Monthly revenue (₹K)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold">Rides volume</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Line
                  type="monotone"
                  dataKey="rides"
                  stroke="var(--primary-glow)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
