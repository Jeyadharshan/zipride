import { createFileRoute } from "@tanstack/react-router";
import { RideMgmt } from "@/admin/pages/Rides";

export const Route = createFileRoute("/admin/rides")({
  head: () => ({ meta: [{ title: "Manage Rides — ZipRide" }] }),
  component: RideMgmt,
});
