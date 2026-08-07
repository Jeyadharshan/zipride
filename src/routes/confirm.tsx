import { createFileRoute } from "@tanstack/react-router";
import { Confirm } from "@/rider/pages/Confirm";

export const Route = createFileRoute("/confirm")({
  head: () => ({ meta: [{ title: "Confirm booking — ZipRide" }] }),
  component: Confirm,
});
