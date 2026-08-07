import { createFileRoute } from "@tanstack/react-router";
import { Rating } from "@/rider/pages/Rating";

export const Route = createFileRoute("/rating")({
  head: () => ({ meta: [{ title: "Rate your ride — ZipRide" }] }),
  component: Rating,
});
