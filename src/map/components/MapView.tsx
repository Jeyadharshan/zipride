import { reverseGeocode } from "@/map/services/reverseGeocoding";
import { fetchRoute } from "@/map/services/routing";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import type L from "leaflet";

// Transparent 1x1 pixel shadow to avoid CDN tracking prevention warning
const SHADOW_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Leaflet CSS is injected once dynamically to avoid SSR crash (window not defined)
let leafletCssInjected = false;
function injectLeafletCss() {
  if (leafletCssInjected || typeof window === "undefined") return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
  leafletCssInjected = true;
}

interface MapViewProps {
  pickupCoords: [number, number] | null;
  dropoffCoords: [number, number] | null;
  onRouteCalculated?: (distanceKm: number, durationMins: number) => void;
  onUserLocationDetected?: (address: string, lat: number, lon: number) => void;
  onDropoffSelected?: (address: string, lat: number, lon: number) => void;
  className?: string;
}

export function MapView({
  pickupCoords,
  dropoffCoords,
  onRouteCalculated,
  onUserLocationDetected,
  onDropoffSelected,
  className,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Initialize Leaflet Map dynamically to avoid SSR "window not defined"
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      injectLeafletCss();
      leafletRef.current = L;

      if (!mapContainerRef.current || mapRef.current) return;

      const mapApiKey = import.meta.env.VITE_MAP_API_KEY || "";
      console.log("[MapView] Connecting Map API key globally:", mapApiKey);

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([9.4522, 77.9626], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        try {
          const shortAddress = await reverseGeocode(lat, lng);
          onDropoffSelected?.(shortAddress, lat, lng);
        } catch (err) {
          console.error("Reverse geocoding click error:", err);
          onDropoffSelected?.(`Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng);
        }
      });

      mapRef.current = map;
      setMapInitialized(true);
    });
  }, []);

  // User Current Geolocation Detection
  useEffect(() => {
    if (!mapInitialized || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const pos = [latitude, longitude] as [number, number];

          if (mapRef.current) {
            mapRef.current.setView(pos, 15);

            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng(pos);
            } else {
              const userIcon = L.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                shadowUrl: SHADOW_URL,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
              });

              userMarkerRef.current = L.marker(pos, { icon: userIcon })
                .addTo(mapRef.current)
                .bindPopup("Your Location")
                .openPopup();
            }
          }

          try {
            const shortAddress = await reverseGeocode(latitude, longitude);
            onUserLocationDetected?.(shortAddress, latitude, longitude);
          } catch (e) {
            console.error("Reverse geocoding current location error:", e);
            onUserLocationDetected?.("My Current Location", latitude, longitude);
          }
        },
        (error) => {
          console.error("Browser geolocation error:", error);
        }
      );
    }
  }, [mapInitialized]);

  // Pickup and Drop markers & OSRM Road Route polyline display
  useEffect(() => {
    if (!mapInitialized || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    if (pickupMarkerRef.current) mapRef.current!.removeLayer(pickupMarkerRef.current);
    if (dropoffMarkerRef.current) mapRef.current!.removeLayer(dropoffMarkerRef.current);
    if (routeLineRef.current) mapRef.current!.removeLayer(routeLineRef.current);

    const greenIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl: SHADOW_URL,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const redIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl: SHADOW_URL,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    if (pickupCoords) {
      pickupMarkerRef.current = L.marker(pickupCoords, { icon: greenIcon })
        .addTo(mapRef.current!)
        .bindPopup("Pickup Location");
    }

    if (dropoffCoords) {
      dropoffMarkerRef.current = L.marker(dropoffCoords, { icon: redIcon })
        .addTo(mapRef.current!)
        .bindPopup("Destination Drop");
    }

    if (pickupCoords && dropoffCoords) {
      fetchRoute(pickupCoords, dropoffCoords)
        .then(({ distance, duration, coordinates }) => {
          routeLineRef.current = L.polyline(coordinates, {
            color: "#ff7a00",
            weight: 5,
            opacity: 0.8,
          }).addTo(mapRef.current!);

          mapRef.current!.fitBounds(routeLineRef.current!.getBounds(), {
            padding: [50, 50],
          });

          onRouteCalculated?.(distance, duration);
        })
        .catch((e) => {
          console.error("OSRM route fetch error:", e);
        });
    } else if (pickupCoords) {
      mapRef.current!.setView(pickupCoords, 14);
    } else if (dropoffCoords) {
      mapRef.current!.setView(dropoffCoords, 14);
    }
  }, [mapInitialized, pickupCoords, dropoffCoords]);

  return (
    <div className={cn("overflow-hidden", className)}>
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
