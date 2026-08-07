import { createFileRoute } from "@tanstack/react-router";
import { Verifications } from "@/admin/pages/Verifications";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({ meta: [{ title: "Driver Verifications — ZipRide" }] }),
  component: Verifications,
});
