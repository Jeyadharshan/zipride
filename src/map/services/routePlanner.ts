// Geoapify Route Planner service for optimization/VRP solver

export interface RoutePlannerLocation {
  id: string;
  location: [number, number]; // [lon, lat]
}

export interface RoutePlannerAgent {
  id: string;
  start_location: [number, number]; // [lon, lat]
  end_location?: [number, number]; // [lon, lat]
  time_windows?: [number, number][];
}

export interface RoutePlannerShipment {
  id: string;
  pickup: {
    location_index?: number;
    location?: [number, number];
    duration?: number;
  };
  delivery: {
    location_index?: number;
    location?: [number, number];
    duration?: number;
  };
}

export interface RoutePlannerJob {
  id: string;
  location: [number, number]; // [lon, lat]
  duration?: number;
}

export interface RoutePlannerParams {
  locations?: RoutePlannerLocation[];
  agents: RoutePlannerAgent[];
  shipments?: RoutePlannerShipment[];
  jobs?: RoutePlannerJob[];
}

/**
 * Sends a list of agents, jobs, shipments, and locations to the Geoapify Route Planner API
 * to retrieve the optimized route schedules for vehicles or experts.
 */
export async function optimizeRoutes(params: RoutePlannerParams): Promise<any> {
  const apiKey = "89b2025995104eb1a5aa9ea8bf27aec3";
  const url = `https://api.geoapify.com/v1/routeplanner?apiKey=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Route planner optimization request failed: ${errorText}`);
  }

  return response.json();
}
