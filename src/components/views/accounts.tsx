"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Eye,
  TrendingUp,
  Heart,
  Plus,
  ArrowRight,
  Settings2,
  ShieldCheck,
  Sparkles,
  Loader2,
  Check,
  ArrowLeft,
  KeyRound,
  Lock,
  Mail,
  AtSign,
  Building2,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard } from "@/components/glass/glass-card";
import {
  PlatformBadge,
  PlatformPill,
  VerifiedTick,
} from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PLATFORMS, PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AccountData {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  followers: number;
  verified: boolean;
  ownerName: string;
  ownerColor: string | null;
  postsCount: number;
  followerGrowth: number;
  impressions: number;
  engagement: number;
}

/** Build a tiny sparkline dataset deterministically from the account id. */
function buildSpark(id: string, growth: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  const points = 12;
  const base = 50 + (Math.abs(h) % 30);
  const arr: { i: number; v: number }[] = [];
  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i + h) * 0.7) * 12 + Math.cos((i + h) * 0.4) * 6;
    const trend = (i / points) * (growth > 0 ? 30 : -10);
    arr.push({ i, v: Math.max(2, base + wave + trend) });
  }
  return arr;
}

export function AccountsView() {
  const { data, loading, reload } = useApi<AccountData[]>("/api/accounts");
  const [filter, setFilter] = React.useState<"all" | PlatformId>("all");
  const [connectOpen, setConnectOpen] = React.useState(false);

  if (loading || !data) return <AccountsSkeleton />;

  const sorted = [...data].sort((a, b) => b.followers - a.followers);

  const totalAccounts = sorted.length;
  const totalFollowers = sorted.reduce((s, a) => s + a.followers, 0);
  const totalImpressions = sorted.reduce((s, a) => s + a.impressions, 0);
  const avgGrowth =
    totalAccounts > 0
      ? Math.round(sorted.reduce((s, a) => s + a.followerGrowth, 0) / totalAccounts)
      : 0;

  const presentPlatforms = Array.from(
    new Set(sorted.map((a) => a.platform))
  ) as PlatformId[];

  const filtered = filter === "all" ? sorted : sorted.filter((a) => a.platform === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard
        strong
        className="glass-sheen animate-rise relative overflow-hidden p-6"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                <span>Accounts</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Connected social profiles
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {totalAccounts} accounts · {presentPlatforms.length} platforms
              </p>
            </div>
          </div>
          <button
            onClick={() => setConnectOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Connect account
          </button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-rise">
        <KpiCard
          label="Total accounts"
          value={totalAccounts}
          icon={<Users className="h-5 w-5" />}
          accent="oklch(0.7 0.24 14)"
          hint={`${presentPlatforms.length} platforms`}
        />
        <KpiCard
          label="Total followers"
          value={fmt(totalFollowers)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="all accounts combined"
        />
        <KpiCard
          label="Impressions"
          value={fmt(totalImpressions)}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="all time"
        />
        <KpiCard
          label="Avg. growth"
          value={fmt(avgGrowth)}
          icon={<Heart className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="followers per account"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 animate-rise">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={sorted.length}
        />
        {presentPlatforms.map((p) => (
          <FilterPill
            key={p}
            active={filter === p}
            onClick={() => setFilter(p)}
            label={PLATFORMS[p].name}
            count={sorted.filter((a) => a.platform === p).length}
            platform={p}
          />
        ))}
      </div>

      {/* Account grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-rise">
        {filtered.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
        {/* Add-account placeholder to fill grid gaps */}
        <button
          onClick={() => setConnectOpen(true)}
          className="lift-hover group flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/50 bg-muted/20 p-6 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/50 transition group-hover:bg-primary/10">
            <Plus className="h-6 w-6" />
          </div>
          <div className="text-sm font-semibold">Connect another account</div>
          <div className="text-xs text-muted-foreground">Add a new social profile</div>
        </button>
      </div>

      {/* Connect dialog — premium multi-step credentials flow */}
      <ConnectAccountDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={() => {
          setConnectOpen(false);
          reload();
        }}
      />
    </div>
  );
}

/* ===================== Connect Account Dialog (multi-step) ===================== */

type Step = "platform" | "credentials" | "connecting" | "success";

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onConnected: () => void;
}

function ConnectAccountDialog({ open, onOpenChange, onConnected }: ConnectAccountDialogProps) {
  const [step, setStep] = React.useState<Step>("platform");
  const [platform, setPlatform] = React.useState<PlatformId | null>(null);
  const [form, setForm] = React.useState({
    handle: "",
    displayName: "",
    loginEmail: "",
    password: "",
    apiToken: "",
    businessAccount: true,
    ownerId: "u-admin",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("platform");
        setPlatform(null);
        setForm({
          handle: "",
          displayName: "",
          loginEmail: "",
          password: "",
          apiToken: "",
          businessAccount: true,
          ownerId: "u-admin",
        });
        setErrors({});
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const p = platform ? PLATFORMS[platform] : null;

  const pickPlatform = (id: PlatformId) => {
    setPlatform(id);
    setStep("credentials");
    // prefill handle hint
    const plat = PLATFORMS[id];
    setForm((f) => ({ ...f, handle: f.handle || `@yourbrand` , displayName: f.displayName || "Your Brand" }));
    void plat;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.handle.trim()) e.handle = "Handle is required";
    else if (!form.handle.startsWith("@")) e.handle = "Handle must start with @";
    if (!form.displayName.trim()) e.displayName = "Display name is required";
    if (!form.loginEmail.trim()) e.loginEmail = "Login email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.loginEmail)) e.loginEmail = "Invalid email format";
    if (!form.password.trim()) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const connect = async () => {
    if (!validate() || !platform) return;
    setStep("connecting");
    // Simulate the OAuth/credential verification + account fetch
    await new Promise((r) => setTimeout(r, 2200));
    // Persist the new account via API
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: form.handle,
          displayName: form.displayName,
          loginEmail: form.loginEmail,
          businessAccount: form.businessAccount,
          ownerId: form.ownerId,
        }),
      });
      if (res.ok) {
        setStep("success");
        setTimeout(() => onConnected(), 1400);
      } else {
        toast.error("Failed to connect account");
        setStep("credentials");
      }
    } catch {
      toast.error("Network error");
      setStep("credentials");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-1">
          <StepDot active={step !== "platform" || true} done={step !== "platform"} label="1" />
          <div className={cn("h-px flex-1 transition", step !== "platform" ? "bg-primary" : "bg-border")} />
          <StepDot active={step === "credentials" || step === "connecting" || step === "success"} done={step === "connecting" || step === "success"} label="2" />
          <div className={cn("h-px flex-1 transition", step === "success" ? "bg-primary" : "bg-border")} />
          <StepDot active={step === "success"} done={step === "success"} label="3" />
        </div>

        {/* STEP 1 — platform picker */}
        {step === "platform" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary" />
                Connect a new account
              </DialogTitle>
              <DialogDescription>
                Choose a platform. You&apos;ll enter your credentials on the next step.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PLATFORM_LIST.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickPlatform(p.id)}
                  className="lift-hover group flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-4 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="transition group-hover:scale-110">
                    <PlatformBadge platform={p.id} size={44} />
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — credentials */}
        {step === "credentials" && p && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <button
                  onClick={() => setStep("platform")}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted/60 hover:bg-muted"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <PlatformBadge platform={platform!} size={28} />
                Connect {p.name}
              </DialogTitle>
              <DialogDescription>
                Enter your {p.name} account credentials. We use secure encryption — your password is never stored in plain text.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Handle + display name */}
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  icon={<AtSign className="h-3.5 w-3.5" />}
                  label={`${p.name} handle`}
                  value={form.handle}
                  onChange={(v) => setForm({ ...form, handle: v })}
                  placeholder="@yourbrand"
                  error={errors.handle}
                  hint={`e.g. @prism.studio`}
                />
                <FormField
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Display name"
                  value={form.displayName}
                  onChange={(v) => setForm({ ...form, displayName: v })}
                  placeholder="Prism Studio"
                  error={errors.displayName}
                />
              </div>

              {/* Login credentials */}
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-3.5">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lock className="h-3 w-3" /> Login credentials
                </div>
                <div className="space-y-3">
                  <FormField
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label="Login email or username"
                    value={form.loginEmail}
                    onChange={(v) => setForm({ ...form, loginEmail: v })}
                    placeholder="you@brand.com"
                    error={errors.loginEmail}
                  />
                  <FormField
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={(v) => setForm({ ...form, password: v })}
                    placeholder="••••••••"
                    error={errors.password}
                  />
                </div>
              </div>

              {/* API token (optional) */}
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-3.5">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <KeyRound className="h-3 w-3" /> API access token
                    <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-medium normal-case text-muted-foreground">optional</span>
                  </div>
                </div>
                <Input
                  value={form.apiToken}
                  onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                  placeholder="paste your developer API token"
                  className="font-mono text-xs"
                />
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  Adding an API token unlocks advanced analytics, automated posting, and deeper insights.{" "}
                  <button className="font-medium text-primary hover:underline">How to get a {p.name} API token →</button>
                </p>
              </div>

              {/* Business account toggle */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Business / Creator account</div>
                    <div className="text-[11px] text-muted-foreground">Enables insights, ads, and scheduling features</div>
                  </div>
                </div>
                <Switch
                  checked={form.businessAccount}
                  onCheckedChange={(v) => setForm({ ...form, businessAccount: v })}
                />
              </div>

              {/* Owner assignment */}
              <div>
                <Label className="text-xs font-medium">Assign to team member</Label>
                <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="u-admin">Maya Reyes (Admin)</SelectItem>
                    <SelectItem value="u-1">Daniel Cho</SelectItem>
                    <SelectItem value="u-2">Priya Nair</SelectItem>
                    <SelectItem value="u-3">Leo Marchetti</SelectItem>
                    <SelectItem value="u-4">Sara Okafor</SelectItem>
                    <SelectItem value="u-5">Tom Becker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-[11px] text-muted-foreground">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Credentials are encrypted at rest (AES-256). Prism never shares or exposes your login. You can revoke access anytime from account settings.</span>
              </div>
            </div>

            <DialogFooter>
              <button onClick={() => setStep("platform")} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">
                Back
              </button>
              <button
                onClick={connect}
                className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold"
              >
                <Zap className="h-4 w-4" />
                Connect {p.name}
              </button>
            </DialogFooter>
          </>
        )}

        {/* STEP 3 — connecting */}
        {step === "connecting" && p && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-6">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.66_0.22_305)] text-white shadow-xl">
                <PlatformBadge platform={platform!} size={44} />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 h-8 w-8 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Connecting to {p.name}…</h3>
            <p className="mt-1 text-sm text-muted-foreground">Verifying credentials and fetching profile data</p>
            <div className="mt-5 space-y-2 text-left">
              <ConnectingStep label="Authenticating credentials" done />
              <ConnectingStep label="Fetching profile info" />
              <ConnectingStep label="Syncing analytics" pending />
            </div>
          </div>
        )}

        {/* STEP 4 — success */}
        {step === "success" && p && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-5">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
            </div>
            <h3 className="text-xl font-bold">{form.displayName} connected!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.handle} on {p.name} is now live in your workspace.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Credentials encrypted · {form.businessAccount ? "Business account" : "Personal account"}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition",
        done
          ? "bg-primary text-primary-foreground"
          : active
          ? "bg-primary/15 text-primary ring-2 ring-primary/30"
          : "bg-muted text-muted-foreground"
      )}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : label}
    </div>
  );
}

function ConnectingStep({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : pending ? (
        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      )}
      <span className={cn(done ? "text-foreground" : pending ? "text-muted-foreground/60" : "text-foreground")}>
        {label}
      </span>
    </div>
  );
}

function FormField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-medium">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("mt-1.5", error && "border-rose-500/50 focus-visible:ring-rose-500/30")}
      />
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ===================== Filter pill ===================== */
function FilterPill({
  active,
  onClick,
  label,
  count,
  platform,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  platform?: PlatformId;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition",
        active
          ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
          : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {platform && <PlatformBadge platform={platform} size={18} />}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted-foreground/15 text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ===================== Account card ===================== */
function AccountCard({ account }: { account: AccountData }) {
  const { setView } = useNav();
  const spark = React.useMemo(
    () => buildSpark(account.id, account.followerGrowth),
    [account.id, account.followerGrowth]
  );
  const growthUp = account.followerGrowth >= 0;
  const platform = PLATFORMS[account.platform];

  return (
    <GlassCard
      hover
      className="glass-sheen lift-hover group relative flex flex-col overflow-hidden p-6"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-[0.12] blur-2xl transition group-hover:opacity-25"
        style={{ background: platform.color }}
      />
      {/* Top: platform + name */}
      <div className="relative flex items-start gap-3">
        <div className="relative">
          <PlatformBadge platform={account.platform} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-lg font-bold leading-tight">
              {account.displayName}
            </h3>
            {account.verified && (
              <VerifiedTick className="h-4 w-4 shrink-0 text-primary" />
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {account.handle}
          </div>
          {/* Owner — muted secondary */}
          <div className="mt-1.5 flex items-center gap-1.5 opacity-60">
            <NameAvatar
              name={account.ownerName}
              color={account.ownerColor}
              className="h-4 w-4 text-[8px]"
            />
            <span className="text-[11px] text-muted-foreground">{account.ownerName}</span>
          </div>
        </div>
      </div>

      {/* Big follower stat + sparkline */}
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="num-display text-3xl font-semibold leading-none tracking-tight">
            {fmt(account.followers)}
          </div>
          <div className="label-caps mt-1.5 text-muted-foreground">Followers</div>
        </div>
        <div className="h-12 w-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={growthUp ? "oklch(0.76 0.18 145)" : "oklch(0.62 0.24 27)"}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={growthUp ? "oklch(0.76 0.18 145)" : "oklch(0.62 0.24 27)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={growthUp ? "oklch(0.76 0.18 145)" : "oklch(0.62 0.24 27)"}
                strokeWidth={2}
                fill={`url(#spark-${account.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth delta */}
      <div className="relative mt-2 flex items-center gap-1.5 text-[11px]">
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
            growthUp
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-rose-500/15 text-rose-500"
          )}
        >
          {growthUp ? "↑" : "↓"} {fmt(Math.abs(account.followerGrowth))}
        </span>
        <span className="text-muted-foreground">growth</span>
      </div>

      {/* Stat grid — decluttered, no boxes */}
      <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
        <Stat label="Posts" value={fmt(account.postsCount)} />
        <Stat label="Impressions" value={fmt(account.impressions)} />
        <Stat label="Engagement" value={fmt(account.engagement)} />
      </div>

      {/* Footer actions */}
      <div className="relative mt-4 flex items-center gap-2">
        <button
          onClick={() => setView("analytics")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          View analytics <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => toast.message(`Manage ${account.displayName}`)}
          className="grid h-9 w-9 place-items-center rounded-xl bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Manage"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="num-display text-base font-semibold tabular-nums">{value}</div>
      <div className="label-caps mt-0.5 text-muted-foreground">{label}</div>
    </div>
  );
}

function AccountsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shimmer h-9 w-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-80 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
