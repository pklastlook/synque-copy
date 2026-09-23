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
  Lock,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Search,
  Activity,
  AlertTriangle,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Flag,
  Gauge,
  Clock,
  MessageSquare,
  UserPlus,
  Repeat,
  Hash,
  Pause,
  Snowflake,
  Trash2,
  Image as ImageIcon,
  BarChart3,
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
import { useAuth } from "@/lib/auth-store";
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

interface HealthData {
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalComments: number;
  positiveRatio: number;
  neutralRatio: number;
  negativeRatio: number;
  reportCount: number;
  reportTrend: number;
  riskScore: number;
  riskLevel: "safe" | "moderate" | "elevated" | "high" | "critical";
  status: "healthy" | "warning" | "restricted" | "suspended";
  riskReasons: string[];
  lastUpdated: string;
}

interface ProtectionData {
  enabled: boolean;
  dailyPostLimit: number;
  hourlyPostLimit: number;
  minMinutesBetweenPosts: number;
  autoFlagSensitiveContent: boolean;
  blockDuplicateContent: boolean;
  blockBannedHashtags: boolean;
  bannedHashtags: string | null;
  enforceWarmupProfile: boolean;
  limitDMsPerHour: number;
  limitFollowsPerHour: number;
  limitCommentsPerHour: number;
  pausePostingOnWarning: boolean;
  cooldownHoursOnFlag: number;
  requireTwoFactor: boolean;
  lastAudit: string | null;
}

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
  health: HealthData | null;
  protection: ProtectionData | null;
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

type Step = "platform" | "detecting" | "permission" | "connecting" | "success";

/** A browser session detected for a given platform — simulates the
 *  "you're already signed in as @handle" UX that real OAuth provides. */
interface DetectedSession {
  handle: string;
  displayName: string;
  avatar: string;
  followers: number;
  verified: boolean;
  isBusiness: boolean;
}

/**
 * Plausible signed-in sessions per platform. In a real deployment these
 * would come from the platform's OAuth identity provider after the user
 * approves the connect popup. For the in-app demo we surface a realistic
 * "already signed in" set so the user just grants permission — no manual
 * credential entry.
 */
const PLATFORM_SESSIONS: Record<PlatformId, DetectedSession[]> = {
  instagram: [
    { handle: "@prism.studio", displayName: "Prism Studio", avatar: "", followers: 24800, verified: true, isBusiness: true },
    { handle: "@ashraf.creator", displayName: "Ashraf", avatar: "", followers: 1240, verified: false, isBusiness: false },
  ],
  facebook: [
    { handle: "Prism Studio", displayName: "Prism Studio", avatar: "", followers: 18200, verified: true, isBusiness: true },
  ],
  x: [
    { handle: "@testclient", displayName: "Test Client", avatar: "", followers: 5400, verified: false, isBusiness: false },
    { handle: "@prism_social", displayName: "Prism Social", avatar: "", followers: 31200, verified: true, isBusiness: true },
  ],
  linkedin: [
    { handle: "Prism Studio", displayName: "Prism Studio", avatar: "", followers: 8900, verified: true, isBusiness: true },
  ],
  tiktok: [
    { handle: "@prismstudio", displayName: "Prism Studio", avatar: "", followers: 156000, verified: true, isBusiness: true },
  ],
  youtube: [
    { handle: "@PrismStudio", displayName: "Prism Studio", avatar: "", followers: 42300, verified: true, isBusiness: true },
  ],
  threads: [
    { handle: "@prism.studio", displayName: "Prism Studio", avatar: "", followers: 7600, verified: false, isBusiness: false },
  ],
};

/** OAuth-style permission scopes shown on the grant step. */
const PERMISSION_SCOPES: { icon: React.ElementType; label: string; desc: string }[] = [
  { icon: Eye, label: "Read profile", desc: "Handle, name, avatar & follower count" },
  { icon: ImageIcon, label: "Publish posts", desc: "Schedule & publish on your behalf" },
  { icon: BarChart3, label: "Read insights", desc: "Reach, impressions & engagement metrics" },
];

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onConnected: () => void;
}

function ConnectAccountDialog({ open, onOpenChange, onConnected }: ConnectAccountDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = React.useState<Step>("platform");
  const [platform, setPlatform] = React.useState<PlatformId | null>(null);
  const [sessions, setSessions] = React.useState<DetectedSession[]>([]);
  const [selected, setSelected] = React.useState<DetectedSession | null>(null);

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("platform");
        setPlatform(null);
        setSessions([]);
        setSelected(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const p = platform ? PLATFORMS[platform] : null;

  /** Pick a platform → scan the browser for signed-in sessions. */
  const pickPlatform = (id: PlatformId) => {
    setPlatform(id);
    setStep("detecting");
    setSelected(null);
    // Simulate the OAuth identity probe (~1.4s) — checking the browser's
    // active login sessions (cookies) for this platform.
    setTimeout(() => {
      setSessions(PLATFORM_SESSIONS[id] ?? []);
      setStep("permission");
    }, 1400);
  };

  /** Grant permission → POST the account to the API. */
  const grantPermission = async () => {
    if (!platform || !selected) return;
    if (!user?.id) {
      toast.error("Sign in to connect an account");
      return;
    }
    setStep("connecting");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: selected.handle,
          displayName: selected.displayName,
          loginEmail: null,
          businessAccount: selected.isBusiness,
          ownerId: user.id,
        }),
      });
      if (res.ok) {
        setStep("success");
        setTimeout(() => onConnected(), 1500);
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to connect account");
        setStep("permission");
      }
    } catch {
      toast.error("Network error");
      setStep("permission");
    }
  };

  /** Step labels for the indicator — gives users context on where they are. */
  const stepLabels = ["Choose", "Grant", "Done"];
  const currentStepIndex = step === "platform" ? 0 : step === "detecting" || step === "permission" ? 1 : 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] overflow-y-auto sm:max-w-[520px]">
        {/* Step indicator — labeled dots with connector lines */}
        <div className="flex items-center gap-2 pb-3">
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition-all duration-300",
                    i < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === currentStepIndex
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < currentStepIndex ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wide transition",
                    i === currentStepIndex ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {stepLabels[i]}
                </span>
              </div>
              {i < 2 && (
                <div className={cn("h-px flex-1 transition-all duration-300", i < currentStepIndex ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ================================================================
            STEP 1 — platform picker
            ================================================================ */}
        {step === "platform" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary" />
                Connect a new account
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                Choose a platform. We&apos;ll scan your browser for existing
                sign-in sessions — no passwords to type.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PLATFORM_LIST.map((plat) => (
                <button
                  key={plat.id}
                  onClick={() => pickPlatform(plat.id)}
                  className="lift-hover group flex flex-col items-center gap-2.5 rounded-2xl border border-border/50 bg-card p-4 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="transition-transform duration-200 group-hover:scale-110">
                    <PlatformBadge platform={plat.id} size={42} />
                  </div>
                  <span className="text-sm font-semibold">{plat.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="font-semibold text-foreground">Official OAuth.</strong>{" "}
                We never see or store your password. You can revoke access anytime
                from account settings.
              </span>
            </div>
          </>
        )}

        {/* ================================================================
            STEP 2a — scanning the browser for signed-in sessions
            ================================================================ */}
        {step === "detecting" && p && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-6">
              {/* Pulsing radar rings behind the platform icon */}
              <div className="absolute inset-0 -m-4">
                <div className="absolute inset-0 animate-ping rounded-3xl bg-primary/10" />
                <div className="absolute inset-0 animate-ping rounded-3xl bg-primary/10 [animation-delay:0.4s]" />
              </div>
              <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-[var(--gold)] text-white shadow-xl">
                <PlatformBadge platform={platform!} size={44} />
              </div>
            </div>

            <h3 className="text-lg font-bold">Scanning your browser…</h3>
            <p className="mt-1.5 max-w-xs text-[13px] text-muted-foreground">
              Looking for {p.name} accounts you&apos;re already signed in to
              in this browser.
            </p>

            {/* Browser-scanning steps indicator */}
            <div className="mt-6 w-full max-w-xs space-y-2 text-left">
              <ScanStep icon={Globe} label="Checking browser sessions" active />
              <ScanStep icon={Search} label="Finding signed-in accounts" pending />
              <ScanStep icon={ShieldCheck} label="Secure OAuth handshake" pending />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Lock className="h-3 w-3" />
              No credentials accessed · encrypted
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2b — permission grant (OAuth-style)
            ================================================================ */}
        {step === "permission" && p && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <button
                  onClick={() => { setStep("platform"); setPlatform(null); setSessions([]); setSelected(null); }}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted/60 transition hover:bg-muted"
                  aria-label="Back to platform picker"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <PlatformBadge platform={platform!} size={28} />
                Grant {p.name} access
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                {sessions.length > 0
                  ? "We found these accounts in your browser's active sessions. Pick one to connect."
                  : "No active browser session found."}
              </DialogDescription>
            </DialogHeader>

            {sessions.length > 0 ? (
              <>
                {/* Source banner — clarifies WHERE accounts were found */}
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px]">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-muted-foreground">
                    <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {sessions.length} {sessions.length === 1 ? "account" : "accounts"}
                    </strong>{" "}
                    found from your browser · sign in to {p.name} to add more
                  </span>
                </div>

                {/* Detected sessions — selectable cards with radio indicator */}
                <div className="space-y-2">
                  {sessions.map((s) => {
                    const isSel = selected?.handle === s.handle;
                    return (
                      <button
                        key={s.handle}
                        onClick={() => setSelected(s)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-200",
                          isSel
                            ? "border-primary bg-primary/5 shadow-[0_0_0_3px_var(--ring)]"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                        )}
                      >
                        {/* Avatar — platform badge moved to a clean side label */}
                        <NameAvatar
                          name={s.displayName}
                          color="rose"
                          className={cn("h-11 w-11 shrink-0 text-sm transition", isSel && "ring-2 ring-primary/40")}
                        />

                        {/* Identity */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold">{s.displayName}</span>
                            {s.verified && <VerifiedTick className="h-3 w-3" />}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-medium">{s.handle}</span>
                            <span className="text-border">·</span>
                            <span className="flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" />
                              {fmt(s.followers)} followers
                            </span>
                          </div>
                        </div>

                        {/* Type badge */}
                        {s.isBusiness && (
                          <span className="rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--gold)]">
                            Business
                          </span>
                        )}

                        {/* Radio indicator — clear selected state */}
                        <div
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all",
                            isSel ? "border-primary bg-primary" : "border-border bg-background"
                          )}
                        >
                          {isSel && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Permission scopes — only after selection */}
                {selected && (
                  <div className="crystal-in rounded-2xl border border-border bg-muted/30 p-3.5">
                    <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      SocialFlow will be able to
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {PERMISSION_SCOPES.map((scope) => {
                        const Icon = scope.icon;
                        return (
                          <div key={scope.label} className="flex flex-col gap-1.5 rounded-xl bg-card p-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-3 w-3" />
                              </div>
                              <span className="text-[11px] font-semibold">{scope.label}</span>
                            </div>
                            <span className="text-[10px] leading-tight text-muted-foreground">{scope.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* No-session fallback — clearer path to manual connect */
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Search className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold">No active {p.name} browser session</p>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  Open {p.name} in a new tab, sign in, then come back here.
                  We&apos;ll detect it automatically.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                onClick={() => { setStep("platform"); setPlatform(null); }}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={grantPermission}
                disabled={!selected}
                className="liquid-pill glow-ring flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                <ShieldCheck className="h-4 w-4" />
                {selected ? `Allow access to ${selected.displayName}` : "Select an account"}
              </button>
            </DialogFooter>
          </>
        )}

        {/* ================================================================
            STEP 3 — connecting
            ================================================================ */}
        {step === "connecting" && p && selected && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-6">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-[var(--gold)] text-white shadow-xl">
                <PlatformBadge platform={platform!} size={44} />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 h-8 w-8 animate-spin rounded-full bg-background p-0.5 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Connecting {selected.displayName}…</h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Fetching profile & syncing analytics
            </p>
            <div className="mt-6 w-full max-w-xs space-y-2.5 text-left">
              <ConnectingStep label="Permission granted" done />
              <ConnectingStep label="Fetching profile info" />
              <ConnectingStep label="Syncing analytics" pending />
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 4 — success
            ================================================================ */}
        {step === "success" && p && selected && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-5">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
            </div>
            <h3 className="text-xl font-bold">{selected.displayName} connected!</h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {selected.handle} on {p.name} is now live in your workspace.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              OAuth access granted · {selected.isBusiness ? "Business account" : "Personal account"}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Small scanning-step row used in the "detecting" state. */
function ScanStep({
  icon: Icon,
  label,
  active,
  pending,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      </div>
      <span
        className={cn(
          "text-[12px] transition",
          active ? "font-medium text-foreground" : pending ? "text-muted-foreground/60" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {active && <div className="ml-auto h-1 w-1 animate-pulse rounded-full bg-primary" />}
    </div>
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
  const [healthOpen, setHealthOpen] = React.useState(false);
  const spark = React.useMemo(
    () => buildSpark(account.id, account.followerGrowth),
    [account.id, account.followerGrowth]
  );
  const growthUp = account.followerGrowth >= 0;
  const platform = PLATFORMS[account.platform];
  const health = account.health;

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
        </div>
        {/* Health status badge */}
        {health && <HealthBadge health={health} onClick={() => setHealthOpen(true)} />}
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

      {/* Health ratio bar — positive / neutral / negative + reports */}
      {health && <HealthRatioBar health={health} onClick={() => setHealthOpen(true)} />}

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
          onClick={() => setHealthOpen(true)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
            health && health.riskLevel !== "safe"
              ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Health
        </button>
        <button
          onClick={async () => {
            if (!confirm(`Remove ${account.displayName}? This will delete all related data.`)) return;
            try {
              const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
              if (res.ok) { toast.success(`${account.displayName} removed`); window.location.reload(); }
              else toast.error("Failed to remove account");
            } catch { toast.error("Network error"); }
          }}
          className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-500 transition hover:bg-rose-500/20"
          aria-label="Remove account"
          title="Remove account"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Account Health dialog */}
      <AccountHealthDialog
        account={account}
        open={healthOpen}
        onOpenChange={setHealthOpen}
      />
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

/* ===================== Health badge (card corner) ===================== */
const RISK_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  safe: { color: "text-emerald-500", bg: "bg-emerald-500/15", label: "Healthy" },
  moderate: { color: "text-amber-500", bg: "bg-amber-500/15", label: "Moderate" },
  elevated: { color: "text-orange-500", bg: "bg-orange-500/15", label: "Elevated" },
  high: { color: "text-rose-500", bg: "bg-rose-500/15", label: "High risk" },
  critical: { color: "text-rose-600", bg: "bg-rose-600/20", label: "Critical" },
};

function HealthBadge({ health, onClick }: { health: HealthData; onClick: () => void }) {
  const s = RISK_STYLE[health.riskLevel] ?? RISK_STYLE.safe;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition hover:scale-105",
        s.bg, s.color
      )}
      title={`Account health: ${s.label} (risk ${health.riskScore}/100)`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {health.riskLevel !== "safe" && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", s.bg)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", s.color.replace("text-", "bg-"))} />
      </span>
      {s.label}
    </button>
  );
}

/* ===================== Health ratio bar (on card) ===================== */
function HealthRatioBar({ health, onClick }: { health: HealthData; onClick: () => void }) {
  const pos = health.positiveRatio;
  const neu = health.neutralRatio;
  const neg = health.negativeRatio;
  return (
    <button
      onClick={onClick}
      className="lift-hover relative mt-4 w-full rounded-xl border border-border/30 bg-muted/20 p-3 text-left transition hover:border-border/60"
    >
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Comment health</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-500"><Flag className="h-2.5 w-2.5" />{health.reportCount} reports</span>
        </span>
      </div>
      {/* Stacked ratio bar */}
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pos}%` }} title={`Positive ${pos}%`} />
        <div className="h-full bg-muted-foreground/40 transition-all" style={{ width: `${neu}%` }} title={`Neutral ${neu}%`} />
        <div className="h-full bg-rose-500 transition-all" style={{ width: `${neg}%` }} title={`Negative ${neg}%`} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums">
        <span className="flex items-center gap-1 text-emerald-500"><ThumbsUp className="h-2.5 w-2.5" />{pos}%</span>
        <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-2.5 w-2.5" />{neu}%</span>
        <span className="flex items-center gap-1 text-rose-500"><ThumbsDown className="h-2.5 w-2.5" />{neg}%</span>
      </div>
    </button>
  );
}

/* ===================== Account Health Dialog (detail + advisor + protection) ===================== */
const RISK_REASON_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  spam_flagged: { label: "Content flagged as spam", icon: Flag },
  high_report_rate: { label: "High user-report rate", icon: AlertTriangle },
  report_rate_increasing: { label: "Report rate increasing", icon: TrendingUp },
  rising_negative_ratio: { label: "Rising negative sentiment", icon: ThumbsDown },
  high_negative_ratio: { label: "High negative comment ratio", icon: ThumbsDown },
  aggressive_engagement_detected: { label: "Aggressive engagement detected", icon: Zap },
  rapid_posting_detected: { label: "Posting too rapidly", icon: Clock },
  duplicate_content_detected: { label: "Duplicate content detected", icon: Repeat },
};

function AccountHealthDialog({
  account,
  open,
  onOpenChange,
}: {
  account: AccountData;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const health = account.health;
  const protection = account.protection;
  const platform = PLATFORMS[account.platform];
  const [tab, setTab] = React.useState<"health" | "advisor" | "protection">("health");

  if (!health) return null;
  const s = RISK_STYLE[health.riskLevel] ?? RISK_STYLE.safe;
  const riskColor =
    health.riskLevel === "safe" ? "oklch(0.76 0.18 145)" :
    health.riskLevel === "moderate" ? "oklch(0.78 0.18 75)" :
    health.riskLevel === "elevated" ? "oklch(0.7 0.19 50)" :
    "oklch(0.62 0.24 27)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] max-w-2xl overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <PlatformBadge platform={account.platform} size={32} />
            <span>{account.displayName}</span>
            <span className="text-xs font-normal text-muted-foreground">{account.handle}</span>
          </DialogTitle>
          <DialogDescription>
            Account health, suspension risk, and protection settings for {platform.name}.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-0.5">
          {[
            { id: "health" as const, label: "Health", icon: Activity },
            { id: "advisor" as const, label: "Save from suspension", icon: ShieldAlert },
            { id: "protection" as const, label: "Protection", icon: Shield },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB: Health overview */}
        {tab === "health" && (
          <div className="space-y-4">
            {/* Risk gauge */}
            <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-caps text-muted-foreground">Suspension risk</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="num-display text-4xl font-bold" style={{ color: riskColor }}>{health.riskScore}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold", s.bg, s.color)}>
                  {s.label}
                </span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${health.riskScore}%`, background: riskColor }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Safe</span><span>Moderate</span><span>Elevated</span><span>High</span><span>Critical</span>
              </div>
            </div>

            {/* Sentiment ratio — big bars */}
            <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="label-caps text-muted-foreground">Comment sentiment (30d)</div>
                <span className="text-xs text-muted-foreground">{fmt(health.totalComments)} comments</span>
              </div>
              {/* Stacked bar */}
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
                <div className="flex items-center justify-center bg-emerald-500 text-[9px] font-bold text-white transition-all" style={{ width: `${health.positiveRatio}%` }}>
                  {health.positiveRatio > 8 ? `${health.positiveRatio}%` : ""}
                </div>
                <div className="flex items-center justify-center bg-muted-foreground/40 text-[9px] font-bold text-white transition-all" style={{ width: `${health.neutralRatio}%` }}>
                  {health.neutralRatio > 8 ? `${health.neutralRatio}%` : ""}
                </div>
                <div className="flex items-center justify-center bg-rose-500 text-[9px] font-bold text-white transition-all" style={{ width: `${health.negativeRatio}%` }}>
                  {health.negativeRatio > 8 ? `${health.negativeRatio}%` : ""}
                </div>
              </div>
              {/* Legend + counts */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <SentimentStat icon={ThumbsUp} color="emerald" label="Positive" count={health.positiveCount} ratio={health.positiveRatio} />
                <SentimentStat icon={Minus} color="muted" label="Neutral" count={health.neutralCount} ratio={health.neutralRatio} />
                <SentimentStat icon={ThumbsDown} color="rose" label="Negative" count={health.negativeCount} ratio={health.negativeRatio} />
              </div>
            </div>

            {/* Reports */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Flag className="h-4 w-4" />
                  <span className="label-caps text-muted-foreground">User reports</span>
                </div>
                <div className="num-display mt-2 text-3xl font-bold">{health.reportCount}</div>
                <div className={cn("mt-1 flex items-center gap-1 text-[11px]", health.reportTrend > 0 ? "text-rose-500" : health.reportTrend < 0 ? "text-emerald-500" : "text-muted-foreground")}>
                  {health.reportTrend > 0 ? "↑" : health.reportTrend < 0 ? "↓" : "—"} {Math.abs(health.reportTrend)} vs last period
                </div>
              </div>
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span className="label-caps">Account status</span>
                </div>
                <div className={cn("mt-2 text-lg font-bold capitalize", s.color)}>{health.status}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {protection?.enabled ? "Protection active" : "Protection off"}
                </div>
              </div>
            </div>

            {/* Risk reasons */}
            {health.riskReasons.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                  <AlertTriangle className="h-4 w-4" /> Risk factors detected
                </div>
                <div className="mt-2 space-y-1.5">
                  {health.riskReasons.map((r) => {
                    const info = RISK_REASON_LABELS[r];
                    const Icon = info?.icon ?? AlertTriangle;
                    return (
                      <div key={r} className="flex items-center gap-2 text-xs text-foreground/80">
                        <Icon className="h-3.5 w-3.5 text-amber-500" />
                        {info?.label ?? r}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Save from suspension advisor */}
        {tab === "advisor" && (
          <SuspensionAdvisor account={account} onGoProtection={() => setTab("protection")} />
        )}

        {/* TAB: Protection settings */}
        {tab === "protection" && protection && (
          <ProtectionPanel accountId={account.id} initial={protection} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SentimentStat({ icon: Icon, color, label, count, ratio }: { icon: React.ElementType; color: string; label: string; count: number; ratio: number }) {
  const colorClass =
    color === "emerald" ? "text-emerald-500 bg-emerald-500/10" :
    color === "rose" ? "text-rose-500 bg-rose-500/10" :
    "text-muted-foreground bg-muted/40";
  return (
    <div className="rounded-xl bg-background/40 p-2 text-center">
      <div className={cn("mx-auto grid h-7 w-7 place-items-center rounded-lg", colorClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="num-display mt-1.5 text-sm font-bold tabular-nums">{ratio}%</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{fmt(count)}</div>
    </div>
  );
}

/* ===================== Suspension Advisor ===================== */
function SuspensionAdvisor({ account, onGoProtection }: { account: AccountData; onGoProtection: () => void }) {
  const health = account.health!;
  const tips: { title: string; desc: string; icon: React.ElementType; severity: "high" | "med" | "low" }[] = [];

  // Dynamic tips based on risk reasons + always-on best practices
  if (health.riskReasons.includes("rapid_posting_detected")) {
    tips.push({ title: "Slow down your posting cadence", desc: "Posting too frequently triggers spam detection. Increase the gap between posts to at least 30-45 minutes.", icon: Clock, severity: "high" });
  }
  if (health.riskReasons.includes("high_report_rate") || health.riskReasons.includes("report_rate_increasing")) {
    tips.push({ title: "Audit recent content for policy violations", desc: "A spike in user reports usually means a specific post crossed a line. Review and remove any borderline content immediately.", icon: Flag, severity: "high" });
  }
  if (health.riskReasons.includes("aggressive_engagement_detected")) {
    tips.push({ title: "Stop mass follow/unfollow & DM blasts", desc: "Rapid follows, unfollows, or bulk DMs are the #1 cause of suspensions. Cap manual actions and never automate them.", icon: UserPlus, severity: "high" });
  }
  if (health.riskReasons.includes("duplicate_content_detected") || health.negativeRatio > 15) {
    tips.push({ title: "Vary your content — avoid duplicates", desc: "Reposting identical captions or media is flagged as low-quality spam. Use the AI composer to generate distinct variants per account.", icon: Repeat, severity: "med" });
  }
  // Always-relevant best practices
  tips.push({ title: "Warm up new or reactivated accounts", desc: "For the first 7-14 days, post 1× per day, engage organically, and avoid links. Ramp up gradually to full cadence.", icon: Activity, severity: "med" });
  tips.push({ title: "Avoid banned/shadowbanned hashtags", desc: "Hashtags like #fyp, #like4like, #follow4follow are silently suppressed. Use the banned-hashtag blocker in Protection settings.", icon: Hash, severity: "med" });
  tips.push({ title: "Enable two-factor authentication", desc: "Compromised accounts are frequently suspended. 2FA + a strong unique password prevents takeovers.", icon: Lock, severity: "low" });
  tips.push({ title: "Respect platform cooldowns", desc: "After any warning or restriction, pause all posting for 24-48h. Continuing to post through a warning usually escalates to suspension.", icon: Pause, severity: "low" });

  const sevStyle = {
    high: { bg: "bg-rose-500/10 border-rose-500/30", color: "text-rose-500" },
    med: { bg: "bg-amber-500/10 border-amber-500/30", color: "text-amber-500" },
    low: { bg: "bg-muted/40 border-border/40", color: "text-muted-foreground" },
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-semibold">How to save this account from suspension</div>
            <div className="text-[11px] text-muted-foreground">
              {health.riskLevel === "safe"
                ? "This account is healthy. Follow the best-practice tips below to keep it safe."
                : `${tips.filter(t => t.severity === "high").length} high-priority action(s) recommended for this account.`}
            </div>
          </div>
        </div>
      </div>

      {tips.map((tip, i) => {
        const st = sevStyle[tip.severity];
        const Icon = tip.icon;
        return (
          <div key={i} className={cn("rounded-2xl border p-4", st.bg)}>
            <div className="flex items-start gap-3">
              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background/60", st.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{tip.title}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", st.color, "bg-background/60")}>
                    {tip.severity === "high" ? "Do now" : tip.severity === "med" ? "Recommended" : "Best practice"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/70">{tip.desc}</p>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={onGoProtection}
        className="liquid-pill glow-ring flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
      >
        <Shield className="h-4 w-4" /> Configure automatic protection
      </button>
    </div>
  );
}

/* ===================== Protection settings panel ===================== */
function ProtectionPanel({ accountId, initial }: { accountId: string; initial: ProtectionData }) {
  const [p, setP] = React.useState<ProtectionData>(initial);
  const [saving, setSaving] = React.useState(false);

  const update = (patch: Partial<ProtectionData>) => setP((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/protection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (res.ok) toast.success("Protection settings saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-start gap-2.5">
          <div className={cn("grid h-9 w-9 place-items-center rounded-xl", p.enabled ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground")}>
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Account protection enabled</div>
            <div className="text-[11px] text-muted-foreground">Guards below only apply when enabled</div>
          </div>
        </div>
        <Switch checked={p.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </div>

      {/* Posting cadence */}
      <ProtectionSection icon={Clock} title="Posting cadence guards" desc="Prevents the rapid-posting pattern that triggers suspensions">
        <NumberSetting label="Daily post limit" value={p.dailyPostLimit} onChange={(v) => update({ dailyPostLimit: v })} suffix="posts/day" />
        <NumberSetting label="Hourly post limit" value={p.hourlyPostLimit} onChange={(v) => update({ hourlyPostLimit: v })} suffix="posts/hour" />
        <NumberSetting label="Min. gap between posts" value={p.minMinutesBetweenPosts} onChange={(v) => update({ minMinutesBetweenPosts: v })} suffix="minutes" />
      </ProtectionSection>

      {/* Content safety */}
      <ProtectionSection icon={ShieldCheck} title="Content safety" desc="Blocks the content patterns platforms auto-flag">
        <ToggleSetting icon={AlertTriangle} label="Auto-flag sensitive content" desc="Review before publishing" checked={p.autoFlagSensitiveContent} onChange={(v) => update({ autoFlagSensitiveContent: v })} />
        <ToggleSetting icon={Repeat} label="Block duplicate content" desc="Reject identical captions/media" checked={p.blockDuplicateContent} onChange={(v) => update({ blockDuplicateContent: v })} />
        <ToggleSetting icon={Hash} label="Block banned hashtags" desc="Suppress shadowbanned tags" checked={p.blockBannedHashtags} onChange={(v) => update({ blockBannedHashtags: v })} />
        {p.blockBannedHashtags && (
          <div className="col-span-2">
            <Label className="text-xs">Banned hashtag list (comma-separated)</Label>
            <textarea
              value={p.bannedHashtags ?? ""}
              onChange={(e) => update({ bannedHashtags: e.target.value })}
              placeholder="follow4follow, like4like, fyp"
              className="mt-1.5 min-h-[60px] w-full resize-y rounded-xl border border-border/40 bg-muted/30 p-2.5 text-xs outline-none focus:border-primary/50"
            />
          </div>
        )}
      </ProtectionSection>

      {/* Behavior guards */}
      <ProtectionSection icon={UserPlus} title="Behavior guards" desc="Caps the manual actions that get accounts suspended">
        <NumberSetting label="DM limit" value={p.limitDMsPerHour} onChange={(v) => update({ limitDMsPerHour: v })} suffix="/hour" />
        <NumberSetting label="Follow limit" value={p.limitFollowsPerHour} onChange={(v) => update({ limitFollowsPerHour: v })} suffix="/hour" />
        <NumberSetting label="Comment limit" value={p.limitCommentsPerHour} onChange={(v) => update({ limitCommentsPerHour: v })} suffix="/hour" />
      </ProtectionSection>

      {/* Automation pause */}
      <ProtectionSection icon={Snowflake} title="Smart cooldown" desc="Automatically pauses posting when risk rises">
        <ToggleSetting icon={Pause} label="Pause posting on warning" desc="Halt all posts when account is flagged" checked={p.pausePostingOnWarning} onChange={(v) => update({ pausePostingOnWarning: v })} />
        <NumberSetting label="Cooldown after a flag" value={p.cooldownHoursOnFlag} onChange={(v) => update({ cooldownHoursOnFlag: v })} suffix="hours" />
        <ToggleSetting icon={Lock} label="Require two-factor auth" desc="Block posts if 2FA is off" checked={p.requireTwoFactor} onChange={(v) => update({ requireTwoFactor: v })} />
      </ProtectionSection>

      {p.enforceWarmupProfile && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-[11px] text-muted-foreground">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Warm-up profile is enforced — new and reactivated accounts ramp up posting gradually over 7-14 days.</span>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="liquid-pill glow-ring flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Save protection settings
      </button>
    </div>
  );
}

function ProtectionSection({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function NumberSetting({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-20"
        />
        <span className="text-[11px] text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function ToggleSetting({ icon: Icon, label, desc, checked, onChange }: { icon: React.ElementType; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl bg-background/40 p-2.5">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div>
          <div className="text-xs font-medium">{label}</div>
          <div className="text-[10px] text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
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
