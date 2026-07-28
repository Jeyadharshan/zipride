// Geocoding service using OpenStreetMap Nominatim
export async function geocodeLocation(address: string): Promise<[number, number] | null> {
  const query = address.toLowerCase().includes("tamil nadu") || address.toLowerCase().includes("tamilnadu")
    ? address
    : `${address}, Tamil Nadu, India`;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
  );
  const data = await res.json();
  if (data && data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}
