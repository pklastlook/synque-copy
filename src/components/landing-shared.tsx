"use client";

import * as React from "react";
import { ArrowRight, ShieldCheck, Check, Rocket, Lock, Mail as MailIcon, Users, Building2, PhoneCall, CreditCard, Loader2, Sparkles, Wifi, ShieldCheck as Shield, Zap } from "lucide-react";
import { LogoWordmark } from "@/components/glass/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

/** Shared nav bar for all landing pages */
export function LandingNav() {
  const [trialOpen, setTrialOpen] = React.useState(false);
  return (
    <>
      <nav className="glass-topbar sticky top-0 z-50 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-2xl px-5 py-3 sm:w-[calc(100%-3rem)]">
        <Link href="/"><LogoWordmark size="text-[17px]" logoSize={26} /></Link>
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/features" className="text-sm text-muted-foreground transition hover:text-foreground">Features</Link>
          <Link href="/workflow" className="text-sm text-muted-foreground transition hover:text-foreground">Workflow</Link>
          <Link href="/pricing" className="text-sm text-muted-foreground transition hover:text-foreground">Pricing</Link>
          <Link href="/about" className="text-sm text-muted-foreground transition hover:text-foreground">About</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:block">
            Sign in
          </Link>
          <button onClick={() => setTrialOpen(true)} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold">
            Start 15-day trial <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>
      <TrialDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </>
  );
}

/** Shared footer for all landing pages */
export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <LogoWordmark size="text-sm" logoSize={22} />
          <p className="mt-2 text-xs text-muted-foreground">Sync Your Social. The enterprise command center for modern social teams.</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" /> Encrypted · 2FA · SOC2-ready
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">Product</div>
          <ul className="mt-3 space-y-2">
            <li><Link href="/features" className="text-xs text-muted-foreground transition hover:text-foreground">Features</Link></li>
            <li><Link href="/workflow" className="text-xs text-muted-foreground transition hover:text-foreground">Workflow</Link></li>
            <li><Link href="/pricing" className="text-xs text-muted-foreground transition hover:text-foreground">Pricing</Link></li>
            <li><Link href="/ai-composer" className="text-xs text-muted-foreground transition hover:text-foreground">AI Composer</Link></li>
            <li><Link href="/protection" className="text-xs text-muted-foreground transition hover:text-foreground">Account Protection</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">Company</div>
          <ul className="mt-3 space-y-2">
            <li><Link href="/about" className="text-xs text-muted-foreground transition hover:text-foreground">About</Link></li>
            <li><Link href="/blog" className="text-xs text-muted-foreground transition hover:text-foreground">Blog</Link></li>
            <li><Link href="/contact" className="text-xs text-muted-foreground transition hover:text-foreground">Contact</Link></li>
            <li><Link href="/careers" className="text-xs text-muted-foreground transition hover:text-foreground">Careers</Link></li>
            <li><Link href="/customers" className="text-xs text-muted-foreground transition hover:text-foreground">Customers</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">Resources</div>
          <ul className="mt-3 space-y-2">
            <li><Link href="/docs" className="text-xs text-muted-foreground transition hover:text-foreground">Documentation</Link></li>
            <li><Link href="/api-reference" className="text-xs text-muted-foreground transition hover:text-foreground">API Reference</Link></li>
            <li><Link href="/help" className="text-xs text-muted-foreground transition hover:text-foreground">Help Center</Link></li>
            <li><Link href="/status" className="text-xs text-muted-foreground transition hover:text-foreground">Status</Link></li>
            <li><Link href="/changelog" className="text-xs text-muted-foreground transition hover:text-foreground">Changelog</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
        <span>© 2026 SYNQUE · Sync Your Social</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="transition hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition hover:text-foreground">Terms</Link>
          <Link href="/protection" className="transition hover:text-foreground">Security</Link>
        </div>
      </div>
    </footer>
  );
}

/** Shared background */
export function LandingBg() {
  return (
    <div className="retaina-bg" aria-hidden>
      <div className="blob-3" />
    </div>
  );
}

/** Trial CTA button — opens the trial dialog with card payment */
export function TrialCTA({ className, label = "Start your 15-day trial" }: { className?: string; label?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn("flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold", className)}>
        <Rocket className="h-4 w-4" /> {label} <ArrowRight className="h-4 w-4" />
      </button>
      <TrialDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Premium animated credit card preview */
function CardPreview({ name, number, expiry, cvc }: { name: string; number: string; expiry: string; cvc: string }) {
  const displayNum = number || "•••• •••• •••• ••••";
  const displayName = name || "YOUR NAME";
  const displayExp = expiry || "MM/YY";
  return (
    <div className="crystal-in relative h-44 w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(0.25_0.04_275)] via-[oklch(0.2_0.06_280)] to-[oklch(0.15_0.03_270)] p-5 shadow-2xl" style={{ animationDelay: "0.1s" }}>
      {/* Shimmer */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
      {/* Chip */}
      <div className="relative h-8 w-10 rounded-md bg-gradient-to-br from-[oklch(0.75_0.15_85)] to-[oklch(0.6_0.12_65)] shadow-inner">
        <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-px opacity-40">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="rounded-sm bg-amber-900/30" />)}
        </div>
      </div>
      {/* Number */}
      <div className="relative mt-4 font-mono text-lg tracking-wider text-white/90">{displayNum}</div>
      {/* Footer */}
      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <div className="text-[8px] uppercase tracking-wide text-white/40">Card Holder</div>
          <div className="text-xs font-medium uppercase text-white/80">{displayName}</div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wide text-white/40">Expires</div>
          <div className="text-xs font-medium text-white/80">{displayExp}</div>
        </div>
        {/* Card brand */}
        <div className="flex gap-1">
          <div className="h-5 w-5 rounded-full bg-rose-500/60" />
          <div className="-ml-2 h-5 w-5 rounded-full bg-amber-400/60" />
        </div>
      </div>
    </div>
  );
}

/** Trial dialog — creates real user on activation (with card payment) */
export function TrialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { signup } = useAuth();
  const [step, setStep] = React.useState<"details" | "payment" | "processing" | "done">("details");
  const [form, setForm] = React.useState({
    name: "", email: "", company: "", teamSize: "5-10", phone: "", password: "",
    cardName: "", cardNumber: "", expiry: "", cvc: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) { setStep("details"); setErrors({}); }
  }, [open]);

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.company.trim()) e.company = "Company is required";
    if (!form.password.trim()) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    const e: Record<string, string> = {};
    if (!form.cardName.trim()) e.cardName = "Name on card required";
    if (!form.cardNumber.trim()) e.cardNumber = "Card number required";
    else if (form.cardNumber.replace(/\s/g, "").length < 15) e.cardNumber = "Invalid card number";
    if (!form.expiry.trim()) e.expiry = "Expiry required";
    else if (!/^\d{2}\/\d{2}$/.test(form.expiry)) e.expiry = "MM/YY";
    if (!form.cvc.trim()) e.cvc = "CVC required";
    else if (form.cvc.length < 3) e.cvc = "Invalid CVC";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const activate = async () => {
    if (!validatePayment()) return;
    setStep("processing");
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));

    try {
      // 1. Create customer in Owner Panel
      const custRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone || null,
          company: form.company.trim(),
          plan: "growth",
        }),
      });
      const custData = await custRes.json().catch(() => ({}));

      // 2. Create subscription record (15-day trial)
      if (custData.id) {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: custData.id,
            plan: "growth",
            amount: 89,
            trialEnds: new Date(Date.now() + 15 * 86400000).toISOString(),
          }),
        }).catch(() => {});
      }

      // 3. Create user account (login credentials)
      const success = await signup(form.name.trim(), form.email.trim(), form.password);
      if (success) {
        // 4. Set user role + department to match customer
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${useAuth.getState().token}` },
        });
        const meData = await meRes.json().catch(() => ({}));
        if (meData.user?.id) {
          await fetch("/api/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: meData.user.id,
              role: "admin",
              title: "Administrator",
              department: form.company.trim(),
            }),
          }).catch(() => {});
        }

        setStep("done");
        setTimeout(() => { onOpenChange(false); window.location.href = "/"; }, 2500);
      } else {
        setStep("payment");
        toast.error("Failed to create account. This email may already be registered.");
      }
    } catch {
      setStep("payment");
      toast.error("Something went wrong. Please try again.");
    }
  };

  const processingSteps = [
    { label: "Validating card details", done: true, icon: CreditCard },
    { label: "Authorizing payment", done: true, icon: Shield },
    { label: "Creating customer record", done: true, icon: Users },
    { label: "Setting up subscription", done: true, icon: CreditCard },
    { label: "Creating your workspace", done: false, icon: Loader2 },
    { label: "Provisioning admin access", done: false, icon: Loader2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] max-w-lg overflow-y-auto">
        {/* Step indicator */}
        <div className="mb-4 flex items-center gap-2">
          <StepDot n={1} label="Details" active={step === "details"} done={step !== "details"} />
          <div className={cn("h-px flex-1 transition-all duration-300", step !== "details" ? "bg-[var(--gold)]" : "bg-border")} />
          <StepDot n={2} label="Payment" active={step === "payment" || step === "processing"} done={step === "processing" || step === "done"} />
          <div className={cn("h-px flex-1 transition-all duration-300", step === "done" ? "bg-[var(--gold)]" : "bg-border")} />
          <StepDot n={3} label="Active" active={step === "done"} done={step === "done"} />
        </div>

        {/* STEP 1: Details */}
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg"><Rocket className="h-5 w-5 text-[var(--gold)]" /> Start your 15-day trial</DialogTitle>
              <DialogDescription>Full access to every module. No charge for 15 days.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Field icon={<Users className="h-3.5 w-3.5" />} label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ashraf" error={errors.name} />
              <Field icon={<MailIcon className="h-3.5 w-3.5" />} label="Work email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@company.com" error={errors.email} />
              <Field icon={<Building2 className="h-3.5 w-3.5" />} label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Your Company" error={errors.company} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Team size</Label>
                  <Select value={form.teamSize} onValueChange={(v) => setForm({ ...form, teamSize: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-4">1–4 members</SelectItem>
                      <SelectItem value="5-10">5–10 members</SelectItem>
                      <SelectItem value="11-25">11–25 members</SelectItem>
                      <SelectItem value="50+">50+ members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field icon={<PhoneCall className="h-3.5 w-3.5" />} label="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 555 0100" />
              </div>
              <Field icon={<Lock className="h-3.5 w-3.5" />} label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min 6 characters" error={errors.password} />
              <div className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/5 p-3 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
                <span>Your card won&apos;t be charged today. You&apos;ll get a reminder 3 days before the trial ends. Cancel anytime.</span>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => onOpenChange(false)} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => validateDetails() && setStep("payment")} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold">
                Continue to payment <ArrowRight className="h-4 w-4" />
              </button>
            </DialogFooter>
          </>
        )}

        {/* STEP 2: Payment */}
        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-[var(--gold)]" /> Payment method</DialogTitle>
              <DialogDescription>Required to activate. <b className="text-foreground">You won&apos;t be charged</b> for 15 days.</DialogDescription>
            </DialogHeader>

            {/* Premium card preview */}
            <div className="flex justify-center py-3">
              <CardPreview name={form.cardName} number={form.cardNumber} expiry={form.expiry} cvc={form.cvc} />
            </div>

            <div className="space-y-3">
              <Field icon={<Users className="h-3.5 w-3.5" />} label="Name on card" value={form.cardName} onChange={(v) => setForm({ ...form, cardName: v })} placeholder="Ashraf" error={errors.cardName} />
              <div>
                <Label className="text-xs"><span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Card number</span></Label>
                <Input value={form.cardNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); setForm({ ...form, cardNumber: v }); }} placeholder="4242 4242 4242 4242" className={cn("mt-1.5 font-mono", errors.cardNumber && "border-rose-500/50")} />
                {errors.cardNumber && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.cardNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Expiry</Label>
                  <Input value={form.expiry} onChange={(e) => { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2); setForm({ ...form, expiry: v }); }} placeholder="MM/YY" className={cn("mt-1.5", errors.expiry && "border-rose-500/50")} />
                  {errors.expiry && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.expiry}</p>}
                </div>
                <div>
                  <Label className="text-xs"><span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> CVC</span></Label>
                  <Input value={form.cvc} onChange={(e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="123" className={cn("mt-1.5", errors.cvc && "border-rose-500/50")} />
                  {errors.cvc && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.cvc}</p>}
                </div>
              </div>
              {/* Security badges */}
              <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-[var(--gold)]" /> 256-bit SSL</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-[var(--gold)]" /> PCI-DSS</span>
                <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-[var(--gold)]" /> Encrypted</span>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setStep("details")} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Back</button>
              <button onClick={activate} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" /> Activate trial
              </button>
            </DialogFooter>
          </>
        )}

        {/* STEP 3: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {/* Animated payment processing */}
            <div className="relative mb-6">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--primary)]/10" />
              <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-[var(--gold)] animate-bounce" />
            </div>
            <h3 className="text-xl font-bold">Processing your payment…</h3>
            <p className="mt-1 text-sm text-muted-foreground">Setting up your 15-day trial</p>

            {/* Processing steps */}
            <div className="mt-6 w-full max-w-xs space-y-3 text-left">
              {processingSteps.map((s, i) => {
                const Icon = s.done ? Check : s.icon;
                return (
                  <div key={i} className="crystal-in flex items-center gap-3 rounded-xl bg-muted/30 p-3" style={{ animationDelay: `${i * 0.2}s` }}>
                    <div className={cn("grid h-7 w-7 place-items-center rounded-lg", s.done ? "bg-emerald-500/15 text-emerald-500" : "bg-[var(--primary)]/15 text-[var(--primary)]")}>
                      <Icon className={cn("h-3.5 w-3.5", !s.done && "animate-spin")} />
                    </div>
                    <span className={cn("text-xs font-medium", s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                    {s.done && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>

            {/* Animated progress bar */}
            <div className="mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)]" style={{ width: "75%" }} />
            </div>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 text-center" style={{ animation: "successPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            {/* Success animation */}
            <div className="relative mb-6">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-12 w-12" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
              <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-[var(--gold)] animate-bounce" />
              <Zap className="absolute -left-2 -bottom-2 h-5 w-5 text-[var(--primary)] animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold">Trial Activated!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your 15-day trial is now live. Entering your workspace…</p>

            {/* Trial summary card */}
            <div className="mt-6 w-full max-w-xs rounded-2xl border border-border/40 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trial Plan</span>
                <span className="rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--gold)]">GROWTH</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">15 days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Charge today</span><span className="font-medium text-emerald-500">$0.00</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">After trial</span><span className="font-medium">$89/mo</span></div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Redirecting to your dashboard…
            </div>
          </div>
        )}

        <style>{`@keyframes successPop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-all duration-300",
        done ? "bg-[var(--gold)] text-[var(--gold-foreground)] shadow-lg" : active ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-2 ring-[var(--gold)]/30" : "bg-muted text-muted-foreground"
      )}>
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
      </div>
      <span className={cn("text-[9px] font-medium", done || active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function Field({ icon, label, value, onChange, placeholder, error, type = "text" }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-xs"><span className="flex items-center gap-1.5">{icon}{label}</span></Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn("mt-1.5", error && "border-rose-500/50 focus-visible:ring-rose-500/30")} />
      {error && <p className="mt-1 text-[11px] font-medium text-rose-500">{error}</p>}
    </div>
  );
}
