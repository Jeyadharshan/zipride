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

export const registerSocketAuth = () => {
  if (socketInstance && socketInstance.connected) {
    const userId = localStorage.getItem("user_id") || sessionStorage.getItem("user_id");
    const role = localStorage.getItem("user_role") || sessionStorage.getItem("user_role") || "rider";

    if (userId) {
      socketInstance.emit("auth:register", { userId, profileId: userId, role });
    }
  }
};

export default getSocket;
