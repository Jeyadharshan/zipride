import { createFileRoute } from "@tanstack/react-router";
import { Earnings } from "@/driver/pages/Earnings";

export const Route = createFileRoute("/driver/earnings")({
  head: () => ({ meta: [{ title: "Earnings History — ZipRide Driver" }] }),
  component: Earnings,
});
