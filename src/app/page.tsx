"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth-store";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { SplashScreen } from "@/components/splash-screen";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AppErrorBoundary } from "@/components/app-error-boundary";

export default function Home() {
  const { isAuthenticated } = useAuth();
  // Avoid hydration mismatch: the Zustand persist store hydrates from
  // localStorage on the client only. On the server (SSR) isAuthenticated is
  // always false (landing page). So we wait for mount before rendering the
  // app shell — otherwise the server HTML won't match the client → React
  // hydration error + "Application error".
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const showApp = mounted && isAuthenticated;

  return (
    <>
      <SplashScreen />
      <ServiceWorkerRegister />
      <AppErrorBoundary>
        {!showApp ? <LandingPage /> : <AppShell />}
      </AppErrorBoundary>
      <PWAInstallPrompt />
    </>
  );
}
