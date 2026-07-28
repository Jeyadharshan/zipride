import { createFileRoute } from "@tanstack/react-router";
import { DriverDashboard } from "@/driver/pages/Dashboard";

export const Route = createFileRoute("/driver/dashboard")({
  head: () => ({ meta: [{ title: "Driver Dashboard — ZipRide Driver" }] }),
  component: DriverDashboard,
});
