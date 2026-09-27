import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { BioLinkList, type BioLink } from "@/components/linkbio/bio-links";

/**
 * Public link-in-bio page.
 *
 * Route: `/l/[slug]`
 *
 * Server Component — fetches the LinkInBio row by slug, increments `visits`
 * (fire-and-forget), and renders a mobile-first single-page experience
 * (avatar → title → subtitle → links → "Powered by SYNQUE" footer).
 *
 * Click tracking on individual links is handled by the `BioLinkList` client
 * component, which POSTs to `/api/linkbio/[id]/click`.
 *
 * If the slug doesn't exist or the page is inactive (`active: false`), we
 * render a tasteful 404 via `notFound()` instead of leaking the existence
 * of inactive pages.
 */

export const dynamic = "force-dynamic";

type ThemeKey = "rose" | "teal" | "amber" | "magenta" | "green" | "dark";

const THEMES: Record<ThemeKey, { gradient: string; accent: string }> = {
  rose: {
    gradient: "linear-gradient(160deg, oklch(0.72 0.24 14) 0%, oklch(0.66 0.22 305) 100%)",
    accent: "oklch(0.72 0.24 14)",
  },
  teal: {
    gradient: "linear-gradient(160deg, oklch(0.74 0.18 165) 0%, oklch(0.6 0.14 200) 100%)",
    accent: "oklch(0.74 0.18 165)",
  },
  amber: {
    gradient: "linear-gradient(160deg, oklch(0.8 0.18 75) 0%, oklch(0.7 0.2 25) 100%)",
    accent: "oklch(0.8 0.18 75)",
  },
  magenta: {
    gradient: "linear-gradient(160deg, oklch(0.66 0.22 305) 0%, oklch(0.55 0.24 350) 100%)",
    accent: "oklch(0.66 0.22 305)",
  },
  green: {
    gradient: "linear-gradient(160deg, oklch(0.76 0.18 145) 0%, oklch(0.6 0.16 165) 100%)",
    accent: "oklch(0.76 0.18 145)",
  },
  dark: {
    gradient: "linear-gradient(160deg, oklch(0.16 0.02 260) 0%, oklch(0.08 0 0) 100%)",
    accent: "oklch(0.7 0.05 260)",
  },
};

function themeFor(raw: string): ThemeKey {
  return THEMES.hasOwnProperty(raw) ? (raw as ThemeKey) : "rose";
}

/** Build a per-page title for the <head> and OG tags. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.linkInBio
    .findUnique({ where: { slug } })
    .catch(() => null);

  if (!page || !page.active) {
    return { title: "Page not found — SYNQUE" };
  }

  const title = page.title || "My link-in-bio";
  const description = page.subtitle || `${title} — powered by SYNQUE`;

  return {
    title: `${title} — SYNQUE Links`,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "SYNQUE",
      ...(page.avatar ? { images: [{ url: page.avatar }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(page.avatar ? { images: [{ url: page.avatar }] } : {}),
    },
  };
}

export default async function BioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await db.linkInBio
    .findUnique({ where: { slug } })
    .catch(() => null);

  if (!page || !page.active) {
    notFound();
  }

  // Fire-and-forget visit increment — never block the render on analytics.
  // Wrapping in `.catch` keeps an unhandled rejection from showing in logs.
  void db.linkInBio
    .update({
      where: { id: page.id },
      data: { visits: { increment: 1 } },
    })
    .catch(() => {
      /* silent — visit tracking is best-effort */
    });

  const theme = themeFor(page.theme);
  const { gradient } = THEMES[theme];

  let links: BioLink[] = [];
  try {
    const parsed = JSON.parse(page.links) as unknown;
    if (Array.isArray(parsed)) {
      links = parsed
        .filter(
          (l): l is BioLink =>
            !!l &&
            typeof (l as BioLink).title === "string" &&
            typeof (l as BioLink).url === "string"
        )
        .map((l) => ({
          title: (l as BioLink).title,
          url: (l as BioLink).url,
          icon:
            typeof (l as BioLink).icon === "string" ? (l as BioLink).icon : "link",
        }));
    }
  } catch {
    links = [];
  }

  const initial = (page.title || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <main
      className="relative flex min-h-[100svh] w-full flex-col items-center px-5 pb-12 pt-14 text-white"
      style={{ background: gradient }}
    >
      {/* Subtle ambient glow — adds depth without distracting from links */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 w-full"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      <div
        className="relative z-10 flex w-full max-w-[480px] flex-col items-center"
        style={{ maxWidth: 480 }}
      >
        {/* Avatar */}
        <div className="relative">
          {page.avatar ? (
            <img
              src={page.avatar}
              alt={page.title || "Avatar"}
              className="h-24 w-24 rounded-full border-2 border-white/40 object-cover shadow-xl shadow-black/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-white/40 bg-white/15 text-3xl font-bold text-white shadow-xl shadow-black/20 backdrop-blur-md">
              {initial}
            </div>
          )}
          {/* Verified-style halo dot — decorative */}
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-white/60"
            style={{ backgroundColor: "rgba(255,255,255,0.45)" }}
          />
        </div>

        {/* Title */}
        {page.title ? (
          <h1 className="mt-5 text-center text-[26px] font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
            {page.title}
          </h1>
        ) : null}

        {/* Subtitle */}
        {page.subtitle ? (
          <p className="mt-2 max-w-[420px] text-center text-[14px] font-medium leading-snug text-white/85">
            {page.subtitle}
          </p>
        ) : null}

        {/* Links */}
        <BioLinkList bioId={page.id} links={links} />

        {/* Footer */}
        <footer className="mt-12 flex flex-col items-center gap-1">
          <a
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md transition-all hover:bg-white/20"
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "currentColor" }}
            />
            Powered by SYNQUE
          </a>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Orchestrate Your Social
          </p>
        </footer>
      </div>
    </main>
  );
}
