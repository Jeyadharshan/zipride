import { createFileRoute } from "@tanstack/react-router";
import { History } from "@/rider/pages/History";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "My Rides — ZipRide" }] }),
  component: History,
});
