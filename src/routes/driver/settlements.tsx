import { createFileRoute } from "@tanstack/react-router";
import { DriverSettlementPage } from "@/driver/pages/Settlements";

export const Route = createFileRoute("/driver/settlements")({
  head: () => ({ meta: [{ title: "Driver Settlements — ZipRide" }] }),
  component: DriverSettlementPage,
});
