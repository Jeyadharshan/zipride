import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/rider/pages/Search";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search destination — ZipRide" }] }),
  component: SearchPage,
});
