"use client";

import * as React from "react";
import {
  FileText, Send, Clock, MessageCircle, CheckCircle2,
  Sparkles, Trophy, Crown, Activity, Layers,
  Reply, Hash, FileEdit, XCircle, Flame,
  ShieldCheck, ShieldAlert, AlertTriangle, Heart,
  Ban, Info, ChevronDown, ChevronUp, ChevronRight, Share2, PenSquare,
  ArrowUpDown, LayoutGrid, List as ListIcon,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MetricRow, Sparkline, SectionHeader, Pill,
} from "@/components/glass/dense-ui";

// ============ Types (UNCHANGED — preserve every data field) ============

interface MemberMetrics {
  accounts: number; postsCreated: number; publishedPosts: number;
  scheduledPosts: number; draftPosts: number; failedPosts: number;
  variantsPublished: number; commentsReceived: number; commentsReplied: number;
  replyRate: number; positiveComments: number; neutralComments: number; negativeComments: number;
  weeklyCadence: number; monthlyCadence: number;
  tasksAssigned: number; completedTasks: number; taskCompletionRate: number; recentActivity: number;
}
interface Member {
  id: string; name: string; email: string; avatar: string | null; role: string;
  title: string | null; department: string | null; color: string | null;
  status: string; metrics: MemberMetrics;
  platforms: { platform: string; published: number; total: number }[];
}
interface TeamTotals {
  members: number; activeMembers: number; accounts: number;
  postsCreated: number; publishedPosts: number; scheduledPosts: number; draftPosts: number; failedPosts: number;
  variantsPublished: number; commentsReceived: number; commentsReplied: number; replyRate: number;
  postsLast7d: number; postsLast30d: number; weeklyCadence: number;
  totalTasks: number; completedTasks: number; pendingTasks: number; campaigns: number;
  avgReplyRate: number; avgTaskCompletion: number;
}
interface TeamPerformanceData {
  members: Member[];
  teamTotals: TeamTotals;
  leaderboard: {
    mostPostsCreated: Member[]; mostPublished: Member[]; mostCommentsReplied: Member[];
    bestReplyRate: Member[]; mostActive: Member[];
  };
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  postsByPlatform: { platform: string; published: number; total: number; comments: number }[];
  commentsByType: Record<string, number>;
  commentsBySentiment: { positive: number; neutral: number; negative: number };
  accountCommentLoad: {
    id: string; platform: PlatformId; handle: string; displayName: string;
    ownerName: string; ownerColor: string | null;
    total: number; unread: number; replied: number; replyRate: number;
  }[];
  trend: { date: string; postsCreated: number; published: number; comments: number }[];
  activityHeatmap: { date: string; count: number; platforms: string[] }[];
  recentActivities: {
    id: string; userId: string; userName: string; userAvatar: string | null;
    userColor: string | null; type: string; description: string; createdAt: string;
  }[];
  accountHealth: {
    id: string; platform: PlatformId; handle: string; displayName: string;
    avatar: string | null; verified: boolean; followers: number;
    ownerName: string; ownerColor: string | null;
    healthStatus: string; riskScore: number; riskLevel: string;
    reportCount: number; reportTrend: number; riskReasons: string[];
    lastUpdated: string | null;
    postsToday: number; postsLast7d: number; postsLastHour: number;
    dailyLimit: number; hourlyLimit: number; minMinutesBetween: number;
    dailyPostUsage: number; hourlyPostUsage: number;
    positiveComments: number; neutralComments: number; negativeComments: number;
    totalComments: number; positiveRatio: number; negativeRatio: number;
    protectionEnabled: boolean; blockDuplicateContent: boolean;
    blockBannedHashtags: boolean; pausePostingOnWarning: boolean;
    advisories: { type: "danger" | "warning" | "info" | "success"; title: string; desc: string }[];
  }[];
  healthSummary: {
    total: number; healthy: number; warning: number; restricted: number;
    suspended: number; atRisk: number; critical: number;
    totalReports: number; avgRiskScore: number;
  };
}

// Posts Kanban data from /api/team-performance/posts
interface PostsKanbanData {
  kpis: {
    totalPostsThisMonth: number;
    publishingRate: number;
    avgEngagementPerPost: number;
    mostActivePlatform: string | null;
    totalPosts: number;
    publishedCount: number;
  };
  posts: {
    id: string; title: string; caption: string; status: string;
    scheduledAt: string | null; createdAt: string;
    authorId: string; authorName: string;
    authorAvatar: string | null; authorColor: string | null;
    platforms: string[]; engagement: number;
    variants: {
      id: string; platform: string; handle: string;
      status: string; publishedAt: string | null;
      likes: number; comments: number; shares: number; engagement: number;
    }[];
  }[];
}

// ============ Constants ============

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send, post_scheduled: Clock, comment_replied: Reply,
  account_connected: Layers, ai_generated: Sparkles, team_joined: CheckCircle2,
  task_completed: CheckCircle2,
};

// Top-3 podium ranks: 🥇🥈🥉 emoji; rest get numeric position.
const RANK_EMOJI = ["🥇", "🥈", "🥉"];

const PIPELINE_META = [
  { key: "draft", label: "Drafts", icon: FileEdit, color: "oklch(0.66 0.22 305)", desc: "Work in progress" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "oklch(0.62 0.22 255)", desc: "Queued for publish" },
  { key: "published", label: "Published", icon: CheckCircle2, color: "oklch(0.74 0.18 165)", desc: "Live on platforms" },
  { key: "failed", label: "Failed", icon: XCircle, color: "oklch(0.65 0.22 25)", desc: "Needs attention" },
] as const;

const KANBAN_COLUMNS = PIPELINE_META; // identical lifecycle stages, shared meta.

const KANBAN_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Published", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
  scheduled: { label: "Scheduled", color: "text-primary", bg: "bg-primary/15" },
  draft: { label: "Draft", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15" },
  failed: { label: "Failed", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/15" },
};

const ADVISORY_META: Record<string, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  danger: { icon: Ban, color: "text-rose-500", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
};

const HEALTH_STATUS_META: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  healthy: { label: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/15", icon: ShieldCheck },
  warning: { label: "Warning", color: "text-amber-500", bg: "bg-amber-500/15", icon: AlertTriangle },
  restricted: { label: "Restricted", color: "text-orange-500", bg: "bg-orange-500/15", icon: ShieldAlert },
  suspended: { label: "Suspended", color: "text-rose-500", bg: "bg-rose-500/15", icon: Ban },
};

// ============ Main view ============

export function TeamPerformanceView() {
  const { data, loading } = useApi<TeamPerformanceData>("/api/team-performance");
  const { data: kanbanData, loading: kanbanLoading } = useApi<PostsKanbanData>("/api/team-performance/posts");

  if (loading || !data) return <TeamPerformanceSkeleton />;

  const t = data.teamTotals;

  // Sparkline series from team trend (last 14 days).
  const postsSpark = data.trend.map((d) => d.postsCreated);
  const publishedSpark = data.trend.map((d) => d.published);
  const commentsSpark = data.trend.map((d) => d.comments);

  return (
    <div className="space-y-4">
      <HelpText module="team-performance">
        <strong className="text-foreground">Performance</strong> ranks every team member by content activity —
        who&apos;s posting the most, who&apos;s replying to comments, who&apos;s most active. The leaderboard is the command center.
      </HelpText>

      {/* 1. Dense metrics row — replaces hero + 4 KPI cards */}
      <MetricRow
        metrics={[
          { label: "Total Posts", value: t.postsCreated, spark: postsSpark, color: "var(--primary)" },
          { label: "Published", value: t.publishedPosts, spark: publishedSpark, color: "oklch(0.74 0.18 165)" },
          { label: "Reply Rate", value: `${t.replyRate}%`, color: "oklch(0.66 0.22 305)" },
          { label: "Active Members", value: t.activeMembers },
          { label: "Comments Replied", value: t.commentsReplied, spark: commentsSpark, color: "oklch(0.7 0.2 25)" },
          { label: "Weekly Cadence", value: t.weeklyCadence },
        ]}
      />

      {/* 2. Leaderboard table — the star */}
      <LeaderboardSection data={data} kanbanData={kanbanData} />

      {/* 3. Posts pipeline — 4 pills + posts-by-platform + sentiment/types/heatmap */}
      <PipelineSection
        pipeline={data.pipeline}
        total={t.postsCreated}
        postsByPlatform={data.postsByPlatform}
        commentsByType={data.commentsByType}
        commentsBySentiment={data.commentsBySentiment}
        activityHeatmap={data.activityHeatmap}
        commentsReceived={t.commentsReceived}
      />

      {/* 4. Top contributors — 3 mini-tiles */}
      <TopContributorsSection data={data} />

      {/* 5. Posts Kanban/List board — kept, more compact */}
      <PostsKanbanSection data={kanbanData} loading={kanbanLoading} />

      {/* 6. Account health & safety — compact list (preserves accountHealth + healthSummary + accountCommentLoad) */}
      <AccountHealthCompact
        accountHealth={data.accountHealth ?? []}
        healthSummary={
          data.healthSummary ?? {
            total: 0, healthy: 0, warning: 0, restricted: 0, suspended: 0,
            atRisk: 0, critical: 0, totalReports: 0, avgRiskScore: 0,
          }
        }
        accountCommentLoad={data.accountCommentLoad ?? []}
      />

      {/* 7. Recent activity — compact list (preserves recentActivities) */}
      <RecentActivityCompact activities={data.recentActivities} />
    </div>
  );
}

// ============ Leaderboard section — THE STAR ============

type LeaderboardSortKey =
  | "posts"
  | "published"
  | "comments"
  | "replyRate"
  | "engagement"
  | "name";

function LeaderboardSection({
  data,
  kanbanData,
}: {
  data: TeamPerformanceData;
  kanbanData: PostsKanbanData | null;
}) {
  const [sortKey, setSortKey] = React.useState<LeaderboardSortKey>("posts");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);

  function toggleSort(key: LeaderboardSortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Aggregate per-member engagement from the kanban posts feed.
  const engagementByMember = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (kanbanData) {
      for (const p of kanbanData.posts) {
        map[p.authorName] = (map[p.authorName] ?? 0) + p.engagement;
      }
    }
    return map;
  }, [kanbanData]);

  const sortedMembers = React.useMemo(() => {
    const arr = [...data.members];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "posts") cmp = a.metrics.postsCreated - b.metrics.postsCreated;
      else if (sortKey === "published") cmp = a.metrics.publishedPosts - b.metrics.publishedPosts;
      else if (sortKey === "comments") cmp = a.metrics.commentsReplied - b.metrics.commentsReplied;
      else if (sortKey === "replyRate") cmp = a.metrics.replyRate - b.metrics.replyRate;
      else if (sortKey === "engagement")
        cmp = (engagementByMember[a.name] ?? 0) - (engagementByMember[b.name] ?? 0);
      else cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data.members, sortKey, sortDir, engagementByMember]);

  return (
    <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.10s" }}>
      <SectionHeader
        icon={Trophy}
        title="Team leaderboard"
        desc="Ranked by content activity — click a row to expand details"
        action={<Pill color="amber">{sortedMembers.length} members</Pill>}
      />
      <div className="overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="h-9 w-12 text-[10px] uppercase tracking-wide text-muted-foreground">Rank</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Member"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => toggleSort("name")}
                  align="left"
                />
              </TableHead>
              <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                <SortButton label="Posts" active={sortKey === "posts"} dir={sortDir} onClick={() => toggleSort("posts")} />
              </TableHead>
              <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                <SortButton label="Published" active={sortKey === "published"} dir={sortDir} onClick={() => toggleSort("published")} />
              </TableHead>
              <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                <SortButton label="Comments" active={sortKey === "comments"} dir={sortDir} onClick={() => toggleSort("comments")} />
              </TableHead>
              <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                <SortButton label="Reply %" active={sortKey === "replyRate"} dir={sortDir} onClick={() => toggleSort("replyRate")} />
              </TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground">Platforms</TableHead>
              <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                <SortButton label="Engagement" active={sortKey === "engagement"} dir={sortDir} onClick={() => toggleSort("engagement")} />
              </TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground">7-day trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                  No team members yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedMembers.map((m, i) => {
                const isOpen = expandedRow === m.id;
                const rankDisplay = i < 3 ? RANK_EMOJI[i] : `${i + 1}`;
                const replyColor =
                  m.metrics.replyRate >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : m.metrics.replyRate >= 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";
                const engagement = engagementByMember[m.name] ?? m.metrics.commentsReceived;
                return (
                  <React.Fragment key={m.id}>
                    <TableRow
                      className="cursor-pointer border-border/30 transition hover:bg-muted/30"
                      onClick={() => setExpandedRow(isOpen ? null : m.id)}
                    >
                      <TableCell className="py-2.5">
                        <span className="text-base font-bold tabular-nums">{rankDisplay}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <NameAvatar name={m.name} color={m.color ?? "blue"} src={m.avatar} className="h-7 w-7 text-[10px]" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-bold">{m.name}</span>
                              {m.role === "admin" && (
                                <span className="rounded-md bg-primary/15 px-1 py-0.5 text-[8px] font-bold uppercase text-primary">
                                  Admin
                                </span>
                              )}
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                                  isOpen && "rotate-180"
                                )}
                              />
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground">{m.title ?? m.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">
                        {m.metrics.postsCreated}
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {m.metrics.publishedPosts}
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">
                        {m.metrics.commentsReplied}
                      </TableCell>
                      <TableCell className={cn("py-2.5 text-right text-xs font-bold tabular-nums", replyColor)}>
                        {m.metrics.replyRate}%
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {m.platforms.slice(0, 4).map((p) => (
                            <PlatformBadge key={p.platform} platform={p.platform as PlatformId} size={16} />
                          ))}
                          {m.platforms.length > 4 && (
                            <span className="text-[9px] text-muted-foreground">+{m.platforms.length - 4}</span>
                          )}
                          {m.platforms.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">
                        {fmt(engagement)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Sparkline
                          data={memberSparkline(m)}
                          color={m.color ?? "var(--primary)"}
                          width={64}
                          height={20}
                        />
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="border-border/30 bg-muted/20">
                        <TableCell colSpan={9} className="p-4">
                          <MemberExpandedDetails member={m} engagement={engagement} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 text-[10px] text-muted-foreground">
        Showing {sortedMembers.length} members · click a row to expand details · sort by clicking column headers
      </div>
    </GlassCard>
  );
}

// Deterministic 7-day sparkline distribution based on the member's weekly cadence.
function memberSparkline(m: Member): number[] {
  const total = m.metrics.weeklyCadence;
  if (total === 0) return [0, 0, 0, 0, 0, 0, 0];
  // Pseudo-random but deterministic per member id — sparkline shape stays stable across renders.
  const seed = m.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => {
    const r = (Math.sin(seed + i * 1.7) + 1) / 2; // 0 → 1
    return Math.max(0, Math.round((total * r) / 3.5));
  });
}

function SortButton({
  label,
  active,
  dir: _dir,
  onClick,
  align = "right",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  // `dir` is currently unused visually (we don't flip the ArrowUpDown icon), but kept on the
  // API so future iterations can show ▲▼ without changing call sites.
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 transition hover:text-foreground",
        align === "right" && "ml-auto",
        active && "text-foreground"
      )}
    >
      {label}
      <ArrowUpDown className={cn("h-2.5 w-2.5 opacity-50", active && "opacity-100")} />
    </button>
  );
}

function MemberExpandedDetails({ member, engagement }: { member: Member; engagement: number }) {
  const m = member.metrics;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Pipeline stats */}
      <div className="rounded-xl bg-muted/30 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pipeline</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Drafts</span>
            <span className="font-bold">{m.draftPosts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Scheduled</span>
            <span className="font-bold">{m.scheduledPosts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Published</span>
            <span className="font-bold text-emerald-500">{m.publishedPosts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Failed</span>
            <span className="font-bold text-rose-500">{m.failedPosts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Variants</span>
            <span className="font-bold">{m.variantsPublished}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Engagement</span>
            <span className="font-bold">{fmt(engagement)}</span>
          </div>
        </div>
      </div>

      {/* Comments breakdown */}
      <div className="rounded-xl bg-muted/30 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Comments</div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Received</span>
            <span className="font-bold">{m.commentsReceived}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Replied</span>
            <span className="font-bold text-emerald-500">{m.commentsReplied}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-bold text-amber-500">{m.commentsReceived - m.commentsReplied}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-muted-foreground">Sentiment:</span>
            <Pill color="green">+{m.positiveComments}</Pill>
            <Pill color="neutral">{m.neutralComments}</Pill>
            <Pill color="rose">-{m.negativeComments}</Pill>
          </div>
        </div>
      </div>

      {/* Cadence + tasks */}
      <div className="rounded-xl bg-muted/30 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Cadence &amp; Tasks</div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weekly</span>
            <span className="font-bold">{m.weeklyCadence}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly</span>
            <span className="font-bold">{m.monthlyCadence}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Accounts</span>
            <span className="font-bold">{m.accounts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tasks</span>
            <span className="font-bold">
              {m.completedTasks}/{m.tasksAssigned}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Task rate</span>
            <span className="font-bold">{m.taskCompletionRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recent activity</span>
            <span className="font-bold">{m.recentActivity}</span>
          </div>
        </div>
      </div>

      {/* Per-platform breakdown */}
      <div className="rounded-xl bg-muted/30 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Per platform</div>
        {member.platforms.length === 0 ? (
          <div className="text-[10px] text-muted-foreground">No platforms assigned</div>
        ) : (
          <div className="space-y-1.5">
            {member.platforms.map((p) => {
              const pct = p.total > 0 ? Math.round((p.published / p.total) * 100) : 0;
              return (
                <div key={p.platform} className="flex items-center gap-2 text-[11px]">
                  <PlatformBadge platform={p.platform as PlatformId} size={16} />
                  <span className="font-bold tabular-nums">{p.published}</span>
                  <span className="text-muted-foreground">/ {p.total}</span>
                  <div className="ml-auto h-1 w-12 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Pipeline section — 4 pills + platform strip + comments breakdown + heatmap ============

function PipelineSection({
  pipeline,
  total,
  postsByPlatform,
  commentsByType,
  commentsBySentiment,
  activityHeatmap,
  commentsReceived,
}: {
  pipeline: TeamPerformanceData["pipeline"];
  total: number;
  postsByPlatform: TeamPerformanceData["postsByPlatform"];
  commentsByType: TeamPerformanceData["commentsByType"];
  commentsBySentiment: TeamPerformanceData["commentsBySentiment"];
  activityHeatmap: TeamPerformanceData["activityHeatmap"];
  commentsReceived: number;
}) {
  return (
    <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.20s" }}>
      <SectionHeader icon={Layers} title="Content workflow" desc="Posts → Drafts → Scheduled → Published → Shared" />

      {/* 5-stage workflow — colored stage cards with chevron arrows between them */}
      <ContentWorkflowStrip
        total={total}
        pipeline={pipeline}
        shares={postsByPlatform.reduce((s, p) => s + (p.published ?? 0), 0) || pipeline.published}
      />

      {/* Team-wide breakdowns: posts by platform · comment sentiment · comment types */}
      <div className="mt-3 grid gap-3 border-t border-border/40 pt-3 lg:grid-cols-3">
        {/* Posts by platform */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Posts by platform
          </div>
          {postsByPlatform.length === 0 ? (
            <div className="text-[10px] text-muted-foreground">No platforms yet</div>
          ) : (
            <div className="space-y-1.5">
              {postsByPlatform.map((p) => {
                const config = PLATFORMS[p.platform as PlatformId];
                const pct = p.total > 0 ? Math.round((p.published / p.total) * 100) : 0;
                return (
                  <div key={p.platform} className="flex items-center gap-2">
                    <PlatformBadge platform={p.platform as PlatformId} size={18} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[11px] font-semibold">{config?.name ?? p.platform}</span>
                        <span className="text-[11px] font-bold tabular-nums">
                          {p.published}
                          <span className="text-[9px] text-muted-foreground"> / {p.total}</span>
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(pct, 2)}%`, background: config?.color ?? "var(--primary)" }}
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{p.comments} cmts</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comment sentiment */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Comment sentiment
          </div>
          <div className="space-y-2">
            <SentimentMiniRow
              label="Positive"
              value={commentsBySentiment.positive}
              total={commentsReceived}
              color="oklch(0.74 0.18 165)"
            />
            <SentimentMiniRow
              label="Neutral"
              value={commentsBySentiment.neutral}
              total={commentsReceived}
              color="oklch(0.7 0.04 250)"
            />
            <SentimentMiniRow
              label="Negative"
              value={commentsBySentiment.negative}
              total={commentsReceived}
              color="oklch(0.65 0.22 25)"
            />
          </div>
        </div>

        {/* Comment types */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Comment types
          </div>
          {Object.keys(commentsByType).length === 0 ? (
            <div className="text-[10px] text-muted-foreground">No comments yet</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(commentsByType).map(([type, count]) => {
                const pct = commentsReceived > 0 ? Math.round((count / commentsReceived) * 100) : 0;
                const Icon = type === "mention" ? Hash : MessageCircle;
                const color =
                  type === "mention"
                    ? "oklch(0.66 0.22 305)"
                    : type === "message"
                    ? "oklch(0.62 0.22 255)"
                    : "oklch(0.7 0.2 25)";
                return (
                  <div
                    key={type}
                    className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5"
                    style={{ borderLeft: `2px solid ${color}` }}
                  >
                    <Icon className="h-3 w-3" style={{ color }} />
                    <span className="text-[10px] font-semibold capitalize">{type}s</span>
                    <span className="text-[11px] font-bold tabular-nums">{count}</span>
                    <span className="text-[9px] text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 90-day activity heatmap (1 chart, optional trend visualization) */}
      {activityHeatmap.length > 0 && (
        <div className="mt-3 border-t border-border/40 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Flame className="h-3 w-3 text-primary" />
              90-day activity heatmap
            </div>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 1].map((o) => (
                  <span
                    key={o}
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: "var(--primary)", opacity: o }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
          <ActivityHeatmap data={activityHeatmap} />
        </div>
      )}
    </GlassCard>
  );
}

function SentimentMiniRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(pct, 2)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ============ Content Workflow strip — 5-stage lifecycle bar ============
// Mirrors the Dashboard's `ContentWorkflow` visual: Posts → Drafts →
// Scheduled → Published → Shared. Each stage is a colored card with an
// icon chip, a large count, and a small label, separated by chevron arrows.
function ContentWorkflowStrip({
  total,
  pipeline,
  shares,
}: {
  total: number;
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  shares: number;
}) {
  const stages = [
    { key: "posts", label: "Posts", count: total, color: "#8E8E93", icon: Layers },
    { key: "draft", label: "Drafts", count: pipeline.draft, color: "#AF52DE", icon: PenSquare },
    { key: "scheduled", label: "Scheduled", count: pipeline.scheduled, color: "#007AFF", icon: Clock },
    { key: "published", label: "Published", count: pipeline.published, color: "#34C759", icon: Send },
    { key: "shared", label: "Shares", count: shares, color: "#FF9500", icon: Share2 },
  ];
  return (
    <div className="flex items-stretch gap-1">
      {stages.map((stage, i) => {
        const StageIcon = stage.icon;
        return (
          <React.Fragment key={stage.key}>
            <div
              className="group relative flex-1 overflow-hidden rounded-xl border p-2"
              style={{ borderColor: `${stage.color}30`, background: `${stage.color}08` }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="grid h-6 w-6 place-items-center rounded-md"
                  style={{ background: `${stage.color}14`, color: stage.color }}
                >
                  <StageIcon className="h-3 w-3" />
                </div>
              </div>
              <div className="num-display mt-1.5 text-base font-bold leading-none tabular-nums">
                {stage.count}
              </div>
              <div className="label-caps mt-0.5 text-[8px]">{stage.label}</div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center">
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/30" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ActivityHeatmap({ data }: { data: { date: string; count: number; platforms: string[] }[] }) {
  if (!data || data.length === 0) {
    return <div className="text-[10px] text-muted-foreground">No activity data</div>;
  }
  const weeks: typeof data[] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const activeDays = data.filter((d) => d.count > 0).length;
  const totalActivity = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="scroll-liquid overflow-x-auto pb-1">
      <div className="flex min-w-[560px] gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const intensity = day.count === 0 ? 0 : Math.min(1, day.count / Math.max(maxCount, 1));
              const opacity = day.count === 0 ? 0.25 : 0.2 + intensity * 0.8;
              const dateLabel = new Date(day.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <div
                  key={day.date}
                  className="group relative h-3 w-3 rounded-sm transition hover:scale-125"
                  style={{
                    background: day.count === 0 ? "var(--muted)" : "var(--primary)",
                    opacity,
                  }}
                  title={`${dateLabel}: ${day.count} activity${day.count !== 1 ? "ies" : ""}${
                    day.platforms.length > 0 ? ` on ${day.platforms.join(", ")}` : ""
                  }`}
                >
                  {day.count > 0 && day.platforms.length > 0 && (
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] shadow-lg group-hover:block">
                      {day.count} on {day.platforms.slice(0, 3).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {new Date(data[0]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        <span>
          {activeDays} active days · {totalActivity} total activities
        </span>
        <span>
          {new Date(data[data.length - 1]?.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

// ============ Top contributors — 3 mini-tiles ============

function TopContributorsSection({ data }: { data: TeamPerformanceData }) {
  const tiles: {
    icon: LucideIcon;
    title: string;
    accent: string;
    members: Member[];
    getValue: (m: Member) => string;
  }[] = [
    {
      icon: FileText,
      title: "Most Posts",
      accent: "oklch(0.62 0.22 255)",
      members: data.leaderboard.mostPostsCreated,
      getValue: (m) => m.metrics.postsCreated.toString(),
    },
    {
      icon: Reply,
      title: "Most Replies",
      accent: "oklch(0.7 0.2 25)",
      members: data.leaderboard.mostCommentsReplied,
      getValue: (m) => m.metrics.commentsReplied.toString(),
    },
    {
      icon: Trophy,
      title: "Best Reply Rate",
      accent: "oklch(0.66 0.22 305)",
      members: data.leaderboard.bestReplyRate,
      getValue: (m) => `${m.metrics.replyRate}%`,
    },
  ];

  return (
    <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.30s" }}>
      <SectionHeader icon={Crown} title="Top contributors" desc="Podium across three categories" />
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((tile, ti) => (
          <div
            key={ti}
            className="crystal-in glass rounded-xl p-3"
            style={{ animationDelay: `${0.04 * ti}s` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{ background: `${tile.accent}14`, color: tile.accent }}
              >
                <tile.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {tile.title}
              </div>
            </div>
            <div className="space-y-2">
              {tile.members.length === 0 ? (
                <div className="py-2 text-center text-[10px] text-muted-foreground">No data</div>
              ) : (
                tile.members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="w-4 text-center text-xs">{RANK_EMOJI[i] ?? i + 1}</span>
                    <NameAvatar
                      name={m.name}
                      color={m.color ?? "blue"}
                      src={m.avatar}
                      className="h-6 w-6 text-[9px]"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{m.name}</span>
                    <span className="num-display text-xs font-bold tabular-nums">{tile.getValue(m)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ============ Posts Kanban / List section — kept, made more compact ============

function PostsKanbanSection({ data, loading }: { data: PostsKanbanData | null; loading: boolean }) {
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [sortKey, setSortKey] = React.useState<"date" | "engagement" | "title">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);

  function toggleSort(key: "date" | "engagement" | "title") {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const grouped = React.useMemo(() => {
    const g: Record<string, PostsKanbanData["posts"]> = {
      draft: [],
      scheduled: [],
      published: [],
      failed: [],
    };
    if (data) {
      for (const p of data.posts) {
        if (g[p.status]) g[p.status].push(p);
      }
    }
    return g;
  }, [data]);

  const sortedList = React.useMemo(() => {
    if (!data) return [];
    return [...data.posts].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "engagement") cmp = a.engagement - b.engagement;
      else cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (loading || !data) {
    return (
      <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.40s" }}>
        <SectionHeader
          icon={LayoutGrid}
          title="Posts board"
          desc="Every post across the team, by lifecycle stage"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-48 rounded-2xl" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const k = data.kpis;
  const mostActiveConfig = k.mostActivePlatform ? PLATFORMS[k.mostActivePlatform as PlatformId] : null;

  return (
    <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.40s" }}>
      <SectionHeader
        icon={LayoutGrid}
        title="Posts board"
        desc="Every post across the team, by lifecycle stage — Kanban or List view."
        action={
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="kanban" className="gap-1 px-2.5 py-0 text-[11px]">
                <LayoutGrid className="h-3 w-3" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1 px-2.5 py-0 text-[11px]">
                <ListIcon className="h-3 w-3" /> List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Compact summary row — dense inline KPI strip. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/20 px-3 py-2 text-[11px]">
        <span className="text-muted-foreground">
          Posts this month:{" "}
          <span className="font-bold text-foreground tabular-nums">{k.totalPostsThisMonth}</span>
        </span>
        <span className="text-muted-foreground">
          Publishing rate: <span className="font-bold text-emerald-500 tabular-nums">{k.publishingRate}%</span>
        </span>
        <span className="text-muted-foreground">
          Avg engagement:{" "}
          <span className="font-bold text-foreground tabular-nums">{fmt(k.avgEngagementPerPost)}</span>
        </span>
        <span className="text-muted-foreground">
          Most active:{" "}
          {mostActiveConfig ? (
            <span className="font-bold text-foreground">{mostActiveConfig.short}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        <span className="ml-auto text-muted-foreground">
          Total: <span className="font-bold text-foreground tabular-nums">{k.totalPosts}</span>
        </span>
      </div>

      {view === "kanban" ? (
        <PostsKanbanBoard grouped={grouped} />
      ) : (
        <PostsListView
          posts={sortedList}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          expandedRow={expandedRow}
          setExpandedRow={setExpandedRow}
        />
      )}
    </GlassCard>
  );
}

// ============ Kanban board (4 columns, more compact than original) ============

function PostsKanbanBoard({ grouped }: { grouped: Record<string, PostsKanbanData["posts"]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {KANBAN_COLUMNS.map((col, ci) => {
        const posts = grouped[col.key] ?? [];
        const ColIcon = col.icon;
        return (
          <div
            key={col.key}
            className="crystal-in glass flex flex-col rounded-xl p-2.5"
            style={{ animationDelay: `${0.04 * ci}s` }}
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/30 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-6 w-6 place-items-center rounded-md"
                  style={{ background: `${col.color}14`, color: col.color }}
                >
                  <ColIcon className="h-3 w-3" />
                </div>
                <div className="text-[11px] font-bold">{col.label}</div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                style={{ background: `${col.color}14`, color: col.color }}
              >
                {posts.length}
              </span>
            </div>
            <div className="scroll-liquid -mr-1 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {posts.length === 0 ? (
                <div className="grid place-items-center py-6 text-center text-[10px] text-muted-foreground">
                  <ColIcon className="mb-1 h-5 w-5 opacity-30" />
                  No {col.label.toLowerCase()}
                </div>
              ) : (
                posts.map((p, i) => <PostsKanbanCard key={p.id} post={p} color={col.color} delay={0.03 * i} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ Kanban card ============

function PostsKanbanCard({
  post,
  color,
  delay,
}: {
  post: PostsKanbanData["posts"][0];
  color: string;
  delay: number;
}) {
  return (
    <div
      className="crystal-in glass rounded-lg border-l-2 p-2.5 transition hover:lift-hover"
      style={{ borderLeftColor: color, animationDelay: `${delay}s` }}
    >
      <div className="truncate text-xs font-bold">{post.title || "Untitled"}</div>
      {post.caption && (
        <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{post.caption}</div>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <NameAvatar
          name={post.authorName}
          color={post.authorColor ?? "blue"}
          src={post.authorAvatar}
          className="h-5 w-5 text-[8px]"
        />
        <span className="truncate text-[10px] font-medium">{post.authorName}</span>
      </div>
      {post.platforms.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {post.platforms.slice(0, 5).map((pl) => (
            <PlatformBadge key={pl} platform={pl as PlatformId} size={16} />
          ))}
          {post.platforms.length > 5 && (
            <span className="text-[9px] text-muted-foreground">+{post.platforms.length - 5}</span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/30 pt-1.5 text-[9px] text-muted-foreground">
        {post.status === "published" && (
          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <Heart className="h-2.5 w-2.5" /> {fmt(post.engagement)}
          </span>
        )}
        {post.status === "scheduled" && post.scheduledAt && (
          <span className="flex items-center gap-1 font-semibold text-primary">
            <Clock className="h-2.5 w-2.5" />
            {new Date(post.scheduledAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {post.status === "draft" && (
          <span className="flex items-center gap-1">
            <FileEdit className="h-2.5 w-2.5" /> Draft
          </span>
        )}
        {post.status === "failed" && (
          <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="h-2.5 w-2.5" /> Failed
          </span>
        )}
        <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

// ============ List view (sortable table) — preserved from original ============

function PostsListView({
  posts,
  sortKey,
  sortDir,
  toggleSort,
  expandedRow,
  setExpandedRow,
}: {
  posts: PostsKanbanData["posts"];
  sortKey: "date" | "engagement" | "title";
  sortDir: "asc" | "desc";
  toggleSort: (key: "date" | "engagement" | "title") => void;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="border-border/40">
            <TableHead className="h-8 text-[10px] uppercase">
              <button onClick={() => toggleSort("title")} className="flex items-center gap-1 hover:text-foreground">
                Post <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
              </button>
            </TableHead>
            <TableHead className="h-8 text-[10px] uppercase">Author</TableHead>
            <TableHead className="h-8 text-[10px] uppercase">Status</TableHead>
            <TableHead className="h-8 text-[10px] uppercase">Platforms</TableHead>
            <TableHead className="h-8 text-right text-[10px] uppercase">
              <button
                onClick={() => toggleSort("engagement")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                Engagement <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
              </button>
            </TableHead>
            <TableHead className="h-8 text-right text-[10px] uppercase">
              <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground">
                Date <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                No posts yet.
              </TableCell>
            </TableRow>
          ) : (
            posts.map((p) => {
              const isOpen = expandedRow === p.id;
              const sm = KANBAN_STATUS_META[p.status] ?? KANBAN_STATUS_META.draft;
              return (
                <React.Fragment key={p.id}>
                  <TableRow
                    className="cursor-pointer border-border/30 transition hover:bg-muted/30"
                    onClick={() => setExpandedRow(isOpen ? null : p.id)}
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                        <div className="min-w-0 max-w-[220px]">
                          <div className="truncate text-xs font-bold">{p.title || "Untitled"}</div>
                          {p.caption && <div className="truncate text-[10px] text-muted-foreground">{p.caption}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <NameAvatar
                          name={p.authorName}
                          color={p.authorColor ?? "blue"}
                          src={p.authorAvatar}
                          className="h-6 w-6 text-[9px]"
                        />
                        <span className="truncate text-[11px] font-medium">{p.authorName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          sm.bg,
                          sm.color
                        )}
                      >
                        {sm.label}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.platforms.slice(0, 4).map((pl) => (
                          <PlatformBadge key={pl} platform={pl as PlatformId} size={16} />
                        ))}
                        {p.platforms.length > 4 && (
                          <span className="text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>
                        )}
                        {p.platforms.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">
                      {fmt(p.engagement)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-[10px] tabular-nums text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                  {isOpen && p.variants.length > 0 && (
                    <TableRow className="border-border/30 bg-muted/20">
                      <TableCell colSpan={6} className="p-4">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Platform variants ({p.variants.length})
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {p.variants.map((v) => {
                            const vsm = KANBAN_STATUS_META[v.status] ?? KANBAN_STATUS_META.draft;
                            return (
                              <div key={v.id} className="rounded-xl border border-border/40 bg-background/50 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <PlatformBadge platform={v.platform as PlatformId} size={20} />
                                    <span className="truncate text-[11px] font-bold">@{v.handle}</span>
                                  </div>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                                      vsm.bg,
                                      vsm.color
                                    )}
                                  >
                                    {vsm.label}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-center">
                                  <div>
                                    <div className="text-[11px] font-bold tabular-nums">{fmt(v.likes)}</div>
                                    <div className="text-[8px] uppercase text-muted-foreground">Likes</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold tabular-nums">{fmt(v.comments)}</div>
                                    <div className="text-[8px] uppercase text-muted-foreground">Cmts</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold tabular-nums">{fmt(v.shares)}</div>
                                    <div className="text-[8px] uppercase text-muted-foreground">Shares</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold tabular-nums text-primary">
                                      {fmt(v.engagement)}
                                    </div>
                                    <div className="text-[8px] uppercase text-muted-foreground">Total</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="mt-3 text-[10px] text-muted-foreground">
        Showing {posts.length} posts · click a row to expand platform variants
      </div>
    </div>
  );
}

// ============ Account Health — compact list (preserves all health data) ============

function AccountHealthCompact({
  accountHealth,
  healthSummary,
  accountCommentLoad,
}: {
  accountHealth: TeamPerformanceData["accountHealth"];
  healthSummary: TeamPerformanceData["healthSummary"];
  accountCommentLoad: TeamPerformanceData["accountCommentLoad"];
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  if (accountHealth.length === 0 && accountCommentLoad.length === 0) return null;
  const hs = healthSummary;

  return (
    <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.50s" }}>
      <SectionHeader
        icon={ShieldCheck}
        title="Account health & safety"
        desc="Risk, posting limits, comment load — keep accounts safe"
        action={
          <div className="flex flex-wrap items-center gap-1">
            {hs.healthy > 0 && <Pill color="green">{hs.healthy} healthy</Pill>}
            {hs.warning > 0 && <Pill color="amber">{hs.warning} warn</Pill>}
            {hs.restricted + hs.suspended > 0 && (
              <Pill color="rose">{hs.restricted + hs.suspended} risk</Pill>
            )}
            {hs.totalReports > 0 && <Pill color="rose">{hs.totalReports} reports</Pill>}
          </div>
        }
      />

      <div className="space-y-1.5">
        {accountHealth.map((acc) => {
          const isOpen = expanded === acc.id;
          const statusMeta = HEALTH_STATUS_META[acc.healthStatus] ?? HEALTH_STATUS_META.healthy;
          const StatusIcon = statusMeta.icon;
          const riskColor =
            acc.riskScore >= 70
              ? "oklch(0.65 0.22 25)"
              : acc.riskScore >= 40
              ? "oklch(0.78 0.18 75)"
              : "oklch(0.74 0.18 165)";
          return (
            <div key={acc.id} className="overflow-hidden rounded-xl border border-border/40">
              <button
                onClick={() => setExpanded(isOpen ? null : acc.id)}
                className="flex w-full items-center gap-3 p-2.5 text-left transition hover:bg-muted/40"
              >
                <PlatformBadge platform={acc.platform} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{acc.displayName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {acc.handle} · {acc.ownerName}
                  </div>
                </div>
                <div className="relative h-7 w-7 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="var(--muted)" strokeWidth="3" opacity={0.3} />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      fill="none"
                      stroke={riskColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 12}
                      strokeDashoffset={2 * Math.PI * 12 - (acc.riskScore / 100) * 2 * Math.PI * 12}
                      style={{ transition: "stroke-dashoffset 1s ease-out" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold" style={{ color: riskColor }}>
                      {acc.riskScore}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    statusMeta.bg,
                    statusMeta.color
                  )}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {statusMeta.label}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-border/40 bg-muted/20 p-3">
                  {/* Posting limits */}
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded-md bg-background/60 p-2">
                      <div className="text-muted-foreground">Today</div>
                      <div className="font-bold tabular-nums">
                        {acc.postsToday}/{acc.dailyLimit}
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            acc.dailyPostUsage >= 100
                              ? "bg-rose-500"
                              : acc.dailyPostUsage >= 75
                              ? "bg-amber-500"
                              : "bg-primary"
                          )}
                          style={{ width: `${Math.min(acc.dailyPostUsage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-md bg-background/60 p-2">
                      <div className="text-muted-foreground">Last hour</div>
                      <div className="font-bold tabular-nums">
                        {acc.postsLastHour}/{acc.hourlyLimit}
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            acc.hourlyPostUsage >= 100
                              ? "bg-rose-500"
                              : acc.hourlyPostUsage >= 75
                              ? "bg-amber-500"
                              : "bg-primary"
                          )}
                          style={{ width: `${Math.min(acc.hourlyPostUsage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-md bg-background/60 p-2">
                      <div className="text-muted-foreground">Last 7d</div>
                      <div className="font-bold tabular-nums">{acc.postsLast7d}</div>
                      {acc.reportCount > 0 ? (
                        <div className="mt-0.5 text-[9px] text-rose-500">{acc.reportCount} reports</div>
                      ) : (
                        <div className="mt-0.5 text-[9px] text-emerald-500">No reports</div>
                      )}
                    </div>
                  </div>

                  {/* Sentiment breakdown */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground">Sentiment:</span>
                    <Pill color="green">+{acc.positiveComments}</Pill>
                    <Pill color="neutral">{acc.neutralComments}</Pill>
                    <Pill color="rose">-{acc.negativeComments}</Pill>
                  </div>

                  {/* Protection badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-muted-foreground">Protection:</span>
                    <ProtectionBadge label="Protection" active={acc.protectionEnabled} />
                    <ProtectionBadge label="No dup" active={acc.blockDuplicateContent} />
                    <ProtectionBadge label="No banned hashtags" active={acc.blockBannedHashtags} />
                    <ProtectionBadge label="Pause on warn" active={acc.pausePostingOnWarning} />
                  </div>

                  {/* Advisories (compact, max 3 visible) */}
                  {acc.advisories.length > 0 && (
                    <div className="space-y-1">
                      {acc.advisories.slice(0, 3).map((adv, ai) => {
                        const meta = ADVISORY_META[adv.type];
                        const AdvIcon = meta.icon;
                        return (
                          <div
                            key={ai}
                            className={cn("flex items-start gap-2 rounded-md border p-2", meta.border, meta.bg)}
                          >
                            <AdvIcon className={cn("mt-0.5 h-3 w-3 shrink-0", meta.color)} />
                            <div className="min-w-0 flex-1">
                              <div className={cn("text-[11px] font-bold", meta.color)}>{adv.title}</div>
                              <div className="text-[10px] text-muted-foreground">{adv.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                      {acc.advisories.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{acc.advisories.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Account comment load (compact list, preserves accountCommentLoad data) */}
      {accountCommentLoad.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Account comment load ·{" "}
            <span className="text-amber-500">
              {accountCommentLoad.reduce((s, a) => s + a.unread, 0)} unread
            </span>
          </div>
          <div className="scroll-liquid max-h-[200px] space-y-1 overflow-y-auto pr-1">
            {accountCommentLoad.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-2 py-1.5"
              >
                <PlatformBadge platform={a.platform} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold">{a.displayName}</div>
                  <div className="truncate text-[9px] text-muted-foreground">{a.handle}</div>
                </div>
                <NameAvatar name={a.ownerName} color={a.ownerColor ?? "blue"} className="h-5 w-5 text-[8px]" />
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div>
                    <div className="font-bold tabular-nums">{a.total}</div>
                    <div className="text-[8px] uppercase text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="font-bold tabular-nums text-amber-500">{a.unread}</div>
                    <div className="text-[8px] uppercase text-muted-foreground">Unread</div>
                  </div>
                  <div>
                    <div
                      className={cn(
                        "font-bold tabular-nums",
                        a.replyRate >= 66
                          ? "text-emerald-500"
                          : a.replyRate >= 33
                          ? "text-amber-500"
                          : "text-rose-500"
                      )}
                    >
                      {a.replyRate}%
                    </div>
                    <div className="text-[8px] uppercase text-muted-foreground">Replied</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function ProtectionBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
      )}
    >
      {active ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ============ Recent Activity — compact list (preserves recentActivities data) ============

function RecentActivityCompact({ activities }: { activities: TeamPerformanceData["recentActivities"] }) {
  return (
    <GlassCard className="crystal-in p-4" style={{ animationDelay: "0.60s" }}>
      <SectionHeader
        icon={Activity}
        title="Recent activity"
        desc="Latest content actions across the team"
        action={activities.length > 0 ? <Pill color="blue">{activities.length} actions</Pill> : undefined}
      />
      <div className="scroll-liquid max-h-[280px] space-y-1 overflow-y-auto pr-1">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No recent activity</div>
        ) : (
          activities.map((a) => {
            const Icon = ACTIVITY_ICON[a.type] ?? Activity;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50"
              >
                <NameAvatar name={a.userName} color={a.userColor ?? "blue"} className="h-7 w-7 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs">
                    <span className="font-semibold">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">
                      {a.description.replace(a.userName + " ", "")}
                    </span>
                  </div>
                </div>
                <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-3 w-3" />
                </div>
                <span className="hidden w-14 text-right text-[10px] text-muted-foreground sm:block">
                  {timeAgo(a.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}

// ============ Skeleton ============

function TeamPerformanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-16 rounded-xl" />
      <div className="shimmer h-64 rounded-2xl" />
      <div className="shimmer h-32 rounded-2xl" />
      <div className="shimmer h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-2xl" />
        ))}
      </div>
      <div className="shimmer h-64 rounded-2xl" />
    </div>
  );
}
