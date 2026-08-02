// User Roles
export const USER_ROLES = {
  RIDER: "rider",
  DRIVER: "driver",
  ADMIN: "admin",
} as const;

// Ride Statuses
export const RIDE_STATUS = {
  SEARCHING: "searching",
  ACCEPTED: "accepted",
  ARRIVING: "arriving",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// Driver Availability Statuses
export const DRIVER_STATUS = {
  OFFLINE: "offline",
  ONLINE: "online",
  BUSY: "busy",
} as const;

// Driver verification status
export const VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  SESSION: "zipride_session",
  USER_PROFILE: "zipride_user_profile",
  THEME: "zipride_theme",
  RECENT_SEARCHES: "zipride_recent_searches",
} as const;

// Map Configurations
export const MAP_CONFIG = {
  DEFAULT_CENTER: {
    lat: 37.7749, // San Francisco base coords (or configure locally)
    lng: -122.4194,
  },
  DEFAULT_ZOOM: 14,
  DRIVER_UPDATE_INTERVAL: 5000, // Update location every 5 seconds
} as const;

// Ride Types and Base Estimations
export const RIDE_TYPES = {
  ECONOMY: {
    id: "economy",
    name: "ZipRide Economy",
    baseFare: 2.5,
    ratePerMile: 1.25,
    ratePerMinute: 0.25,
    capacity: 4,
    description: "Affordable everyday rides for up to 4 riders",
    icon: "car",
  },
  PREMIUM: {
    id: "premium",
    name: "ZipRide Premium",
    baseFare: 5.0,
    ratePerMile: 2.2,
    ratePerMinute: 0.45,
    capacity: 4,
    description: "High-end luxury vehicles for premium comfort",
    icon: "sparkles",
  },
  SUV: {
    id: "suv",
    name: "ZipRide SUV",
    baseFare: 7.0,
    ratePerMile: 2.8,
    ratePerMinute: 0.55,
    capacity: 6,
    description: "Spacious SUVs ideal for groups and luggage",
    icon: "truck",
  },
} as const;

export type RideTypeId = keyof typeof RIDE_TYPES;
export type RideStatusType = (typeof RIDE_STATUS)[keyof typeof RIDE_STATUS];
export type UserRoleType = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type DriverStatusType = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];
export type VerificationStatusType = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
