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

/* REAL brand glyphs (Simple Icons SVG paths, 24×24 viewBox).
   Each path uses fill="currentColor" so the glyph tints to whatever color
   the parent sets (white on a colored badge, or the platform color on a
   transparent pill). These are the official brand logos, not abstract marks. */
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
      // Instagram camera (Simple Icons)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case "facebook":
      // Facebook "f" (Simple Icons)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "x":
      // X (formerly Twitter) logo (Simple Icons)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z" />
        </svg>
      );
    case "linkedin":
      // LinkedIn "in" (official glyph)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
        </svg>
      );
    case "tiktok":
      // TikTok note (Simple Icons)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.57-5.71-.04-.56-.03-1.12-.03-1.67.13-2.49 1.72-4.83 3.97-5.97 1.49-.74 3.23-.93 4.87-.59.02 1.49-.04 2.98.03 4.47-.7-.23-1.48-.29-2.21-.08-1.32.32-2.36 1.47-2.57 2.81-.16 1.04.15 2.16.85 2.96 1.01 1.19 2.88 1.52 4.21.75 1.03-.59 1.68-1.74 1.71-2.92.02-2.27 0-4.54.01-6.81.01-3.67-.01-7.33.03-11z" />
        </svg>
      );
    case "youtube":
      // YouTube play button (Simple Icons)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "threads":
      // Threads "@" (Simple Icons)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.84 1.205 8.594.024 12.175 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.696 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.358-.218-3.255-.801-1.062-.689-1.676-1.747-1.728-2.984-.052-1.235.426-2.358 1.345-3.158.905-.789 2.151-1.242 3.594-1.309 1.275-.059 2.522.092 3.657.435-.056-.879-.275-1.552-.65-2.005-.49-.59-1.281-.892-2.348-.892-.886 0-1.818.243-2.608.689-.378.214-.784.454-1.184.714l-1.098-1.756c.435-.292.91-.571 1.41-.834 1.062-.559 2.32-.852 3.485-.852 2.21 0 3.862.947 4.66 2.664.434.931.665 2.091.665 3.354.488.287.91.626 1.255 1.013.91 1.033 1.284 2.408 1.013 3.76-.31 1.543-1.077 2.91-2.273 4.09-1.494 1.473-3.398 2.169-5.966 2.191h-.014z" />
        </svg>
      );
  }
}
