import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Ride, DriverProfile } from "@/shared/types";

export const useRealtime = () => {
  /**
   * Listen to real-time changes on a specific ride
   */
  const useRideUpdates = (rideId: string | undefined, onUpdate: (ride: Ride) => void) => {
    useEffect(() => {
      if (!rideId) return;

      const channel = supabase
        .channel(`ride-tracking-${rideId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rides",
            filter: `id=eq.${rideId}`,
          },
          (payload) => {
            onUpdate(payload.new as Ride);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [rideId, onUpdate]);
  };

  /**
   * Listen to all new ride requests in searching status (for Drivers)
   */
  const usePendingRideRequests = (onNewRequest: (ride: Ride) => void) => {
    useEffect(() => {
      const channel = supabase
        .channel("pending-rides")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "rides",
            filter: "status=eq.searching",
          },
          (payload) => {
            onNewRequest(payload.new as Ride);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [onNewRequest]);
  };

  /**
   * Listen to a specific driver's location updates (for Riders tracking driver on map)
   */
  const useDriverLocation = (
    driverId: string | undefined,
    onLocationUpdate: (location: { lat: number; lng: number; lastActive: string }) => void,
  ) => {
    useEffect(() => {
      if (!driverId) return;

      const channel = supabase
        .channel(`driver-location-${driverId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "driver_profiles",
            filter: `id=eq.${driverId}`,
          },
          (payload) => {
            const updatedProfile = payload.new as DriverProfile;
            if (updatedProfile.current_latitude && updatedProfile.current_longitude) {
              onLocationUpdate({
                lat: updatedProfile.current_latitude,
                lng: updatedProfile.current_longitude,
                lastActive: updatedProfile.last_active_at || new Date().toISOString(),
              });
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [driverId, onLocationUpdate]);
  };

  return {
    useRideUpdates,
    usePendingRideRequests,
    useDriverLocation,
  };
};
