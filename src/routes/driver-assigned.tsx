import { createFileRoute } from "@tanstack/react-router";
import { DriverAssigned } from "@/rider/pages/DriverAssigned";

export const Route = createFileRoute("/driver-assigned")({
  head: () => ({ meta: [{ title: "Driver assigned — ZipRide" }] }),
  component: DriverAssigned,
});
