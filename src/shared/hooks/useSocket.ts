import { useEffect } from "react";
import { getSocket, registerSocketAuth } from "@/shared/lib/socket";

export function useSocket(eventMap: Record<string, (data: any) => void>) {
  useEffect(() => {
    const socket = getSocket();
    registerSocketAuth();

    Object.entries(eventMap).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(eventMap).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [eventMap]);
}

export default useSocket;
