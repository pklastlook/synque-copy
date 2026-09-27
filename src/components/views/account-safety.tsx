"use client";

import * as React from "react";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Activity, Clock, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, XCircle, Zap,
  Heart, Activity as ActivityIcon, Thermometer,
  Calendar, PlayCircle, PauseCircle, Lock,
  ArrowUpRight, RefreshCw, Copy, FileText,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  MetricRow, SectionHeader, ListRow, Pill, Sparkline,
  type Metric,
} from "@/components/glass/dense-ui";

// ============ Types ============

interface HealthData {
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalComments: number;
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
  enforceWarmupProfile: boolean;
  pausePostingOnWarning: boolean;
  cooldownHoursOnFlag: number;
  lastAudit: string | null;
}

interface AccountData {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  avatar: string | null;
  followers: number;
  verified: boolean;
  ownerId: string;
  ownerName: string;
  ownerColor: string | null;
  createdAt: string;
  postsCount: number;
  health: HealthData | null;
  protection: ProtectionData | null;
}

// ============ Risk level metadata ============

const RISK_META: Record<string, { label: string; color: string; bg: string; icon: LucideIcon; dot: string }> = {
  safe: { label: "Safe", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: ShieldCheck, dot: "bg-emerald-500" },
  moderate: { label: "Moderate", color: "text-amber-500", bg: "bg-amber-500/10", icon: Shield, dot: "bg-amber-500" },
  elevated: { label: "Elevated", color: "text-orange-500", bg: "bg-orange-500/10", icon: ShieldAlert, dot: "bg-orange-500" },
  high: { label: "High", color: "text-rose-500", bg: "bg-rose-500/10", icon: ShieldAlert, dot: "bg-rose-500" },
  critical: { label: "Critical", color: "text-red-600", bg: "bg-red-500/10", icon: ShieldX, dot: "bg-red-600" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  healthy: { label: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  warning: { label: "Warning", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle },
  restricted: { label: "Restricted", color: "text-orange-500", bg: "bg-orange-500/10", icon: PauseCircle },
  suspended: { label: "Suspended", color: "text-rose-500", bg: "bg-rose-500/10", icon: Lock },
};

// ============ Warm-up phases ============

const WARMUP_PHASES = [
  { day: 1, phase: "Setup", desc: "Complete profile, add photo, bio", action: "Browse + like 5 posts" },
  { day: 3, phase: "Observe", desc: "Follow 5-10 accounts in your niche", action: "Like + view stories" },
  { day: 5, phase: "Engage", desc: "Comment on 2-3 posts", action: "No posting yet" },
  { day: 7, phase: "First Post", desc: "Post 1 piece of original content", action: "1 post max" },
  { day: 10, phase: "Build Rhythm", desc: "Post every 2-3 days", action: "Max 1 post/day" },
  { day: 14, phase: "Normal Activity", desc: "Resume normal posting cadence", action: "Within limits" },
];

function getWarmupPhase(accountAgeDays: number) {
  if (accountAgeDays >= 14) return { phase: WARMUP_PHASES[5], day: accountAgeDays, total: 14, complete: true };
  if (accountAgeDays >= 10) return { phase: WARMUP_PHASES[4], day: accountAgeDays, total: 14, complete: false };
  if (accountAgeDays >= 7) return { phase: WARMUP_PHASES[3], day: accountAgeDays, total: 14, complete: false };
  if (accountAgeDays >= 5) return { phase: WARMUP_PHASES[2], day: accountAgeDays, total: 14, complete: false };
  if (accountAgeDays >= 3) return { phase: WARMUP_PHASES[1], day: accountAgeDays, total: 14, complete: false };
  return { phase: WARMUP_PHASES[0], day: accountAgeDays, total: 14, complete: false };
}

// ============ Appeal templates ============

const APPEAL_TEMPLATES: Record<string, { title: string; body: string }> = {
  instagram: {
    title: "Instagram Account Appeal",
    body: `Dear Instagram Support Team,

I am writing to appeal the suspension of my account @USERNAME. I believe this suspension may have been triggered in error.

I have always strived to follow Instagram's Community Guidelines. I do not use bots, automation tools, or third-party apps to artificially inflate engagement. All interactions on my account are genuine and manual.

If any specific content violated guidelines, I kindly request that you identify it so I can remove it immediately and ensure compliance going forward.

I value my account and the community I've built. I kindly request a review of this decision.

Thank you for your time and consideration.

Account: @USERNAME
Email: [your email]`,
  },
  facebook: {
    title: "Facebook Account Appeal",
    body: `Dear Facebook Support Team,

I am requesting a review of the restriction placed on my Facebook account. I believe this action was taken in error.

I have always used my account in accordance with Facebook's Community Standards. I do not engage in spamming, fake engagement, or any automated activity. All my posts and interactions are authentic.

If a specific post triggered this action, I would appreciate knowing so I can review and adjust my content accordingly.

I rely on my Facebook account for genuine personal and professional connections. I kindly ask for a manual review of this decision.

Thank you for your assistance.

Account: [your name/email]`,
  },
  x: {
    title: "X (Twitter) Account Appeal",
    body: `Dear X Support Team,

I am writing to appeal the suspension of my account @USERNAME. I believe my account may have been flagged in error.

I have always adhered to X's Rules and Policies. I do not use automation tools, mass-following, or any form of inauthentic engagement. My account activity is entirely manual and genuine.

If any specific content or action triggered this suspension, I would be grateful for details so I can address it immediately.

I respectfully request a manual review of my account status.

Thank you for your time.

Account: @USERNAME`,
  },
  tiktok: {
    title: "TikTok Account Appeal",
    body: `Dear TikTok Support Team,

I am appealing the suspension of my TikTok account @USERNAME. I believe this action was taken in error.

I have always followed TikTok's Community Guidelines. I create original content and do not use bots, automation, or third-party services to manipulate engagement metrics.

If a specific video or action caused this suspension, I would appreciate knowing so I can remove it and ensure future compliance.

I value my TikTok account and the audience I've built. I kindly request a review of this decision.

Thank you for your assistance.

Account: @USERNAME`,
  },
  linkedin: {
    title: "LinkedIn Account Appeal",
    body: `Dear LinkedIn Support Team,

I am writing to appeal the restriction placed on my LinkedIn account. I believe this action was taken in error.

I have always used LinkedIn in accordance with the User Agreement and Professional Community Policies. My connections and interactions are genuine and professional.

If any specific activity triggered this restriction, I would be grateful for clarification so I can address it.

I rely on LinkedIn for professional networking and would appreciate a manual review of my account status.

Thank you for your assistance.

Account: [your email]`,
  },
};

// ============ Main view ============

export function AccountSafetyView() {
  const { data, loading, reload } = useApi<AccountData[]>("/api/accounts");
  const { setView } = useNav();
  const [appealOpen, setAppealOpen] = React.useState(false);
  const [appealPlatform, setAppealPlatform] = React.useState<PlatformId>("instagram");

  const accounts = data ?? [];

  // Fleet-level stats
  const stats = React.useMemo(() => {
    const withHealth = accounts.filter((a) => a.health);
    const safe = withHealth.filter((a) => a.health!.riskLevel === "safe").length;
    const atRisk = withHealth.filter((a) =>
      ["moderate", "elevated", "high", "critical"].includes(a.health!.riskLevel)
    ).length;
    const suspended = withHealth.filter((a) => a.health!.status === "suspended").length;
    const inWarmup = accounts.filter((a) => {
      const ageDays = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays < 14;
    }).length;
    const protectionOn = accounts.filter((a) => a.protection?.enabled).length;
    const avgRisk = withHealth.length > 0
      ? Math.round(withHealth.reduce((s, a) => s + a.health!.riskScore, 0) / withHealth.length)
      : 0;
    return { total: accounts.length, safe, atRisk, suspended, inWarmup, protectionOn, avgRisk };
  }, [accounts]);

  const metrics: Metric[] = React.useMemo(() => [
    { label: "Accounts", value: stats.total, color: "var(--primary)" },
    { label: "Safe", value: stats.safe, color: "oklch(0.74 0.18 145)" },
    { label: "At risk", value: stats.atRisk, color: "oklch(0.7 0.2 25)" },
    { label: "In warm-up", value: stats.inWarmup, color: "oklch(0.72 0.18 75)" },
    { label: "Suspended", value: stats.suspended, color: "oklch(0.65 0.22 15)" },
    { label: "Avg risk", value: `${stats.avgRisk}%`, color: "oklch(0.62 0.2 255)" },
  ], [stats]);

  if (loading) return <SafetySkeleton />;

  // Sort: most at-risk first
  const sorted = [...accounts].sort((a, b) => {
    const ra = a.health?.riskScore ?? 0;
    const rb = b.health?.riskScore ?? 0;
    return rb - ra;
  });

  return (
    <div className="space-y-4">
      <HelpText module="account-safety">
        <strong className="text-foreground">Account Safety</strong> — your command center for keeping
        accounts alive long-term. Monitor risk scores, track warm-up progress, and access appeal
        templates. All strategies are ToS-compliant — no spoofing, just smart habits.
      </HelpText>

      {/* Metric strip */}
      <MetricRow metrics={metrics} />

      {/* Fleet health overview */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="Fleet health overview"
          desc="All accounts sorted by risk score (highest first)"
          icon={Activity}
          action={
            <div className="flex items-center gap-2">
              {/* Risk gauge */}
              <div className="flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1">
                <Thermometer className={cn(
                  "h-3.5 w-3.5",
                  stats.avgRisk >= 60 ? "text-rose-500" :
                  stats.avgRisk >= 30 ? "text-amber-500" : "text-emerald-500"
                )} />
                <span className="text-[11px] font-bold">
                  {stats.avgRisk >= 60 ? "High risk" : stats.avgRisk >= 30 ? "Moderate" : "Healthy"}
                </span>
              </div>
              <button
                onClick={() => {
                  fetch("/api/accounts/health/recalculate", { method: "POST" })
                    .then(() => { reload(); toast.success("Health recalculated"); })
                    .catch(() => toast.error("Recalculation failed"));
                }}
                className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" /> Recalculate
              </button>
            </div>
          }
        />

        {/* Risk distribution bar */}
        {stats.total > 0 && (
          <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500" style={{ width: `${(stats.safe / stats.total) * 100}%` }} title={`${stats.safe} safe`} />
            <div className="bg-amber-500" style={{ width: `${(stats.atRisk / stats.total) * 100}%` }} title={`${stats.atRisk} at risk`} />
            <div className="bg-rose-500" style={{ width: `${(stats.suspended / stats.total) * 100}%` }} title={`${stats.suspended} suspended`} />
          </div>
        )}

        {/* Account list */}
        <div className="scroll-liquid max-h-[500px] space-y-1.5 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <div className="grid place-items-center py-12 text-center text-sm text-muted-foreground">
              <Shield className="mb-2 h-8 w-8 opacity-40" />
              No accounts connected yet.
            </div>
          ) : (
            sorted.map((a) => (
              <AccountSafetyRow
                key={a.id}
                account={a}
                onAppeal={() => {
                  setAppealPlatform(a.platform);
                  setAppealOpen(true);
                }}
              />
            ))
          )}
        </div>
      </GlassCard>

      {/* Warm-up tracker */}
      {stats.inWarmup > 0 && (
        <GlassCard className="crystal-in p-4">
          <SectionHeader
            title="Warm-up tracker"
            desc="New accounts need 14 days of gradual activity before normal posting"
            icon={Calendar}
            action={<Pill color="amber">{stats.inWarmup} in warm-up</Pill>}
          />
          <div className="space-y-2.5">
            {accounts
              .filter((a) => {
                const ageDays = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                return ageDays < 14;
              })
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((a) => {
                const ageDays = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                const wp = getWarmupPhase(ageDays);
                const progress = Math.min(100, (ageDays / 14) * 100);
                return (
                  <div key={a.id} className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformBadge platform={a.platform} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">{a.displayName}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          Day {ageDays} of 14 · {wp.phase.phase}
                        </div>
                      </div>
                      <Pill color={wp.complete ? "green" : "amber"}>
                        {wp.complete ? "Ready" : `${Math.round(progress)}%`}
                      </Pill>
                    </div>
                    {/* Progress bar */}
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", wp.complete ? "bg-emerald-500" : "bg-primary")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{wp.phase.action}</span>
                      <span>· {wp.phase.desc}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </GlassCard>
      )}

      {/* Warm-up schedule guide */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="14-day warm-up schedule"
          desc="The proven schedule that keeps new accounts safe from suspension"
          icon={PlayCircle}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WARMUP_PHASES.map((p, i) => (
            <div key={p.day} className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-xs font-bold">Day {p.day}</span>
                <span className="ml-auto text-[9px] font-medium text-muted-foreground">{p.phase}</span>
              </div>
              <div className="text-[11px] font-medium text-foreground/80">{p.desc}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">→ {p.action}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Safety best practices */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="Safety best practices"
          desc="Proven strategies that prevent account suspension (100% ToS-compliant)"
          icon={ShieldCheck}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <SafetyTip
            icon={Clock}
            title="Respect rate limits"
            desc="Max 4 posts/day, 2 posts/hour, 30 min between posts. Our rate guardian enforces this automatically."
            color="emerald"
          />
          <SafetyTip
            icon={Calendar}
            title="Warm up new accounts"
            desc="New accounts need 14 days of gradual activity before normal posting. Use the warm-up tracker above."
            color="amber"
          />
          <SafetyTip
            icon={FileText}
            title="Post original content"
            desc="Don't post duplicate content across accounts. Each post should be unique to avoid spam detection."
            color="blue"
          />
          <SafetyTip
            icon={ActivityIcon}
            title="Avoid aggressive engagement"
            desc="No mass follow/unfollow, bulk DMs, or rapid commenting. Cap manual actions to human-like rates."
            color="violet"
          />
          <SafetyTip
            icon={ShieldCheck}
            title="Keep protection on"
            desc="Account Protection blocks banned hashtags, flags sensitive content, and pauses posting on warnings."
            color="emerald"
          />
          <SafetyTip
            icon={Heart}
            title="Monitor sentiment"
            desc="If negative comment ratio rises above 30%, pause posting and review your content strategy."
            color="rose"
          />
        </div>
      </GlassCard>

      {/* Suspension recovery */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="Suspension recovery"
          desc="Pre-written appeal templates for each platform"
          icon={FileText}
          action={
            <button
              onClick={() => setAppealOpen(true)}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              <FileText className="h-3.5 w-3.5" /> View templates
            </button>
          }
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(APPEAL_TEMPLATES).map(([platform, tpl]) => {
            const p = PLATFORMS[platform as PlatformId];
            return (
              <button
                key={platform}
                onClick={() => {
                  setAppealPlatform(platform as PlatformId);
                  setAppealOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <PlatformBadge platform={platform as PlatformId} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{p.name} appeal</div>
                  <div className="truncate text-[10px] text-muted-foreground">Pre-written template</div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Appeal dialog */}
      <AppealDialog
        open={appealOpen}
        onOpenChange={setAppealOpen}
        platform={appealPlatform}
      />
    </div>
  );
}

// ============ Account safety row ============

function AccountSafetyRow({ account, onAppeal }: { account: AccountData; onAppeal: () => void }) {
  const health = account.health;
  const protection = account.protection;
  const riskMeta = health ? RISK_META[health.riskLevel] : null;
  const statusMeta = health ? STATUS_META[health.status] : null;
  const ageDays = Math.floor((Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const inWarmup = ageDays < 14;

  return (
    <ListRow className="flex-col !items-stretch gap-2 px-3 py-2.5 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        {/* Platform badge */}
        <PlatformBadge platform={account.platform} size={32} />

        {/* Account info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold">{account.displayName}</span>
            {account.verified && <CheckCircle2 className="h-3 w-3 text-primary" />}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="truncate">{account.handle}</span>
            <span>·</span>
            <span>{ageDays}d old</span>
            {inWarmup && (
              <>
                <span>·</span>
                <span className="font-medium text-amber-500">warm-up</span>
              </>
            )}
          </div>
        </div>

        {/* Risk score gauge */}
        {health && riskMeta && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <div className={cn("text-sm font-bold tabular-nums", riskMeta.color)}>
                {health.riskScore}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">risk</div>
            </div>
            {/* Mini risk bar */}
            <div className="grid h-8 w-2 place-items-end overflow-hidden rounded-full bg-muted">
              <div
                className={cn("w-full rounded-full", riskMeta.dot)}
                style={{ height: `${health.riskScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Status badge */}
        {health && statusMeta && (
          <Pill color={
            health.status === "healthy" ? "green" :
            health.status === "warning" ? "amber" :
            health.status === "restricted" ? "violet" : "rose"
          }>
            <statusMeta.icon className="h-2.5 w-2.5" />
            {statusMeta.label}
          </Pill>
        )}

        {/* Protection indicator */}
        {protection && (
          <div
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full",
              protection.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
            )}
            title={protection.enabled ? "Protection active" : "Protection off"}
          >
            <Shield className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Risk reasons (if any) */}
      {health && health.riskReasons.length > 0 && health.riskLevel !== "safe" && (
        <div className="flex flex-wrap items-center gap-1.5 pl-11">
          {health.riskReasons.slice(0, 4).map((reason, i) => (
            <span
              key={i}
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-medium",
                riskMeta?.bg,
                riskMeta?.color
              )}
            >
              {reason.replace(/_/g, " ")}
            </span>
          ))}
          {health.riskReasons.length > 4 && (
            <span className="text-[9px] text-muted-foreground">
              +{health.riskReasons.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Action row — show appeal button if at risk */}
      {health && ["elevated", "high", "critical"].includes(health.riskLevel) && (
        <div className="flex items-center gap-2 pl-11">
          <button
            onClick={onAppeal}
            className="flex items-center gap-1 rounded-lg bg-muted/40 px-2 py-1 text-[10px] font-medium text-primary transition hover:bg-primary/10"
          >
            <FileText className="h-2.5 w-2.5" /> Appeal template
          </button>
          {protection?.pausePostingOnWarning && health.status === "restricted" && (
            <span className="flex items-center gap-1 text-[9px] text-amber-500">
              <PauseCircle className="h-2.5 w-2.5" /> Posting paused (cooldown {protection.cooldownHoursOnFlag}h)
            </span>
          )}
        </div>
      )}
    </ListRow>
  );
}

// ============ Safety tip ============

function SafetyTip({ icon: Icon, title, desc, color }: { icon: LucideIcon; title: string; desc: string; color: string }) {
  const colorClass = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    blue: "bg-blue-500/10 text-blue-500",
    violet: "bg-violet-500/10 text-violet-500",
    rose: "bg-rose-500/10 text-rose-500",
  }[color] || "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <div className={cn("grid h-7 w-7 place-items-center rounded-lg", colorClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-bold">{title}</span>
      </div>
      <div className="text-[11px] leading-relaxed text-muted-foreground">{desc}</div>
    </div>
  );
}

// ============ Appeal dialog ============

function AppealDialog({ open, onOpenChange, platform }: { open: boolean; onOpenChange: (o: boolean) => void; platform: PlatformId }) {
  const tpl = APPEAL_TEMPLATES[platform];
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tpl.body);
      setCopied(true);
      toast.success("Appeal template copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlatformBadge platform={platform} size={24} />
            {tpl.title}
          </DialogTitle>
          <DialogClose asChild>
            <button className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <pre className="scroll-liquid max-h-[400px] overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80">
              {tpl.body}
            </pre>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Replace @USERNAME with your actual handle before sending
            </span>
            <button
              onClick={handleCopy}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy template"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Skeleton ============

function SafetySkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-10 rounded-xl" />
      <div className="shimmer h-64 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="shimmer h-48 rounded-3xl" />
        <div className="shimmer h-48 rounded-3xl" />
      </div>
    </div>
  );
}
