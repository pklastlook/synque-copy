"use client";

import * as React from "react";
import { FileText, CreditCard, ShieldCheck, Users, EyeOff, Scale, RefreshCw, AlertTriangle, Mail, Layers, Ban } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg } from "@/components/landing-shared";

const SECTIONS = [
  {
    id: "acceptance",
    icon: FileText,
    title: "1. Acceptance of terms",
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the SYNQUE platform, including all related
          web pages, API services, and integrations (the &ldquo;Service&rdquo;). By creating an account, accessing, or
          using the Service, you agree to be bound by these Terms and our Privacy Policy.
        </p>
        <p>
          If you are using the Service on behalf of a company, you represent that you have the authority to bind that
          company to these Terms, and &ldquo;you&rdquo; in these Terms will refer to that company.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    icon: Users,
    title: "2. Accounts & roles",
    body: (
      <>
        <p>
          You must provide accurate, current information when creating an account. You are responsible for safeguarding
          your password and for all activity that occurs under your account. The Service supports the following roles:
        </p>
        <ul>
          <li><strong>Admin</strong> — full access, including billing, team management, and account deletion.</li>
          <li><strong>Manager</strong> — manage content, calendars, and team members within their department.</li>
          <li><strong>Editor</strong> — create and edit posts, but cannot publish or delete.</li>
          <li><strong>Member</strong> — collaborate on assigned tasks and view shared content.</li>
          <li><strong>Viewer</strong> — read-only access to dashboards, analytics, and reports. Used for the Live Demo.</li>
        </ul>
        <p>
          Admins can change a team member&apos;s role at any time. Role changes take effect immediately.
        </p>
      </>
    ),
  },
  {
    id: "subscription",
    icon: CreditCard,
    title: "3. Subscription & billing",
    body: (
      <>
        <p>
          SYNQUE offers three plans: Starter (free), Growth ($49/mo or $89/mo when billed with extra accounts), and
          Enterprise (custom pricing). Each plan includes a 15-day free trial during which no charge is applied to your
          payment method.
        </p>
        <ul>
          <li><strong>Trial</strong> — begins when you submit valid payment details. You will not be charged for the first 15 days.</li>
          <li><strong>Renewal</strong> — paid plans renew automatically on the same calendar day each billing period.</li>
          <li><strong>Cancellation</strong> — you can cancel anytime from Settings. Cancellation stops future renewals; the current period remains active until the end of the paid term.</li>
          <li><strong>Refunds</strong> — annual plans are refundable on a prorated basis within the first 30 days. Monthly plans are non-refundable.</li>
          <li><strong>Price changes</strong> — we will notify you at least 30 days before any price increase takes effect.</li>
        </ul>
      </>
    ),
  },
  {
    id: "acceptable-use",
    icon: ShieldCheck,
    title: "4. Acceptable use",
    body: (
      <>
        <p>
          You agree to use the Service only for lawful purposes and in a manner that does not infringe the rights of,
          restrict, or inhibit anyone else&apos;s use and enjoyment of the Service. Prohibited behavior includes:
        </p>
        <ul>
          <li>Harassing, defamatory, or otherwise objectionable content.</li>
          <li>Spam, automated mass-posting that violates platform terms of service, or coordinated inauthentic behavior.</li>
          <li>Uploading malware, viruses, or any code designed to disrupt the Service or scrape data.</li>
          <li>Reverse engineering, decompiling, or attempting to derive source code from the Service.</li>
          <li>Sharing account credentials across users or reselling access without written permission.</li>
          <li>Using the Service to circumvent rate limits or platform-level enforcement actions.</li>
        </ul>
        <p>
          SYNQUE includes built-in account-protection features (posting cadence limits, banned-hashtag screening,
          warm-up mode). Disabling or circumventing these features is at your own risk and may result in account
          suspension by the upstream platform. SYNQUE is not liable for such suspensions.
        </p>
      </>
    ),
  },
  {
    id: "content-ownership",
    icon: Layers,
    title: "5. Your content",
    body: (
      <>
        <p>
          You retain all ownership rights to content you create, upload, or publish through the Service
          (&ldquo;User Content&rdquo;). By using the Service, you grant SYNQUE a worldwide, non-exclusive,
          royalty-free license to host, store, process, and transmit your User Content solely as needed to operate the
          Service for you.
        </p>
        <p>
          You represent that you own or have the necessary rights to all User Content you submit, and that the User
          Content does not violate any third-party rights or applicable law.
        </p>
      </>
    ),
  },
  {
    id: "ai-content",
    icon: RefreshCw,
    title: "6. AI-generated content",
    body: (
      <>
        <p>
          SYNQUE uses a large language model to generate platform-native caption variants based on the brief you
          provide. You are solely responsible for reviewing, editing, and approving any AI-generated content before
          publication. SYNQUE does not guarantee that AI-generated content is accurate, original, or fit for a
          particular purpose.
        </p>
        <p>
          You agree not to use the AI features to generate content that is unlawful, defamatory, infringing, or that
          impersonates another person without their consent.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    icon: EyeOff,
    title: "7. Intellectual property",
    body: (
      <>
        <p>
          The Service, including its design, features, and underlying software, is the exclusive property of SYNQUE
          and its licensors. These Terms do not grant you any right, title, or interest in the Service except for the
          limited right to use it in accordance with these Terms.
        </p>
        <p>
          &ldquo;SYNQUE&rdquo;, the SYNQUE logo, and other SYNQUE trademarks are protected by trademark and
          unfair-competition laws. You may not use them without prior written permission.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    icon: Ban,
    title: "8. Suspension & termination",
    body: (
      <>
        <p>
          You may delete your account at any time from Settings &rarr; Account. Upon deletion, your data is removed from
          production systems within 30 days, subject to the retention periods described in our Privacy Policy.
        </p>
        <p>
          We may suspend or terminate your access to the Service if: (a) you breach these Terms; (b) we are required to
          do so by law; (c) your account is inactive for more than 12 consecutive months; or (d) we discontinue the
          Service or a material part of it (with at least 60 days&apos; notice by email).
        </p>
        <p>
          Upon termination, all licenses granted to you under these Terms immediately cease. Sections that by their
          nature should survive termination — including intellectual property, disclaimers, and limitation of liability
          — will continue to apply.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    icon: AlertTriangle,
    title: "9. Disclaimers",
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Service will be uninterrupted, error-free, or secure, or that any analytics data,
          follower counts, or engagement metrics pulled from third-party platforms are accurate, complete, or current.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    icon: Scale,
    title: "10. Limitation of liability",
    body: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL SOCIALFLOW, ITS OFFICERS, DIRECTORS,
          EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
          OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
        <p>
          THE TOTAL LIABILITY OF SOCIALFLOW FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE WILL
          NOT EXCEED THE AMOUNT YOU PAID TO SOCIALFLOW IN THE 12 MONTHS PRECEDING THE CLAIM, OR $50 USD, WHICHEVER IS
          GREATER.
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    icon: ShieldCheck,
    title: "11. Indemnification",
    body: (
      <>
        <p>
          You agree to indemnify and hold harmless SYNQUE, its officers, directors, employees, and agents from any
          claim, demand, loss, or damages — including reasonable attorneys&apos; fees — arising out of your User
          Content, your breach of these Terms, or your violation of any law or third-party rights.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "12. Changes to these Terms",
    body: (
      <>
        <p>
          We may revise these Terms from time to time. The most current version will always be posted on this page, with
          the &ldquo;Last updated&rdquo; date below. For material changes, we will notify you by email and post a notice
          in the Service at least 30 days before the changes take effect.
        </p>
        <p>
          If you continue using the Service after the effective date of any change, you accept the revised Terms.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    icon: Mail,
    title: "13. Contact us",
    body: (
      <>
        <p>Questions about these Terms? We&apos;re happy to help:</p>
        <ul>
          <li><strong>Email:</strong> <a className="text-primary hover:underline" href="mailto:legal@synque.cloud">legal@synque.cloud</a></li>
          <li><strong>Mail:</strong> SYNQUE, Attn: Legal, 548 Market St, San Francisco, CA 94104</li>
        </ul>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-24 pb-8 sm:pt-32">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <FileText className="h-3 w-3" /> Terms of Service
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            The rules of the <span className="gold-text">road.</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Plain-English terms that protect both you and SYNQUE. No legalese where a sentence will do.
          </p>
          <p className="crystal-in mt-3 text-xs text-muted-foreground" style={{ animationDelay: "0.3s" }}>
            Last updated: January 2026 · By using SYNQUE you agree to these Terms
          </p>
        </div>
      </section>

      {/* Quick TOC */}
      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="crystal-in glass rounded-2xl p-5 sm:p-6">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">In these Terms</div>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5 hover:text-foreground"
              >
                {s.title.replace(/^\d+\.\s/, "")}
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
                    <div className="prose-terms mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
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
        .prose-terms ul { list-style: disc; padding-left: 1.5rem; }
        .prose-terms ul li { margin-top: 0.4rem; }
        .prose-terms strong { color: var(--foreground); font-weight: 600; }
        .prose-terms p { color: var(--muted-foreground); }
      `}</style>
    </div>
  );
}
