import { createFileRoute } from "@tanstack/react-router";
import { Active } from "@/driver/pages/Active";

export const Route = createFileRoute("/driver/active")({
  head: () => ({ meta: [{ title: "Active Ride — ZipRide Driver" }] }),
  component: Active,
});
