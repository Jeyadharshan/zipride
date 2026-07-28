// Tracking services for real-time ride tracking
import { supabase } from "@/lib/supabase";

export function subscribeToRideTracking(rideId: string, onUpdate: (coords: { lat: number; lng: number }) => void) {
  return supabase
    .channel(`ride-tracking-${rideId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rides",
        filter: `id=eq.${rideId}`,
      },
      (payload: any) => {
        const { driver_latitude, driver_longitude } = payload.new;
        if (driver_latitude && driver_longitude) {
          onUpdate({ lat: driver_latitude, lng: driver_longitude });
        }
      }
    )
    .subscribe();
}
