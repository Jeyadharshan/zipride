import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const backendUrl =
      typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : API_BASE || "https://zipride-1.onrender.com";

    socketInstance = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    });

    socketInstance.on("connect", () => {
      console.log("⚡ Socket.IO Connected:", socketInstance?.id);
      registerSocketAuth();
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("⚠️ Socket.IO Disconnected:", reason);
    });
  }

  return socketInstance;
};

export const registerSocketAuth = (userId?: string, role?: string) => {
  if (socketInstance && socketInstance.connected) {
    const activeUserId = userId || localStorage.getItem("user_id") || sessionStorage.getItem("user_id");
    const activeRole = role || localStorage.getItem("user_role") || sessionStorage.getItem("user_role") || "rider";

    if (activeUserId) {
      localStorage.setItem("user_id", activeUserId);
      localStorage.setItem("user_role", activeRole);
      socketInstance.emit("auth:register", { userId: activeUserId, profileId: activeUserId, role: activeRole });
    }
  }
};

export default getSocket;
