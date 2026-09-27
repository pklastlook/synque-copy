"use client";

import { useAuth } from "@/lib/auth-store";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { SplashScreen } from "@/components/splash-screen";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Animated SYNQUE intro — shows once per browser session, sits on
          top (z-[9999]) then fades away to reveal the app underneath. */}
      <SplashScreen />
      <ServiceWorkerRegister />
      {!isAuthenticated ? <LandingPage /> : <AppShell />}
    </>
  );
}
