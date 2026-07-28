import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ridesService } from "@/shared/services/rides";
import type { RideRequest } from "@/shared/types";

export const useRides = () => {
  const queryClient = useQueryClient();

  // Active Ride Query
  const activeRideQuery = useQuery({
    queryKey: ["rides", "active"],
    queryFn: () => ridesService.getActiveRide(),
    refetchOnWindowFocus: true,
  });

  // History Query (Rider)
  const riderHistoryQuery = useQuery({
    queryKey: ["rides", "history", "rider"],
    queryFn: () => ridesService.getRideHistory("rider"),
  });

  // History Query (Driver)
  const driverHistoryQuery = useQuery({
    queryKey: ["rides", "history", "driver"],
    queryFn: () => ridesService.getRideHistory("driver"),
  });

  // Request Ride Mutation
  const requestRideMutation = useMutation({
    mutationFn: (request: RideRequest) => ridesService.requestRide(request),
    onSuccess: (data) => {
      // Invalidate active queries to fetch the newly created ride
      queryClient.invalidateQueries({ queryKey: ["rides", "active"] });
      queryClient.invalidateQueries({ queryKey: ["rides", "history", "rider"] });
    },
  });

  // Cancel Ride Mutation
  const cancelRideMutation = useMutation({
    mutationFn: (rideId: string) => ridesService.cancelRide(rideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rides", "active"] });
      queryClient.invalidateQueries({ queryKey: ["rides", "history"] });
    },
  });

  return {
    // Active ride query states
    activeRide: activeRideQuery.data,
    isActiveRideLoading: activeRideQuery.isLoading,
    isActiveRideError: activeRideQuery.isError,
    activeRideError: activeRideQuery.error,
    refetchActiveRide: activeRideQuery.refetch,

    // History queries
    riderHistory: riderHistoryQuery.data || [],
    isRiderHistoryLoading: riderHistoryQuery.isLoading,
    driverHistory: driverHistoryQuery.data || [],
    isDriverHistoryLoading: driverHistoryQuery.isLoading,

    // Mutations
    requestRide: requestRideMutation.mutateAsync,
    isRequestingRide: requestRideMutation.isPending,
    requestRideError: requestRideMutation.error,

    cancelRide: cancelRideMutation.mutateAsync,
    isCancellingRide: cancelRideMutation.isPending,
    cancelRideError: cancelRideMutation.error,
  };
};
export type UseRidesReturn = ReturnType<typeof useRides>;
