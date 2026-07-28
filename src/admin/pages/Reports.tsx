import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  FileBarChart,
  Download,
  FileText,
  TrendingUp,
  Users,
  Car,
  Wallet,
  CreditCard,
  Printer,
  Eye,
} from "lucide-react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { Reveal } from "@/shared/components/kit/Reveal";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin/reports")({
  component: Reports,
});

const REPORT_TYPES = [
  {
    id: "revenue",
    title: "Revenue Report",
    description: "Platform revenue and admin commissions",
    icon: TrendingUp,
  },
  {
    id: "daily",
    title: "Daily Report",
    description: "Daily summaries and details",
    icon: FileText,
  },
  {
    id: "weekly",
    title: "Weekly Report",
    description: "Weekly summaries and details",
    icon: FileText,
  },
  {
    id: "monthly",
    title: "Monthly Report",
    description: "Monthly summaries and details",
    icon: FileBarChart,
  },
  {
    id: "yearly",
    title: "Yearly Report",
    description: "Annual financial statement",
    icon: FileBarChart,
  },
  {
    id: "custom",
    title: "Custom Date Report",
    description: "Report for specific selected dates",
    icon: FileText,
  },
  {
    id: "driver_earnings",
    title: "Driver Earnings Report",
    description: "Aggregated gross and net earnings per driver",
    icon: Wallet,
  },
  {
    id: "driver_rides",
    title: "Driver Ride Report",
    description: "Total ride summaries mapped per driver",
    icon: Car,
  },
  {
    id: "rider_rides",
    title: "Rider Ride Report",
    description: "Total ride summaries mapped per rider",
    icon: Users,
  },
  {
    id: "wallet",
    title: "Wallet Report",
    description: "Wallet transaction histories and platform deposits",
    icon: Wallet,
  },
  {
    id: "payment",
    title: "Payment Report",
    description: "Transaction statuses and methods review",
    icon: CreditCard,
  },
  {
    id: "cancellation",
    title: "Cancellation Report",
    description: "Cancelled trips breakdown and reasons",
    icon: FileText,
  },
  {
    id: "admin_commission",
    title: "Admin Commission Report",
    description: "Net admin platform profit (10%) overview",
    icon: TrendingUp,
  },
];

function formatOnlineTime(seconds: number | undefined | null): string {
  if (!seconds) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds % 60}s`;
}

export function Reports() {
  const [selectedReport, setSelectedReport] = useState("revenue");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/admin/reports?reportType=${selectedReport}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      // Call reports endpoint on the Express server via fetch
      const res = await apiFetch(url, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || ""}`,
        },
      });

      if (res.status === 401) {
        alert("Your session has expired. Please log in again.");
        sessionStorage.clear();
        localStorage.removeItem("zipride_admin_session_backup");
        localStorage.removeItem("jwt_token");
        window.location.href = "/login";
        return;
      }

      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message);
      setPreviewData(resJson.data);
    } catch (err: any) {
      alert("Failed to load report data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!previewData) {
      alert("Please preview or generate the report first.");
      return;
    }

    let csvRows = [];
    if (selectedReport === "driver_earnings") {
      const earnings = previewData.driverEarnings || [];
      csvRows = [
        [
          "Driver Name",
          "Driver Phone",
          "Total Rides",
          "Gross Earnings (INR)",
          "Net Earnings (INR)",
          "Online Time",
        ],
        ...earnings.map((d: any) => [
          d.driver_name || "Unknown",
          d.driver_phone || "",
          d.total_rides || 0,
          d.gross_earnings || 0,
          d.net_earnings || 0,
          formatOnlineTime(d.online_seconds),
        ]),
      ];
    } else {
      const rides = previewData.rides || [];
      csvRows = [
        [
          "Ride ID",
          "Date",
          "Rider",
          "Driver",
          "Pickup",
          "Dropoff",
          "Fare (INR)",
          "Payment Method",
          "Status",
        ],
        ...rides.map((r: any) => [
          r.ride_code || r.id,
          new Date(r.booking_time).toLocaleDateString(),
          r.rider_name || "Unknown",
          r.driver_name || "No Driver",
          r.pickup_address || "",
          r.dropoff_address || "",
          r.final_fare || r.estimated_fare || 0,
          r.payment_method || "",
          r.ride_status || "",
        ]),
      ];
    }

    const csvContent = csvRows
      .map((row) => row.map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedReport}_Report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleDownloadExcel = () => {
    if (!previewData) {
      alert("Please preview or generate the report first.");
      return;
    }

    let ws;
    if (selectedReport === "driver_earnings") {
      const earnings = previewData.driverEarnings || [];
      ws = XLSX.utils.json_to_sheet(
        earnings.map((d: any) => ({
          "Driver Name": d.driver_name || "Unknown",
          "Driver Phone": d.driver_phone || "",
          "Total Rides": d.total_rides || 0,
          "Gross Earnings (INR)": d.gross_earnings || 0,
          "Net Earnings (INR)": d.net_earnings || 0,
          "Online Time": formatOnlineTime(d.online_seconds),
        })),
      );
    } else {
      const rides = previewData.rides || [];
      ws = XLSX.utils.json_to_sheet(
        rides.map((r: any) => ({
          "Ride ID": r.ride_code || r.id,
          Date: new Date(r.booking_time).toLocaleDateString(),
          Rider: r.rider_name || "Unknown",
          Driver: r.driver_name || "No Driver",
          "Pickup Address": r.pickup_address || "",
          "Dropoff Address": r.dropoff_address || "",
          "Fare (INR)": r.final_fare || r.estimated_fare || 0,
          "Payment Method": r.payment_method || "",
          Status: r.ride_status || "",
        })),
      );
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report Data");
    XLSX.writeFile(wb, `${selectedReport}_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleDownloadPDF = () => {
    if (!previewData) {
      alert("Please preview or generate the report first.");
      return;
    }
    const doc = new jsPDF() as any;

    // Header Design
    doc.setFillColor(34, 197, 94); // ZipRide Brand green color
    doc.rect(0, 0, 220, 35, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ZIPRIDE ENTERPRISE", 15, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Ride Hailing Platform", 15, 28);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${selectedReport.toUpperCase()} REPORT`, 15, 48);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated at: ${new Date().toLocaleString()}`, 15, 54);
    doc.text(`Date Range: ${startDate || "All-time"} to ${endDate || "Present"}`, 15, 59);

    // Summary statistics table
    const s = previewData.summary || {};
    const summaryData = [
      ["Total Rides", String(s.total_rides || 0), "Completed Rides", String(s.completed || 0)],
      ["Cancelled Rides", String(s.cancelled || 0), "Pending Rides", String(s.pending || 0)],
      [
        "Gross Revenue",
        `INR ${Number(s.revenue || 0).toFixed(2)}`,
        "Admin Commission",
        `INR ${Number(s.admin_commission || 0).toFixed(2)}`,
      ],
    ];

    autoTable(doc, {
      startY: 65,
      head: [["Summary Statistics", "", "", ""]],
      body: summaryData,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
    });

    // Details table
    let columns = [];
    let body = [];
    if (selectedReport === "driver_earnings") {
      columns = [
        "Driver Name",
        "Driver Phone",
        "Total Rides",
        "Gross Earnings",
        "Net Earnings",
        "Online Time",
      ];
      body = (previewData.driverEarnings || []).map((d: any) => [
        d.driver_name || "Unknown",
        d.driver_phone || "",
        String(d.total_rides || 0),
        `INR ${Number(d.gross_earnings || 0).toFixed(2)}`,
        `INR ${Number(d.net_earnings || 0).toFixed(2)}`,
        formatOnlineTime(d.online_seconds),
      ]);
    } else {
      columns = ["Ride ID", "Date", "Rider", "Driver", "Fare", "Payment", "Status"];
      body = (previewData.rides || []).map((r: any) => [
        r.ride_code || String(r.id).substring(0, 8),
        new Date(r.booking_time).toLocaleDateString(),
        r.rider_name || "Unknown",
        r.driver_name || "No Driver",
        `INR ${r.final_fare || r.estimated_fare || 0}`,
        r.payment_method || "",
        r.ride_status || "",
      ]);
    }

    const finalY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 10
      : 120;

    autoTable(doc, {
      startY: finalY,
      head: [columns],
      body: body,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
    });

    doc.save(`${selectedReport}_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminShell title="Reports" subtitle="Generate & download enterprise analytics reports">
      <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr]">
        {/* Left pane: Report selector */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-4">
          <h2 className="font-extrabold text-base mb-2">Select Report Type</h2>
          <div className="space-y-1 overflow-y-auto max-h-[350px] pr-1">
            {REPORT_TYPES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    selectedReport === r.id
                      ? "gradient-brand text-primary-foreground shadow-glow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">{r.title}</p>
                    <p className="text-[10px] opacity-75 font-normal line-clamp-1">
                      {r.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {/* Right pane: Report Actions & Preview */}
        <div className="space-y-6">
          {previewData && (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-extrabold text-base">Report Export Options</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-1 bg-secondary text-primary font-bold px-3 py-2 rounded-xl text-xs hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                  <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-1 bg-secondary text-primary font-bold px-3 py-2 rounded-xl text-xs hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1 bg-secondary text-primary font-bold px-3 py-2 rounded-xl text-xs hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 bg-secondary text-primary font-bold px-3 py-2 rounded-xl text-xs hover:bg-secondary/80 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print
                  </button>
                </div>
              </div>

              {/* Statistics summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-secondary/30 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Total Rides
                  </p>
                  <p className="text-xl font-extrabold mt-1">
                    {previewData.summary?.total_rides || 0}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue</p>
                  <p className="text-xl font-extrabold mt-1">
                    ₹{Number(previewData.summary?.revenue || 0).toFixed(0)}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Commission (10%)
                  </p>
                  <p className="text-xl font-extrabold mt-1 text-primary">
                    ₹{Number(previewData.summary?.admin_commission || 0).toFixed(0)}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Driver Earnings
                  </p>
                  <p className="text-xl font-extrabold mt-1">
                    ₹{Number(previewData.summary?.driver_earnings || 0).toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Report Preview (Limit 50
                  rows)
                </h3>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-secondary/90 backdrop-blur border-b border-border z-10">
                        <tr>
                          {selectedReport === "driver_earnings"
                            ? [
                                "Driver Name",
                                "Driver Phone",
                                "Total Rides",
                                "Gross Earnings",
                                "Net Earnings",
                                "Online Time",
                              ].map((c) => (
                                <th
                                  key={c}
                                  className="px-3 py-2 text-left font-bold text-[10px] uppercase text-muted-foreground tracking-wider"
                                >
                                  {c}
                                </th>
                              ))
                            : [
                                "Ride ID",
                                "Date",
                                "Rider",
                                "Driver",
                                "Fare",
                                "Payment",
                                "Status",
                              ].map((c) => (
                                <th
                                  key={c}
                                  className="px-3 py-2 text-left font-bold text-[10px] uppercase text-muted-foreground tracking-wider"
                                >
                                  {c}
                                </th>
                              ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedReport === "driver_earnings"
                          ? previewData.driverEarnings
                              ?.slice(0, 50)
                              .map((d: any, index: number) => (
                                <tr key={index} className="hover:bg-secondary/20">
                                  <td className="px-3 py-2 font-bold text-primary">
                                    {d.driver_name || "Unknown"}
                                  </td>
                                  <td className="px-3 py-2">{d.driver_phone || ""}</td>
                                  <td className="px-3 py-2">{d.total_rides || 0}</td>
                                  <td className="px-3 py-2 font-bold">
                                    ₹{Number(d.gross_earnings || 0).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 font-bold text-success">
                                    ₹{Number(d.net_earnings || 0).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 font-bold">
                                    {formatOnlineTime(d.online_seconds)}
                                  </td>
                                </tr>
                              ))
                          : previewData.rides?.slice(0, 50).map((r: any) => (
                              <tr key={r.id} className="hover:bg-secondary/20">
                                <td className="px-3 py-2 font-bold text-primary">
                                  {r.ride_code || String(r.id).substring(0, 8)}
                                </td>
                                <td className="px-3 py-2">
                                  {new Date(r.booking_time).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2">{r.rider_name || "Unknown"}</td>
                                <td className="px-3 py-2">{r.driver_name || "No Driver"}</td>
                                <td className="px-3 py-2 font-bold">
                                  ₹{r.final_fare || r.estimated_fare || 0}
                                </td>
                                <td className="px-3 py-2">{r.payment_method || ""}</td>
                                <td className="px-3 py-2">{r.ride_status}</td>
                              </tr>
                            ))}
                        {((selectedReport === "driver_earnings" &&
                          (!previewData.driverEarnings ||
                            previewData.driverEarnings.length === 0)) ||
                          (selectedReport !== "driver_earnings" &&
                            (!previewData.rides || previewData.rides.length === 0))) && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                              No matching details.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!previewData && (
            <div className="rounded-3xl border border-border bg-card p-12 text-center text-muted-foreground shadow-soft">
              <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary" />
              <h3 className="font-bold text-sm">No Report Generated</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Select a report type on the left pane and click "Generate Report" to view analytics
                and download PDF/Excel/CSV exports.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
