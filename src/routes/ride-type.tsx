import { createFileRoute } from "@tanstack/react-router";
import { RideType } from "@/rider/pages/RideType";

export const Route = createFileRoute("/ride-type")({
  head: () => ({ meta: [{ title: "Select ride type — ZipRide" }] }),
  component: RideType,
});
