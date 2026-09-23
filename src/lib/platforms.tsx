import * as React from "react";
import { cn } from "@/lib/utils";

export type PlatformId =
  | "instagram"
  | "facebook"
  | "x"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "threads";

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  short: string;
  charLimit: number;
  gradient: string; // tailwind class for avatar bg
  color: string; // raw css color for charts
  accent: string;
  supportsMedia: boolean;
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    short: "IG",
    charLimit: 2200,
    gradient: "pl-ig",
    color: "#E1306C",
    accent: "oklch(0.7 0.24 350)",
    supportsMedia: true,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    short: "FB",
    charLimit: 63206,
    gradient: "pl-fb",
    color: "#1877F2",
    accent: "oklch(0.55 0.21 264)",
    supportsMedia: true,
  },
  x: {
    id: "x",
    name: "X",
    short: "X",
    charLimit: 280,
    gradient: "pl-x",
    color: "#0F1419",
    accent: "oklch(0.2 0 0)",
    supportsMedia: true,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    short: "in",
    charLimit: 3000,
    gradient: "pl-li",
    color: "#0A66C2",
    accent: "oklch(0.5 0.16 250)",
    supportsMedia: true,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    short: "TT",
    charLimit: 2200,
    gradient: "pl-tt",
    color: "#010101",
    accent: "oklch(0.3 0.02 250)",
    supportsMedia: true,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    short: "YT",
    charLimit: 5000,
    gradient: "pl-yt",
    color: "#FF0000",
    accent: "oklch(0.58 0.23 25)",
    supportsMedia: true,
  },
  threads: {
    id: "threads",
    name: "Threads",
    short: "Th",
    charLimit: 500,
    gradient: "pl-th",
    color: "#000000",
    accent: "oklch(0.25 0 0)",
    supportsMedia: true,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

/* Original geometric platform glyphs — not copied from any brand logo.
   Each is a simplified, abstract mark that evokes the platform's identity. */
export function PlatformGlyph({
  platform,
  className,
}: {
  platform: PlatformId;
  className?: string;
}) {
  const cls = cn("h-full w-full", className);
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="6" fill="currentColor" />
          <path d="M14.5 8.5h1.8V6.2c-.6-.1-1.3-.2-2-.2-2.1 0-3.4 1.3-3.4 3.6v1.4H8.8v2.4h2.1V20h2.5v-6.6h2.1l.4-2.4h-2.5V9.7c0-.8.3-1.2 1.1-1.2z" fill="#fff" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" />
          <path d="M7.5 9.5v7M7.5 7v.01M11 16.5v-4a2 2 0 0 1 4 0v4M11 16.5v-7" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 6c.6 2 2.2 3.4 4.2 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <rect x="2.5" y="6" width="19" height="12" rx="4" fill="currentColor" />
          <path d="M10.5 9.2l4.5 2.8-4.5 2.8z" fill="#fff" />
        </svg>
      );
    case "threads":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M12 4a8 8 0 1 0 7.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 8a4 4 0 1 0 3.7 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.1" fill="currentColor" />
        </svg>
      );
  }
}
