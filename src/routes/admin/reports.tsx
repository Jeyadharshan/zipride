import { createFileRoute } from "@tanstack/react-router";
import { Reports } from "@/admin/pages/Reports";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "System Reports — ZipRide" }] }),
  component: Reports,
});
