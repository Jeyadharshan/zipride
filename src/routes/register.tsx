import { createFileRoute } from "@tanstack/react-router";
import { Register } from "@/auth/pages/Register";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create Account — ZipRide" }] }),
  component: Register,
});
