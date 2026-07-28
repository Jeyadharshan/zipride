import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import type L from "leaflet";
import { fetchRoute } from "@/map/services/routing";

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

// Transparent 1x1 pixel shadow to avoid CDN tracking prevention warning
const SHADOW_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

interface MapCanvasProps {
  className?: string;
  carProgress?: number;
  dashed?: boolean;
  pickupCoords?: [number, number] | null;
  dropoffCoords?: [number, number] | null;
  mode?: "pickup" | "dropoff";
}

export function MapCanvas({
  className,
  carProgress = 0.5,
  dashed = false,
  pickupCoords,
  dropoffCoords,
  mode = "dropoff",
}: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const boundsFittedRef = useRef<string>("");

  // Calculate bearing (angle) between p1 and p2 coordinates in degrees
  const calculateBearing = (p1: [number, number], p2: [number, number]): number => {
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360; // Normalize to [0, 360]
  };

  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // Initialize Leaflet Map — dynamically imported to avoid SSR "window not defined"
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      injectLeafletCss();
      leafletRef.current = L;

      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([9.4522, 77.9626], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapInitialized(true);
    });
  }, []);

  // Effect 1: Fetch actual route and fitBounds ONCE when pickup/dropoff coordinates change
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return;

    // Invalidate size to handle dynamic container resizing and prevent tile bugs
    mapRef.current.invalidateSize();

    const pickup = [
      Number(pickupCoords ? pickupCoords[0] : 9.4522),
      Number(pickupCoords ? pickupCoords[1] : 77.9626)
    ] as [number, number];
    const dropoff = [
      Number(dropoffCoords ? dropoffCoords[0] : 9.5022),
      Number(dropoffCoords ? dropoffCoords[1] : 77.9026)
    ] as [number, number];

    // Remove green starting location marker completely
    if (pickupMarkerRef.current) {
      mapRef.current.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    // Manage Destination Marker (Red)
    const LLocal = leafletRef.current;
    if (!LLocal) return;
    if (mode === "pickup") {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLatLng(dropoff);
        dropoffMarkerRef.current.setPopupContent("Pickup Location");
      } else {
        const redIcon = LLocal.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
          shadowUrl: SHADOW_URL,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        dropoffMarkerRef.current = LLocal.marker(dropoff, { icon: redIcon })
          .addTo(mapRef.current!)
          .bindPopup("Pickup Location");
      }
    } else {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLatLng(dropoff);
        dropoffMarkerRef.current.setPopupContent("Destination");
      } else {
        const redIcon = LLocal.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
          shadowUrl: SHADOW_URL,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        dropoffMarkerRef.current = LLocal.marker(dropoff, { icon: redIcon })
          .addTo(mapRef.current!)
          .bindPopup("Destination");
      }
    }

    let active = true;

    // Fetch actual route from Geoapify
    fetchRoute(pickup, dropoff)
      .then((res) => {
        if (!active) return;
        const coords = res.coordinates;
        if (coords.length > 0) {
          setRoutePoints(coords);

          // Clear previous polyline route layers ONLY when new route points are ready
          if (routeLineRef.current) {
            mapRef.current!.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
          }
          mapRef.current!.eachLayer((layer) => {
            if (LLocal && layer instanceof LLocal.Polyline && !(layer instanceof LLocal.Polygon)) {
              mapRef.current!.removeLayer(layer);
            }
          });

          routeLineRef.current = LLocal.polyline(coords, {
            color: "#ff7a00",
            weight: 5,
            opacity: 0.8,
            dashArray: undefined,
          }).addTo(mapRef.current!);

          // Focus map view to fit route bounds ONCE per route key change
          const routeKey = `${mode}|${dropoff[0]},${dropoff[1]}`;
          if (boundsFittedRef.current !== routeKey) {
            mapRef.current!.fitBounds(routeLineRef.current!.getBounds(), {
              padding: [40, 40],
            });
            boundsFittedRef.current = routeKey;
          }
        } else {
          setRoutePoints([]);
          
          // Clear previous polyline route layers
          if (routeLineRef.current) {
            mapRef.current!.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
          }
          mapRef.current!.eachLayer((layer) => {
            if (LLocal && layer instanceof LLocal.Polyline && !(layer instanceof LLocal.Polygon)) {
              mapRef.current!.removeLayer(layer);
            }
          });
          drawFallbackLine(LLocal, pickup, dropoff);
        }
      })
      .catch((e) => {
        console.error("Geoapify route fetch error in MapCanvas:", e);
        setRoutePoints([]);
        
        // Clear previous polyline route layers
        if (routeLineRef.current) {
          mapRef.current!.removeLayer(routeLineRef.current);
          routeLineRef.current = null;
        }
        mapRef.current!.eachLayer((layer) => {
          if (LLocal && layer instanceof LLocal.Polyline && !(layer instanceof LLocal.Polygon)) {
            mapRef.current!.removeLayer(layer);
          }
        });
        drawFallbackLine(LLocal, pickup, dropoff);
      });

    return () => {
      active = false;
    };
  }, [mapInitialized, pickupCoords, dropoffCoords, mode]);

  // Effect 2: Update car position & rotation along route when progress changes (no fitBounds to allow free view panning/zooming)
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return;

    const pickup = [
      Number(pickupCoords ? pickupCoords[0] : 9.4522),
      Number(pickupCoords ? pickupCoords[1] : 77.9626)
    ] as [number, number];
    const dropoff = [
      Number(dropoffCoords ? dropoffCoords[0] : 9.5022),
      Number(dropoffCoords ? dropoffCoords[1] : 77.9026)
    ] as [number, number];

    let carPos = [0, 0] as [number, number];
    let angle = 0;

    if (routePoints.length > 1) {
      const index = Math.min(Math.floor(carProgress * (routePoints.length - 1)), routePoints.length - 1);
      carPos = routePoints[index] || pickup;

      // Calculate direction angle (bearing) for car rotation
      const nextPoint = routePoints[index + 1] || routePoints[index];
      const prevPoint = routePoints[index - 1] || routePoints[index];
      if (index < routePoints.length - 1) {
        angle = calculateBearing(carPos, nextPoint);
      } else {
        angle = calculateBearing(prevPoint, carPos);
      }
    } else {
      const carLat = pickup[0] + (dropoff[0] - pickup[0]) * carProgress;
      const carLng = pickup[1] + (dropoff[1] - pickup[1]) * carProgress;
      carPos = [carLat, carLng] as [number, number];
      angle = calculateBearing(pickup, dropoff);
    }

    // Create marker icon with rotation angle applied (top-down yellow taxi model)
    const LCar = leafletRef.current;
    if (!LCar) return;
    const carIcon = LCar.icon({
      iconUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='40' height='40'><g transform='rotate(${angle}, 256, 256)'><rect x='130' y='80' width='252' height='360' rx='50' fill='%231e293b' opacity='0.2'/><rect x='100' y='120' width='40' height='80' rx='10' fill='%230f172a'/><rect x='372' y='120' width='40' height='80' rx='10' fill='%230f172a'/><rect x='100' y='320' width='40' height='80' rx='10' fill='%230f172a'/><rect x='372' y='320' width='40' height='80' rx='10' fill='%230f172a'/><rect x='120' y='70' width='272' height='370' rx='60' fill='%23f59e0b'/><rect x='140' y='150' width='232' height='210' rx='40' fill='%23d97706'/><path d='M160 170 C160 150, 352 150, 352 170 L332 210 L180 210 Z' fill='%23e2e8f0'/><path d='M180 310 L332 310 L352 340 C352 350, 160 350, 160 340 Z' fill='%23e2e8f0'/><rect x='135' y='220' width='15' height='80' rx='5' fill='%23e2e8f0'/><rect x='362' y='220' width='15' height='80' rx='5' fill='%23e2e8f0'/><rect x='160' y='60' width='30' height='15' rx='5' fill='%23fef08a'/><rect x='322' y='60' width='30' height='15' rx='5' fill='%23fef08a'/><rect x='160' y='435' width='40' height='10' rx='3' fill='%23ef4444'/><rect x='312' y='435' width='40' height='10' rx='3' fill='%23ef4444'/></g></svg>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    // Manage Driver Marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(carPos);
      driverMarkerRef.current.setIcon(carIcon);
    } else {
      driverMarkerRef.current = LCar.marker(carPos, { icon: carIcon })
        .addTo(mapRef.current!)
        .bindPopup("Driver Location");
    }
  }, [mapInitialized, routePoints, carProgress, pickupCoords, dropoffCoords]);

  const drawFallbackLine = (L: any, pickup: [number, number], dropoff: [number, number]) => {
    routeLineRef.current = L.polyline([pickup, dropoff], {
      color: "#ff7a00",
      weight: 5,
      opacity: 0.8,
      dashArray: undefined,
    }).addTo(mapRef.current!);

    mapRef.current!.fitBounds(routeLineRef.current!.getBounds(), {
      padding: [40, 40],
    });
  };

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
