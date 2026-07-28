import { createFileRoute } from "@tanstack/react-router";
import { AdminWalletPage } from "@/admin/pages/Wallet";

export const Route = createFileRoute("/admin/wallet")({
  head: () => ({ meta: [{ title: "Wallet & Financial Audit — ZipRide" }] }),
  component: AdminWalletPage,
});
