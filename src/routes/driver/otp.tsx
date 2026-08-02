import { createFileRoute } from "@tanstack/react-router";
import { VerifyOtpPage } from "@/auth/pages/DriverOtp";

export const Route = createFileRoute("/driver/otp")({
  head: () => ({ meta: [{ title: "Verify Driver — ZipRide" }] }),
  component: VerifyOtpPage,
});
