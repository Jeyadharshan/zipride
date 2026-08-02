import { useEffect, useState } from "react";
import { Search, RefreshCw, Trash2, User } from "lucide-react";
import { AdminShell } from "@/admin/layouts/AdminShell";
import { DataTable } from "@/admin/components/DataTable";
import { Pill, Avatar, InteractivePhone } from "@/shared/components/kit/Primitives";
import { apiFetch } from "@/lib/api";

function getAuthHeaders(): HeadersInit {
  const jwtToken = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token");
  return {
    "Content-Type": "application/json",
    ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
  };
}

const tone = (s: string) =>
  s === "active" || s === "Active"
    ? "success"
    : s === "suspended" || s === "banned" || s === "blocked"
    ? "destructive"
    : "muted";

export function UserMgmt() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = async (search = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: "rider" });
      if (search) params.set("search", search);
      // Use a large limit so all users are shown
      params.set("limit", "1000");

      const res = await apiFetch(`/api/v1/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        alert("Your session has expired. Please log in again.");
        sessionStorage.clear();
        localStorage.removeItem("zipride_admin_session_backup");
        localStorage.removeItem("jwt_token");
        window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(
          json.data.map((u: any) => ({
            id: u.id,
            name: u.full_name || "Anonymous User",
            phone: u.phone || "No phone",
            email: u.email || "",
            username: u.username || "",
            rides: u.total_rides || 0,
            spent: u.total_spent ? `₹${u.total_spent}` : "₹0",
            status: u.account_status || "active",
            joined: new Date(u.created_at).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }))
        );
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleDelete = async (u: any) => {
    if (
      !window.confirm(
        `Permanently delete rider "${u.name}"? They will NOT be able to log in again. This cannot be undone.`
      )
    )
      return;

    setDeletingId(u.id);
    try {
      const res = await apiFetch(`/api/v1/admin/user/${u.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Rider "${u.name}" has been permanently deleted.`);
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
      } else {
        alert("Error: " + (json.message || "Failed to delete user"));
      }
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell
      title="User Management"
      subtitle={`${users.length} registered riders`}
    >
      {/* Search + Refresh bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search users by name, phone, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => loadUsers(searchTerm)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading users…
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No riders found.</p>
        </div>
      )}

      {/* Table */}
      {!loading && users.length > 0 && (
        <DataTable
          columns={["User", "Phone", "Rides", "Spent", "Joined", "Status", "Actions"]}
        >
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-secondary/50">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar label={u.name[0]} className="h-9 w-9 text-xs" />
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    {u.username && (
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5 text-muted-foreground">
                <InteractivePhone phone={u.phone} />
              </td>
              <td className="px-5 py-3.5 font-semibold">{u.rides}</td>
              <td className="px-5 py-3.5 font-semibold">{u.spent}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{u.joined}</td>
              <td className="px-5 py-3.5">
                <Pill tone={tone(u.status) as any}>
                  {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                </Pill>
              </td>
              <td className="px-5 py-3.5">
                <button
                  onClick={() => handleDelete(u)}
                  disabled={deletingId === u.id}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white bg-destructive hover:bg-destructive/80 shadow-soft transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === u.id ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}
