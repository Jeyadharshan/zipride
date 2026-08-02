import { createFileRoute } from "@tanstack/react-router";
import { DriverDashboard } from "@/driver/pages/Dashboard";

export const Route = createFileRoute("/driver/home")({
  head: () => ({ meta: [{ title: "Driver Home — ZipRide Driver" }] }),
  component: DriverDashboard,
});
