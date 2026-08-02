import { createFileRoute } from "@tanstack/react-router";
import { Help } from "@/rider/pages/Help";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Support — ZipRide" }] }),
  component: Help,
});
