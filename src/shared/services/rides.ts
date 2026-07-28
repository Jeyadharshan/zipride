import { supabase } from "@/lib/supabase";
import { RIDE_STATUS, RIDE_TYPES } from "@/shared/constants";
import type {
  Ride,
  RideInsert,
  RideUpdate,
  RideWithParticipants,
  RideRequest,
  FareEstimate,
  DriverWithProfile,
} from "@/shared/types";

export const ridesService = {
  /**
   * Request a new ride (Rider action)
   */
  async requestRide(request: RideRequest): Promise<Ride> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Authentication required to request a ride.");

    // Estimate fare details locally or on DB
    const rideTypeInfo =
      RIDE_TYPES[request.rideType.toUpperCase() as keyof typeof RIDE_TYPES] || RIDE_TYPES.ECONOMY;
    const mockDistance = 5.2; // in miles (mock value or generated from routing API)
    const mockDuration = 900; // 15 mins (in seconds)
    const fare =
      Math.round((rideTypeInfo.baseFare + mockDistance * rideTypeInfo.ratePerMile) * 100) / 100;

    const rideInsert: RideInsert = {
      rider_id: user.id,
      pickup_address: request.pickupAddress,
      pickup_latitude: request.pickupLat,
      pickup_longitude: request.pickupLng,
      dropoff_address: request.dropoffAddress,
      dropoff_latitude: request.dropoffLat,
      dropoff_longitude: request.dropoffLng,
      status: RIDE_STATUS.SEARCHING,
      fare,
      distance: mockDistance,
      duration: mockDuration,
      payment_method: request.paymentMethod,
      payment_status: "pending",
    };

    const { data, error } = await supabase.from("rides").insert(rideInsert).select().single();

    if (error) throw error;
    return data;
  },

  /**
   * Get a specific ride with rider and driver details
   */
  async getRideDetails(rideId: string): Promise<RideWithParticipants> {
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        rider:profiles!rides_rider_id_fkey(full_name, phone, avatar_url),
        driver:profiles!rides_driver_id_fkey(full_name, phone, avatar_url, id, email)
      `,
      )
      .eq("id", rideId)
      .single();

    if (error) throw error;

    let driver: DriverWithProfile | null = null;

    // Fetch driver profile subdetails if driver exists
    if (data.driver && data.driver.id) {
      const { data: driverProfile } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("id", data.driver.id)
        .single();

      if (driverProfile) {
        driver = {
          ...driverProfile,
          profile: data.driver,
        };
      }
    }

    return {
      ...data,
      driver,
    } as unknown as RideWithParticipants;
  },

  /**
   * Get active ride for current rider or driver
   */
  async getActiveRide(): Promise<RideWithParticipants | null> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return null;

    // Check rider's active ride
    const { data: riderRide, error: riderError } = await supabase
      .from("rides")
      .select("id")
      .eq("rider_id", user.id)
      .in("status", [
        RIDE_STATUS.SEARCHING,
        RIDE_STATUS.ACCEPTED,
        RIDE_STATUS.ARRIVING,
        RIDE_STATUS.IN_PROGRESS,
      ])
      .order("created_at", { ascending: false })
      .limit(1);

    if (!riderError && riderRide && riderRide.length > 0) {
      return this.getRideDetails(riderRide[0].id);
    }

    // Check driver's active ride
    const { data: driverRide, error: driverError } = await supabase
      .from("rides")
      .select("id")
      .eq("driver_id", user.id)
      .in("status", [RIDE_STATUS.ACCEPTED, RIDE_STATUS.ARRIVING, RIDE_STATUS.IN_PROGRESS])
      .order("created_at", { ascending: false })
      .limit(1);

    if (!driverError && driverRide && driverRide.length > 0) {
      return this.getRideDetails(driverRide[0].id);
    }

    return null;
  },

  /**
   * Cancel an active ride
   */
  async cancelRide(rideId: string): Promise<Ride> {
    const update: RideUpdate = {
      status: RIDE_STATUS.CANCELLED,
    };

    const { data, error } = await supabase
      .from("rides")
      .update(update)
      .eq("id", rideId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get ride history for current user (rider or driver)
   */
  async getRideHistory(role: "rider" | "driver"): Promise<Ride[]> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Authentication required.");

    const query = supabase.from("rides").select("*");

    if (role === "rider") {
      query.eq("rider_id", user.id);
    } else {
      query.eq("driver_id", user.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Estimate fares for a given route (Mock routing details or calculated from distance/duration)
   */
  async estimateFares(
    pickupAddress: string,
    dropoffAddress: string,
    distanceMiles: number = 4.5,
    durationSeconds: number = 720,
  ): Promise<FareEstimate[]> {
    return Object.values(RIDE_TYPES).map((type) => {
      const fare =
        Math.round(
          (type.baseFare +
            distanceMiles * type.ratePerMile +
            (durationSeconds / 60) * type.ratePerMinute) *
            100,
        ) / 100;
      return {
        rideType: type.id,
        rideTypeName: type.name,
        fare,
        estimatedDistance: distanceMiles,
        estimatedDuration: durationSeconds,
        description: type.description,
        icon: type.icon,
      };
    });
  },
};

export type RidesService = typeof ridesService;
