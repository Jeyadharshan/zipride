import { createFileRoute } from "@tanstack/react-router";
import { DriverMgmt } from "@/admin/pages/Drivers";

export const Route = createFileRoute("/admin/drivers")({
  head: () => ({ meta: [{ title: "Manage Drivers — ZipRide" }] }),
  component: DriverMgmt,
});
