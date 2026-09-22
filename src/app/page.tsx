"use client";

import { useAuth } from "@/lib/auth-store";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";

export default function Home() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LandingPage />;
  return <AppShell />;
}
