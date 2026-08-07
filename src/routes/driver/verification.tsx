import { createFileRoute } from "@tanstack/react-router";
import { Verification } from "@/driver/pages/Verification";

export const Route = createFileRoute("/driver/verification")({
  head: () => ({ meta: [{ title: "Verification Status — ZipRide Driver" }] }),
  component: Verification,
});
