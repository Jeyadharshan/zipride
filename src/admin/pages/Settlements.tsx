import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Search, Filter, RefreshCw, FileText, Loader2 } from "lucide-react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { StatCard, Pill } from "@/shared/components/kit/Primitives";
import { apiFetch } from "@/lib/api";
import { useSocket } from "@/shared/hooks/useSocket";

export function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);

      const res = await apiFetch(`/api/v1/admin/settlements?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setSettlements(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to load admin settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  useSocket({
    "driver-settlement-requested": () => fetchSettlements(),
    "notification": () => fetchSettlements()
  });

  const handleApprove = async (id: number) => {
    if (!confirm(`Approve payout settlement #${id}?`)) return;
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/v1/admin/settlement/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data && data.success) {
        alert("✅ Settlement Approved & Driver Notified!");
        fetchSettlements();
      }
    } catch (e: any) {
      alert("Approval error: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt(`Enter rejection reason for settlement #${id}:`);
    if (reason === null) return;
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/v1/admin/settlement/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data && data.success) {
        alert("Settlement Rejected.");
        fetchSettlements();
      }
    } catch (e: any) {
      alert("Rejection error: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };
  const handleMarkPaid = async (id: number) => {
    const txnRef = prompt(`Enter Transaction Reference / Bank UTR for settlement #${id}:`);
    if (txnRef === null) return;
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/v1/admin/settlement/${id}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ txnReference: txnRef, notes: "Marked Paid via Bank Transfer" })
      });
      const data = await res.json();
      if (data && data.success) {
        alert("✅ Settlement Marked as Paid & Driver Notified!");
        fetchSettlements();
      }
    } catch (e: any) {
      alert("Mark Paid error: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportCsv = () => {
    if (settlements.length === 0) return;
    const headers = ["Settlement ID", "Driver Name", "Phone", "Amount", "Status", "Bank Details", "Date"];
    const rows = settlements.map((s) => [
      s.id,
      `"${s.full_name || 'Driver'}"`,
      s.phone || '',
      s.amount,
      s.status,
      `"${s.bank_details || ''}"`,
      s.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `driver_settlements_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPendingAmt = settlements
    .filter((s) => s.status === "Pending")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const totalApprovedAmt = settlements
    .filter((s) => s.status === "Approved" || s.status === "Settled")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  return (
    <AdminShell title="Driver Settlement Payouts" subtitle="Approve, reject, and audit driver payout settlement requests">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard value={`₹${totalPendingAmt.toLocaleString("en-IN")}`} label="Total Pending Payouts" icon={<Clock className="text-amber-500" />} />
        <StatCard value={`₹${totalApprovedAmt.toLocaleString("en-IN")}`} label="Total Settled Payouts" icon={<CheckCircle2 className="text-emerald-500" />} />
        <StatCard value={settlements.length.toString()} label="Total Requests" icon={<FileText />} />
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-extrabold text-lg">Payout Filters</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="rounded-xl border border-border bg-secondary hover:bg-accent text-xs font-bold px-3.5 py-2 transition-colors cursor-pointer"
            >
              Export CSV Report
            </button>
            <button
              onClick={fetchSettlements}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Driver Name, Phone, ID..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={fetchSettlements}
            className="rounded-xl gradient-brand py-2 text-xs font-bold text-primary-foreground shadow-glow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" /> Filter Results
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-extrabold text-lg mb-4">Payout Settlement Requests</h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading settlement requests...</span>
          </div>
        ) : settlements.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-2xl">
            <p className="text-sm font-semibold text-muted-foreground">No payout settlement requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <th className="py-3 px-3">Set ID</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Bank Details</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors text-xs font-medium">
                    <td className="py-3 px-3 font-mono font-bold">#SET-{s.id}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-foreground">{s.full_name || "Driver"}</p>
                      <p className="text-[10px] text-muted-foreground">{s.phone || "—"}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-sm text-foreground">
                      ₹{Number(s.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 max-w-[200px] truncate font-mono text-[11px]">{s.bank_details || "Bank Transfer"}</td>
                    <td className="py-3 px-3">
                      <Pill tone={s.status === "Approved" || s.status === "Settled" ? "success" : s.status === "Pending" ? "warning" : "destructive"}>
                        {s.status}
                      </Pill>
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.status === "Pending" || s.status === "Approved" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === "Pending" && (
                            <button
                              onClick={() => handleApprove(s.id)}
                              disabled={processingId === s.id}
                              className="rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-2.5 py-1 font-bold text-xs cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            disabled={processingId === s.id}
                            className="rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 font-bold text-xs cursor-pointer"
                          >
                            Mark Paid
                          </button>
                          {s.status === "Pending" && (
                            <button
                              onClick={() => handleReject(s.id)}
                              disabled={processingId === s.id}
                              className="rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 px-2.5 py-1 font-bold text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-bold">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
