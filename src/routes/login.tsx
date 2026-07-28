import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/auth/pages/Login";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ZipRide" }] }),
  component: Login,
});
