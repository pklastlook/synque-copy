import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSafeUrl } from "@/lib/url-safety";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Shared secret used by the WhatsApp mini-service to sign webhook requests.
 * The mini-service must compute HMAC-SHA256(rawBody, secret) and send the
 * hex digest in the `X-Webhook-Signature` header. We verify it on receipt
 * so that an attacker who can reach this public endpoint cannot forge
 * incoming messages (the route is in the middleware's public allowlist
 * because the mini-service is unauthenticated baileys, not a JWT user).
 *
 * NOTE: when MINI_SERVICE_KEY is unset, signature verification ALWAYS fails
 * — boot-time fail-fast is the mini-service's responsibility (see task
 * P1-2-a). On the receiving side we just reject every webhook with 401 +
 * a clear error so the operator notices during testing.
 */
const WEBHOOK_SECRET = process.env.MINI_SERVICE_KEY;

/**
 * Verify an HMAC-SHA256 signature against the shared secret using a
 * constant-time comparison (`crypto.timingSafeEqual`) so signature checks
 * are not susceptible to timing oracles.
 *
 * @param body Raw request body text — MUST be the exact bytes the sender
 *   signed (i.e. read via `await req.text()`, not `req.json()` which would
 *   re-serialize and change whitespace).
 * @param signature Hex-encoded signature from the `X-Webhook-Signature`
 *   header.
 * @param secret Shared secret (`MINI_SERVICE_KEY`).
 */
function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    // timingSafeEqual requires equal-length buffers; if the lengths differ
    // the signature is definitely wrong, but we still want a constant-time
    // path so we compare against a same-length dummy instead of returning
    // early.
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

/**
 * POST /api/whatsapp/webhook?ownerId=xxx
 *
 * Receives incoming WhatsApp messages from the mini-service (baileys) and
 * stores them in the WhatsAppMessage table. The user sees them appear in
 * the WhatsApp Inbox in real-time.
 *
 * SECURITY (P2-5): the request MUST carry an `X-Webhook-Signature` header
 * that is the HMAC-SHA256 of the raw request body, keyed with
 * MINI_SERVICE_KEY. Unsigned or wrongly-signed requests are rejected with
 * 401 — this endpoint is in the middleware's public allowlist (no JWT
 * required) so signature verification is the only thing preventing a
 * stranger from forging incoming WhatsApp messages.
 *
 * Body (from mini-service):
 *   { source, senderName, groupName?, content, mediaUrl?, mediaType? }
 */
export async function POST(req: NextRequest) {
  // ── 1. Verify HMAC-SHA256 signature BEFORE trusting any payload ────────
  const signature = req.headers.get("X-Webhook-Signature") || "";
  if (!WEBHOOK_SECRET) {
    // Fail closed if the operator forgot to set MINI_SERVICE_KEY. The
    // mini-service (per P1-2-a) refuses to boot without it, so in a
    // correctly-deployed environment this branch is unreachable.
    console.error("[whatsapp/webhook] MINI_SERVICE_KEY not set — rejecting all webhooks");
    return NextResponse.json(
      { error: "Webhook signing secret not configured" },
      { status: 503 }
    );
  }
  // Read the raw body text — signature is over the EXACT bytes the sender
  // transmitted. `req.json()` would re-serialize and break the signature.
  const bodyText = await req.text();
  if (!signature || !verifySignature(bodyText, signature, WEBHOOK_SECRET)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }
  // Now that the body is authenticated, parse it as JSON.
  let body: {
    source: string;
    senderName: string;
    groupName?: string | null;
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
  };
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  // ── 2. Route param check + content sanity check (unchanged) ───────────
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  if (!body.content || body.content.length < 2) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── 3. SECURITY (P2-3-c): validate `mediaUrl` is http(s) before storing ─
  // `mediaUrl` is rendered as a clickable link / image src in the WhatsApp
  // Inbox UI. A `javascript:` URL here would be a stored XSS that runs
  // when a team member opens the inbound message. Even though the webhook
  // is now HMAC-signed (so only the mini-service can write here), we
  // defence-in-depth against a compromised mini-service / future attacker
  // who exfiltrates MINI_SERVICE_KEY.
  if (body.mediaUrl && typeof body.mediaUrl === "string" && !isSafeUrl(body.mediaUrl)) {
    return NextResponse.json(
      { error: `Unsafe media URL scheme: ${body.mediaUrl}` },
      { status: 400 }
    );
  }

  // De-dupe: skip if an identical message arrived in the last 30s
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const existing = await db.whatsAppMessage.findFirst({
    where: {
      content: body.content,
      senderName: body.senderName,
      isLive: true,
      createdAt: { gte: thirtySecondsAgo },
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const msg = await db.whatsAppMessage.create({
    data: {
      source: body.source ?? "chat",
      senderName: body.senderName ?? "Unknown",
      senderPhone: null,
      groupName: body.groupName ?? null,
      content: body.content,
      mediaUrl: body.mediaUrl ?? null,
      mediaType: body.mediaType ?? null,
      status: "new",
      isLive: true,
      // No savedById — this is an auto-received message, not pasted by a user
    },
  });

  return NextResponse.json({ ok: true, id: msg.id });
}
