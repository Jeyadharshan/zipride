import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/rider/pages/Onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to ZipRide — ZipRide" }] }),
  component: Onboarding,
});
