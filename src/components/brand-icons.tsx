import * as React from "react";
import {
  SiInstagram,
  SiFacebook,
  SiX,
  SiTiktok,
  SiYoutube,
  SiThreads,
  SiWhatsapp,
} from "react-icons/si";
import { cn } from "@/lib/utils";

/**
 * Real social-media brand logos.
 *
 * Sources: react-icons (Simple Icons set) for Instagram, Facebook, X, TikTok,
 * YouTube, Threads, WhatsApp. LinkedIn was removed from Simple Icons (trademark
 * request) so we render its official glyph inline.
 *
 * Each icon is a single-color SVG that inherits `currentColor` — so it tints
 * to whatever color the parent sets.
 */

type BrandProps = { className?: string; title?: string };

export function InstagramIcon({ className, title }: BrandProps) {
  return (
    <SiInstagram
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function FacebookIcon({ className, title }: BrandProps) {
  return (
    <SiFacebook
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function XIcon({ className, title }: BrandProps) {
  return (
    <SiX
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function TiktokIcon({ className, title }: BrandProps) {
  return (
    <SiTiktok
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function YoutubeIcon({ className, title }: BrandProps) {
  return (
    <SiYoutube
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function ThreadsIcon({ className, title }: BrandProps) {
  return (
    <SiThreads
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function WhatsappIcon({ className, title }: BrandProps) {
  return (
    <SiWhatsapp
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

/** LinkedIn — official "in" glyph (Simple Icons removed it for trademark). */
export function LinkedinIcon({ className, title }: BrandProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-full w-full", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

/** Map platform id → brand icon component. */
export function PlatformBrandIcon({
  platform,
  className,
  title,
}: {
  platform:
    | "instagram"
    | "facebook"
    | "x"
    | "linkedin"
    | "tiktok"
    | "youtube"
    | "threads"
    | "whatsapp";
  className?: string;
  title?: string;
}) {
  switch (platform) {
    case "instagram":
      return <InstagramIcon className={className} title={title} />;
    case "facebook":
      return <FacebookIcon className={className} title={title} />;
    case "x":
      return <XIcon className={className} title={title} />;
    case "linkedin":
      return <LinkedinIcon className={className} title={title} />;
    case "tiktok":
      return <TiktokIcon className={className} title={title} />;
    case "youtube":
      return <YoutubeIcon className={className} title={title} />;
    case "threads":
      return <ThreadsIcon className={className} title={title} />;
    case "whatsapp":
      return <WhatsappIcon className={className} title={title} />;
  }
}
