import { useEffect, useState } from "react";
import { Plus, ArrowDownToLine, Smartphone, Banknote, Zap, Car, Gift, Clock, CreditCard, CheckCircle2 } from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { PageHeader } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { cn } from "@/shared/utils/cn";
import { useAuth } from "@/auth/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const QUICK = [100, 500, 1000, 2000];

export function WalletPage() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amt, setAmt] = useState(500);
  const [customAmt, setCustomAmt] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchWalletData = async () => {
    try {
      const summaryRes = await apiFetch("/api/v1/wallet");
      if (summaryRes?.success && summaryRes?.data) {
        setSummary(summaryRes.data);
      }

      const historyRes = await apiFetch("/api/v1/wallet/history");
      if (historyRes?.success && Array.isArray(historyRes?.data)) {
        setTransactions(historyRes.data);
      }
    } catch (e) {
      console.warn("Failed to load wallet data:", e);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [profile]);

  const handleAddMoney = async () => {
    const finalAmt = customAmt ? parseFloat(customAmt) : amt;
    if (isNaN(finalAmt) || finalAmt <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/wallet/add-money", {
        method: "POST",
        body: JSON.stringify({ amount: finalAmt })
      });

      if (!res || !res.razorpay_order_id) {
        throw new Error(res?.message || "Failed to create Razorpay order");
      }

      const { razorpay_order_id, amount: orderAmt, currency, key_id } = res;

      // Load Razorpay Script dynamically
      if (!(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((res) => (script.onload = res));
      }

      const options = {
        key: key_id || "rzp_live_THQ2isXoSiOoDg",
        amount: Math.round(orderAmt * 100),
        currency: currency || "INR",
        name: "ZipRide Wallet Recharge",
        description: `Add ₹${orderAmt} to ZipRide Wallet`,
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await apiFetch("/api/v1/wallet/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: orderAmt
              })
            });
            if (verifyRes && verifyRes.success) {
              alert(`✅ ₹${orderAmt} added to your ZipRide wallet successfully!`);
              setCustomAmt("");
              fetchWalletData();
            } else {
              alert("Payment verification failed: " + (verifyRes?.message || "Invalid signature"));
            }
          } catch (err: any) {
            alert("Verification error: " + err.message);
          }
        },
        prefill: {
          name: profile?.full_name || "ZipRide Rider",
          email: profile?.email || "",
          contact: profile?.phone || ""
        },
        theme: { color: "#0284c7" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      alert("Error initiating Razorpay checkout: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const balance = summary?.available_balance ?? summary?.balance ?? 0;
  const displayAmt = customAmt ? parseFloat(customAmt) || 0 : amt;

  return (
    <UserShell>
      <PageHeader title="My Wallet" subtitle="Manage balance, recharge via Razorpay & view history" />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balance & Stats Card */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-7 text-white shadow-elevated">
            <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <p className="text-xs uppercase tracking-wider text-white/80 font-bold">Available Balance</p>
            <p className="mt-1 text-4xl font-extrabold">₹{Number(balance).toLocaleString("en-IN")}.00</p>
            
            {/* Quick Metrics */}
            <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
              <div>
                <p className="text-[11px] text-white/70 font-semibold uppercase">Total Added</p>
                <p className="text-lg font-bold text-emerald-300">₹{Number(summary?.total_added || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/70 font-semibold uppercase">Total Spent</p>
                <p className="text-lg font-bold text-rose-300">₹{Number(summary?.total_spent || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button 
                onClick={handleAddMoney}
                className="flex items-center gap-2 rounded-2xl bg-white text-primary px-5 py-2.5 font-bold shadow-soft hover:bg-white/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Money (Razorpay)
              </button>
            </div>
          </div>
        </Reveal>

        {/* Add Money Card */}
        <Reveal delay={0.08}>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Add Money via Razorpay
            </h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setAmt(q);
                    setCustomAmt("");
                  }}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                    (amt === q && !customAmt) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary/50",
                  )}
                >
                  ₹{q}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={customAmt}
              onChange={(e) => setCustomAmt(e.target.value)}
              placeholder="Enter custom amount (₹)"
              className="mt-3 w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring text-base font-semibold"
            />
            <button 
              onClick={handleAddMoney}
              disabled={loading}
              className="mt-4 w-full rounded-2xl gradient-brand py-3.5 font-bold text-primary-foreground shadow-glow flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? "Processing..." : `Add ₹${displayAmt.toLocaleString()} to Wallet`}
            </button>
          </div>
        </Reveal>
      </div>

      {/* Transaction History Section */}
      <div className="mt-6">
        <Reveal delay={0.12}>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-extrabold text-lg">Wallet Transaction History</h2>
                <p className="text-xs text-muted-foreground">Credits, debits, ride payments, and recharges</p>
              </div>
              <button onClick={fetchWalletData} className="text-xs font-bold text-primary hover:underline">Refresh</button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                <Clock className="h-8 w-8 opacity-30 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground">No wallet transactions recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((t: any) => {
                  const isCredit = Number(t.amount) > 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between py-3.5 px-1 hover:bg-secondary/20 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "grid h-10 w-10 place-items-center rounded-xl font-bold text-sm",
                          isCredit ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
                        )}>
                          {isCredit ? "+" : "−"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{t.description || t.type_label || (isCredit ? "Wallet Recharge" : "Ride Payment")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.date ? new Date(t.date).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold text-base", isCredit ? "text-emerald-600" : "text-rose-600")}>
                          {isCredit ? "+" : "−"}₹{Math.abs(Number(t.amount)).toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {t.status || "Success"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </UserShell>
  );
}

