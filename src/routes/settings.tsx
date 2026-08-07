import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/rider/pages/Settings";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — ZipRide" }] }),
  component: Settings,
});
