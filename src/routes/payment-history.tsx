import { createFileRoute } from "@tanstack/react-router";
import { PaymentHistoryPage } from "@/rider/pages/PaymentHistory";

export const Route = createFileRoute("/payment-history")({
  head: () => ({ meta: [{ title: "Payment History — ZipRide" }] }),
  component: PaymentHistoryPage,
});
