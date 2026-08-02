import { createFileRoute } from "@tanstack/react-router";
import { UserMgmt } from "@/admin/pages/Users";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Manage Users — ZipRide" }] }),
  component: UserMgmt,
});
