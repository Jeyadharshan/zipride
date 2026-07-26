import { useEffect, useState } from "react";
import { Receipt, Download, ShieldCheck, Wallet, CreditCard, Calendar, Clock, Loader2 } from "lucide-react";
import { UserShell } from "@/rider/layouts/UserShell";
import { PageHeader, Pill } from "@/shared/components/kit/Primitives";
import { Reveal } from "@/shared/components/kit/Reveal";
import { apiFetch } from "@/lib/api";
import { cn } from "@/shared/utils/cn";

export function PaymentHistoryPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    async function loadPaymentHistory() {
      setLoading(true);
      try {
        const res = await apiFetch("/api/v1/payments");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.data)) {
            setPayments(data.data);
          }
        }
      } catch (err) {
        console.error("Failed to load payment history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPaymentHistory();
  }, []);

  const handlePrintReceipt = (item: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rideIdStr = String(item.ride_id || "").slice(0, 8);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZipRide Receipt - ZR-${rideIdStr}</title>
        <style>
          body { font-family: sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
          .logo { font-size: 24px; font-weight: 800; color: #0284c7; }
          .title { font-size: 14px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 5px; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
          .total { display: flex; justify-content: space-between; padding: 15px 0; font-size: 18px; font-weight: 800; border-top: 2px solid #1e293b; margin-top: 15px; }
          .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">⚡ ZipRide</div>
          <div class="title">Official Trip & Payment Receipt</div>
        </div>
        <div class="row"><span>Receipt ID:</span> <strong>ZR-REC-${rideIdStr}</strong></div>
        <div class="row"><span>Ride ID:</span> <strong>#${item.ride_id}</strong></div>
        <div class="row"><span>Date & Time:</span> <span>${item.date ? new Date(item.date).toLocaleString() : 'N/A'}</span></div>
        <div class="row"><span>Pickup:</span> <span>${item.pickup_address || 'Pickup Point'}</span></div>
        <div class="row"><span>Dropoff:</span> <span>${item.drop_address || 'Destination'}</span></div>
        <div class="row"><span>Payment Method:</span> <strong>${item.payment_method || 'Wallet'}</strong></div>
        <div class="row"><span>Transaction ID:</span> <span>${item.transaction_id || item.gateway_order_id || 'TXN-ZIP-' + rideIdStr}</span></div>
        <div class="row"><span>Ride Fare:</span> <span>₹${Number(item.amount || 0).toFixed(2)}</span></div>
        <div class="row"><span>Driver Tip:</span> <span>₹${Number(item.tip_amount || 0).toFixed(2)}</span></div>
        <div class="total"><span>Total Paid:</span> <span>₹${(Number(item.amount || 0) + Number(item.tip_amount || 0)).toFixed(2)}</span></div>
        <div class="footer">
          <p>Thank you for riding with ZipRide!</p>
          <p>100% Verified Digital Invoice</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <UserShell>
      <PageHeader title="Payment History" subtitle="View all ride payments, tips, wallet recharges & download receipts" />

      {loading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading payment history...</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
          <Receipt className="h-10 w-10 opacity-30 mx-auto mb-2 text-muted-foreground" />
          <p className="text-lg font-bold text-muted-foreground">No payment records found</p>
          <p className="text-xs text-muted-foreground mt-1">Your payment transactions and receipts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p, i) => {
            const total = Number(p.amount || 0) + Number(p.tip_amount || 0);
            return (
              <Reveal key={p.ride_id || i} delay={i * 0.03}>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:border-primary/50 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl font-bold text-sm shrink-0",
                        p.wallet_used ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        {p.wallet_used ? <Wallet className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base">Ride #{p.ride_id}</p>
                          <Pill tone={p.payment_status === "Paid" || p.payment_status === "Success" ? "success" : "muted"}>
                            {p.payment_status || "Paid"}
                          </Pill>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.date ? new Date(p.date).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {p.pickup_address?.split(",")[0]} → {p.drop_address?.split(",")[0]}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                          <span>Method: <strong className="text-foreground">{p.payment_method || (p.wallet_used ? "Wallet" : "Razorpay")}</strong></span>
                          <span>•</span>
                          <span>Txn: <span className="font-mono text-foreground">{String(p.transaction_id || p.gateway_order_id || "TXN-ZIP").slice(0, 16)}</span></span>
                          {p.tip_amount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">Tip: ₹{p.tip_amount}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-2xl font-extrabold text-foreground">₹{total.toLocaleString("en-IN")}</p>
                      <button
                        onClick={() => handlePrintReceipt(p)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Receipt
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </UserShell>
  );
}
