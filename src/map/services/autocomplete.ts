// Autocomplete service using Geoapify Geocoding Autocomplete API
export async function fetchSuggestions(query: string): Promise<any[]> {
  if (query.trim().length < 3) return [];
  const apiKey = "89b2025995104eb1a5aa9ea8bf27aec3";
  const searchStr = query.toLowerCase().includes("tamil nadu") || query.toLowerCase().includes("tamilnadu")
    ? query
    : `${query}, Tamil Nadu, India`;

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(searchStr)}&limit=5&apiKey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.features) {
    return data.features.map((item: any) => ({
      name: item.properties.formatted,
      lat: item.geometry.coordinates[1],
      lon: item.geometry.coordinates[0],
    }));
  }
  return [];
}
