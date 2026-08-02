// Reverse geocoding service using OpenStreetMap Nominatim
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (data && data.display_name) {
    const parts = data.display_name.split(",");
    return parts.slice(0, 3).join(",").trim();
  }
  throw new Error("No address found");
}
