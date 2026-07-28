import { useEffect, useState } from "react";
import { TrendingUp, Car, Clock, Wallet, HeartHandshake, ShieldCheck, ArrowDownToLine, Loader2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { StatCard, PageHeader } from "@/shared/components/kit/Primitives";
import { useAuth } from "@/auth/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export function Earnings() {
  const { profile } = useAuth();
  const [driverWallet, setDriverWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDriverWallet() {
      setLoading(true);
      try {
        const res = await apiFetch("/api/v1/driver/wallet");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.data) {
            setDriverWallet(data.data);
          }
        }
      } catch (err) {
        console.error("Failed to load driver wallet details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDriverWallet();
  }, [profile]);

  const walletBalance = Number(driverWallet?.wallet_balance || 0);
  const totalEarnings = Number(driverWallet?.total_earnings || 0);
  const todayEarnings = Number(driverWallet?.today_earnings || 0);
  const weeklyEarnings = Number(driverWallet?.weekly_earnings || 0);
  const monthlyEarnings = Number(driverWallet?.monthly_earnings || 0);
  const tipsEarned = Number(driverWallet?.tips_earned || 0);
  const pendingSettlement = Number(driverWallet?.pending_settlement || 0);
  const completedRides = Number(driverWallet?.completed_rides || 0);

  return (
    <DriverShell>
      <PageHeader title="Driver Wallet & Earnings" subtitle="Your complete income, tips earned & payout settlement" />

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading driver financial metrics...</span>
        </div>
      ) : (
        <>
          {/* Main Wallet Hero */}
          <div className="mb-6 overflow-hidden rounded-3xl gradient-hero p-7 text-white shadow-elevated grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase font-bold text-white/80 tracking-wider">Wallet Balance</p>
              <p className="mt-1 text-4xl font-extrabold">₹{walletBalance.toLocaleString("en-IN")}.00</p>
              <p className="text-xs text-white/80 mt-2">
                Total Lifetime Earnings: <strong className="text-white">₹{totalEarnings.toLocaleString("en-IN")}</strong> ({completedRides} rides)
              </p>
            </div>
            <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/15 pt-4 md:pt-0 md:pl-6">
              <div>
                <p className="text-xs uppercase font-bold text-white/80 tracking-wider">Pending Settlement (Next Payout)</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">₹{pendingSettlement.toLocaleString("en-IN")}</p>
              </div>
              <p className="text-[11px] text-white/70 mt-3 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Automated weekly payout transfer to your registered bank account
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard value={`₹${todayEarnings.toLocaleString("en-IN")}`} label="Today's Earnings" icon={<TrendingUp />} />
            <StatCard value={`₹${weeklyEarnings.toLocaleString("en-IN")}`} label="Weekly Earnings" icon={<Wallet />} />
            <StatCard value={`₹${monthlyEarnings.toLocaleString("en-IN")}`} label="Monthly Earnings" icon={<Wallet />} />
            <StatCard value={`₹${tipsEarned.toLocaleString("en-IN")}`} label="Tips Earned" icon={<HeartHandshake className="text-rose-500" />} />
          </div>

          {/* Withdraw History Section */}
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-primary" /> Withdraw & Settlement History
              </h2>
              <span className="text-xs font-semibold text-muted-foreground">Auto-settled weekly</span>
            </div>

            <div className="text-center py-8 border border-dashed border-border rounded-2xl">
              <ShieldCheck className="h-8 w-8 opacity-30 mx-auto mb-2 text-primary" />
              <p className="text-sm font-semibold text-foreground">Weekly Payout Active</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Your driver earnings and tips are automatically settled directly to your registered UPI / bank account every Monday.
              </p>
            </div>
          </div>
        </>
      )}
    </DriverShell>
  );
}
