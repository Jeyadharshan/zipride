import { createFileRoute } from "@tanstack/react-router";
import { Earnings } from "@/driver/pages/Earnings";

export const Route = createFileRoute("/driver/wallet")({
  head: () => ({ meta: [{ title: "Driver Wallet & Earnings — ZipRide" }] }),
  component: Earnings,
});
