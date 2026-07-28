import { createFileRoute } from "@tanstack/react-router";
import { Completed } from "@/rider/pages/Completed";

export const Route = createFileRoute("/completed")({
  head: () => ({ meta: [{ title: "Ride completed — ZipRide" }] }),
  component: Completed,
});
