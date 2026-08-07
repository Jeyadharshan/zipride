import { createFileRoute } from "@tanstack/react-router";
import { Revenue } from "@/admin/pages/Revenue";

export const Route = createFileRoute("/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue Tracking — ZipRide" }] }),
  component: Revenue,
});
