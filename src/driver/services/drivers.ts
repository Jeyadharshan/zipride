import { supabase } from "@/lib/supabase";
import { DRIVER_STATUS, RIDE_STATUS } from "@/shared/constants";
import type {
  DriverProfile,
  DriverProfileInsert,
  DriverProfileUpdate,
  Ride,
  DriverWithProfile,
} from "@/shared/types";

export const driversService = {
  /**
   * Register or update driver vehicle and basic profile metadata
   */
  async registerDriver(profile: DriverProfileInsert): Promise<DriverProfile> {
    const { data, error } = await supabase
      .from("driver_profiles")
      .upsert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update driver online availability status
   */
  async updateStatus(driverId: string, status: DriverProfile["status"]): Promise<DriverProfile> {
    const update: DriverProfileUpdate = {
      status,
      last_active_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("driver_profiles")
      .update(update)
      .eq("id", driverId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update driver's physical coordinates
   */
  async updateLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<DriverProfile> {
    const update: DriverProfileUpdate = {
      current_latitude: latitude,
      current_longitude: longitude,
      last_active_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("driver_profiles")
      .update(update)
      .eq("id", driverId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch online drivers within geographic bounds (mock or spatial query)
   */
  async getNearbyDrivers(
    lat: number,
    lng: number,
    limit: number = 10,
  ): Promise<DriverWithProfile[]> {
    // In a fully-implemented Supabase project, you would use a postgres RPC spatial query
    // e.g. supabase.rpc('nearby_drivers', { lat, lng })
    const { data, error } = await supabase
      .from("driver_profiles")
      .select(
        `
        *,
        profile:profiles!driver_profiles_id_fkey(full_name, phone, avatar_url, email)
      `,
      )
      .eq("status", DRIVER_STATUS.ONLINE)
      .limit(limit);

    if (error) throw error;
    return data as unknown as DriverWithProfile[];
  },

  /**
   * Fetch rides that are currently looking for a driver
   */
  async getPendingRides(): Promise<Ride[]> {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("status", RIDE_STATUS.SEARCHING)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Accept an incoming ride request (Driver action)
   */
  async acceptRide(rideId: string, driverId: string): Promise<Ride> {
    // 1. Transactionally assign driver and update status
    const { data, error } = await supabase
      .from("rides")
      .update({
        driver_id: driverId,
        status: RIDE_STATUS.ACCEPTED,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("status", RIDE_STATUS.SEARCHING) // Check status is still searching
      .select()
      .single();

    if (error) throw error;

    // 2. Set driver status to BUSY
    await this.updateStatus(driverId, DRIVER_STATUS.BUSY);

    return data;
  },

  /**
   * Update the status of an ongoing ride (Driver action)
   */
  async updateRideStatus(
    rideId: string,
    status: Exclude<Ride["status"], "searching">,
    driverId: string,
  ): Promise<Ride> {
    const updates: Partial<Ride> = {
      status,
    };

    if (status === RIDE_STATUS.IN_PROGRESS) {
      updates.started_at = new Date().toISOString();
    } else if (status === RIDE_STATUS.COMPLETED) {
      updates.completed_at = new Date().toISOString();
      updates.payment_status = "completed"; // Mock setting payment as completed on arrival
    }

    const { data, error } = await supabase
      .from("rides")
      .update(updates)
      .eq("id", rideId)
      .select()
      .single();

    if (error) throw error;

    // If ride is finished or cancelled, mark driver as available again
    if (status === RIDE_STATUS.COMPLETED || status === RIDE_STATUS.CANCELLED) {
      await this.updateStatus(driverId, DRIVER_STATUS.ONLINE);
    }

    return data;
  },
};

export type DriversService = typeof driversService;
