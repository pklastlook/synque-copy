"use client";
import * as React from "react";
import { Code2, Webhook, Key, Database, FileJson, Terminal, Copy, Check } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const CATEGORIES = [
  { icon: Key, title: "Authentication", desc: "JWT-based auth with Bearer tokens and cookie support.", accent: "oklch(0.7 0.2 25)" },
  { icon: Code2, title: "Posts API", desc: "Create, schedule, publish, and analyze posts across platforms.", accent: "oklch(0.55 0.2 255)" },
  { icon: Database, title: "Analytics API", desc: "Retrieve engagement metrics, follower growth, and reach data.", accent: "oklch(0.62 0.22 300)" },
  { icon: FileJson, title: "Media API", desc: "Upload, manage, and serve media via Cloudinary CDN.", accent: "oklch(0.66 0.18 200)" },
  { icon: Webhook, title: "Webhooks", desc: "Real-time event notifications for posts, comments, and DMs.", accent: "oklch(0.68 0.22 145)" },
  { icon: Terminal, title: "CLI & SDKs", desc: "Official JavaScript, Python, and PHP clients plus a CLI.", accent: "oklch(0.72 0.18 75)" },
];

const ENDPOINTS = [
  { method: "POST", path: "/v1/posts", desc: "Create a new post (single or multi-account variants).", color: "oklch(0.68 0.22 145)" },
  { method: "GET", path: "/v1/posts/:id", desc: "Retrieve a post with platform-specific variants.", color: "oklch(0.55 0.2 255)" },
  { method: "POST", path: "/v1/posts/:id/publish", desc: "Publish immediately or queue for scheduled time.", color: "oklch(0.68 0.22 145)" },
  { method: "GET", path: "/v1/analytics", desc: "Aggregate engagement, reach, and follower metrics.", color: "oklch(0.55 0.2 255)" },
  { method: "POST", path: "/v1/media/upload", desc: "Upload to Cloudinary; returns CDN-backed URL.", color: "oklch(0.68 0.22 145)" },
];

export default function ApiReferencePage() {
  const [copied, setCopied] = React.useState(false);
  const snippet = `curl -X POST https://api.socialflow.app/v1/posts \\
  -H "Authorization: Bearer $SOCIALFLOW_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "brief": "Launch day is here. New collection live now.",
    "accounts": ["ig:yourbrand", "x:yourbrand", "li:yourbrand"],
    "tone": "energetic",
    "schedule": "2025-04-01T15:00:00Z"
  }'`;

  const copy = () => {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Code2 className="h-3 w-3" /> API Reference
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            The complete <span className="gold-text">REST API</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Built for developers. JSON in, JSON out. JWT auth, predictable errors, idempotency keys, and live webhooks.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <div key={c.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: c.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${c.accent}, oklch(0.45 0.16 258))` }}>
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code snippet */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="crystal-in glass-strong overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> Create a multi-account post
              </span>
            </div>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1 text-xs font-medium hover:bg-muted">
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
            <code className="font-mono text-foreground/90">{snippet}</code>
          </pre>
        </div>
      </section>

      {/* Endpoint list */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Core <span className="gold-text">endpoints</span></h2>
        <div className="mt-6 space-y-3">
          {ENDPOINTS.map((e, i) => (
            <div key={e.path} className="crystal-in glass lift-hover flex flex-wrap items-center gap-3 rounded-2xl p-4" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <span className="w-fit rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: e.color }}>
                {e.method}
              </span>
              <code className="font-mono text-sm font-semibold">{e.path}</code>
              <span className="text-sm text-muted-foreground">— {e.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Ship in <span className="gold-text">an afternoon</span></h2>
          <p className="mt-3 text-muted-foreground">Spin up a 15-day trial workspace and get your API token instantly.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
