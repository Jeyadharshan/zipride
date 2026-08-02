import { createFileRoute } from "@tanstack/react-router";
import { ForgotPassword } from "@/auth/pages/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — ZipRide" }] }),
  component: ForgotPassword,
});
