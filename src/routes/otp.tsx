import { createFileRoute } from "@tanstack/react-router";
import { Otp } from "@/auth/pages/RiderOtp";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify Phone — ZipRide" }] }),
  component: Otp,
});
