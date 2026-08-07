import type { Database } from "./database.types";

// Re-export database schema types
export type * from "./database.types";

// User and Profile Domain Models
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type DriverProfile = Database["public"]["Tables"]["driver_profiles"]["Row"];
export type DriverProfileInsert = Database["public"]["Tables"]["driver_profiles"]["Insert"];
export type DriverProfileUpdate = Database["public"]["Tables"]["driver_profiles"]["Update"];

export type UserRole = Profile["role"];
export type DriverStatus = DriverProfile["status"];
export type VerificationStatus = DriverProfile["verification_status"];

// Ride Domain Models
export type Ride = Database["public"]["Tables"]["rides"]["Row"];
export type RideInsert = Database["public"]["Tables"]["rides"]["Insert"];
export type RideUpdate = Database["public"]["Tables"]["rides"]["Update"];
export type RideStatus = Ride["status"];

// Location and Geo Models
export interface LatLng {
  lat: number;
  lng: number;
}

export interface RideLocation {
  pickup: LatLng & { address: string };
  dropoff: LatLng & { address: string };
}

// Payment and Billing Domain Models
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];
export type PaymentStatus = Payment["status"];

// Notification Model
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

// Custom UI Models & API Interfaces
export interface RideRequest {
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  paymentMethod: string;
  rideType: string;
}

export interface FareEstimate {
  rideType: string;
  rideTypeName: string;
  fare: number;
  estimatedDuration: number; // in seconds
  estimatedDistance: number; // in miles/km
  description: string;
  icon: string;
}

export interface DriverWithProfile extends DriverProfile {
  profile: Pick<Profile, "full_name" | "phone" | "avatar_url" | "email">;
}

export interface RideWithParticipants extends Ride {
  rider?: Pick<Profile, "full_name" | "phone" | "avatar_url">;
  driver?: DriverWithProfile;
}
