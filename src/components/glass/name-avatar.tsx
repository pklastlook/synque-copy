"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const GRADIENTS: Record<string, string> = {
  rose: "from-[oklch(0.7_0.24_14)] to-[oklch(0.66_0.22_350)]",
  amber: "from-[oklch(0.78_0.18_75)] to-[oklch(0.7_0.19_45)]",
  teal: "from-[oklch(0.74_0.18_165)] to-[oklch(0.7_0.16_195)]",
  magenta: "from-[oklch(0.66_0.22_305)] to-[oklch(0.62_0.24_340)]",
  green: "from-[oklch(0.76_0.18_145)] to-[oklch(0.72_0.2_160)]",
  blue: "from-[oklch(0.7_0.18_250)] to-[oklch(0.66_0.2_280)]",
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
  className,
  ring,
}: {
  name: string;
  color?: string | null;
  src?: string | null;
  className?: string;
  ring?: boolean;
}) {
  const c = color && GRADIENTS[color] ? color : hashColor(name);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white shadow-inner",
        GRADIENTS[c],
        ring && "ring-2 ring-background",
        className
      )}
      aria-label={name}
    >
      {src ? (
         
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="select-none">{initials(name)}</span>
      )}
    </div>
  );
}
