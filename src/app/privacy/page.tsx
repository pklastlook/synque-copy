"use client";

import * as React from "react";
import { ShieldCheck, Lock, Database, Eye, Users, Globe, Mail, Trash2, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg } from "@/components/landing-shared";

const SECTIONS = [
  {
    id: "overview",
    icon: ShieldCheck,
    title: "Overview",
    body: (
      <>
        <p>
          SYNQUE (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the social media team work
          management platform at synque.cloud (the &ldquo;Service&rdquo;). This Privacy Policy explains what
          information we collect, how we use it, and the choices you have.
        </p>
        <p>
          By using the Service, you agree to the collection and use of information as described in this policy.
          Capitalized terms used but not defined here have the meaning given to them in our Terms of Service.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    icon: Database,
    title: "Data we collect",
    body: (
      <>
        <p>We collect information you provide directly to us:</p>
        <ul>
          <li><strong>Account information</strong> — name, email address, company name, phone number (optional), and password (stored as a one-way bcrypt hash).</li>
          <li><strong>Billing information</strong> — name on card, card number (processed via our payment processor; we never store full PANs or CVCs on our servers).</li>
          <li><strong>Workspace content</strong> — captions, media assets, scheduled posts, hashtag groups, and analytics data you or your connected social accounts produce.</li>
          <li><strong>Connected account data</strong> — handles, display names, follower counts, and engagement metrics pulled from Instagram, Facebook, X, LinkedIn, TikTok, YouTube, and Threads via their official APIs.</li>
          <li><strong>Usage data</strong> — pages visited, features used, device type, IP address, and browser information. Used for product improvement and security.</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    icon: Eye,
    title: "How we use your data",
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service — including AI per-account caption generation and account suspension protection.</li>
          <li>Process payments and manage your subscription, including the 15-day trial.</li>
          <li>Send you transactional emails (receipts, security alerts, trial reminders) and, with your consent, product updates.</li>
          <li>Detect, prevent, and address technical issues, fraud, and abuse — including enforcing per-platform posting cadence limits.</li>
          <li>Aggregate and anonymize usage data to improve the Service and develop new features.</li>
        </ul>
      </>
    ),
  },
  {
    id: "data-storage",
    icon: Lock,
    title: "Data storage & security",
    body: (
      <>
        <p>
          Your data is stored on encrypted PostgreSQL databases hosted on Neon in the region closest to your team.
          Media assets are stored on Cloudinary&apos;s CDN with signed URLs for private assets. All connections between
          your browser and our servers use TLS 1.3 (HTTPS).
        </p>
        <ul>
          <li><strong>Encryption at rest</strong> — database volumes and object storage are encrypted with AES-256.</li>
          <li><strong>Encryption in transit</strong> — all API requests and webhook payloads are TLS-encrypted.</li>
          <li><strong>Access control</strong> — strict role-based access control (RBAC) inside SYNQUE; only authorized engineers can access production data, and every access is logged.</li>
          <li><strong>2FA enforcement</strong> — admins can require two-factor authentication for every team member.</li>
          <li><strong>SOC2 readiness</strong> — our controls are aligned with SOC 2 Type II criteria; annual third-party audits are scheduled.</li>
        </ul>
      </>
    ),
  },
  {
    id: "data-sharing",
    icon: Users,
    title: "Data sharing & sub-processors",
    body: (
      <>
        <p>We do not sell your personal information. We share data only with the sub-processors listed below, all of whom are bound by data processing agreements (DPAs):</p>
        <ul>
          <li><strong>Neon</strong> — managed PostgreSQL database hosting.</li>
          <li><strong>Cloudinary</strong> — media asset storage and CDN delivery.</li>
          <li><strong>Payment processor</strong> — subscription billing and card tokenization (PCI-DSS Level 1).</li>
          <li><strong>Email provider</strong> — transactional email delivery.</li>
          <li><strong>Social platforms</strong> — Instagram, Facebook, X, LinkedIn, TikTok, YouTube, and Threads, only when you connect an account and only to the extent necessary to perform the actions you initiate.</li>
        </ul>
        <p>We may also disclose data when required by law, court order, or to protect our rights, property, or safety.</p>
      </>
    ),
  },
  {
    id: "your-rights",
    icon: Globe,
    title: "Your rights",
    body: (
      <>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data.</li>
          <li><strong>Delete</strong> your account and associated data (subject to legal retention requirements).</li>
          <li><strong>Export</strong> your workspace data in a machine-readable format.</li>
          <li><strong>Object to</strong> or restrict certain processing activities.</li>
          <li><strong>Withdraw consent</strong> for non-essential processing at any time.</li>
        </ul>
        <p>
          To exercise any of these rights, email <a className="text-primary hover:underline" href="mailto:privacy@synque.cloud">privacy@synque.cloud</a>.
          We respond to verified requests within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    icon: Trash2,
    title: "Data retention",
    body: (
      <>
        <p>
          We retain your data for as long as your account is active. After account deletion, we remove personal data
          from production systems within 30 days, with the following exceptions:
        </p>
        <ul>
          <li><strong>Financial records</strong> — kept for 7 years to comply with tax and accounting regulations.</li>
          <li><strong>Security logs</strong> — kept for 12 months for fraud detection and incident investigation.</li>
          <li><strong>Anonymized analytics</strong> — aggregated, non-identifying data may be retained indefinitely.</li>
        </ul>
      </>
    ),
  },
  {
    id: "international",
    icon: Globe,
    title: "International transfers",
    body: (
      <>
        <p>
          SYNQUE is a global product. Your data may be processed in countries other than your own, including the
          United States, the European Union, and India. When we transfer data across borders, we rely on Standard
          Contractual Clauses (SCCs) approved by the European Commission and other recognized transfer mechanisms.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    icon: RefreshCw,
    title: "Cookies & tracking",
    body: (
      <>
        <p>We use cookies and similar technologies for:</p>
        <ul>
          <li><strong>Essential</strong> — authentication, session management, and security (cannot be disabled).</li>
          <li><strong>Functional</strong> — remembering your theme preference (light/dark), language, and last-used workspace.</li>
          <li><strong>Analytics</strong> — privacy-respecting product analytics to understand which features are used. No third-party advertising cookies, ever.</li>
        </ul>
        <p>You can manage non-essential cookies from your browser settings at any time.</p>
      </>
    ),
  },
  {
    id: "childrens",
    icon: AlertTriangle,
    title: "Children&apos;s privacy",
    body: (
      <>
        <p>
          The Service is intended for business use and is not directed to children under 16. We do not knowingly collect
          personal information from children. If you believe we have collected data from a child, please contact us
          immediately and we will delete it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    icon: FileText,
    title: "Changes to this policy",
    body: (
      <>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by email and by
          posting a notice in the Service at least 30 days before the changes take effect. The &ldquo;Last updated&rdquo;
          date below indicates when this policy was last revised.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    icon: Mail,
    title: "Contact us",
    body: (
      <>
        <p>
          Questions about this Privacy Policy or your data? Reach our Data Protection Officer:
        </p>
        <ul>
          <li><strong>Email:</strong> <a className="text-primary hover:underline" href="mailto:privacy@synque.cloud">privacy@synque.cloud</a></li>
          <li><strong>Mail:</strong> SYNQUE, Attn: Privacy, 548 Market St, San Francisco, CA 94104</li>
        </ul>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-24 pb-8 sm:pt-32">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <ShieldCheck className="h-3 w-3" /> Privacy Policy
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Your data, <span className="gold-text">your control.</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            We collect the minimum needed to run a great product — and we tell you exactly what that is, why, and how to remove it.
          </p>
          <p className="crystal-in mt-3 text-xs text-muted-foreground" style={{ animationDelay: "0.3s" }}>
            Last updated: January 2026 · Effective immediately for all accounts
          </p>
        </div>
      </section>

      {/* Quick TOC */}
      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="crystal-in glass rounded-2xl p-5 sm:p-6">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">In this policy</div>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5 hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="space-y-6">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <article
                key={s.id}
                id={s.id}
                className="crystal-in glass lift-hover scroll-mt-24 rounded-2xl p-6 sm:p-8"
                style={{ animationDelay: `${0.05 * i + 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{s.title}</h2>
                    <div className="prose-privacy mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {s.body}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <LandingFooter />

      <style>{`
        .prose-privacy ul { list-style: disc; padding-left: 1.5rem; }
        .prose-privacy ul li { margin-top: 0.4rem; }
        .prose-privacy strong { color: var(--foreground); font-weight: 600; }
        .prose-privacy p { color: var(--muted-foreground); }
      `}</style>
    </div>
  );
}
