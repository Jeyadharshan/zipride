import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "@/admin/pages/Settings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — ZipRide" }] }),
  component: AdminSettings,
});
