import { useEffect, useState } from "react";
import { Wallet, ShieldCheck, ArrowUpRight, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { DriverShell } from "@/driver/layouts/DriverShell";
import { PageHeader, Pill } from "@/shared/components/kit/Primitives";
import { apiFetch } from "@/lib/api";
import { useSocket } from "@/shared/hooks/useSocket";

export function DriverSettlementPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSettlementSummary = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/driver/settlement");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.data) {
          setSummary(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to load driver settlement summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlementSummary();
  }, []);

  useSocket({
    "driver-wallet-updated": () => fetchSettlementSummary(),
    "notification": () => fetchSettlementSummary()
  });

  const handleRequestSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid settlement amount.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/driver/settlement/request", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          bankDetails
        })
      });
      const data = await res.json();
      if (data && data.success) {
        alert("✅ Settlement request submitted successfully!");
        setModalOpen(false);
        setAmount("");
        fetchSettlementSummary();
      } else {
        alert("Error: " + (data?.message || "Could not submit request."));
      }
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingBalance = Number(summary?.pending_balance || 0);
  const settledBalance = Number(summary?.settled_balance || 0);
  const history = summary?.settlement_history || [];

  return (
    <DriverShell>
      <PageHeader title="Driver Payout Settlements" subtitle="Manage your earnings payout requests and settlement status" />

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading settlement details...</span>
        </div>
      ) : (
        <>
          {/* Summary Banner */}
          <div className="mb-6 rounded-3xl gradient-hero p-7 text-white shadow-elevated grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase font-bold text-white/80 tracking-wider">Pending Payout Balance</p>
              <p className="mt-1 text-4xl font-extrabold">₹{pendingBalance.toLocaleString("en-IN")}.00</p>
              <p className="text-xs text-white/80 mt-2">
                Total Lifetime Settled: <strong className="text-emerald-300">₹{settledBalance.toLocaleString("en-IN")}</strong>
              </p>
            </div>
            <div className="flex flex-col justify-center items-start md:items-end border-t md:border-t-0 md:border-l border-white/15 pt-4 md:pt-0 md:pl-6">
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-2xl bg-white text-slate-900 px-6 py-3 font-bold text-sm shadow-glow hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowUpRight className="h-4 w-4" /> Request Payout Settlement
              </button>
              <p className="text-[11px] text-white/70 mt-2 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> 100% verified direct bank payout
              </p>
            </div>
          </div>

          {/* Request Modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur p-4">
              <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-elevated border border-border">
                <h3 className="text-lg font-extrabold text-foreground mb-1">Request Earnings Settlement</h3>
                <p className="text-xs text-muted-foreground mb-4">Enter amount to transfer to your bank account / UPI ID.</p>
                <form onSubmit={handleRequestSettlement} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Settlement Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">UPI ID or Bank Account Details</label>
                    <input
                      type="text"
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      placeholder="e.g. driver@upi or HDFC0001234 A/C 9876543210"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="w-1/2 rounded-xl border border-border py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-1/2 rounded-xl gradient-brand py-2.5 text-xs font-bold text-primary-foreground shadow-glow cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* History Ledger */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-extrabold text-lg mb-4">Settlement Request History</h2>
            {history.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                <Clock className="h-8 w-8 opacity-30 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground">No settlement requests submitted yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((h: any) => (
                  <div key={h.id} className="py-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold font-mono">#SET-{h.id}</p>
                        <Pill tone={h.status === "Approved" || h.status === "Settled" ? "success" : h.status === "Pending" ? "warning" : "destructive"}>
                          {h.status}
                        </Pill>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested on {h.created_at ? new Date(h.created_at).toLocaleString() : "—"}
                      </p>
                      {h.bank_details && <p className="text-xs text-muted-foreground font-mono">Details: {h.bank_details}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-foreground">₹{Number(h.amount).toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-muted-foreground">{h.payment_method || "Bank Transfer"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DriverShell>
  );
}
