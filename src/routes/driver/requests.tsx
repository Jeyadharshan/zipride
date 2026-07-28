import { createFileRoute } from "@tanstack/react-router";
import { Requests } from "@/driver/pages/Requests";

export const Route = createFileRoute("/driver/requests")({
  head: () => ({ meta: [{ title: "Incoming Requests — ZipRide Driver" }] }),
  component: Requests,
});
