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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    // Pseudo-random oscillation derived from id hash + index
    const wave = Math.sin((i + h) * 0.7) * 12 + Math.cos((i + h) * 0.4) * 6;
    const trend = (i / points) * (growth > 0 ? 30 : -10);
    arr.push({ i, v: Math.max(2, base + wave + trend) });
  }
  return arr;
}

export function AccountsView() {
  const { data, loading } = useApi<AccountData[]>("/api/accounts");
  const [filter, setFilter] = React.useState<"all" | PlatformId>("all");
  const [connectOpen, setConnectOpen] = React.useState(false);

  if (loading || !data) return <AccountsSkeleton />;

  // Sort by followers desc (API already does this, but enforce)
  const sorted = [...data].sort((a, b) => b.followers - a.followers);

  // KPIs
  const totalAccounts = sorted.length;
  const totalFollowers = sorted.reduce((s, a) => s + a.followers, 0);
  const totalImpressions = sorted.reduce((s, a) => s + a.impressions, 0);
  const avgGrowth =
    totalAccounts > 0
      ? Math.round(
          sorted.reduce((s, a) => s + a.followerGrowth, 0) / totalAccounts
        )
      : 0;

  // Platforms present
  const presentPlatforms = Array.from(
    new Set(sorted.map((a) => a.platform))
  ) as PlatformId[];

  // Filtered list
  const filtered =
    filter === "all" ? sorted : sorted.filter((a) => a.platform === filter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <GlassCard
        strong
        className="glass-sheen animate-rise relative overflow-hidden p-5"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
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
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
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
        {filtered.length === 0 && (
          <GlassCard className="col-span-full p-10 text-center text-sm text-muted-foreground">
            No accounts for this platform.
          </GlassCard>
        )}
      </div>

      {/* Connect dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Connect a new account
            </DialogTitle>
            <DialogDescription>
              Choose a platform to add a new social profile to your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PLATFORM_LIST.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  toast.success(`${p.name} account connected`);
                  setConnectOpen(false);
                }}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
              >
                <PlatformBadge platform={p.id} size={44} />
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  @{p.short.toLowerCase()}-connect
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
      className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {platform && <PlatformBadge platform={platform} size={18} />}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted-foreground/15 text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

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
      className="glass-sheen group relative flex flex-col overflow-hidden p-5"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ background: platform.color }}
      />
      {/* Top: platform + name */}
      <div className="relative flex items-start gap-3">
        <PlatformBadge platform={account.platform} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-base font-bold leading-tight">
              {account.displayName}
            </h3>
            {account.verified && (
              <VerifiedTick className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            @{account.handle}
          </div>
        </div>
        <PlatformPill platform={account.platform} className="hidden sm:inline-flex" />
      </div>

      {/* Owner row */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
        <NameAvatar
          name={account.ownerName}
          color={account.ownerColor}
          className="h-6 w-6 text-[10px]"
          ring
        />
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{account.ownerName}</span>{" "}
          owns this account
        </span>
        <ShieldCheck className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" />
      </div>

      {/* Big follower stat + sparkline */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tabular-nums leading-none">
            {fmt(account.followers)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">followers</div>
        </div>
        <div className="h-10 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={growthUp ? "oklch(0.76 0.18 145)" : "oklch(0.62 0.24 27)"}
                    stopOpacity={0.55}
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
      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
        <span
          className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${
            growthUp
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-rose-500/15 text-rose-500"
          }`}
        >
          {growthUp ? "↑" : "↓"} {fmt(Math.abs(account.followerGrowth))}
        </span>
        <span className="text-muted-foreground">growth</span>
      </div>

      {/* Stat grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        <Stat label="Posts" value={fmt(account.postsCount)} />
        <Stat label="Impr." value={fmt(account.impressions)} />
        <Stat label="Eng." value={fmt(account.engagement)} />
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center gap-2">
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
    <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function AccountsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
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
          <div key={i} className="shimmer h-72 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
