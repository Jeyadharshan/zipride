import { createFileRoute } from "@tanstack/react-router";
import { DriverProfile } from "@/driver/pages/Profile";

export const Route = createFileRoute("/driver/profile")({
  head: () => ({ meta: [{ title: "Driver Profile — ZipRide Driver" }] }),
  component: DriverProfile,
});
