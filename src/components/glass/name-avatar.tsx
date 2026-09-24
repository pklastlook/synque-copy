"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const GRADIENTS: Record<string, string> = {
  rose: "from-[var(--primary)] to-[var(--gold)]",
  amber: "from-[oklch(0.82 0.14 85)] to-[oklch(0.7 0.16 55)]",
  teal: "from-[oklch(0.72 0.16 200)] to-[oklch(0.7 0.15 165)]",
  magenta: "from-[oklch(0.6 0.16 230)] to-[var(--gold)]",
  green: "from-[oklch(0.76 0.18 145)] to-[oklch(0.72 0.15 165)]",
  blue: "from-[var(--primary)] to-[oklch(0.5 0.16 230)]",
};

function hashColor(name: string) {
  const keys = Object.keys(GRADIENTS);
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return keys[Math.abs(h) % keys.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function NameAvatar({
  name,
  color,
  src,
  gender,
  className,
  ring,
}: {
  name: string;
  color?: string | null;
  src?: string | null;
  gender?: string | null;
  className?: string;
  ring?: boolean;
}) {
  const c = color && GRADIENTS[color] ? color : hashColor(name);
  // Gender-based gradient override when no photo is available
  const genderGradient =
    gender === "female" ? "from-pink-500 to-rose-400" :
    gender === "male" ? "from-blue-500 to-cyan-400" :
    null;
  const gradient = genderGradient ?? GRADIENTS[c];
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white shadow-inner",
        gradient,
        ring && "ring-2 ring-background",
        className
      )}
      aria-label={name}
    >
      {src ?
        <img src={src} alt={name} className="h-full w-full object-cover" />
      : (
        <span className="select-none">{initials(name)}</span>
      )}
    </div>
  );
}
