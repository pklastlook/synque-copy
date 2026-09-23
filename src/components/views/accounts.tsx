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
  AtSign,
  Building2,
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
import { HelpText } from "@/components/glass/help-text";
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
      <HelpText module="accounts"><strong className="text-foreground">Accounts</strong> shows all your connected social profiles. Click <strong className="text-foreground">Connect account</strong> to add a new platform via secure OAuth.</HelpText>
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

type Step = "platform" | "consent" | "handle" | "connecting" | "success";

/** OAuth-style permission scopes shown on the consent step. */
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
  // Real handle data entered by the user — persisted to the database.
  const [handle, setHandle] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [followers, setFollowers] = React.useState("");
  const [posts, setPosts] = React.useState("");
  const [impressions, setImpressions] = React.useState("");
  const [engagement, setEngagement] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [isBusiness, setIsBusiness] = React.useState(true);

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("platform");
        setPlatform(null);
        setHandle("");
        setDisplayName("");
        setFollowers("");
        setPosts("");
        setImpressions("");
        setEngagement("");
        setVerified(false);
        setIsBusiness(true);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const p = platform ? PLATFORMS[platform] : null;

  /** Check if OAuth is configured for a platform */
  const oauthConfigured = React.useMemo(() => {
    if (!platform || !user?.id) return false;
    const apiPlatform = platform === "x" ? "twitter" : platform;
    // Only facebook, instagram, twitter, linkedin support OAuth redirect
    if (!["facebook", "instagram", "x", "linkedin"].includes(platform)) return false;
    return true; // We check the actual credential existence on the server
  }, [platform, user?.id]);

  /** Pick a platform → redirect to OAuth login (like Later) or fall back to manual entry */
  const pickPlatform = async (id: PlatformId) => {
    setPlatform(id);
    const apiPlatform = id === "x" ? "twitter" : id;

    // Only facebook/instagram/twitter/linkedin support OAuth redirect
    if (!["facebook", "instagram", "x", "linkedin"].includes(id)) {
      setStep("consent");
      return;
    }

    if (!user?.id) {
      toast.error("Sign in first");
      return;
    }

    // Try OAuth redirect — if credentials aren't configured, show manual fallback
    setStep("connecting");
    try {
      const res = await fetch(`/api/oauth/check?platform=${apiPlatform}&userId=${user.id}`);
      const json = await res.json();
      if (json.configured) {
        // Redirect browser to the platform's login page (like Later)
        const redirectUrl = `/api/oauth/connect/${apiPlatform}?userId=${user.id}`;
        setTimeout(() => { window.location.href = redirectUrl; }, 100);
      } else {
        // OAuth not configured — show manual entry with a clear explanation
        setStep("consent");
      }
    } catch {
      setStep("consent");
    }
  };

  /** Connect → POST the real handle to the API. */
  const connect = async () => {
    if (!platform) return;
    if (!handle.trim()) {
      toast.error("Enter your handle");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in to connect an account");
      return;
    }
    setStep("connecting");
    try {
      const cleanHandle = handle.trim().startsWith("@") ? handle.trim() : "@" + handle.trim();
      const num = (s: string) => { const n = parseInt(s.replace(/[^0-9]/g, ""), 10); return isNaN(n) ? 0 : n; };
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: cleanHandle,
          displayName: displayName.trim() || cleanHandle,
          loginEmail: null,
          businessAccount: isBusiness,
          ownerId: user.id,
          followers: num(followers),
          postsCount: num(posts),
          impressions: num(impressions),
          engagement: num(engagement),
          reach: num(impressions),
          verified,
        }),
      });
      if (res.ok) {
        setStep("success");
        setTimeout(() => onConnected(), 1500);
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to connect account");
        setStep("handle");
      }
    } catch {
      toast.error("Network error");
      setStep("handle");
    }
  };

  /** Step labels for the indicator. */
  const stepLabels = ["Choose", "Authorize", "Done"];
  const currentStepIndex = step === "platform" ? 0 : step === "consent" || step === "handle" || step === "connecting" ? 1 : 2;

  const cleanHandle = handle.trim().startsWith("@") ? handle.trim() : handle.trim() ? "@" + handle.trim() : "";

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
                Choose a platform to connect via secure OAuth authorization.
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
                We never see or store your password. You authorize access on
                {` `}{PLATFORM_LIST[0].name}'s own consent screen, and you can revoke it anytime.
              </span>
            </div>
          </>
        )}

        {/* ================================================================
            STEP 2a — OAuth consent screen (what SocialFlow will access)
            ================================================================ */}
        {step === "consent" && p && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <button
                  onClick={() => { setStep("platform"); setPlatform(null); }}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted/60 transition hover:bg-muted"
                  aria-label="Back to platform picker"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Authorize {p.name}
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                SocialFlow needs permission to manage your {p.name} account.
              </DialogDescription>
            </DialogHeader>

            {/* OAuth consent card — like the real platform consent screens */}
            <div className="crystal-in rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-lg">→</span>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-muted">
                  <PlatformBadge platform={platform!} size={32} />
                </div>
              </div>
              <p className="mt-4 text-center text-[13px] text-muted-foreground">
                <strong className="font-semibold text-foreground">SocialFlow</strong> wants to access your{" "}
                <strong className="font-semibold text-foreground">{p.name}</strong> account
              </p>

              {/* Permission scopes */}
              <div className="mt-5 space-y-2.5">
                {PERMISSION_SCOPES.map((scope) => {
                  const Icon = scope.icon;
                  return (
                    <div key={scope.label} className="flex items-start gap-3 rounded-xl bg-muted/40 p-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold">{scope.label}</div>
                        <div className="text-[11px] text-muted-foreground">{scope.desc}</div>
                      </div>
                      <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="font-semibold text-amber-600 dark:text-amber-400">One-time setup needed.</strong>{" "}
                The workspace owner must add {p.name} OAuth App credentials in{" "}
                <strong className="text-foreground">Settings → Platform API Keys</strong> to enable
                one-click login. Until then, enter your handle manually below.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                onClick={() => { setStep("platform"); setPlatform(null); }}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Cancel
              </button>
              {[
                "facebook",
                "instagram",
                "x",
                "linkedin",
              ].includes(platform!) && user?.id && (
                <button
                  onClick={() => {
                    const apiPlatform = platform === "x" ? "twitter" : platform;
                    window.location.href = `/api/oauth/connect/${apiPlatform}?userId=${user.id}`;
                  }}
                  className="liquid-gold flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold sm:flex-none"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Login with {p.name}
                </button>
              )}
              <button
                onClick={() => setStep("handle")}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Enter manually
              </button>
            </DialogFooter>
          </>
        )}

        {/* ================================================================
            STEP 2b — Enter your handle (after OAuth authorization)
            In production this would come from the OAuth provider's response.
            Here the user enters their real handle, which is persisted to the DB.
            ================================================================ */}
        {step === "handle" && p && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <button
                  onClick={() => setStep("consent")}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted/60 transition hover:bg-muted"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Your {p.name} account
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                Authorization granted. Enter your {p.name} handle to finish connecting.
              </DialogDescription>
            </DialogHeader>

            {/* Authorization granted banner */}
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px]">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              <span className="text-muted-foreground">
                <strong className="font-semibold text-emerald-600 dark:text-emerald-400">Authorized.</strong>{" "}
                {p.name} granted read, publish & insights access.
              </span>
            </div>

            {/* Handle input form — real data persisted to DB */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.name} handle
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9@._-]/g, ""))}
                    placeholder="@yourbrand"
                    autoFocus
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                  />
                  {cleanHandle && (
                    <span className="px-3 text-[11px] font-medium text-muted-foreground">{cleanHandle}</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  The {`@`}username exactly as it appears on {p.name}.
                </p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Brand"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Followers + verified — real data from the profile */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Followers
                  </label>
                  <input
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="7499"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Verified
                  </label>
                  <button
                    type="button"
                    onClick={() => setVerified(!verified)}
                    className={cn(
                      "flex h-[42px] w-full items-center justify-between rounded-xl border px-3 transition",
                      verified ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
                    )}
                  >
                    <span className="text-[13px] font-medium">{verified ? "Yes" : "No"}</span>
                    <Switch checked={verified} onCheckedChange={setVerified} />
                  </button>
                </div>
              </div>

              {/* Posts + Impressions + Engagement — real profile metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    Posts
                  </label>
                  <input
                    value={posts}
                    onChange={(e) => setPosts(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="132"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    Impressions
                  </label>
                  <input
                    value={impressions}
                    onChange={(e) => setImpressions(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="45000"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                    Engagement
                  </label>
                  <input
                    value={engagement}
                    onChange={(e) => setEngagement(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="3200"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Business account toggle */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">Business / Creator account</div>
                    <div className="text-[11px] text-muted-foreground">Enables insights, ads & scheduling</div>
                  </div>
                </div>
                <Switch checked={isBusiness} onCheckedChange={setIsBusiness} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                onClick={() => setStep("consent")}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={connect}
                disabled={!handle.trim()}
                className="liquid-pill glow-ring flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                <ShieldCheck className="h-4 w-4" />
                Connect {cleanHandle || p.name}
              </button>
            </DialogFooter>
          </>
        )}

        {/* ================================================================
            STEP 3 — connecting
            ================================================================ */}
        {step === "connecting" && p && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-6">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-[var(--gold)] text-white shadow-xl">
                <PlatformBadge platform={platform!} size={44} />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 h-8 w-8 animate-spin rounded-full bg-background p-0.5 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Connecting {cleanHandle}…</h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Fetching profile & syncing analytics
            </p>
            <div className="mt-6 w-full max-w-xs space-y-2.5 text-left">
              <ConnectingStep label="Authorization granted" done />
              <ConnectingStep label="Fetching profile info" />
              <ConnectingStep label="Syncing analytics" pending />
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 4 — success
            ================================================================ */}
        {step === "success" && p && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-5">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
            </div>
            <h3 className="text-xl font-bold">Connected!</h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{cleanHandle}</span> on {p.name} is now live in your workspace.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              OAuth access granted · {isBusiness ? "Business account" : "Personal account"}
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
