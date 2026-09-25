"use client";

import * as React from "react";
import { LandingNav, LandingFooter, LandingBg } from "@/components/landing-shared";
import { ArrowRight, Check } from "lucide-react";

export default function Page() {
  return (
    <div className="relative min-h-screen">
      <LandingBg />
      <LandingNav />
      <main className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8" style={{ minHeight: "70vh" }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {cards}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
