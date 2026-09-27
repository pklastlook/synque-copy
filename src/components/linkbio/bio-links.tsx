"use client";

import * as React from "react";
import {
  ExternalLink,
  Link as LinkIcon,
  Globe,
  ShoppingBag,
  BookOpen,
  Play,
  Music,
  Mail,
  MessageCircle,
  Instagram,
  Youtube,
} from "lucide-react";

export interface BioLink {
  title: string;
  url: string;
  icon: string;
}

const ICON_SET: { name: string; component: React.ElementType }[] = [
  { name: "shopping-bag", component: ShoppingBag },
  { name: "book-open", component: BookOpen },
  { name: "play", component: Play },
  { name: "music", component: Music },
  { name: "mail", component: Mail },
  { name: "message-circle", component: MessageCircle },
  { name: "link", component: LinkIcon },
  { name: "globe", component: Globe },
  { name: "instagram", component: Instagram },
  { name: "youtube", component: Youtube },
];

function iconComponent(name: string): React.ElementType {
  return ICON_SET.find((i) => i.name === name)?.component ?? LinkIcon;
}

/**
 * BioLinkList — the clickable list of links rendered on the public
 * link-in-bio page.
 *
 * Responsibilities:
 * 1. Render each link as a translucent "glass" button styled to match the
 *    active theme (text color + soft tinted backdrop).
 * 2. Fire a fire-and-forget POST to `/api/linkbio/[id]/click` when a link is
 *    clicked, so the bio's `clicks` counter increments server-side.
 * 3. Open the link in a new tab (with `noopener,noreferrer` for safety).
 *
 * The increment POST is async but non-blocking — the browser still opens
 * the URL immediately. If the network request fails, we silently ignore it;
 * click tracking must never block navigation.
 */
export function BioLinkList({ bioId, links }: { bioId: string; links: BioLink[] }) {
  const handleClick = React.useCallback(
    (_url: string) => {
      // Fire-and-forget — do not await; let the browser navigate immediately.
      fetch(`/api/linkbio/${bioId}/click`, { method: "POST" }).catch(() => {
        /* silent — click tracking is best-effort */
      });
    },
    [bioId]
  );

  if (!links || links.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-white/60">
        No links yet.
      </p>
    );
  }

  return (
    <nav className="mt-8 flex w-full flex-col gap-3" aria-label="Links">
      {links.map((link, idx) => {
        const Icon = iconComponent(link.icon);
        return (
          <a
            key={`${link.url}-${idx}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(link.url)}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/25 bg-white/15 px-5 py-4 text-left font-semibold text-white shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-white/40 hover:bg-white/25 active:scale-[0.99]"
            style={{ willChange: "transform" }}
          >
            {/* Hover wash — subtle directional glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/20">
              <Icon className="h-4 w-4" />
            </span>
            <span className="relative flex-1 truncate text-[15px] leading-snug">
              {link.title}
            </span>
            <ExternalLink className="relative h-4 w-4 shrink-0 text-white/60 transition-colors group-hover:text-white" />
          </a>
        );
      })}
    </nav>
  );
}
