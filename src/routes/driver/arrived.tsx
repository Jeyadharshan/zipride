import { createFileRoute } from "@tanstack/react-router";
import { ArrivedAtPassenger } from "@/driver/pages/Arrived";

export const Route = createFileRoute("/driver/arrived")({
  head: () => ({ meta: [{ title: "Arrived at pickup — ZipRide Driver" }] }),
  component: ArrivedAtPassenger,
});
