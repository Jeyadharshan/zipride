import type { LatLng } from "@/shared/types";

/**
 * Calculates the distance between two points on the Earth using the Haversine formula.
 * Returns distance in miles by default, or kilometers if useMetric is true.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  useMetric = false,
): number => {
  const R = useMetric ? 6371 : 3958.8; // Radius of the earth in km or miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in units
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Generates an array of coordinates interpolating between a start and end point.
 * Useful for animating/simulating driver movement.
 */
export const interpolatePoints = (start: LatLng, end: LatLng, steps = 20): LatLng[] => {
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lat = start.lat + (end.lat - start.lat) * fraction;
    const lng = start.lng + (end.lng - start.lng) * fraction;
    points.push({ lat, lng });
  }
  return points;
};

/**
 * Basic validation for latitude and longitude
 */
export const isValidCoordinate = (
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};
