"use client";

import { useAuth } from "@/lib/auth-store";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <ServiceWorkerRegister />
      {!isAuthenticated ? <LandingPage /> : <AppShell />}
    </>
  );
}
