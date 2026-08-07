import { createFileRoute } from "@tanstack/react-router";
import { Payment } from "@/rider/pages/Payment";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Payment details — ZipRide" }] }),
  component: Payment,
});
