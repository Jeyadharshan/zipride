import dotenv from 'dotenv';
dotenv.config();

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || 'czcmkgvwuhxjrxgcxhkvdfgylnpeefhhgjxf';

export const GeoapifyService = {
  async getRoute(origin, destination) {
    try {
      if (GEOAPIFY_API_KEY) {
        const url = `https://api.geoapify.com/v1/routing?waypoints=${origin.lat},${origin.lng}|${destination.lat},${destination.lng}&mode=drive&apiKey=${GEOAPIFY_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const route = data.features[0].properties;
            return {
              distance: parseFloat((route.distance / 1000).toFixed(2)),
              duration: Math.ceil(route.time / 60),
              coordinates: data.features[0].geometry.coordinates[0].map(pt => [pt[1], pt[0]])
            };
          }
        }
      }
      
      // Fallback to public OSRM API
      const fallbackUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      const fallbackRes = await fetch(fallbackUrl);
      const data = await fallbackRes.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distance: parseFloat((route.distance / 1000).toFixed(2)),
          duration: Math.ceil(route.duration / 60),
          coordinates: route.geometry.coordinates.map(pt => [pt[1], pt[0]])
        };
      }
      throw new Error('OSRM routing request failed');
    } catch (err) {
      console.error('[Geoapify Service] Routing error:', err.message);
      throw err;
    }
  },

  async geocode(address) {
    try {
      if (GEOAPIFY_API_KEY) {
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_API_KEY}&limit=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const feature = data.features?.[0];
          if (feature) {
            return {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0],
              formatted: feature.properties.formatted
            };
          }
        }
      }
      
      // Fallback using OSM Nominatim
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const fallbackRes = await fetch(fallbackUrl);
      const data = await fallbackRes.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          formatted: data[0].display_name
        };
      }
      return null;
    } catch (err) {
      console.error('[Geoapify Service] Geocoding error:', err.message);
      return null;
    }
  }
};
export default GeoapifyService;
