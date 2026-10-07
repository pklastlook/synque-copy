"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Check,
  Lock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  Calendar,
  Star,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { LandingNav, LandingFooter, LandingBg } from "@/components/landing-shared";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Plan templates — single source of truth for the plan cards + the billing
// flow. Mirrors the pricing page (Starter $299, Growth $499, Enterprise Custom).
// ============================================================================

interface PlanTemplate {
  id: "starter" | "growth" | "enterprise" | "custom";
  name: string;
  price: number | null; // null = custom (contact sales)
  priceLabel: string;
  desc: string;
  features: string[];
  accent: string;
  featured?: boolean;
}

const PLANS: PlanTemplate[] = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    priceLabel: "$299",
    desc: "For solo creators & small teams getting started.",
    features: ["3 social accounts", "1 user", "AI composer (100/mo)", "Basic analytics", "Email support"],
    accent: "oklch(0.74 0.18 165)",
  },
  {
    id: "growth",
    name: "Growth",
    price: 499,
    priceLabel: "$499",
    desc: "For growing teams that publish daily.",
    features: ["15 social accounts", "5 users", "Unlimited AI composer", "Advanced analytics", "Account protection", "Priority support"],
    accent: "oklch(0.72 0.22 300)",
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    priceLabel: "Custom",
    desc: "For large teams with custom needs.",
    features: ["Unlimited accounts", "Unlimited users", "Custom domain mail server", "SSO + SAML", "Dedicated success manager", "99.9% SLA"],
    accent: "oklch(0.7 0.2 25)",
  },
];

// ============================================================================
// Types — match the JSON shape returned by /api/subscriptions + /api/payments.
// ============================================================================

interface SubscriptionData {
  id: string;
  customerId: string;
  customerName: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  trialEnds: string | null;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  billingCycle: string | null;
  notes: string | null;
}

interface PaymentRecord {
  id: string;
  subscriptionId: string | null;
  invoiceId: string | null;
  customerId: string;
  amount: number;
  currency: string;
  method: string;
  cardLast4: string | null;
  cardBrand: string | null;
  status: string;
  transactionId: string | null;
  createdAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `$${(n || 0).toFixed(2)}`;
  }
}

function detectCardBrand(num: string): "visa" | "mastercard" | "amex" | "unknown" {
  const digits = num.replace(/\s/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

function statusTone(status: string): { className: string; dot: string } {
  switch (status) {
    case "active":
    case "completed":
      return { className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" };
    case "trial":
    case "pending":
      return { className: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
    case "cancelled":
    case "failed":
    case "refunded":
    case "expired":
      return { className: "bg-rose-500/15 text-rose-600 dark:text-rose-400", dot: "bg-rose-500" };
    default:
      return { className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  }
}

// ============================================================================
// Main page component
// ============================================================================

export default function BillingPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [subs, setSubs] = React.useState<SubscriptionData[] | null>(null);
  const [payments, setPayments] = React.useState<PaymentRecord[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [payForPlan, setPayForPlan] = React.useState<PlanTemplate | null>(null);

  // ===== Fetch subscriptions + payments on mount (only when authenticated). =====
  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const [subRes, payRes] = await Promise.all([
          fetch("/api/subscriptions", { headers }),
          fetch("/api/payments", { headers }),
        ]);
        if (cancelled) return;
        const subJson = subRes.ok ? await subRes.json() : [];
        const payJson = payRes.ok ? await payRes.json() : [];
        setSubs(Array.isArray(subJson) ? subJson : []);
        setPayments(Array.isArray(payJson) ? payJson : []);
      } catch {
        if (!cancelled) {
          setSubs([]);
          setPayments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, token]);

  // ===== Resolve the caller's active subscription (prefer active, then trial). =====
  const activeSub =
    (subs ?? []).find((s) => s.status === "active") ??
    (subs ?? []).find((s) => s.status === "trial") ??
    (subs ?? [])[0] ??
    null;

  // ===== If not authenticated, show a friendly gate. =====
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <LandingBg />
        <LandingNav />
        <main className="relative mx-auto max-w-3xl px-4 pt-32 pb-16 text-center">
          <div className="crystal-in inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Lock className="h-3.5 w-3.5" /> Sign in required
          </div>
          <h1 className="crystal-in mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Manage your <span className="gold-text">subscription</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Sign in to your SYNQUE workspace to view your current plan, manage payment methods,
            upgrade or downgrade your subscription, and download past invoices.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="liquid-pill glow-ring inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
            >
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/40 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              View plans
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <LandingBg />
        <LandingNav />
        <main className="relative mx-auto max-w-5xl px-4 pt-32 pb-16">
          <div className="shimmer h-40 rounded-3xl" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shimmer h-64 rounded-3xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />
      <main className="relative mx-auto max-w-5xl px-4 pt-32 pb-16">
        {/* ===== Header ===== */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="crystal-in inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <CreditCard className="h-3.5 w-3.5" /> Billing &amp; Subscription
            </div>
            <h1 className="crystal-in mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Your subscription"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Manage your plan, payment method, and review past invoices. Changes take effect
              immediately and a paid invoice is generated for the current billing period.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
        </div>

        {/* ===== Current plan card ===== */}
        <CurrentPlanCard sub={activeSub} />

        {/* ===== Plan options ===== */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold">Choose your plan</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => {
              const isCurrent = activeSub?.plan === p.id;
              const isUpgrade = activeSub
                ? (p.price ?? 0) > (activeSub.totalAmount ?? activeSub.amount ?? 0)
                : false;
              const isDowngrade = activeSub
                ? (p.price ?? 0) < (activeSub.totalAmount ?? activeSub.amount ?? 0) && p.price !== null
                : false;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "crystal-in relative flex flex-col rounded-3xl border bg-background/60 p-5 transition",
                    p.featured ? "border-primary/40 shadow-lg" : "border-border/40",
                    isCurrent && "ring-2 ring-primary/40",
                  )}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                      <Star className="h-2.5 w-2.5" /> Popular
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className="grid h-9 w-9 place-items-center rounded-xl"
                      style={{ background: `${p.accent}18`, color: p.accent }}
                    >
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="text-base font-bold">{p.name}</span>
                    {isCurrent && (
                      <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="num-display mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{p.priceLabel}</span>
                    {p.price !== null && (
                      <span className="text-xs font-medium text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                  <ul className="mt-4 flex-1 space-y-1.5 text-xs">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Your current plan
                      </Button>
                    ) : p.price === null ? (
                      <a
                        href="mailto:sales@synque.cloud?subject=Enterprise%20plan%20inquiry"
                        className="liquid-pill flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        Contact sales <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => setPayForPlan(p)}
                        className={cn(
                          "liquid-pill flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold",
                          p.featured && "glow-ring",
                        )}
                      >
                        {isUpgrade ? <><TrendingUp className="h-3.5 w-3.5" /> Upgrade</>
                          : isDowngrade ? <><ArrowDown className="h-3.5 w-3.5" /> Downgrade</>
                          : <>Subscribe <ArrowRight className="h-3.5 w-3.5" /></>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Payment history ===== */}
        <PaymentHistory payments={payments ?? []} />

        {/* ===== Security reassurance ===== */}
        <section className="mt-10">
          <div className="crystal-in flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/30 p-4 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <div className="font-semibold text-foreground">Payments are secure</div>
              <p className="mt-0.5">
                Card details are tokenised at submission and never stored on our servers. Payments
                are processed over HTTPS and your card&apos;s last 4 digits + brand are recorded
                against your account for reconciliation only.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Payment dialog ===== */}
      <PaymentDialog
        plan={payForPlan}
        onClose={() => setPayForPlan(null)}
        onSuccess={() => {
          // Re-fetch subscriptions + payments after a successful payment so
          // the "Current plan" card + payment history update instantly.
          setPayForPlan(null);
          setLoading(true);
          (async () => {
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
            try {
              const [subRes, payRes] = await Promise.all([
                fetch("/api/subscriptions", { headers }),
                fetch("/api/payments", { headers }),
              ]);
              const subJson = subRes.ok ? await subRes.json() : [];
              const payJson = payRes.ok ? await payRes.json() : [];
              setSubs(Array.isArray(subJson) ? subJson : []);
              setPayments(Array.isArray(payJson) ? payJson : []);
            } finally {
              setLoading(false);
            }
          })();
        }}
      />

      <LandingFooter />
    </div>
  );
}

// ============================================================================
// Current plan card — shows the caller's active or trial subscription, with
// billing cycle, next billing date, trial countdown, and totals breakdown.
// ============================================================================

function CurrentPlanCard({ sub }: { sub: SubscriptionData | null }) {
  if (!sub) {
    return (
      <section className="mt-8">
        <div className="crystal-in flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/60 p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold">No active subscription</h3>
          <p className="max-w-md text-xs text-muted-foreground">
            You don&apos;t have a subscription yet. Pick a plan below to get started —
            your trial lasts 15 days and you can cancel anytime.
          </p>
        </div>
      </section>
    );
  }

  const tone = statusTone(sub.status);
  const total = sub.totalAmount ?? sub.amount;
  const nextBilling = (() => {
    if (!sub.startDate) return null;
    const cycleDays = sub.billingCycle === "quarterly" ? 90 : sub.billingCycle === "yearly" ? 365 : 30;
    return new Date(new Date(sub.startDate).getTime() + cycleDays * 24 * 60 * 60 * 1000);
  })();
  const trialDaysLeft = sub.trialEnds
    ? Math.max(0, Math.ceil((new Date(sub.trialEnds).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <section className="mt-8">
      <div className="crystal-in relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-background/60 to-background/60 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold capitalize">{sub.plan} plan</h2>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", tone.className)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                  {sub.status}
                </span>
                {sub.billingCycle && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                    {sub.billingCycle}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Started {format(new Date(sub.startDate), "MMM d, yyyy")}
                {sub.endDate && ` · ends ${format(new Date(sub.endDate), "MMM d, yyyy")}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="num-display text-2xl font-bold tabular-nums">
              {money(total, sub.currency)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {sub.billingCycle ? `per ${sub.billingCycle.replace("ly", "")}` : "one-time"}
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {sub.status === "trial" && sub.trialEnds && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <Calendar className="h-3 w-3" /> Trial ends {format(new Date(sub.trialEnds), "MMM d, yyyy")}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {trialDaysLeft !== null && trialDaysLeft > 0
                  ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left to subscribe`
                  : "Trial expired — subscribe to keep your access"}
              </div>
            </div>
          )}
          {nextBilling && (
            <div className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Calendar className="h-3 w-3" /> Next billing
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {format(nextBilling, "MMM d, yyyy")}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-xs">
            <div className="font-semibold text-foreground">Plan breakdown</div>
            <div className="mt-0.5 space-y-0.5 text-[10px] text-muted-foreground">
              <div className="flex justify-between"><span>Base</span><span className="tabular-nums">{money(sub.amount, sub.currency)}</span></div>
              {sub.discountAmount && sub.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span><span className="tabular-nums">-{money(sub.discountAmount, sub.currency)}</span>
                </div>
              )}
              {sub.taxAmount && sub.taxAmount > 0 && (
                <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">+{money(sub.taxAmount, sub.currency)}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Payment history — table of past payments from /api/payments.
// ============================================================================

function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold">Payment history</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{payments.length} payment(s)</span>
      </div>
      {payments.length === 0 ? (
        <div className="crystal-in flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">No payments yet</p>
          <p className="text-xs text-muted-foreground">Subscribe to a plan above to record your first payment.</p>
        </div>
      ) : (
        <div className="crystal-in overflow-hidden rounded-2xl border border-border/40 bg-background/60">
          <div className="scroll-liquid max-h-[400px] overflow-y-auto">
            {payments.map((p) => {
              const tone = statusTone(p.status);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border/30 px-4 py-2.5 text-xs last:border-b-0"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold">{p.transactionId ?? p.id.slice(-8)}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize", tone.className)}>
                        <span className={cn("h-1 w-1 rounded-full", tone.dot)} /> {p.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.method === "card" && p.cardLast4
                        ? `Card •••• ${p.cardLast4}${p.cardBrand ? ` · ${p.cardBrand}` : ""}`
                        : p.method}
                      {" · "}
                      {format(new Date(p.createdAt), "MMM d, yyyy · HH:mm")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{money(p.amount, p.currency)}</div>
                    <div className="text-[10px] text-muted-foreground">{p.currency}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Payment dialog — collects card details and POSTs to /api/payments.
// ============================================================================

function PaymentDialog({
  plan,
  onClose,
  onSuccess,
}: {
  plan: PlanTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [cardName, setCardName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // ===== Reset state whenever the dialog opens for a new plan. =====
  React.useEffect(() => {
    if (plan) {
      setCardName("");
      setCardNumber("");
      setExpiry("");
      setCvc("");
      setBusy(false);
      setSuccess(false);
    }
  }, [plan]);

  // ===== Format the card number into groups of 4 as the user types. =====
  const onCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    const grouped = digits.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(grouped);
  };

  // ===== Format the expiry as MM / YY. =====
  const onExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setExpiry(digits);
    } else {
      setExpiry(`${digits.slice(0, 2)} / ${digits.slice(2)}`);
    }
  };

  // ===== CVC: digits only, max 4 (Amex) / 3 (others). =====
  const onCvcChange = (raw: string) => {
    setCvc(raw.replace(/\D/g, "").slice(0, 4));
  };

  const cardBrand = detectCardBrand(cardNumber);
  const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
  const amount = plan?.price ?? 0;

  const valid =
    cardName.trim().length >= 3 &&
    cardNumber.replace(/\s/g, "").length >= 13 &&
    expiry.replace(/\D/g, "").length === 4 &&
    cvc.length >= 3;

  const submit = async () => {
    if (!plan) return;
    if (!valid) {
      toast.error("Please complete all card fields");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount,
          currency: "USD",
          method: "card",
          cardLast4,
          cardBrand: cardBrand === "unknown" ? null : cardBrand,
          status: "completed",
          transactionId: `txn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        id?: string;
        invoiceNumber?: string;
        updatedSubscription?: boolean;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Payment failed");
      }
      setSuccess(true);
      toast.success("Payment successful!", {
        description: `${money(amount)} charged to •••• ${cardLast4}.${json.invoiceNumber ? ` Invoice ${json.invoiceNumber} generated.` : ""}`,
        duration: 6000,
      });
      // Brief delay so the user sees the success state before the dialog closes.
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={!!plan} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscribe to {plan.name}
          </DialogTitle>
          <DialogDescription>
            {plan.price !== null
              ? `You'll be charged ${money(plan.price)} now. Your subscription will be activated immediately and a paid invoice will be generated.`
              : "Enterprise plans require a custom quote — contact sales."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="h-7 w-7" />
            </div>
            <div className="text-base font-semibold">Payment complete</div>
            <p className="max-w-xs text-xs text-muted-foreground">
              Your subscription is now active. A paid invoice has been generated and credited to the
              owner&apos;s bank account.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {/* ===== Plan + price summary ===== */}
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-7 w-7 place-items-center rounded-lg"
                  style={{ background: `${plan.accent}18`, color: plan.accent }}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold">{plan.name} plan</span>
              </div>
              <div className="text-right">
                <div className="num-display text-base font-bold tabular-nums">{money(plan.price ?? 0)}</div>
                <div className="text-[9px] text-muted-foreground">one-time</div>
              </div>
            </div>

            {/* ===== Card details form ===== */}
            <div>
              <Label className="text-xs">Name on card</Label>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Smith"
                className="mt-1.5"
                autoComplete="cc-name"
              />
            </div>
            <div>
              <Label className="text-xs">Card number</Label>
              <div className="relative mt-1.5">
                <Input
                  value={cardNumber}
                  onChange={(e) => onCardNumberChange(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="pr-16 font-mono"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
                {cardBrand !== "unknown" && cardNumber.replace(/\s/g, "").length >= 4 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                    {cardBrand}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Expiry</Label>
                <Input
                  value={expiry}
                  onChange={(e) => onExpiryChange(e.target.value)}
                  placeholder="MM / YY"
                  className="mt-1.5 font-mono"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
              </div>
              <div>
                <Label className="text-xs">CVC</Label>
                <Input
                  value={cvc}
                  onChange={(e) => onCvcChange(e.target.value)}
                  placeholder="123"
                  className="mt-1.5 font-mono"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </div>
            </div>

            {/* ===== Security reassurance ===== */}
            <div className="flex items-start gap-2 rounded-xl bg-emerald-500/5 p-2.5 text-[11px] text-muted-foreground">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <span>
                This is a sandbox payment — no real card is charged. Your card&apos;s last 4 digits
                + brand are recorded against your account for reconciliation.
              </span>
            </div>

            {/* ===== Validation hint ===== */}
            {!valid && (cardName || cardNumber || expiry || cvc) && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>Complete all fields with valid card details before submitting.</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {success ? (
            <Button onClick={onSuccess} className="liquid-pill">Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button
                onClick={submit}
                disabled={busy || !valid}
                className="liquid-pill flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {busy ? "Processing…" : `Pay ${money(plan.price ?? 0)}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
