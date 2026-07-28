import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/rider/pages/Dashboard";

export const Route = createFileRoute("/rider/home")({
  head: () => ({ meta: [{ title: "Rider Home — ZipRide" }] }),
  component: Dashboard,
});
