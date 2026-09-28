import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * UTM Builder — generates UTM tracking URLs.
 *
 * POST /api/utm
 * Body: {
 *   url:        string  (base URL, e.g. https://example.com/landing)
 *   source:     string  (utm_source — referrer: facebook, newsletter, etc.)
 *   medium:     string  (utm_medium — cpc, email, social, etc.)
 *   campaign:   string  (utm_campaign — campaign name / slug)
 *   term?:      string  (utm_term — paid keywords)
 *   content?:   string  (utm_content — ad variant / button label)
 * }
 *
 * Response: {
 *   url:        string  (full URL with utm_* query params)
 *   short:      string  (a display-friendly truncated form, for previews)
 *   params:     Record<string,string>  (the actual utm_* map sent)
 * }
 *
 * The API does NOT persist UTM links — they are derived strings. The
 * client owns the history (localStorage) so users can review past links
 * without polluting the database.
 */

function normalizeUrl(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Auto-prepend https:// if the user forgot the scheme.
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const {
    url: rawUrl,
    source: rawSource,
    medium: rawMedium,
    campaign: rawCampaign,
    term: rawTerm,
    content: rawContent,
  } = body as {
    url?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  const baseUrl = normalizeUrl(rawUrl ?? "");
  if (!baseUrl) {
    return NextResponse.json({ error: "A valid base URL is required" }, { status: 400 });
  }

  const source = slugify(rawSource ?? "");
  const medium = slugify(rawMedium ?? "");
  const campaign = slugify(rawCampaign ?? "");
  const term = rawTerm ? slugify(rawTerm) : "";
  const content = rawContent ? slugify(rawContent) : "";

  if (!source || !medium || !campaign) {
    return NextResponse.json(
      { error: "utm_source, utm_medium, and utm_campaign are required" },
      { status: 400 }
    );
  }

  const params: Record<string, string> = {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
  };
  if (term) params.utm_term = term;
  if (content) params.utm_content = content;

  try {
    const u = new URL(baseUrl);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const full = u.toString();

    // Short display: scheme + host + "/…?utm_campaign=…"
    const short = `${u.origin}${u.pathname === "/" ? "" : u.pathname}?utm_campaign=${encodeURIComponent(campaign)}`;

    return NextResponse.json({ url: full, short, params });
  } catch {
    return NextResponse.json({ error: "Could not parse base URL" }, { status: 400 });
  }
}

/** GET — quick health check + sample params, mainly for the docs/help UI. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    description: "POST a base URL + utm_source/medium/campaign to generate a UTM-tracked link.",
    required: ["url", "source", "medium", "campaign"],
    optional: ["term", "content"],
  });
}
