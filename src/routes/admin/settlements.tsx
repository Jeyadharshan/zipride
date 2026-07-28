import { createFileRoute } from "@tanstack/react-router";
import { AdminSettlementsPage } from "@/admin/pages/Settlements";

export const Route = createFileRoute("/admin/settlements")({
  head: () => ({ meta: [{ title: "Driver Payout Settlements — ZipRide Admin" }] }),
  component: AdminSettlementsPage,
});
