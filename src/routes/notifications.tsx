import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/rider/pages/Notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ZipRide" }] }),
  component: Notifications,
});
