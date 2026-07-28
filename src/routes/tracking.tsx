import { createFileRoute } from "@tanstack/react-router";
import { Tracking } from "@/rider/pages/Tracking";

export const Route = createFileRoute("/tracking")({
  head: () => ({ meta: [{ title: "Live tracking — ZipRide" }] }),
  component: Tracking,
});
