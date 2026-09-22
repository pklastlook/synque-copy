"use client";

import * as React from "react";
import { ArrowRight, ShieldCheck, Check, Rocket } from "lucide-react";
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
import { Lock, Mail as MailIcon, Users, Building2, PhoneCall, CreditCard, Loader2 } from "lucide-react";
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
          <p className="mt-2 text-xs text-muted-foreground">Social, Simplified. The enterprise command center for modern social teams.</p>
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
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">Company</div>
          <ul className="mt-3 space-y-2">
            <li><Link href="/about" className="text-xs text-muted-foreground transition hover:text-foreground">About</Link></li>
            <li><a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">Blog</a></li>
            <li><a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">Resources</div>
          <ul className="mt-3 space-y-2">
            <li><a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">Documentation</a></li>
            <li><a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">Help Center</a></li>
            <li><a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">Status</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
        <span>© 2026 SocialFlow · Social, Simplified</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Security</a>
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

/** Trial dialog — creates real user on activation (with card payment) */
export function TrialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { signup } = useAuth();
  const [step, setStep] = React.useState<"details" | "payment" | "activating" | "done">("details");
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
    setStep("activating");
    const success = await signup(form.name.trim(), form.email.trim(), form.password);
    if (success) {
      setStep("done");
      setTimeout(() => { onOpenChange(false); window.location.href = "/"; }, 1500);
    } else {
      setStep("payment");
      toast.error("Failed to create account. This email may already be registered.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] max-w-lg overflow-y-auto">
        <div className="mb-2 flex items-center gap-2">
          <StepDot n={1} active={step === "details"} done={step !== "details"} />
          <div className={cn("h-px flex-1 transition", step !== "details" ? "bg-[var(--gold)]" : "bg-border")} />
          <StepDot n={2} active={step === "payment" || step === "activating"} done={step === "activating" || step === "done"} />
          <div className={cn("h-px flex-1 transition", step === "done" ? "bg-[var(--gold)]" : "bg-border")} />
          <StepDot n={3} active={step === "done"} done={step === "done"} />
        </div>

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
                <span>Your card won&apos;t be charged today. Cancel anytime.</span>
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

        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-[var(--gold)]" /> Add a payment method</DialogTitle>
              <DialogDescription>Required to activate. <b className="text-foreground">You won&apos;t be charged</b> for 15 days.</DialogDescription>
            </DialogHeader>
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
            </div>
            <DialogFooter>
              <button onClick={() => setStep("details")} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Back</button>
              <button onClick={activate} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" /> Activate trial
              </button>
            </DialogFooter>
          </>
        )}

        {step === "activating" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--gold)]" />
            <h3 className="mt-5 text-lg font-semibold">Activating your trial…</h3>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
            </div>
            <h3 className="text-xl font-bold">Trial activated! Welcome to SocialFlow.</h3>
            <p className="mt-1 text-sm text-muted-foreground">Entering your workspace…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition",
      done ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : active ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-2 ring-[var(--gold)]/30" : "bg-muted text-muted-foreground"
    )}>
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
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
