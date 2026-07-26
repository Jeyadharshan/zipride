import { useEffect, useState } from "react";
import { Wallet, TrendingUp, CreditCard, HeartHandshake, Search, Filter, RefreshCw, Calendar, Loader2 } from "lucide-react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { StatCard, Pill } from "@/shared/components/kit/Primitives";
import { apiFetch } from "@/lib/api";
import { cn } from "@/shared/utils/cn";

export function AdminWalletPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchWalletStats = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (statusFilter) queryParams.set("status", statusFilter);
      if (dateFrom) queryParams.set("dateFrom", dateFrom);
      if (dateTo) queryParams.set("dateTo", dateTo);

      const res = await apiFetch(`/api/v1/admin/wallet?${queryParams.toString()}`);
      if (res && res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load admin wallet stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletStats();
  }, []);

  const totalWalletBalance = Number(stats?.total_wallet_balance || 0);
  const totalRecharge = Number(stats?.total_recharge || 0);
  const totalWalletPayments = Number(stats?.total_wallet_payments || 0);
  const totalTips = Number(stats?.total_tips || 0);
  const totalDriverEarnings = Number(stats?.total_driver_earnings || 0);
  const transactions = stats?.transactions || [];

  return (
    <AdminShell title="Wallet & Financial Control" subtitle="Enterprise wallet metrics, tips, recharges & transaction audit">
      {/* Financial Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard value={`₹${totalWalletBalance.toLocaleString("en-IN")}`} label="Total Wallet Balance" icon={<Wallet />} />
        <StatCard value={`₹${totalRecharge.toLocaleString("en-IN")}`} label="Total Recharges" icon={<CreditCard className="text-emerald-500" />} />
        <StatCard value={`₹${totalWalletPayments.toLocaleString("en-IN")}`} label="Total Wallet Payments" icon={<TrendingUp className="text-primary" />} />
        <StatCard value={`₹${totalTips.toLocaleString("en-IN")}`} label="Total Tips Paid" icon={<HeartHandshake className="text-rose-500" />} />
        <StatCard value={`₹${totalDriverEarnings.toLocaleString("en-IN")}`} label="Total Driver Earnings" icon={<Wallet className="text-amber-500" />} />
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-extrabold text-lg">Transaction Search & Filter</h2>
          <button
            onClick={fetchWalletStats}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Rider, Driver, Ride..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-medium"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-medium"
          />

          {/* Filter Action */}
          <button
            onClick={fetchWalletStats}
            className="rounded-xl gradient-brand py-2 text-xs font-bold text-primary-foreground shadow-glow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" /> Apply Filters
          </button>
        </div>
      </div>

      {/* Transactions Audit Table */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-extrabold text-lg mb-4">Audit Ledger Logs</h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-2xl">
            <p className="text-sm font-semibold text-muted-foreground">No transactions match your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <th className="py-3 px-3">Txn ID</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx: any) => {
                  const isCredit = Number(tx.amount) > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-secondary/30 transition-colors text-xs font-medium">
                      <td className="py-3 px-3 font-mono font-bold">#{tx.id}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-foreground">{tx.user_name || "User"}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.user_phone || "—"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize font-semibold text-primary">{tx.transaction_type || tx.type || "Transaction"}</span>
                      </td>
                      <td className="py-3 px-3 max-w-[220px] truncate">{tx.description || "—"}</td>
                      <td className={cn("py-3 px-3 text-right font-extrabold text-sm", isCredit ? "text-emerald-600" : "text-rose-600")}>
                        {isCredit ? "+" : "−"}₹{Math.abs(Number(tx.amount)).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3">
                        <Pill tone={tx.status === "Success" ? "success" : tx.status === "Pending" ? "warning" : "destructive"}>
                          {tx.status || "Success"}
                        </Pill>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {tx.date ? new Date(tx.date).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
