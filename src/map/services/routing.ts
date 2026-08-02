// Driving routing service using Geoapify Routing API
export async function fetchRoute(pickupCoords: [number, number], dropoffCoords: [number, number]): Promise<{ distance: number; duration: number; coordinates: [number, number][] }> {
  const apiKey = "89b2025995104eb1a5aa9ea8bf27aec3";
  const url = `https://api.geoapify.com/v1/routing?waypoints=${pickupCoords[0]},${pickupCoords[1]}|${dropoffCoords[0]},${dropoffCoords[1]}&mode=drive&apiKey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    const route = data.features[0];
    const distance = parseFloat((route.properties.distance / 1000).toFixed(1));
    const duration = Math.ceil(route.properties.time / 60);
    
    let coords: [number, number][] = [];
    if (route.geometry && route.geometry.type === "LineString") {
      coords = route.geometry.coordinates.map((pt: any) => [pt[1], pt[0]] as [number, number]);
    } else if (route.geometry && route.geometry.type === "MultiLineString") {
      coords = route.geometry.coordinates.flat(1).map((pt: any) => [pt[1], pt[0]] as [number, number]);
    }
    
    return { distance, duration, coordinates: coords };
  }
  throw new Error("No route found");
}
