import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")(({
  head: () => ({ meta: [{ title: "ZipRide — Fast, Reliable & Safe Rides" }] }),
  component: SplashRedirect,
}));

function SplashRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return null;
}
