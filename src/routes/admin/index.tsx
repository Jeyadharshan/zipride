import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/admin/pages/Dashboard";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — ZipRide" }] }),
  component: AdminDashboard,
});
