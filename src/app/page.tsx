"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth-store";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { SplashScreen } from "@/components/splash-screen";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

export default function Home() {
  const { isAuthenticated } = useAuth();
  // Avoid hydration mismatch: the Zustand persist store hydrates from
  // localStorage on the client only. On the server (SSR) isAuthenticated is
  // always false (landing page). If we render based on isAuthenticated
  // immediately, the server HTML won't match the client → React hydration
  // error + "Application error". So we wait for mount before rendering the
  // app shell.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Before mount: render the landing page (matches SSR). After mount: render
  // whichever the hydrated Zustand store says.
  const showApp = mounted && isAuthenticated;

  return (
    <>
      {/* Animated SYNQUE intro — shows once per browser session, sits on
          top (z-[9999]) then fades away to reveal the app underneath. */}
      <SplashScreen />
      <ServiceWorkerRegister />
      {!showApp ? <LandingPage /> : <AppShell />}
      {/* PWA install prompt — available on every page (landing + app) */}
      <PWAInstallPrompt />
    </>
  );
}
