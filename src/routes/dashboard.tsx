import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/rider/pages/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Rider Dashboard — ZipRide" }] }),
  component: Dashboard,
});
