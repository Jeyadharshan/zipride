import { useEffect, useState } from "react";
import { Bell, Check, Trash2, X, ShieldAlert, Wallet, Route, HeartHandshake, CreditCard, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/shared/lib/socket";
import { cn } from "@/shared/utils/cn";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState<any>(null);

  const fetchNotifications = async () => {
    const token = sessionStorage.getItem("jwt_token") || localStorage.getItem("jwt_token") || localStorage.getItem("zipride_jwt_token");
    if (!token) return;
    try {
      const res = await apiFetch("/api/v1/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount ?? data.data.filter((n: any) => !n.is_read).length);
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    const handleNewNotif = (notif: any) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
      setToastNotification(notif);
      setTimeout(() => setToastNotification(null), 5000);
    };

    const handleNotifCount = (data: any) => {
      if (data?.count !== undefined) setUnreadCount(data.count);
    };

    socket.on("notification", handleNewNotif);
    socket.on("notification-count", handleNotifCount);

    return () => {
      socket.off("notification", handleNewNotif);
      socket.off("notification-count", handleNotifCount);
    };
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {}
  };

  const deleteNotif = async (id: string) => {
    try {
      await apiFetch(`/api/v1/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {}
  };

  const getNotifIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "ride":
      case "ride updates":
        return <Route className="h-4 w-4 text-primary" />;
      case "wallet":
        return <Wallet className="h-4 w-4 text-amber-500" />;
      case "payment":
      case "payments":
        return <CreditCard className="h-4 w-4 text-emerald-500" />;
      case "tip":
      case "tips":
        return <HeartHandshake className="h-4 w-4 text-rose-500" />;
      case "document verification":
      case "verification":
        return <ShieldAlert className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <>
      {/* Real-time Popup Toast */}
      {toastNotification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm rounded-2xl bg-card p-4 shadow-elevated border border-primary/40 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10">{getNotifIcon(toastNotification.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{toastNotification.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{toastNotification.message || toastNotification.body}</p>
            </div>
            <button onClick={() => setToastNotification(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground hover:bg-accent transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-extrabold text-destructive-foreground shadow-glow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur">
          <div className="w-full max-w-md bg-card h-full shadow-elevated border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Notifications
                </h3>
                <p className="text-xs text-muted-foreground">{unreadCount} unread updates</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-colors relative group",
                      n.is_read ? "border-border bg-card" : "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-secondary">{getNotifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message || n.body}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="capitalize font-semibold text-primary">{n.type || "System"}</span>
                          <div className="flex items-center gap-2">
                            {!n.is_read && (
                              <button
                                onClick={() => markRead(n.id)}
                                className="flex items-center gap-1 text-emerald-600 font-bold hover:underline cursor-pointer"
                              >
                                <Check className="h-3 w-3" /> Mark read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotif(n.id)}
                              className="text-destructive hover:underline cursor-pointer opacity-70 hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
