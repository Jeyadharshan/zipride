import { createFileRoute } from "@tanstack/react-router";
import { Searching } from "@/rider/pages/Searching";

export const Route = createFileRoute("/searching")({
  head: () => ({ meta: [{ title: "Finding your driver — ZipRide" }] }),
  component: Searching,
});
