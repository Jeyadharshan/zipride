import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

let socketInstance: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance.
 *
 * KEY FIXES for Render / proxy-hosted backends:
 *  1. transports: ["polling", "websocket"]  — polling MUST come first so the
 *     HTTP upgrade handshake completes before switching to WS. Render's
 *     reverse-proxy cannot handle a cold WebSocket-first connection.
 *  2. upgrade: true + upgradeTimeout: 10000 — allow up to 10 s to promote
 *     from polling to WebSocket after the initial connection is established.
 *  3. autoConnect: false — prevents a connection attempt at module-load time
 *     (before the user is authenticated). Call socket.connect() explicitly.
 *  4. Longer reconnection backoff — Render free tier sleeps; give it time to
 *     wake up before retrying.
 */
export const getSocket = (): Socket => {
  if (!socketInstance) {
    // Determine the correct backend URL:
    //   - localhost in dev
    //   - VITE_API_URL / VITE_BACKEND_URL env var in production (set in .env)
    //   - safe fallback to the known Render URL
    const backendUrl =
      typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : API_BASE || "https://zipride-1.onrender.com";

    socketInstance = io(backendUrl, {
      // ⚠️  CRITICAL: polling first — required for Render / nginx proxy
      transports: ["polling", "websocket"],
      upgrade: true,         // promote to WebSocket after polling handshake
      upgradeTimeout: 10000, // wait up to 10 s before giving up on upgrade

      // Do NOT auto-connect at module load; caller calls socket.connect()
      autoConnect: false,

      // Reconnection strategy (handle Render cold-starts / spin-downs)
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,

      // Keep the connection alive
      timeout: 20000,
    });

    socketInstance.on("connect", () => {
      console.log("⚡ Socket.IO Connected:", socketInstance?.id);
      registerSocketAuth();
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("🔴 Socket.IO connection error:", err.message);
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("⚠️ Socket.IO Disconnected:", reason);
      // "io server disconnect" means server intentionally closed — reconnect
      if (reason === "io server disconnect") {
        socketInstance?.connect();
      }
    });
  }

  // Connect on first call (deferred from construction)
  if (!socketInstance.connected && !socketInstance.active) {
    socketInstance.connect();
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
