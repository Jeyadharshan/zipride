import { useEffect, useRef } from "react";
import { getSocket, registerSocketAuth } from "@/shared/lib/socket";

export function useSocket(eventMap: Record<string, (data: any) => void>) {
  const eventMapRef = useRef(eventMap);
  eventMapRef.current = eventMap;

  useEffect(() => {
    const socket = getSocket();
    registerSocketAuth();

    const handlers: Record<string, (data: any) => void> = {};

    Object.keys(eventMapRef.current).forEach((event) => {
      handlers[event] = (data: any) => {
        if (eventMapRef.current[event]) {
          eventMapRef.current[event](data);
        }
      };
      socket.on(event, handlers[event]);
    });

    return () => {
      Object.keys(handlers).forEach((event) => {
        socket.off(event, handlers[event]);
      });
    };
  }, []);
}

export default useSocket;
