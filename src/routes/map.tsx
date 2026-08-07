import { createFileRoute } from "@tanstack/react-router";
import { MapPage } from "@/rider/pages/Map";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Confirm location — ZipRide" }] }),
  component: MapPage,
});
