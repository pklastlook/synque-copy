"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth-store";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { PwaSplashScreen } from "@/components/pwa-splash";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);

  // Hide splash after animation completes (2s)
  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && <PwaSplashScreen onComplete={() => setShowSplash(false)} />}
      {!isAuthenticated ? <LandingPage /> : <AppShell />}
    </>
  );
}
