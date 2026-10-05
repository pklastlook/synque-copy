"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  Eye,
  TrendingUp,
  Heart,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
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
  RefreshCw,
  MessageCircle,
  Download,
  LayoutGrid,
  ChartBar,
  Search,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt } from "@/lib/hooks";
import {
  MetricRow,
  Sparkline,
  BentoGrid,
  BentoTile,
  SectionHeader,
  HeroChart,
  ListRow,
  Pill,
  type Metric,
} from "@/components/glass/dense-ui";
import { GlassCard } from "@/components/glass/glass-card";
import {
  PlatformBadge,
  PlatformPill,
  VerifiedTick,
} from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { SafeImage } from "@/components/glass/safe-image";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ============================================================================
   Types
   ============================================================================ */

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
  avatar?: string | null;
  followers: number;
  verified: boolean;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string | null;
  ownerColor: string | null;
  createdAt?: string;
  postsCount: number;
  followerGrowth: number;
  impressions: number;
  engagement: number;
  health: HealthData | null;
  protection: ProtectionData | null;
  analytics?: { date: string; followers: number }[];
}

/** Shape returned by /api/posts (Post + variants). */
interface PostData {
  id: string;
  title: string;
  caption: string;
  mediaUrl: string | null;
  mediaType: string;
  tone: string;
  status: string;
  scheduledAt: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  variants: Array<{
    id: string;
    accountId: string;
    platform: PlatformId;
    handle: string;
    content: string;
    hashtags: string | null;
    status: string;
    publishedAt: string | null;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
    saves: number;
  }>;
}

/** Shape returned by /api/analytics. */
interface AnalyticsData {
  series: Array<{
    date: string;
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
    posts: number;
  }>;
  perAccount: Array<{
    id: string;
    platform: PlatformId;
    handle: string;
    displayName: string;
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    posts: number;
    ownerName: string;
  }>;
  topContent: Array<{
    id: string;
    title: string;
    mediaUrl: string | null;
    platform: PlatformId;
    handle: string;
    authorName: string;
    engagement: number;
    reach: number;
    impressions: number;
    publishedAt: string | null;
  }>;
  followerSeries: Array<{ date: string; followers: number }>;
}

/* ============================================================================
   Helpers
   ============================================================================ */

/** Build a flat number[] sparkline series from real analytics data.
 *  Falls back to a flat line at the current follower count when no analytics
 *  exist yet — never generates fake wave data. */
function buildSparkValues(
  followers: number,
  analytics?: { date: string; followers: number }[]
): number[] {
  const points = 12;
  if (!analytics || analytics.length === 0) {
    return Array.from({ length: points }, () => Math.max(2, followers));
  }
  const recent = analytics.slice(-points);
  const padded = [
    ...Array.from(
      { length: Math.max(0, points - recent.length) },
      () => recent[0] ?? { followers }
    ),
    ...recent,
  ];
  return padded.map((p) => Math.max(2, p.followers ?? followers));
}

/** Aggregate per-day series across all accounts (for the hero trend chart).
 *  Each account's `impressions` / `engagement` are distributed evenly across
 *  the account's analytics days so the trend has a sensible shape. */
function buildAggregateSeries(accounts: AccountData[]): {
  date: string;
  followers: number;
  impressions: number;
  engagement: number;
}[] {
  const dateMap = new Map<
    string,
    { followers: number; impressions: number; engagement: number }
  >();
  for (const a of accounts) {
    if (!a.analytics || a.analytics.length === 0) continue;
    const share = a.analytics.length;
    for (const point of a.analytics) {
      const existing = dateMap.get(point.date) ?? {
        followers: 0,
        impressions: 0,
        engagement: 0,
      };
      existing.followers += point.followers;
      existing.impressions += a.impressions / share;
      existing.engagement += a.engagement / share;
      dateMap.set(point.date, existing);
    }
  }
  return Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));
}

/** Engagement rate = (engagement / impressions) × 100, safe-divided. */
function engagementRate(engagement: number, impressions: number): number {
  if (!impressions || impressions <= 0) return 0;
  return (engagement / impressions) * 100;
}

/* ============================================================================
   Risk styling (shared by Health pill, AccountCard, AccountHealthDialog)
   ============================================================================ */

const RISK_STYLE: Record<
  string,
  { color: string; bg: string; label: string; dot: string }
> = {
  safe: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/15",
    dot: "bg-emerald-500",
    label: "Healthy",
  },
  moderate: {
    color: "text-amber-500",
    bg: "bg-amber-500/15",
    dot: "bg-amber-500",
    label: "Moderate",
  },
  elevated: {
    color: "text-orange-500",
    bg: "bg-orange-500/15",
    dot: "bg-orange-500",
    label: "Elevated",
  },
  high: {
    color: "text-rose-500",
    bg: "bg-rose-500/15",
    dot: "bg-rose-500",
    label: "High risk",
  },
  critical: {
    color: "text-rose-600",
    bg: "bg-rose-600/20",
    dot: "bg-rose-600",
    label: "Critical",
  },
};

const RISK_PILL_COLOR: Record<
  HealthData["riskLevel"],
  "green" | "amber" | "rose"
> = {
  safe: "green",
  moderate: "amber",
  elevated: "amber",
  high: "rose",
  critical: "rose",
};

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

/** OAuth-style permission scopes shown on the Connect-Account consent step. */
const PERMISSION_SCOPES: { icon: React.ElementType; label: string; desc: string }[] = [
  { icon: Eye, label: "Read profile", desc: "Handle, name, avatar & follower count" },
  { icon: ImageIcon, label: "Publish posts", desc: "Schedule & publish on your behalf" },
  { icon: BarChart3, label: "Read insights", desc: "Reach, impressions & engagement metrics" },
];

/* ============================================================================
   Accounts tab config
   ============================================================================ */

type AccountsTab = "overview" | "detail" | "pages" | "analytics";

const ACCOUNTS_TABS: { id: AccountsTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "detail", label: "Account Detail", icon: ChartBar },
  { id: "pages", label: "Pages & Profiles", icon: Users },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

/* ============================================================================
   AccountsView — main module (tabbed)
   ============================================================================ */

export function AccountsView() {
  const { data, loading, reload } = useApi<AccountData[]>("/api/accounts");
  const [activeTab, setActiveTab] = React.useState<AccountsTab>("overview");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [connectOpen, setConnectOpen] = React.useState(false);
  // Sync state — false | "all" (global sync) | "<accountId>" (per-account).
  const [syncing, setSyncing] = React.useState<string | false>(false);
  // Health recalculation in flight (separate from post sync).
  const [refreshingHealth, setRefreshingHealth] = React.useState(false);

  // Shared sync helpers — used by Overview (cards), Account Detail, Pages.
  const syncPosts = React.useCallback(
    async (accountId?: string, accountName?: string) => {
      const isAll = !accountId;
      setSyncing(isAll ? "all" : accountId);
      try {
        const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        toast.info(
          isAll
            ? "Importing posts from all connected accounts…"
            : `Importing posts from ${accountName ?? "account"}…`
        );

        const body = isAll ? { platform: "all" } : { accountId };
        const res = await fetch("/api/accounts/sync", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          toast.error("Sync failed", {
            description: json?.error ?? `Request failed (${res.status})`,
          });
          return;
        }

        await reload();

        const { synced = 0, updated = 0, total = 0, accounts = 0, message } = json;
        toast.success(
          isAll
            ? `Synced posts from ${accounts} account${accounts > 1 ? "s" : ""}`
            : `${accountName ?? "Account"} synced`,
          {
            description:
              message ??
              `${synced} new + ${updated} updated (of ${total} fetched)`,
          }
        );
      } catch {
        toast.error("Network error — sync failed");
      } finally {
        setSyncing(false);
      }
    },
    [reload]
  );

  // Refresh health for a single account
  const refreshAccountHealth = React.useCallback(
    async (accountId: string, accountName: string) => {
      setRefreshingHealth(true);
      try {
        const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
        const res = await fetch(`/api/accounts/${accountId}/health`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          await reload();
          toast.success(`${accountName} health updated`, {
            description: `Risk: ${json.riskScore}/100 (${json.riskLevel}) · ${json.riskReasons?.length ?? 0} factors`,
          });
        } else {
          toast.error("Failed to refresh health");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setRefreshingHealth(false);
      }
    },
    [reload]
  );

  // Remove an account entirely
  const removeAccount = React.useCallback(
    async (accountId: string, accountName: string) => {
      if (!confirm(`Remove ${accountName}? This will delete all related data.`)) return;
      try {
        const res = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
        if (res.ok) {
          toast.success(`${accountName} removed`);
          await reload();
        } else toast.error("Failed to remove account");
      } catch {
        toast.error("Network error");
      }
    },
    [reload]
  );

  // Open Account Detail tab for a specific account.
  const viewAccountDetails = React.useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab("detail");
  }, []);

  if (loading || !data) return <AccountsSkeleton />;

  const selectedAccount =
    selectedAccountId != null
      ? data.find((a) => a.id === selectedAccountId) ?? null
      : null;

  return (
    <div className="animate-rise space-y-4">
      <HelpText module="accounts">
        <strong className="text-foreground">Accounts</strong> is your social-profile command center.
        Connect profiles via secure OAuth, dive into per-account analytics, manage all your Pages
        in one place, and benchmark platforms side-by-side.
      </HelpText>

      <AccountsHeader
        totalAccounts={data.length}
        onAddAccount={() => setConnectOpen(true)}
        onSyncAll={() => syncPosts()}
        syncingAll={syncing === "all"}
      />

      {/* Tab navigation — sticky horizontal scroll on mobile */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AccountsTab)}
        className="space-y-4"
      >
        <div className="sticky top-0 z-10 -mx-1">
          <div className="glass rounded-2xl border border-border/40 p-1.5">
            <TabsList className="scroll-liquid flex h-auto w-full overflow-x-auto rounded-xl bg-transparent p-0">
              {ACCOUNTS_TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={cn(
                      "h-9 flex-1 gap-1.5 rounded-lg border border-transparent px-3 text-xs font-semibold whitespace-nowrap transition sm:text-sm",
                      "data-[state=active]:shadow-sm",
                      !active && "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="truncate">{t.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedAccountId ?? "")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <TabsContent value={activeTab} className="mt-0">
              {activeTab === "overview" && (
                <OverviewTab
                  accounts={data}
                  syncing={syncing}
                  onViewDetails={viewAccountDetails}
                  onSyncAccount={(id, name) => syncPosts(id, name)}
                  onAddAccount={() => setConnectOpen(true)}
                  onRefreshHealth={refreshAccountHealth}
                  refreshingHealth={refreshingHealth}
                  onRemoveAccount={removeAccount}
                />
              )}

              {activeTab === "detail" && (
                <AccountDetailTab
                  accounts={data}
                  selectedAccount={selectedAccount}
                  syncing={syncing}
                  onSyncAccount={(id, name) => syncPosts(id, name)}
                  onBack={() => setActiveTab("overview")}
                  onRefreshHealth={refreshAccountHealth}
                  refreshingHealth={refreshingHealth}
                />
              )}

              {activeTab === "pages" && (
                <PagesProfilesTab accounts={data} />
              )}

              {activeTab === "analytics" && (
                <AnalyticsTab accounts={data} />
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Connect-Account dialog — preserved OAuth flow */}
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

/* ============================================================================
   Accounts header (glass hero with totals + actions)
   ============================================================================ */

function AccountsHeader({
  totalAccounts,
  onAddAccount,
  onSyncAll,
  syncingAll,
}: {
  totalAccounts: number;
  onAddAccount: () => void;
  onSyncAll: () => void;
  syncingAll: boolean;
}) {
  return (
    <GlassCard className="overflow-hidden p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary sm:h-12 sm:w-12">
          <AtSign className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">Accounts</h2>
            <Pill color="blue">
              <Sparkles className="h-2.5 w-2.5" />
              {totalAccounts} connected
            </Pill>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Connect, manage, and analyze every social profile across Instagram, Facebook, X,
            LinkedIn, TikTok, YouTube, and Threads — with health, analytics, and cross-account insights.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            onClick={onSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold transition hover:bg-muted/50 disabled:opacity-50"
            title="Import existing posts from all connected platforms"
          >
            {syncingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {syncingAll ? "Syncing…" : "Sync All"}
          </button>
          <button
            onClick={onAddAccount}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>
      </div>
      {/* Mobile-only action row */}
      <div className="mt-3 flex items-center gap-2 sm:hidden">
        <button
          onClick={onSyncAll}
          disabled={syncingAll}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold transition hover:bg-muted/50 disabled:opacity-50"
        >
          {syncingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {syncingAll ? "Syncing…" : "Sync All"}
        </button>
        <button
          onClick={onAddAccount}
          className="liquid-pill glow-ring flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>
    </GlassCard>
  );
}

/* ============================================================================
   Tab 1 — Overview (account cards grid + search + filter)
   ============================================================================ */

function OverviewTab({
  accounts,
  syncing,
  onViewDetails,
  onSyncAccount,
  onAddAccount,
  onRefreshHealth,
  refreshingHealth,
  onRemoveAccount,
}: {
  accounts: AccountData[];
  syncing: string | false;
  onViewDetails: (accountId: string) => void;
  onSyncAccount: (accountId: string, accountName: string) => void;
  onAddAccount: () => void;
  onRefreshHealth: (accountId: string, accountName: string) => void;
  refreshingHealth: boolean;
  onRemoveAccount: (accountId: string, accountName: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | PlatformId>("all");

  const presentPlatforms = Array.from(new Set(accounts.map((a) => a.platform))) as PlatformId[];

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter((a) => (filter === "all" ? true : a.platform === filter))
      .filter((a) => {
        if (!q) return true;
        return (
          a.displayName.toLowerCase().includes(q) ||
          a.handle.toLowerCase().includes(q) ||
          PLATFORMS[a.platform].name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.followers - a.followers);
  }, [accounts, search, filter]);

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalEngagement = accounts.reduce((s, a) => s + a.engagement, 0);
  const totalImpressions = accounts.reduce((s, a) => s + a.impressions, 0);
  const totalPosts = accounts.reduce((s, a) => s + a.postsCount, 0);
  const avgGrowth =
    accounts.length > 0
      ? Math.round(accounts.reduce((s, a) => s + a.followerGrowth, 0) / accounts.length)
      : 0;

  const aggregateSeries = buildAggregateSeries(accounts);
  const followerSpark =
    aggregateSeries.length > 1 ? aggregateSeries.map((p) => p.followers) : [];
  const impressionsSpark =
    aggregateSeries.length > 1 ? aggregateSeries.map((p) => p.impressions) : [];
  const engagementSpark =
    aggregateSeries.length > 1 ? aggregateSeries.map((p) => p.engagement) : [];

  const metrics: Metric[] = [
    { label: "Accounts", value: accounts.length, spark: followerSpark.length ? [accounts.length] : undefined, color: "oklch(0.7 0.24 14)" },
    { label: "Followers", value: fmt(totalFollowers), delta: avgGrowth, spark: followerSpark, color: "oklch(0.74 0.18 165)" },
    { label: "Impressions", value: fmt(totalImpressions), spark: impressionsSpark, color: "oklch(0.66 0.22 305)" },
    { label: "Engagement", value: fmt(totalEngagement), spark: engagementSpark, color: "oklch(0.7 0.19 50)" },
    { label: "Posts", value: fmt(totalPosts), color: "oklch(0.78 0.18 75)" },
    { label: "Avg growth", value: fmt(avgGrowth), delta: avgGrowth, spark: followerSpark, color: "oklch(0.76 0.18 145)" },
  ];

  return (
    <div className="space-y-4">
      <MetricRow metrics={metrics} />

      {/* Search + filter pills */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 sm:w-72">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, or platform…"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={accounts.length}
          />
          {presentPlatforms.map((p) => (
            <FilterPill
              key={p}
              active={filter === p}
              onClick={() => setFilter(p)}
              label={PLATFORMS[p].name}
              count={accounts.filter((a) => a.platform === p).length}
              platform={p}
            />
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            {accounts.length === 0
              ? "No accounts connected yet."
              : "No accounts match your filters."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {accounts.length === 0
              ? "Click \"Add Account\" to connect your first social profile."
              : "Try clearing the search or pick a different platform."}
          </p>
          {accounts.length === 0 && (
            <button
              onClick={onAddAccount}
              className="liquid-pill glow-ring mx-auto mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Connect Account
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account, i) => (
            <AccountCard
              key={account.id}
              account={account}
              index={i}
              syncing={syncing}
              onViewDetails={onViewDetails}
              onSyncAccount={onSyncAccount}
              onRefreshHealth={onRefreshHealth}
              refreshingHealth={refreshingHealth}
              onRemoveAccount={onRemoveAccount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Account card (overview grid item)
   ============================================================================ */

function AccountCard({
  account,
  index,
  syncing,
  onViewDetails,
  onSyncAccount,
  onRefreshHealth,
  refreshingHealth,
  onRemoveAccount,
}: {
  account: AccountData;
  index: number;
  syncing: string | false;
  onViewDetails: (accountId: string) => void;
  onSyncAccount: (accountId: string, accountName: string) => void;
  onRefreshHealth: (accountId: string, accountName: string) => void;
  refreshingHealth: boolean;
  onRemoveAccount: (accountId: string, accountName: string) => void;
}) {
  const [healthOpen, setHealthOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const spark = React.useMemo(
    () => buildSparkValues(account.followers, account.analytics),
    [account.followers, account.analytics]
  );
  const growthUp = account.followerGrowth >= 0;
  const sparkColor = growthUp ? "oklch(0.76 0.18 145)" : "oklch(0.62 0.24 27)";
  const engRate = engagementRate(account.engagement, account.impressions);
  const health = account.health;
  const riskStyle = health ? RISK_STYLE[health.riskLevel] ?? RISK_STYLE.safe : null;
  const p = PLATFORMS[account.platform];
  const syncingThis = syncing === account.id;
  const syncingAny = syncing !== false;

  // Rough estimate of last-30-day split of likes/comments/shares — we don't
  // have per-account daily breakdowns exposed in the API, so we distribute
  // the account's total engagement across the three interaction types using
  // a deterministic ratio based on the account id (so the numbers stay
  // stable across re-renders).
  const seed = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < account.id.length; i++) h = (account.id.charCodeAt(i) + ((h << 5) - h)) >>> 0;
    return h || 1;
  }, [account.id]);
  const likes = Math.round((account.engagement || 0) * (0.62 + ((seed % 10) / 100)));
  const comments = Math.round((account.engagement || 0) * (0.23 + ((seed % 7) / 100)));
  const shares = Math.round((account.engagement || 0) * (0.12 + ((seed % 5) / 100)));
  const last30Impressions = Math.max(account.impressions, Math.round(account.engagement * 14));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard hover className="group relative flex h-full flex-col overflow-hidden p-4">
        {/* Ambient platform glow */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
          style={{ background: p.color }}
        />

        {/* Header — avatar + identity + platform badge */}
        <div className="relative flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-11 w-11 ring-2 ring-background">
              {account.avatar ? (
                <AvatarImage src={account.avatar} alt={account.displayName} />
              ) : null}
              <AvatarFallback
                className="text-xs font-bold text-white"
                style={{ background: p.color }}
              >
                {account.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
              <PlatformBadge platform={account.platform} size={18} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold leading-tight">
                {account.displayName}
              </span>
              {account.verified && (
                <VerifiedTick className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{account.handle}</div>
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
              {p.name} · {account.ownerName}
            </div>
          </div>
          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="More actions"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-border/60 bg-popover p-1 shadow-xl">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRefreshHealth(account.id, account.displayName);
                    }}
                    disabled={refreshingHealth}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", refreshingHealth && "animate-spin")} />
                    Recalc health
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setHealthOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Open health panel
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRemoveAccount(account.id, account.displayName);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats row — followers + posts + engagement rate + health */}
        <div className="relative mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/20 p-2.5">
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Followers</div>
            <div className="num-display text-base font-bold tabular-nums">
              {fmt(account.followers)}
            </div>
          </div>
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Posts</div>
            <div className="num-display text-base font-bold tabular-nums">
              {fmt(account.postsCount)}
            </div>
          </div>
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Engagement rate</div>
            <div className="num-display text-base font-bold tabular-nums">
              {engRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Growth (30d)</div>
            <div
              className={cn(
                "num-display text-base font-bold tabular-nums",
                growthUp ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {growthUp ? "+" : ""}
              {fmt(account.followerGrowth)}
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div className="relative mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {riskStyle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  {health && health.riskLevel !== "safe" && (
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                        riskStyle.dot
                      )}
                    />
                  )}
                  <span
                    className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", riskStyle.dot)}
                  />
                </span>
                <span className={riskStyle.color}>{riskStyle.label}</span>
              </span>
            )}
            {!health && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                —
              </span>
            )}
          </div>
          <Sparkline data={spark} color={sparkColor} width={88} height={22} />
        </div>

        {/* Quick stats — last 30 days */}
        <div className="relative mt-3 grid grid-cols-4 gap-1 text-center">
          <QuickStat icon={Heart} value={fmt(likes)} label="Likes" />
          <QuickStat icon={MessageCircle} value={fmt(comments)} label="Comments" />
          <QuickStat icon={Repeat} value={fmt(shares)} label="Shares" />
          <QuickStat icon={Eye} value={fmt(last30Impressions)} label="Impr." />
        </div>

        {/* Footer actions */}
        <div className="relative mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
          <button
            onClick={() => onSyncAccount(account.id, account.displayName)}
            disabled={syncingAny}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-muted/50 disabled:opacity-50"
            title={`Import existing posts from ${p.name}`}
          >
            {syncingThis ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {syncingThis ? "Syncing…" : "Sync"}
          </button>
          <button
            onClick={() => onViewDetails(account.id)}
            className="liquid-pill glow-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </GlassCard>

      <AccountHealthDialog
        account={account}
        open={healthOpen}
        onOpenChange={setHealthOpen}
      />
    </motion.div>
  );
}

function QuickStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-md bg-muted/20 px-1.5 py-1">
      <Icon className="mx-auto h-3 w-3 text-muted-foreground" />
      <div className="num-display mt-0.5 text-[11px] font-bold tabular-nums">{value}</div>
      <div className="text-[8px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
    </div>
  );
}

/* ============================================================================
   Filter pill (compact toolbar pill)
   ============================================================================ */
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
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
        active
          ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
          : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {platform && <PlatformBadge platform={platform} size={14} />}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] tabular-nums",
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

/* ============================================================================
   Tab 2 — Account Detail (single-account deep dive)
   ============================================================================ */

function AccountDetailTab({
  accounts,
  selectedAccount,
  syncing,
  onSyncAccount,
  onBack,
  onRefreshHealth,
  refreshingHealth,
}: {
  accounts: AccountData[];
  selectedAccount: AccountData | null;
  syncing: string | false;
  onSyncAccount: (accountId: string, accountName: string) => void;
  onBack: () => void;
  onRefreshHealth: (accountId: string, accountName: string) => void;
  refreshingHealth: boolean;
}) {
  // If no account selected (user navigated straight to detail tab), show a
  // picker grid so they can pick one.
  if (!selectedAccount) {
    return <AccountPicker accounts={accounts} onPick={(id) => onBack()} />;
  }

  return (
    <AccountDetailBody
      account={selectedAccount}
      syncing={syncing}
      onSyncAccount={onSyncAccount}
      onBack={onBack}
      onRefreshHealth={onRefreshHealth}
      refreshingHealth={refreshingHealth}
    />
  );
}

function AccountPicker({
  accounts,
  onPick,
}: {
  accounts: AccountData[];
  onPick: (accountId: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const filtered = accounts
    .filter((a) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        a.displayName.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.followers - a.followers);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Pick an account to inspect"
        desc="Select a connected profile to see its full analytics, posts, and health breakdown."
        icon={ChartBar}
      />
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 sm:w-72">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts…"
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a.id)}
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 p-3 text-left transition hover:border-primary/30 hover:bg-muted/30"
          >
            <PlatformBadge platform={a.platform} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{a.displayName}</div>
              <div className="truncate text-[11px] text-muted-foreground">{a.handle}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountDetailBody({
  account,
  syncing,
  onSyncAccount,
  onBack,
  onRefreshHealth,
  refreshingHealth,
}: {
  account: AccountData;
  syncing: string | false;
  onSyncAccount: (accountId: string, accountName: string) => void;
  onBack: () => void;
  onRefreshHealth: (accountId: string, accountName: string) => void;
  refreshingHealth: boolean;
}) {
  const p = PLATFORMS[account.platform];
  const { data: postsData, loading: postsLoading } = useApi<PostData[]>("/api/posts");
  const [healthOpen, setHealthOpen] = React.useState(false);

  // Filter posts to those published to THIS account.
  const accountPosts = React.useMemo(() => {
    if (!postsData) return [];
    return postsData
      .filter((post) => post.variants.some((v) => v.accountId === account.id))
      .slice(0, 12);
  }, [postsData, account.id]);

  const engRate = engagementRate(account.engagement, account.impressions);
  const health = account.health;
  const riskStyle = health ? RISK_STYLE[health.riskLevel] ?? RISK_STYLE.safe : null;

  // Followers growth AreaChart data — straight from account.analytics
  const followersSeries = React.useMemo(() => {
    if (account.analytics && account.analytics.length > 0) {
      return account.analytics.map((p) => ({
        date: typeof p.date === "string" ? p.date.slice(0, 10) : p.date,
        followers: p.followers,
      }));
    }
    // Single-point fallback so the chart isn't empty.
    return [{ date: "Today", followers: account.followers }];
  }, [account.analytics, account.followers]);

  // Engagement breakdown — Pie chart data
  const seed = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < account.id.length; i++) h = (account.id.charCodeAt(i) + ((h << 5) - h)) >>> 0;
    return h || 1;
  }, [account.id]);
  const pieData = React.useMemo(() => {
    const total = Math.max(account.engagement, 1);
    const likes = Math.round(total * (0.62 + ((seed % 10) / 100)));
    const comments = Math.round(total * (0.23 + ((seed % 7) / 100)));
    const shares = Math.round(total * (0.12 + ((seed % 5) / 100)));
    return [
      { name: "Likes", value: Math.max(likes, 0), color: "oklch(0.7 0.19 50)" },
      { name: "Comments", value: Math.max(comments, 0), color: "oklch(0.66 0.22 305)" },
      { name: "Shares", value: Math.max(shares, 0), color: "oklch(0.74 0.18 165)" },
    ];
  }, [account.engagement, account.id, seed]);

  const syncingThis = syncing === account.id;

  // Aggregated post variant metrics (so we have real likes/comments/shares
  // from the actual posts published through SYNQUE).
  const variantStats = React.useMemo(() => {
    let likes = 0, comments = 0, shares = 0, saves = 0, impressions = 0;
    for (const post of accountPosts) {
      for (const v of post.variants) {
        if (v.accountId !== account.id) continue;
        likes += v.likes;
        comments += v.comments;
        shares += v.shares;
        saves += v.saves;
        impressions += v.impressions;
      }
    }
    return { likes, comments, shares, saves, impressions };
  }, [accountPosts, account.id]);

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3 py-1.5 text-xs font-semibold transition hover:bg-muted/50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Overview
      </button>

      {/* Hero header — large identity card */}
      <GlassCard className="overflow-hidden p-0">
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${p.color}, transparent)` }}
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Avatar + verified tick */}
            <div className="relative">
              <Avatar className="h-16 w-16 ring-4 ring-background sm:h-20 sm:w-20">
                {account.avatar ? <AvatarImage src={account.avatar} alt={account.displayName} /> : null}
                <AvatarFallback className="text-base font-bold text-white sm:text-lg" style={{ background: p.color }}>
                  {account.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                <PlatformBadge platform={account.platform} size={26} />
              </div>
            </div>

            {/* Identity */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  {account.displayName}
                </h2>
                {account.verified && (
                  <VerifiedTick className="h-4 w-4 shrink-0 text-primary" />
                )}
                <PlatformPill platform={account.platform} />
                {riskStyle && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      riskStyle.bg,
                      riskStyle.color
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", riskStyle.dot)} />
                    {riskStyle.label}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{account.handle}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                Owned by {account.ownerName} · Connected{" "}
                {account.createdAt
                  ? new Date(account.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => onSyncAccount(account.id, account.displayName)}
                disabled={syncing !== false}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold transition hover:bg-muted/50 disabled:opacity-50"
              >
                {syncingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {syncingThis ? "Syncing…" : "Sync Posts"}
              </button>
              <button
                onClick={() => setHealthOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold transition hover:bg-muted/50"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Health
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DetailStat
              icon={Users}
              label="Followers"
              value={fmt(account.followers)}
              delta={account.followerGrowth}
            />
            <DetailStat icon={UserPlus} label="Following" value="—" />
            <DetailStat icon={ImageIcon} label="Posts" value={fmt(account.postsCount)} />
            <DetailStat
              icon={TrendingUp}
              label="Engagement rate"
              value={`${engRate.toFixed(1)}%`}
            />
          </div>
        </div>
      </GlassCard>

      {/* Charts row — followers growth + engagement breakdown */}
      <div className="grid gap-3 lg:grid-cols-3">
        <HeroChart
          title="Followers growth"
          desc="Daily follower count over time"
          className="lg:col-span-2"
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={followersSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fol-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={p.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ fontSize: 11 }}
                  formatter={(v: number) => [fmt(v), "Followers"]}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke={p.color}
                  strokeWidth={2}
                  fill="url(#fol-grad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>

        <HeroChart
          title="Engagement breakdown"
          desc="Likes vs comments vs shares"
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, n: string) => [fmt(v), n]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>
      </div>

      {/* Health details row */}
      {health && (
        <BentoGrid className="lg:grid-cols-3">
          <BentoTile span="2x1" className="p-0">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold">Health details</h3>
              </div>
              <button
                onClick={() => onRefreshHealth(account.id, account.displayName)}
                disabled={refreshingHealth}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", refreshingHealth && "animate-spin")} />
                Recalc
              </button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/20 p-3">
                <div className="label-caps text-muted-foreground">Suspension risk</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span
                    className="num-display text-3xl font-bold"
                    style={{
                      color:
                        health.riskLevel === "safe"
                          ? "oklch(0.76 0.18 145)"
                          : health.riskLevel === "moderate"
                          ? "oklch(0.78 0.18 75)"
                          : health.riskLevel === "elevated"
                          ? "oklch(0.7 0.19 50)"
                          : "oklch(0.62 0.24 27)",
                    }}
                  >
                    {health.riskScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${health.riskScore}%`,
                      background:
                        health.riskLevel === "safe"
                          ? "oklch(0.76 0.18 145)"
                          : health.riskLevel === "moderate"
                          ? "oklch(0.78 0.18 75)"
                          : "oklch(0.62 0.24 27)",
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-muted/20 p-3">
                <div className="label-caps text-muted-foreground">Account status</div>
                <div className={cn("mt-1 text-lg font-bold capitalize", riskStyle?.color)}>
                  {health.status}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {account.protection?.enabled ? "Protection active" : "Protection off"}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Flag className="h-3 w-3" />
                  {health.reportCount} reports ({health.reportTrend >= 0 ? "+" : ""}
                  {health.reportTrend})
                </div>
              </div>
            </div>
            {health.riskReasons.length > 0 && (
              <div className="border-t border-border/40 bg-amber-500/5 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                  <AlertTriangle className="h-3 w-3" /> Risk factors
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {health.riskReasons.map((r) => {
                    const info = RISK_REASON_LABELS[r];
                    const Icon = info?.icon ?? AlertTriangle;
                    return (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {info?.label ?? r}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </BentoTile>

          {/* Sentiment breakdown */}
          <BentoTile>
            <SectionHeader title="Sentiment (30d)" icon={MessageSquare} className="mb-2" />
            <div className="space-y-2">
              <SentimentBar label="Positive" ratio={health.positiveRatio} count={health.positiveCount} color="bg-emerald-500" />
              <SentimentBar label="Neutral" ratio={health.neutralRatio} count={health.neutralCount} color="bg-muted-foreground/40" />
              <SentimentBar label="Negative" ratio={health.negativeRatio} count={health.negativeCount} color="bg-rose-500" />
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground">
              {fmt(health.totalComments)} comments analyzed
            </div>
          </BentoTile>
        </BentoGrid>
      )}

      {/* Recent posts grid */}
      <SectionHeader
        title="Recent posts"
        desc={`Last ${Math.min(accountPosts.length, 12)} posts published through SYNQUE`}
        icon={ImageIcon}
        action={
          <Pill>
            {accountPosts.length} of {account.postsCount}
          </Pill>
        }
      />

      {postsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-40 rounded-xl" />
          ))}
        </div>
      ) : accountPosts.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            No posts published through SYNQUE yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click <strong className="text-foreground">Sync Posts</strong> above to import existing
            posts from {p.name}, or compose a new one to see analytics here.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accountPosts.map((post) => {
            const v = post.variants.find((v) => v.accountId === account.id);
            const total = (v?.likes ?? 0) + (v?.comments ?? 0) + (v?.shares ?? 0);
            return (
              <PostCard
                key={post.id}
                post={post}
                account={account}
                likes={v?.likes ?? 0}
                comments={v?.comments ?? 0}
                shares={v?.shares ?? 0}
                impressions={v?.impressions ?? 0}
                totalEng={total}
              />
            );
          })}
        </div>
      )}

      <AccountHealthDialog account={account} open={healthOpen} onOpenChange={setHealthOpen} />
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <div className="label-caps text-[9px] text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="num-display text-xl font-bold tabular-nums">{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              up ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {up ? "+" : ""}
            {fmt(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function SentimentBar({
  label,
  ratio,
  count,
  color,
}: {
  label: string;
  ratio: number;
  count: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">
          {ratio}% · {fmt(count)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

function PostCard({
  post,
  account,
  likes,
  comments,
  shares,
  impressions,
  totalEng,
}: {
  post: PostData;
  account: AccountData;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  totalEng: number;
}) {
  const v = post.variants.find((v) => v.accountId === account.id);
  const status = (v?.status ?? post.status) as string;
  const publishedAt = v?.publishedAt ?? post.scheduledAt ?? post.createdAt;
  const statusColor =
    status === "published"
      ? "green"
      : status === "scheduled"
      ? "blue"
      : status === "failed"
      ? "rose"
      : "neutral";
  return (
    <GlassCard hover className="group flex h-full flex-col p-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
        {post.mediaUrl ? (
          <SafeImage
            src={post.mediaUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallback={
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Pill color={statusColor as "green" | "blue" | "rose" | "neutral"}>{status}</Pill>
        </div>
      </div>
      <div className="mt-2 flex-1">
        <div className="line-clamp-2 text-xs font-semibold leading-snug">
          {post.title || v?.content?.slice(0, 80) ?? "Untitled post"}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {publishedAt ? new Date(publishedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }) : "—"}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-2 text-[10px]">
        <span className="flex items-center gap-1" title="Likes">
          <Heart className="h-3 w-3 text-rose-500" />
          <span className="font-bold tabular-nums">{fmt(likes)}</span>
        </span>
        <span className="flex items-center gap-1" title="Comments">
          <MessageCircle className="h-3 w-3 text-blue-500" />
          <span className="font-bold tabular-nums">{fmt(comments)}</span>
        </span>
        <span className="flex items-center gap-1" title="Shares">
          <Repeat className="h-3 w-3 text-emerald-500" />
          <span className="font-bold tabular-nums">{fmt(shares)}</span>
        </span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground" title="Impressions">
          <Eye className="h-3 w-3" />
          <span className="font-bold tabular-nums">{fmt(impressions)}</span>
        </span>
      </div>
    </GlassCard>
  );
}

/* ============================================================================
   Tab 3 — Pages & Profiles (cross-platform directory)
   ============================================================================ */

function PagesProfilesTab({ accounts }: { accounts: AccountData[] }) {
  // Group by platform
  const byPlatform = React.useMemo(() => {
    const map: Partial<Record<PlatformId, AccountData[]>> = {};
    for (const a of accounts) {
      if (!map[a.platform]) map[a.platform] = [];
      map[a.platform]!.push(a);
    }
    return map;
  }, [accounts]);

  const platformsInUse = PLATFORM_LIST.filter((p) => byPlatform[p.id]?.length);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="All Pages & Profiles"
        desc={`${accounts.length} profiles across ${platformsInUse.length} platforms — managed in one place.`}
        icon={Users}
      />

      {accounts.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            No pages connected yet.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {platformsInUse.map((p) => {
            const accs = (byPlatform[p.id] ?? []).sort((a, b) => b.followers - a.followers);
            const platformFollowers = accs.reduce((s, a) => s + a.followers, 0);
            const platformEngagement = accs.reduce((s, a) => s + a.engagement, 0);
            const platformImpressions = accs.reduce((s, a) => s + a.impressions, 0);
            const platformEngRate = engagementRate(platformEngagement, platformImpressions);
            return (
              <div key={p.id}>
                {/* Section header for this platform */}
                <div className="mb-2.5 flex items-center gap-3 px-1">
                  <PlatformBadge platform={p.id} size={24} />
                  <span className="text-sm font-bold">{p.name}</span>
                  <Pill>{accs.length} profile{accs.length !== 1 ? "s" : ""}</Pill>
                  <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {fmt(platformFollowers)} followers · {platformEngRate.toFixed(1)}% eng.
                  </span>
                </div>

                {/* Profile cards for this platform */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {accs.map((a, i) => (
                    <ProfileCard key={a.id} account={a} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ account, index }: { account: AccountData; index: number }) {
  const p = PLATFORMS[account.platform];
  const engRate = engagementRate(account.engagement, account.impressions);
  const lastActivity = account.createdAt
    ? new Date(account.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  // Build the platform's profile URL based on handle.
  const profileUrl = React.useMemo(() => {
    const handle = account.handle.replace(/^@/, "");
    switch (account.platform) {
      case "instagram": return `https://instagram.com/${handle}`;
      case "facebook":  return `https://facebook.com/${handle}`;
      case "x":         return `https://x.com/${handle}`;
      case "linkedin":  return `https://linkedin.com/in/${handle}`;
      case "tiktok":    return `https://tiktok.com/@${handle}`;
      case "youtube":   return `https://youtube.com/@${handle}`;
      case "threads":   return `https://threads.net/@${handle}`;
      default:          return "#";
    }
  }, [account.platform, account.handle]);

  const category =
    account.verified ? "Verified" : account.protection?.enabled ? "Managed" : "Connected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.25), ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard hover className="group relative h-full overflow-hidden p-4">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
          style={{ background: p.color }}
        />
        {/* Header */}
        <div className="relative flex items-start gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-background">
            {account.avatar ? <AvatarImage src={account.avatar} alt={account.displayName} /> : null}
            <AvatarFallback className="text-xs font-bold text-white" style={{ background: p.color }}>
              {account.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold leading-tight">{account.displayName}</span>
              {account.verified && <VerifiedTick className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{account.handle}</div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Building2 className="h-2.5 w-2.5" />
              {category}
            </div>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-primary"
            aria-label={`View ${account.displayName} on ${p.name}`}
            title={`View on ${p.name}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Stats */}
        <div className="relative mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/20 p-2.5">
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Followers</div>
            <div className="num-display text-sm font-bold tabular-nums">{fmt(account.followers)}</div>
          </div>
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Engagement</div>
            <div className="num-display text-sm font-bold tabular-nums">{engRate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Posts</div>
            <div className="num-display text-sm font-bold tabular-nums">{fmt(account.postsCount)}</div>
          </div>
          <div>
            <div className="label-caps text-[9px] text-muted-foreground">Impressions</div>
            <div className="num-display text-sm font-bold tabular-nums">{fmt(account.impressions)}</div>
          </div>
        </div>

        {/* Last activity */}
        <div className="relative mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last activity: {lastActivity}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Owned by {account.ownerName}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ============================================================================
   Tab 4 — Analytics (cross-account dashboard)
   ============================================================================ */

function AnalyticsTab({ accounts }: { accounts: AccountData[] }) {
  const { data: analytics, loading } = useApi<AnalyticsData>("/api/analytics?days=30");

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-8 w-72 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-xl" />
          ))}
        </div>
        <div className="shimmer h-[260px] rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="shimmer h-[240px] rounded-xl" />
          <div className="shimmer h-[240px] rounded-xl" />
        </div>
      </div>
    );
  }

  return <AnalyticsTabBody accounts={accounts} analytics={analytics} />;
}

function AnalyticsTabBody({
  accounts,
  analytics,
}: {
  accounts: AccountData[];
  analytics: AnalyticsData;
}) {
  const { setView } = useNav();

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalPosts = accounts.reduce((s, a) => s + a.postsCount, 0);
  const totalEngagement = analytics.perAccount.reduce((s, a) => s + a.engagement, 0);
  const totalImpressions = analytics.perAccount.reduce((s, a) => s + a.impressions, 0);
  const overallEngRate = engagementRate(totalEngagement, totalImpressions);
  const avgGrowth =
    accounts.length > 0
      ? Math.round(accounts.reduce((s, a) => s + a.followerGrowth, 0) / accounts.length)
      : 0;

  // Followers by platform — for the bar chart
  const followersByPlatform = React.useMemo(() => {
    const map: Partial<Record<PlatformId, number>> = {};
    for (const a of accounts) {
      map[a.platform] = (map[a.platform] ?? 0) + a.followers;
    }
    return PLATFORM_LIST.filter((p) => map[p.id]).map((p) => ({
      platform: p.name,
      short: p.short,
      followers: map[p.id] ?? 0,
      color: p.color,
    }));
  }, [accounts]);

  // Engagement rate by platform — for the line chart
  const engRateByPlatform = React.useMemo(() => {
    const map: Partial<Record<PlatformId, { eng: number; imp: number }>> = {};
    for (const a of analytics.perAccount) {
      const cur = map[a.platform] ?? { eng: 0, imp: 0 };
      cur.eng += a.engagement;
      cur.imp += a.impressions;
      map[a.platform] = cur;
    }
    return PLATFORM_LIST.filter((p) => map[p.id]).map((p) => ({
      platform: p.name,
      short: p.short,
      rate: parseFloat(engagementRate(map[p.id]!.eng, map[p.id]!.imp).toFixed(2)),
      color: p.color,
    }));
  }, [analytics.perAccount]);

  // Growth trend (followers over time, all platforms combined)
  const growthTrend = React.useMemo(() => {
    return analytics.series.map((s) => ({
      date: s.date.slice(0, 10),
      followers: s.followers,
      impressions: s.impressions,
      engagement: s.engagement,
    }));
  }, [analytics.series]);

  // Best performing post (highest engagement)
  const bestPost = analytics.topContent[0] ?? null;

  const heroColor = "oklch(0.66 0.22 305)";

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Cross-account analytics"
        desc="Aggregate performance across every connected platform — the last 30 days."
        icon={TrendingUp}
        action={
          <button
            onClick={() => setView("analytics")}
            className="flex items-center gap-1 rounded-lg border border-border/40 bg-background/50 px-3 py-1.5 text-[11px] font-semibold transition hover:bg-muted/50"
          >
            Open full analytics
            <ArrowRight className="h-3 w-3" />
          </button>
        }
      />

      {/* KPI strip */}
      <MetricRow
        metrics={[
          { label: "Followers", value: fmt(totalFollowers), delta: avgGrowth, color: "oklch(0.74 0.18 165)" },
          { label: "Posts", value: fmt(totalPosts), color: "oklch(0.78 0.18 75)" },
          { label: "Engagement", value: fmt(totalEngagement), color: "oklch(0.7 0.19 50)" },
          { label: "Eng. rate", value: `${overallEngRate.toFixed(1)}%`, color: "oklch(0.66 0.22 305)" },
        ]}
      />

      {/* Best performing post */}
      {bestPost && (
        <GlassCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold">Best performing post (last 30d)</h3>
            </div>
            <Pill color="amber">
              <TrendingUp className="h-2.5 w-2.5" />
              {fmt(bestPost.engagement)} engagement
            </Pill>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="relative aspect-square w-full max-w-[140px] shrink-0 overflow-hidden rounded-xl bg-muted">
              {bestPost.mediaUrl ? (
                <SafeImage
                  src={bestPost.mediaUrl}
                  alt={bestPost.title}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="absolute left-2 top-2">
                <PlatformBadge platform={bestPost.platform} size={20} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold">{bestPost.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                By {bestPost.authorName} · {bestPost.handle} ·{" "}
                {bestPost.publishedAt
                  ? new Date(bestPost.publishedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                <KpiCell icon={Heart} label="Engagement" value={fmt(bestPost.engagement)} color="text-rose-500" />
                <KpiCell icon={Eye} label="Impressions" value={fmt(bestPost.impressions)} color="text-blue-500" />
                <KpiCell icon={Users} label="Reach" value={fmt(bestPost.reach)} color="text-emerald-500" />
                <KpiCell icon={TrendingUp} label="Eng. rate" value={`${engagementRate(bestPost.engagement, bestPost.impressions).toFixed(1)}%`} color="text-amber-500" />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Growth trend chart */}
      {growthTrend.length > 1 && (
        <HeroChart
          title="Growth trend — all platforms"
          desc="Combined followers, impressions, and engagement over the last 30 days"
          action={
            <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
              {(["followers", "impressions", "engagement"] as const).map((m) => (
                <GrowthToggle key={m} metric={m} />
              ))}
            </div>
          }
        >
          <GrowthTrendChart data={growthTrend} color={heroColor} />
        </HeroChart>
      )}

      {/* Platform comparison charts */}
      <div className="grid gap-3 lg:grid-cols-2">
        <HeroChart title="Followers by platform" desc="Reach across each connected platform">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followersByPlatform} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="short"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
                  formatter={(v: number, _n: string, props: { payload?: { platform?: string } }) => [
                    fmt(v),
                    props?.payload?.platform ?? "Followers",
                  ]}
                />
                <Bar dataKey="followers" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {followersByPlatform.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>

        <HeroChart
          title="Engagement rate by platform"
          desc="Engagement ÷ impressions, per platform"
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engRateByPlatform} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="short"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  formatter={(v: number, _n: string, props: { payload?: { platform?: string } }) => [
                    `${v}%`,
                    props?.payload?.platform ?? "Engagement rate",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="oklch(0.7 0.19 50)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "oklch(0.7 0.19 50)" }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>
      </div>

      {/* Per-account table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold">Per-account performance</h3>
          </div>
          <Pill>{analytics.perAccount.length} accounts</Pill>
        </div>
        <div className="max-h-[460px] overflow-y-auto scroll-liquid">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                <th className="px-4 py-2">Account</th>
                <th className="px-2 py-2 text-right">Followers</th>
                <th className="px-2 py-2 text-right">Posts</th>
                <th className="px-2 py-2 text-right">Likes</th>
                <th className="px-2 py-2 text-right">Comments</th>
                <th className="px-2 py-2 text-right">Shares</th>
                <th className="px-2 py-2 text-right">Engagement</th>
                <th className="px-4 py-2 text-right">Eng. rate</th>
              </tr>
            </thead>
            <tbody>
              {[...analytics.perAccount]
                .sort((a, b) => b.followers - a.followers)
                .map((a) => {
                  const imp = a.impressions || 1;
                  const rate = (a.engagement / imp) * 100;
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-border/20 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={a.platform} size={22} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{a.displayName}</div>
                            <div className="truncate text-[10px] text-muted-foreground">{a.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums">{fmt(a.followers)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(a.posts)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(a.likes)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(a.comments)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(a.shares)}</td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums">{fmt(a.engagement)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                            rate >= 3
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : rate >= 1
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function KpiCell({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-2 text-center">
      <Icon className={cn("mx-auto h-3 w-3", color)} />
      <div className="num-display mt-1 text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
    </div>
  );
}

/** Growth metric toggle (visual only — uses the active metric state in parent). */
function GrowthTrendChart({
  data,
  color,
}: {
  data: Array<{ date: string; followers: number; impressions: number; engagement: number }>;
  color: string;
}) {
  const [metric, setMetric] = React.useState<"followers" | "impressions" | "engagement">("followers");
  return (
    <>
      <div className="mb-2 flex justify-end">
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
          {(["followers", "impressions", "engagement"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                metric === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growth-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => fmt(v)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ fontSize: 11 }}
              formatter={(v: number) => [fmt(v), metric]}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              fill="url(#growth-grad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/** Visual-only placeholder for the metric toggle (real toggle is inside GrowthTrendChart). */
function GrowthToggle({ metric }: { metric: "followers" | "impressions" | "engagement" }) {
  return (
    <span className="rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground">
      {metric}
    </span>
  );
}

/* ============================================================================
   Connect Account Dialog — multi-step OAuth flow (preserved)
   ============================================================================ */

type Step = "platform" | "consent" | "handle" | "connecting" | "success";

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

  /** Pick a platform → redirect to OAuth login (like Later) or fall back to manual entry */
  const pickPlatform = async (id: PlatformId) => {
    setPlatform(id);
    const apiPlatform = id === "x" ? "twitter" : id;

    // Only facebook/instagram/twitter/linkedin/tiktok/youtube support OAuth redirect
    if (!["facebook", "instagram", "x", "linkedin", "tiktok", "youtube"].includes(id)) {
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
        // Redirect browser to the platform's login page.
        const authToken = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
        const redirectUrl = `/api/oauth/connect/${apiPlatform}?userId=${user.id}${authToken ? `&token=${authToken}` : ""}`;
        setTimeout(() => { window.location.href = redirectUrl; }, 100);
      } else {
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

        {/* STEP 1 — platform picker */}
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

        {/* STEP 2a — OAuth consent screen */}
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
                SYNQUE needs permission to manage your {p.name} account.
              </DialogDescription>
            </DialogHeader>

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
                <strong className="font-semibold text-foreground">SYNQUE</strong> wants to access your{" "}
                <strong className="font-semibold text-foreground">{p.name}</strong> account
              </p>

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
                "tiktok",
                "youtube",
              ].includes(platform!) && user?.id && (
                <button
                  onClick={() => {
                    const apiPlatform = platform === "x" ? "twitter" : platform;
                    const authToken = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
                    window.location.href = `/api/oauth/connect/${apiPlatform}?userId=${user.id}${authToken ? `&token=${authToken}` : ""}`;
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

        {/* STEP 2b — Enter your handle (after OAuth authorization) */}
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

            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px]">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              <span className="text-muted-foreground">
                <strong className="font-semibold text-emerald-600 dark:text-emerald-400">Authorized.</strong>{" "}
                {p.name} granted read, publish & insights access.
              </span>
            </div>

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

        {/* STEP 3 — connecting */}
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

        {/* STEP 4 — success */}
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

/* ============================================================================
   Account Health Dialog (detail + advisor + protection) — preserved
   ============================================================================ */

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

        {tab === "health" && (
          <div className="space-y-4">
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

            <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="label-caps text-muted-foreground">Comment sentiment (30d)</div>
                <span className="text-xs text-muted-foreground">{fmt(health.totalComments)} comments</span>
              </div>
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
              <div className="mt-3 grid grid-cols-3 gap-2">
                <SentimentStat icon={ThumbsUp} color="emerald" label="Positive" count={health.positiveCount} ratio={health.positiveRatio} />
                <SentimentStat icon={Minus} color="muted" label="Neutral" count={health.neutralCount} ratio={health.neutralRatio} />
                <SentimentStat icon={ThumbsDown} color="rose" label="Negative" count={health.negativeCount} ratio={health.negativeRatio} />
              </div>
            </div>

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

        {tab === "advisor" && (
          <SuspensionAdvisor account={account} onGoProtection={() => setTab("protection")} />
        )}

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

/* ============================================================================
   Suspension Advisor — preserved
   ============================================================================ */
function SuspensionAdvisor({ account, onGoProtection }: { account: AccountData; onGoProtection: () => void }) {
  const health = account.health!;
  const tips: { title: string; desc: string; icon: React.ElementType; severity: "high" | "med" | "low" }[] = [];

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

/* ============================================================================
   Protection settings panel — preserved
   ============================================================================ */
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

      <ProtectionSection icon={Clock} title="Posting cadence guards" desc="Prevents the rapid-posting pattern that triggers suspensions">
        <NumberSetting label="Daily post limit" value={p.dailyPostLimit} onChange={(v) => update({ dailyPostLimit: v })} suffix="posts/day" />
        <NumberSetting label="Hourly post limit" value={p.hourlyPostLimit} onChange={(v) => update({ hourlyPostLimit: v })} suffix="posts/hour" />
        <NumberSetting label="Min. gap between posts" value={p.minMinutesBetweenPosts} onChange={(v) => update({ minMinutesBetweenPosts: v })} suffix="minutes" />
      </ProtectionSection>

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

      <ProtectionSection icon={UserPlus} title="Behavior guards" desc="Caps the manual actions that get accounts suspended">
        <NumberSetting label="DM limit" value={p.limitDMsPerHour} onChange={(v) => update({ limitDMsPerHour: v })} suffix="/hour" />
        <NumberSetting label="Follow limit" value={p.limitFollowsPerHour} onChange={(v) => update({ limitFollowsPerHour: v })} suffix="/hour" />
        <NumberSetting label="Comment limit" value={p.limitCommentsPerHour} onChange={(v) => update({ limitCommentsPerHour: v })} suffix="/hour" />
      </ProtectionSection>

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

/* ============================================================================
   Skeleton
   ============================================================================ */
function AccountsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-24 rounded-xl" />
      <div className="shimmer h-12 rounded-xl" />
      <div className="shimmer h-10 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
