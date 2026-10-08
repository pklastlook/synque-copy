"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "next-themes";

/**
 * /api-docs — clean, dependency-free API reference page.
 *
 * Renders a static list of SYNQUE REST endpoints grouped by module.
 * No swagger-ui-react dependency — just a small, self-contained
 * Next.js Client Component that fetches the OpenAPI spec from
 * /api/docs (purely for the path/method/description metadata) and
 * lays it out as a glass-styled, grouped table.
 *
 * The page is intentionally simple:
 *   - Each module (Posts, Accounts, Analytics, Inbox, Competitors,
 *     Team Performance, Webhooks, Auth, etc.) is its own section.
 *   - Each endpoint row shows: HTTP method badge · path ·
 *     short description · auth-required pill.
 *   - The Bearer JWT required for "Try it" calls is shown once in
 *     the header (the user copies it from their auth store — no
 *     interactive "Try-It-Out" UI).
 *
 * Auth: protected by requireAuth on /api/docs (which the page
 * fetches). Unauthenticated visitors are redirected to /login
 * with a `next=/api-docs` query so they bounce back after signing in.
 */

// ─── Static endpoint catalogue ────────────────────────────────────────
// The /api/docs route returns an OpenAPI spec, but it only covers the
// public surface (8 modules). This static catalogue is the source of
// truth for the docs page — it lists every module + endpoint the
// platform exposes. Adding a new route? Append it here.

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface Endpoint {
  method: Method;
  path: string;
  description: string;
  /** "JWT" = Bearer token required (every authenticated route). "—" = public. */
  auth: "JWT" | "Public" | "Admin";
}

interface Module {
  name: string;
  description: string;
  endpoints: Endpoint[];
}

const MODULES: Module[] = [
  {
    name: "Authentication",
    description: "Login, signup, password reset, 2FA, session management.",
    endpoints: [
      { method: "POST", path: "/api/auth/signup", description: "Create a tenant + admin user. Returns JWT.", auth: "Public" },
      { method: "POST", path: "/api/auth/login", description: "Exchange email + password for a JWT (or 2FA temp token).", auth: "Public" },
      { method: "POST", path: "/api/auth/logout", description: "Revoke the active session.", auth: "JWT" },
      { method: "GET", path: "/api/auth/me", description: "Return the current user + tenant + role.", auth: "JWT" },
      { method: "POST", path: "/api/auth/forgot-password", description: "Send a password-reset email.", auth: "Public" },
      { method: "POST", path: "/api/auth/reset-password", description: "Reset password using a reset token.", auth: "Public" },
      { method: "GET", path: "/api/auth/verify-email", description: "Verify email using the token from the welcome email.", auth: "Public" },
      { method: "POST", path: "/api/auth/resend-verification", description: "Resend the email-verification link.", auth: "JWT" },
      { method: "POST", path: "/api/auth/2fa/setup", description: "Generate a TOTP secret + QR code.", auth: "JWT" },
      { method: "POST", path: "/api/auth/2fa/verify", description: "Verify a TOTP code to enable 2FA.", auth: "JWT" },
      { method: "POST", path: "/api/auth/2fa/login", description: "Complete login with a TOTP code (after the temp token).", auth: "Public" },
      { method: "POST", path: "/api/auth/2fa/disable", description: "Disable 2FA (requires current code).", auth: "JWT" },
      { method: "GET", path: "/api/auth/sessions", description: "List active sessions for the current user.", auth: "JWT" },
      { method: "DELETE", path: "/api/auth/sessions/[id]", description: "Revoke a specific session.", auth: "JWT" },
    ],
  },
  {
    name: "Posts & Composer",
    description: "Create, schedule, publish, and analyze posts across connected accounts.",
    endpoints: [
      { method: "GET", path: "/api/posts", description: "List posts (filter by status/author).", auth: "JWT" },
      { method: "POST", path: "/api/posts", description: "Create a post + per-account variants (publishes or routes to approval based on role).", auth: "JWT" },
      { method: "GET", path: "/api/posts/[id]", description: "Get a single post with its variants.", auth: "JWT" },
      { method: "PATCH", path: "/api/posts/[id]", description: "Update post fields (caption, title, scheduledAt, status).", auth: "JWT" },
      { method: "DELETE", path: "/api/posts/[id]", description: "Delete a post and its variants.", auth: "JWT" },
      { method: "POST", path: "/api/posts/[id]/publish-now", description: "Publish a post's variants immediately.", auth: "JWT" },
      { method: "POST", path: "/api/posts/bulk-import", description: "Import up to 500 posts from CSV rows.", auth: "JWT" },
      { method: "POST", path: "/api/posts/series", description: "Auto-generate + schedule a recurring series.", auth: "JWT" },
      { method: "POST", path: "/api/posts/auto-fill", description: "AI-fill empty days on the calendar.", auth: "JWT" },
      { method: "POST", path: "/api/publish/[platform]", description: "Publish a single variant to a specific platform.", auth: "JWT" },
    ],
  },
  {
    name: "A/B Testing",
    description: "Group 2–4 variants of the same post for engagement comparison.",
    endpoints: [
      { method: "GET", path: "/api/ab-tests", description: "List A/B test groups with per-variant engagement.", auth: "JWT" },
      { method: "POST", path: "/api/ab-tests", description: "Create a test group (stamps abTestGroupId on 2–4 variants).", auth: "JWT" },
      { method: "GET", path: "/api/ab-tests/[id]", description: "Get full per-variant comparison + winner flag.", auth: "JWT" },
      { method: "DELETE", path: "/api/ab-tests/[id]", description: "Stop a test (clears the group id, preserves data).", auth: "JWT" },
    ],
  },
  {
    name: "Approvals",
    description: "Multi-step review workflow for editor/member submissions.",
    endpoints: [
      { method: "GET", path: "/api/approvals", description: "List approval requests (pending/resolved).", auth: "JWT" },
      { method: "GET", path: "/api/approvals/[id]", description: "Get a single approval request.", auth: "JWT" },
      { method: "PATCH", path: "/api/approvals/[id]", description: "Update approval (add comment, change type).", auth: "JWT" },
      { method: "POST", path: "/api/approvals/[id]/approve", description: "Approve — flips post to published + triggers publish flow.", auth: "JWT" },
      { method: "POST", path: "/api/approvals/[id]/reject", description: "Reject — flips post back to draft with a reason.", auth: "JWT" },
    ],
  },
  {
    name: "Accounts",
    description: "Connected social accounts + per-account health/protection.",
    endpoints: [
      { method: "GET", path: "/api/accounts", description: "List connected social accounts.", auth: "JWT" },
      { method: "GET", path: "/api/accounts/[id]", description: "Get a single account.", auth: "JWT" },
      { method: "PATCH", path: "/api/accounts/[id]", description: "Update account (display name, owner, etc.).", auth: "JWT" },
      { method: "DELETE", path: "/api/accounts/[id]", description: "Disconnect an account.", auth: "JWT" },
      { method: "GET", path: "/api/accounts/[id]/health", description: "Account health snapshot (risk score, status, advisories).", auth: "JWT" },
      { method: "GET", path: "/api/accounts/[id]/protection", description: "Account protection settings (rate limits, blocks).", auth: "JWT" },
      { method: "POST", path: "/api/accounts/sync", description: "Sync follower + engagement metrics from platforms.", auth: "JWT" },
      { method: "POST", path: "/api/accounts/health/recalculate", description: "Recompute risk scores across all accounts.", auth: "JWT" },
    ],
  },
  {
    name: "Analytics",
    description: "Engagement, reach, follower growth, best-time, sentiment, hashtags.",
    endpoints: [
      { method: "GET", path: "/api/analytics", description: "Aggregated engagement/reach/impressions + per-account breakdown.", auth: "JWT" },
      { method: "GET", path: "/api/analytics/best-time", description: "Best hour-of-day to post (by avg engagement).", auth: "JWT" },
      { method: "GET", path: "/api/analytics/sentiment-trend", description: "Daily positive/neutral/negative sentiment series.", auth: "JWT" },
      { method: "GET", path: "/api/analytics/hashtag-performance", description: "Top-20 hashtags by total engagement.", auth: "JWT" },
      { method: "GET", path: "/api/analytics/insights", description: "LLM-generated insights on the team's performance.", auth: "JWT" },
    ],
  },
  {
    name: "Inbox & Listening",
    description: "Comments, mentions, DMs across all connected platforms.",
    endpoints: [
      { method: "GET", path: "/api/inbox", description: "List comments/messages/mentions (filter by status/sentiment).", auth: "JWT" },
      { method: "GET", path: "/api/inbox/[id]", description: "Get a single comment.", auth: "JWT" },
      { method: "POST", path: "/api/inbox/[id]/reply", description: "Reply to a comment (posts to platform + stores locally).", auth: "JWT" },
      { method: "GET", path: "/api/listening", description: "List listening queries (saved searches).", auth: "JWT" },
      { method: "POST", path: "/api/listening/sync", description: "Sync new mentions for saved queries.", auth: "JWT" },
      { method: "POST", path: "/api/listening/[id]/reply", description: "Reply to a mention from a listening query.", auth: "JWT" },
    ],
  },
  {
    name: "Competitors",
    description: "Track rival accounts + deep content analysis.",
    endpoints: [
      { method: "GET", path: "/api/competitors", description: "List tracked competitors.", auth: "JWT" },
      { method: "POST", path: "/api/competitors", description: "Add a competitor to track.", auth: "JWT" },
      { method: "GET", path: "/api/competitors/[id]", description: "Get a single competitor with follower snapshots.", auth: "JWT" },
      { method: "PATCH", path: "/api/competitors/[id]", description: "Update competitor (notes, status).", auth: "JWT" },
      { method: "DELETE", path: "/api/competitors/[id]", description: "Stop tracking a competitor.", auth: "JWT" },
      { method: "POST", path: "/api/competitors/sync", description: "Sync follower counts + recent posts for tracked competitors.", auth: "JWT" },
      { method: "POST", path: "/api/competitors/[id]/analyze", description: "Deep analysis: sentiment, content gaps, share-of-voice, top posts.", auth: "JWT" },
    ],
  },
  {
    name: "Team Performance",
    description: "Per-member content activity metrics + leaderboards + health.",
    endpoints: [
      { method: "GET", path: "/api/team-performance", description: "Per-member metrics (posts, engagement, tasks, response time, activity score).", auth: "JWT" },
      { method: "GET", path: "/api/team-performance/posts", description: "Kanban-style view of posts by status for the current month.", auth: "JWT" },
      { method: "GET", path: "/api/team", description: "List team members (alias of organization users).", auth: "JWT" },
      { method: "PATCH", path: "/api/team/[id]", description: "Update a team member (role, title, department).", auth: "Admin" },
    ],
  },
  {
    name: "Tasks",
    description: "Lightweight team task management.",
    endpoints: [
      { method: "GET", path: "/api/tasks", description: "List tasks (filter by status/assignee).", auth: "JWT" },
      { method: "POST", path: "/api/tasks", description: "Create a task.", auth: "JWT" },
      { method: "GET", path: "/api/tasks/[id]", description: "Get a single task.", auth: "JWT" },
      { method: "PATCH", path: "/api/tasks/[id]", description: "Update task (status, assignee, due date).", auth: "JWT" },
      { method: "DELETE", path: "/api/tasks/[id]", description: "Delete a task.", auth: "JWT" },
    ],
  },
  {
    name: "Media Library",
    description: "Upload, store, and tag media assets. Compresses + dedupes on upload.",
    endpoints: [
      { method: "GET", path: "/api/media", description: "List media assets (filter by folder/type/tag).", auth: "JWT" },
      { method: "POST", path: "/api/media/upload", description: "Multipart upload — compresses images, dedupes by hash, AI alt text.", auth: "JWT" },
      { method: "GET", path: "/api/media/[id]", description: "Get a single asset.", auth: "JWT" },
      { method: "PATCH", path: "/api/media/[id]", description: "Update asset (tags, alt text, folder).", auth: "JWT" },
      { method: "DELETE", path: "/api/media/[id]", description: "Delete an asset.", auth: "JWT" },
    ],
  },
  {
    name: "Webhooks",
    description: "Outbound HMAC-signed event delivery. Subscribe to post.published, comment.received, payment.completed.",
    endpoints: [
      { method: "GET", path: "/api/webhooks", description: "List webhooks for the caller's tenant (secret masked).", auth: "JWT" },
      { method: "POST", path: "/api/webhooks", description: "Register a webhook endpoint (returns full secret ONCE).", auth: "JWT" },
      { method: "GET", path: "/api/webhooks/[id]", description: "Get a single webhook.", auth: "JWT" },
      { method: "PATCH", path: "/api/webhooks/[id]", description: "Update webhook (label, url, events, active).", auth: "JWT" },
      { method: "DELETE", path: "/api/webhooks/[id]", description: "Delete a webhook.", auth: "JWT" },
    ],
  },
  {
    name: "Customers & Subscriptions",
    description: "Tenant management + billing plans + invoices.",
    endpoints: [
      { method: "GET", path: "/api/customers", description: "List customers (admin only — returns all tenants).", auth: "Admin" },
      { method: "POST", path: "/api/customers", description: "Create a customer (admin only).", auth: "Admin" },
      { method: "GET", path: "/api/customers/[id]", description: "Get a customer (with branding + plan).", auth: "Admin" },
      { method: "PATCH", path: "/api/customers/[id]", description: "Update customer (plan, branding, status).", auth: "Admin" },
      { method: "GET", path: "/api/subscriptions", description: "List the caller's active + past subscriptions.", auth: "JWT" },
      { method: "POST", path: "/api/subscriptions", description: "Create a new subscription for the caller's tenant.", auth: "JWT" },
      { method: "GET", path: "/api/subscriptions/[id]", description: "Get a single subscription.", auth: "JWT" },
      { method: "POST", path: "/api/subscriptions/[id]/generate-invoice", description: "Generate the next period's invoice.", auth: "JWT" },
      { method: "POST", path: "/api/subscriptions/batch-generate-invoices", description: "Generate invoices for all due subscriptions.", auth: "Admin" },
      { method: "GET", path: "/api/invoices", description: "List invoices (filter by status).", auth: "JWT" },
      { method: "GET", path: "/api/invoices/[id]", description: "Get a single invoice.", auth: "JWT" },
      { method: "POST", path: "/api/invoices/regenerate", description: "Regenerate an invoice PDF.", auth: "JWT" },
      { method: "GET", path: "/api/invoices/export", description: "CSV export of invoices.", auth: "JWT" },
      { method: "GET", path: "/api/payments", description: "List payments.", auth: "JWT" },
    ],
  },
  {
    name: "Stripe Billing",
    description: "Payment intents, recurring subscriptions, webhooks, customer portal.",
    endpoints: [
      { method: "POST", path: "/api/stripe/create-payment-intent", description: "Create a Stripe PaymentIntent + record the Payment row.", auth: "JWT" },
      { method: "POST", path: "/api/stripe/create-subscription", description: "Create a Stripe Subscription (recurring). GET ?portal=true opens the Customer Portal.", auth: "JWT" },
      { method: "POST", path: "/api/stripe/create-checkout-session", description: "Create a Stripe Checkout Session.", auth: "JWT" },
      { method: "POST", path: "/api/stripe/webhook", description: "Stripe webhook handler (invoice.paid, invoice.payment_failed, etc.).", auth: "Public" },
    ],
  },
  {
    name: "AI Services",
    description: "LLM helpers for content generation, chat, usage tracking.",
    endpoints: [
      { method: "POST", path: "/api/ai/generate", description: "Generate per-account content variants from a brief.", auth: "JWT" },
      { method: "POST", path: "/api/ai/chat", description: "Chat with the AI assistant (multi-turn).", auth: "JWT" },
      { method: "GET", path: "/api/ai/usage", description: "Get the current user's AI usage (used/limit/remaining/plan).", auth: "JWT" },
      { method: "POST", path: "/api/ai/assistant", description: "Per-account AI assistant invocation.", auth: "JWT" },
      { method: "GET", path: "/api/llm/status", description: "Health check for the LLM provider.", auth: "JWT" },
    ],
  },
  {
    name: "Comments",
    description: "Synced comments + sentiment classification.",
    endpoints: [
      { method: "GET", path: "/api/comments/classify", description: "Batch-classify comment sentiment.", auth: "JWT" },
      { method: "POST", path: "/api/sync/comments", description: "Sync new comments from platforms.", auth: "JWT" },
    ],
  },
  {
    name: "Reports",
    description: "Generated PDF reports + custom report builder.",
    endpoints: [
      { method: "GET", path: "/api/reports", description: "List reports.", auth: "JWT" },
      { method: "POST", path: "/api/reports", description: "Create a report.", auth: "JWT" },
      { method: "GET", path: "/api/reports/[id]", description: "Get a single report.", auth: "JWT" },
      { method: "GET", path: "/api/reports/[id]/pdf", description: "Download a report PDF.", auth: "JWT" },
      { method: "POST", path: "/api/reports/custom", description: "Build a custom report from a template.", auth: "JWT" },
      { method: "GET", path: "/api/reports/data", description: "Raw report data (CSV/JSON).", auth: "JWT" },
      { method: "GET", path: "/api/reports/posts", description: "Posts-only report data.", auth: "JWT" },
    ],
  },
  {
    name: "Data Export",
    description: "CSV exports for posts, analytics, and clients.",
    endpoints: [
      { method: "GET", path: "/api/export/posts", description: "CSV export of all posts + variants.", auth: "JWT" },
      { method: "GET", path: "/api/export/analytics", description: "CSV export of aggregated analytics (days window).", auth: "JWT" },
      { method: "GET", path: "/api/export/clients", description: "CSV export of all customers (admin only).", auth: "Admin" },
    ],
  },
  {
    name: "Notifications",
    description: "In-app notifications (toast + bell).",
    endpoints: [
      { method: "GET", path: "/api/notifications", description: "List notifications (filter by type/read).", auth: "JWT" },
      { method: "PATCH", path: "/api/notifications/[id]", description: "Mark as read/unread.", auth: "JWT" },
      { method: "DELETE", path: "/api/notifications/[id]", description: "Dismiss a notification.", auth: "JWT" },
    ],
  },
  {
    name: "Calendar & Dashboard",
    description: "Calendar overview + KPI dashboard.",
    endpoints: [
      { method: "GET", path: "/api/dashboard", description: "KPI dashboard (posts, accounts, comments, pending tasks).", auth: "JWT" },
      { method: "GET", path: "/api/cron/publish-scheduled", description: "Vercel Cron — publishes all variants due now.", auth: "Public" },
    ],
  },
  {
    name: "OAuth Connections",
    description: "Platform OAuth flow (X, Instagram, Facebook, LinkedIn, etc.).",
    endpoints: [
      { method: "GET", path: "/api/oauth/connect/[platform]", description: "Begin OAuth flow — redirect to the platform's consent screen.", auth: "JWT" },
      { method: "GET", path: "/api/oauth/callback/[platform]", description: "OAuth callback — exchanges code for tokens.", auth: "Public" },
      { method: "GET", path: "/api/oauth/check", description: "Check which platforms the user has connected.", auth: "JWT" },
    ],
  },
  {
    name: "Admin & Owner",
    description: "Super-admin + owner-panel routes for managing the entire platform.",
    endpoints: [
      { method: "GET", path: "/api/admin", description: "Platform-wide stats (super-admin only).", auth: "Admin" },
      { method: "GET", path: "/api/branding", description: "Get the caller's tenant branding config.", auth: "JWT" },
      { method: "GET", path: "/api/audit-logs", description: "Audit logs (admin only).", auth: "Admin" },
      { method: "GET", path: "/api/bank-accounts", description: "List bank accounts (admin only).", auth: "Admin" },
      { method: "POST", path: "/api/bank-accounts", description: "Add a bank account (admin only).", auth: "Admin" },
      { method: "GET", path: "/api/api-keys", description: "List API keys (admin only).", auth: "Admin" },
      { method: "POST", path: "/api/api-keys", description: "Create an API key (admin only).", auth: "Admin" },
      { method: "GET", path: "/api/serial-keys", description: "List serial/license keys (admin only).", auth: "Admin" },
      { method: "POST", path: "/api/serial-keys/activate", description: "Activate a serial key.", auth: "JWT" },
    ],
  },
];

// ─── Visual helpers ──────────────────────────────────────────────────

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  PATCH: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  PUT: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  DELETE: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const AUTH_STYLES: Record<Endpoint["auth"], string> = {
  JWT: "bg-primary/10 text-primary border-primary/30",
  Public: "bg-muted text-muted-foreground border-border",
  Admin: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

function countEndpoints(): number {
  return MODULES.reduce((sum, m) => sum + m.endpoints.length, 0);
}

// ─── Page component ──────────────────────────────────────────────────

export default function ApiDocsPage() {
  const { isAuthenticated, token, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = React.useState("");
  const [activeModule, setActiveModule] = React.useState<string>("All");

  // Redirect unauthenticated users to /login. We wait until `loading`
  // flips to false so we don't redirect during the initial hydration.
  React.useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push("/login?next=/api-docs");
    }
  }, [loading, isAuthenticated, router]);

  // Filtered modules — based on the search box + the per-module dropdown.
  const visibleModules = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    return MODULES.filter((m) => {
      if (activeModule !== "All" && m.name !== activeModule) return false;
      if (!q) return true;
      // Show the module if any endpoint matches the query.
      return m.endpoints.some(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q),
      );
    }).map((m) => ({
      ...m,
      endpoints: m.endpoints.filter(
        (e) =>
          !q ||
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q),
      ),
    }));
  }, [filter, activeModule]);

  // While we don't know if the user is authenticated yet, show a loader.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="shimmer h-12 w-12 rounded-full" />
      </div>
    );
  }

  // Unauthenticated — the redirect effect will fire; render a placeholder.
  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to sign in…
          </p>
          <a
            href="/login?next=/api-docs"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="min-h-screen bg-background text-foreground"
    >
      {/* ─── Header ─── */}
      <div className="border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-sm font-semibold text-foreground hover:underline"
            >
              ← Back to SYNQUE
            </a>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-semibold">SYNQUE API Reference</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
              {countEndpoints()} endpoints · {MODULES.length} modules
            </span>
            {token && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Authenticated
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* ─── Intro + auth note ─── */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight">SYNQUE REST API</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Every endpoint (except <code className="rounded bg-muted px-1">/api/auth/*</code>,
            <code className="ml-1 rounded bg-muted px-1">/api/oauth/callback/*</code>,
            <code className="ml-1 rounded bg-muted px-1">/api/stripe/webhook</code>, and
            <code className="ml-1 rounded bg-muted px-1">/api/cron/*</code>) requires a
            Bearer JWT in the <code className="rounded bg-muted px-1">Authorization</code> header.
            Get your token from <code className="rounded bg-muted px-1">POST /api/auth/login</code>.
          </p>
          {token && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Your token</span>
              <code className="text-xs text-muted-foreground truncate flex-1 font-mono">
                {token.slice(0, 24)}…{token.slice(-8)}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(token)}
                className="rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {/* ─── Search + module filter ─── */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by path, description, or method…"
            className="flex-1 min-w-[240px] rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={activeModule}
            onChange={(e) => setActiveModule(e.target.value)}
            className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            aria-label="Filter by module"
          >
            <option value="All">All modules</option>
            {MODULES.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* ─── Module sections ─── */}
        {visibleModules.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center text-sm text-muted-foreground">
            No endpoints match &quot;{filter}&quot;.
          </div>
        ) : (
          visibleModules.map((m) => (
            <section
              key={m.name}
              className="rounded-xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden"
            >
              <header className="border-b border-border/40 bg-background/40 px-5 py-3">
                <h2 className="text-base font-semibold tracking-tight">
                  {m.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {m.endpoints.length} endpoint{m.endpoints.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
              </header>
              <ul className="divide-y divide-border/30">
                {m.endpoints.map((e) => (
                  <li
                    key={`${e.method}-${e.path}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-background/30 transition"
                  >
                    <span
                      className={`inline-flex w-16 justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${METHOD_STYLES[e.method]}`}
                    >
                      {e.method}
                    </span>
                    <div className="min-w-0">
                      <code className="block truncate text-sm font-mono text-foreground">
                        {e.path}
                      </code>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.description}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${AUTH_STYLES[e.auth]}`}
                      title={
                        e.auth === "JWT"
                          ? "Requires Authorization: Bearer <token>"
                          : e.auth === "Admin"
                          ? "Requires admin role"
                          : "Public — no auth required"
                      }
                    >
                      {e.auth}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {/* ─── Footer ─── */}
        <footer className="border-t border-border/40 pt-4 text-center text-xs text-muted-foreground">
          SYNQUE API · OpenAPI 3.0 spec available at{" "}
          <a
            href="/api/docs"
            className="font-semibold text-primary hover:underline"
          >
            /api/docs
          </a>{" "}
          · Webhooks deliver HMAC-signed payloads with the{" "}
          <code className="rounded bg-muted px-1">X-Synque-Signature</code> header
        </footer>
      </div>
    </div>
  );
}
