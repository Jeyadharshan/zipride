import { createFileRoute } from "@tanstack/react-router";
import { WalletPage } from "@/rider/pages/Wallet";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "My Wallet — ZipRide" }] }),
  component: WalletPage,
});
