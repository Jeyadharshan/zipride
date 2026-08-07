import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "@/rider/pages/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — ZipRide" }] }),
  component: Profile,
});
