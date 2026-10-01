import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IosIconTile — a square icon tile in the iOS 26/27 "Liquid Glass" style.
 *
 * Visual spec:
 *  - Squircle shape (rounded square) at ~22% corner radius (iOS icon proportion)
 *  - Full-bleed gradient background (per-app brand gradient)
 *  - Subtle top-inner highlight (gives the glassy depth)
 *  - Soft drop shadow for elevation
 *  - White glyph centered, sized to ~56% of the tile
 *  - Active state: scales up 6% + brighter shadow ring
 *
 * Usage:
 *   <IosIconTile gradient="linear-gradient(135deg, #5856D6, #AF52DE)" size={48}>
 *     <HomeIcon className="h-6 w-6" />
 *   </IosIconTile>
 *
 * The glyph inside should be a white single-color SVG (lucide icons with
 * `className="h-X w-X"` + stroke="currentColor", or a brand icon).
 */
export interface IosIconTileProps {
  children: React.ReactNode;
  /** CSS background — gradient or solid color */
  gradient?: string;
  /** tile size in px (square). default 48 */
  size?: number;
  /** extra classes for the tile */
  className?: string;
  /** extra classes wrapping the glyph */
  glyphClassName?: string;
  /** active highlight ring */
  active?: boolean;
  /** disable the top highlight (for solid dark icons like X/TikTok) */
  flat?: boolean;
  /** accessible label */
  label?: string;
}

export function IosIconTile({
  children,
  gradient,
  size = 48,
  className,
  glyphClassName,
  active = false,
  flat = false,
  label,
}: IosIconTileProps) {
  return (
    <span
      className={cn(
        "ios-icon-tile relative grid shrink-0 place-items-center",
        active && "ios-icon-tile-active",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.224), // iOS squircle proportion
        background: gradient ?? "linear-gradient(145deg, #8E8E93, #636366)",
      }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* top inner highlight (glass depth) */}
      {!flat && (
        <span
          className="ios-icon-tile-glint pointer-events-none absolute inset-0 rounded-[inherit]"
          aria-hidden
        />
      )}
      {/* glyph */}
      <span
        className={cn(
          "relative z-[1] grid h-full w-full place-items-center text-white",
          glyphClassName,
        )}
        style={{ color: "#fff" }}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * Gradient presets per app — iOS-style app icon gradients.
 * Each follows the brand's signature gradient (or a tasteful tonal one for
 * app-internal nav items).
 */
export const IOS_GRADIENTS = {
  // App nav tiles
  home: "linear-gradient(145deg, #5856D6 0%, #3634A3 100%)",
  inbox: "linear-gradient(145deg, #34C759 0%, #1D8C3A 100%)",
  compose: "linear-gradient(145deg, #FF9500 0%, #FF5E3A 100%)",
  calendar: "linear-gradient(145deg, #FF3B30 0%, #C81D18 100%)",
  stats: "linear-gradient(145deg, #007AFF 0%, #004ECC 100%)",
  reports: "linear-gradient(145deg, #FF2D55 0%, #C8163D 100%)",
  insights: "linear-gradient(145deg, #30D158 0%, #12A23A 100%)",
  more: "linear-gradient(145deg, #8E8E93 0%, #48484A 100%)",
  settings: "linear-gradient(145deg, #8E8E93 0%, #48484A 100%)",
  tasks: "linear-gradient(145deg, #FF9500 0%, #E07000 100%)",
  org: "linear-gradient(145deg, #5AC8FA 0%, #0A84FF 100%)",
  performance: "linear-gradient(145deg, #FFD60A 0%, #FF9500 100%)",
  accounts: "linear-gradient(145deg, #007AFF 0%, #5856D6 100%)",
  media: "linear-gradient(145deg, #AF52DE 0%, #7B2CBF 100%)",
  campaigns: "linear-gradient(145deg, #FF6B00 0%, #FF2D55 100%)",
  chat: "linear-gradient(145deg, #5856D6 0%, #AF52DE 100%)",
  vpn: "linear-gradient(145deg, #34C759 0%, #007AFF 100%)",

  // Social brand tiles
  whatsapp: "linear-gradient(145deg, #25D366 0%, #128C7E 100%)",
  instagram: "linear-gradient(145deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)",
  facebook: "linear-gradient(145deg, #1877F2 0%, #0A4FB5 100%)",
  x: "linear-gradient(145deg, #2B2B2B 0%, #000000 100%)",
  linkedin: "linear-gradient(145deg, #0A66C2 0%, #004182 100%)",
  tiktok: "linear-gradient(145deg, #25F4EE 0%, #000000 60%, #FE2C55 100%)",
  youtube: "linear-gradient(145deg, #FF0000 0%, #CC0000 100%)",
  threads: "linear-gradient(145deg, #3A3A3C 0%, #000000 100%)",
} as const;

export type IosGradientKey = keyof typeof IOS_GRADIENTS;
