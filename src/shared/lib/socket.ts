import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

let socketInstance: Socket | null = null;
let wakeUpInProgress = false;

/**
 * Pings the backend health endpoint to wake Render from cold-start sleep.
 * Render free-tier instances spin down after 15 min of inactivity and take
 * up to 60 s to wake. We must wait for HTTP before opening the socket.
 */
async function wakeUpBackend(backendUrl: string): Promise<void> {
  if (wakeUpInProgress) return;
  wakeUpInProgress = true;
  const urls = [`${backendUrl}/health`, `${backendUrl}/api/health`, `${backendUrl}/`];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) as any });
      if (res.ok || res.status < 500) {
        console.log("⚡ Backend is awake — opening socket connection");
        wakeUpInProgress = false;
        return;
      }
    } catch {
      // try next URL
    }
  }
  wakeUpInProgress = false;
  // Even if ping fails, attempt socket connection anyway
}

/**
 * Returns a singleton Socket.IO client instance, tuned for Render free-tier.
 *
 * KEY FIXES:
 *  1. wakeUpBackend() — HTTP-pings the backend before opening socket so
 *     Render has time to spin up. Avoids the "timeout" error on cold start.
 *  2. transports: ["polling", "websocket"] — polling first (required for
 *     Render / nginx proxy to complete the HTTP upgrade handshake).
 *  3. timeout: 60000 — 60 s to match Render's max cold-start time.
 *  4. autoConnect: false — avoids a premature connection before auth.
 *  5. Exponential reconnection backoff with a 30 s max delay.
 */
export const getSocket = (): Socket => {
  const backendUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : API_BASE || "https://zipride-1.onrender.com";

  if (!socketInstance) {
    socketInstance = io(backendUrl, {
      // ⚠️  CRITICAL: polling first — required for Render / nginx proxy
      transports: ["polling", "websocket"],
      upgrade: true,

      // Do NOT auto-connect at module load; caller calls socket.connect()
      autoConnect: false,

      // 60 s timeout — covers Render cold-start (up to ~60 s)
      timeout: 60000,

      // Reconnection strategy
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    socketInstance.on("connect", () => {
      console.log("⚡ Socket.IO Connected:", socketInstance?.id);
      registerSocketAuth();
    });

    socketInstance.on("connect_error", (err) => {
      // "timeout" during Render cold-start is expected — log as info not error
      if (err.message === "timeout") {
        console.info("⏳ Socket.IO: backend is waking up, retrying...");
      } else {
        console.warn("🔴 Socket.IO connection error:", err.message);
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("⚠️ Socket.IO Disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server intentionally closed — reconnect
        socketInstance?.connect();
      }
    });
  }

  // Connect on first call (deferred from construction)
  if (!socketInstance.connected && !socketInstance.active) {
    // Wake up Render first, then connect
    wakeUpBackend(backendUrl).finally(() => {
      if (socketInstance && !socketInstance.connected && !socketInstance.active) {
        socketInstance.connect();
      }
    });
  }

  return socketInstance;
};

export const registerSocketAuth = (userId?: string, role?: string) => {
  if (socketInstance && socketInstance.connected) {
    const activeUserId =
      userId ||
      localStorage.getItem("user_id") ||
      sessionStorage.getItem("user_id");
    const activeRole =
      role ||
      localStorage.getItem("user_role") ||
      sessionStorage.getItem("user_role") ||
      "rider";

    if (activeUserId) {
      localStorage.setItem("user_id", activeUserId);
      localStorage.setItem("user_role", activeRole);
      socketInstance.emit("auth:register", {
        userId: activeUserId,
        profileId: activeUserId,
        role: activeRole,
      });
    }
  }
};

/**
 * Cleanly disconnect and destroy the singleton (e.g. on logout).
 * Next call to getSocket() will create a fresh connection.
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default getSocket;
