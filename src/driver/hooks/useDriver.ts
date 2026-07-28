import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { driversService } from "@/driver/services/drivers";
import { useAuth } from "@/auth/hooks/useAuth";
import type { DriverProfileInsert, DriverProfile, Ride } from "@/shared/types";

export const useDriver = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Query: Pending ride requests seeking drivers
  const pendingRidesQuery = useQuery({
    queryKey: ["driver", "pendingRides"],
    queryFn: () => driversService.getPendingRides(),
    enabled: !!profile,
    refetchInterval: 10000, // Poll every 10 seconds (or use Realtime hook)
  });

  // Mutation: Register driver details
  const registerDriverMutation = useMutation({
    mutationFn: (prof: DriverProfileInsert) => driversService.registerDriver(prof),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", "profile"] });
    },
  });

  // Mutation: Update driver online status
  const updateStatusMutation = useMutation({
    mutationFn: (status: DriverProfile["status"]) => {
      if (!profile) throw new Error("Authentication required");
      return driversService.updateStatus(profile.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", "profile"] });
    },
  });

  // Mutation: Update physical coordinate location
  const updateLocationMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      if (!profile) throw new Error("Authentication required");
      return driversService.updateLocation(profile.id, latitude, longitude);
    },
  });

  // Mutation: Accept ride request
  const acceptRideMutation = useMutation({
    mutationFn: (rideId: string) => {
      if (!profile) throw new Error("Authentication required");
      return driversService.acceptRide(rideId, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rides", "active"] });
      queryClient.invalidateQueries({ queryKey: ["driver", "pendingRides"] });
    },
  });

  // Mutation: Update current ride state
  const updateRideStatusMutation = useMutation({
    mutationFn: ({
      rideId,
      status,
    }: {
      rideId: string;
      status: Exclude<Ride["status"], "searching">;
    }) => {
      if (!profile) throw new Error("Authentication required");
      return driversService.updateRideStatus(rideId, status, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rides", "active"] });
      queryClient.invalidateQueries({ queryKey: ["rides", "history"] });
    },
  });

  return {
    // Queries
    pendingRides: pendingRidesQuery.data || [],
    isPendingRidesLoading: pendingRidesQuery.isLoading,
    refetchPendingRides: pendingRidesQuery.refetch,

    // Mutations
    registerDriver: registerDriverMutation.mutateAsync,
    isRegisteringDriver: registerDriverMutation.isPending,

    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,

    updateLocation: updateLocationMutation.mutateAsync,
    isUpdatingLocation: updateLocationMutation.isPending,

    acceptRide: acceptRideMutation.mutateAsync,
    isAcceptingRide: acceptRideMutation.isPending,

    updateRideStatus: updateRideStatusMutation.mutateAsync,
    isUpdatingRideStatus: updateRideStatusMutation.isPending,
  };
};
export type UseDriverReturn = ReturnType<typeof useDriver>;
