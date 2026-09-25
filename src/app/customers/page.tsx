"use client";
import { LandingNav, LandingFooter, LandingBg } from "@/components/landing-shared";
import { Check } from "lucide-react";

export default function Page() {
  const items = [
    { title: "Social Media Cell", desc: "Reduced posting time by 73% across 7+ platforms with AI-generated variants." },
    { title: "LastLook Studios", desc: "Eliminated account suspensions with automated protection rules." },
    { title: "Brand Collective", desc: "Increased engagement by 240% using AI-optimized posting schedules." },
    { title: "Creative Hub", desc: "Unified 12 team members into one collaborative workflow." },
  ];
  return (
    <div className="relative min-h-screen">
      <LandingBg />
      <LandingNav />
      <main className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8" style={{ minHeight: "70vh" }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Customers</h1>
          <p className="mt-4 text-lg text-muted-foreground">Teams that transformed their social workflow</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-500/10 border border-teal-500/30">
                  <Check className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
