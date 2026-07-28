import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")(({
  head: () => ({ meta: [{ title: "Redirecting — ZipRide" }] }),
  component: SplashRedirect,
}));

function SplashRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return null;
}
