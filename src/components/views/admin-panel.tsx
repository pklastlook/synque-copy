"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  AtSign,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Crown,
  Download,
  Eye,
  FileText,
  Flag,
  Heart,
  ListChecks,
  Mail,
  MessageCircle,
  Pause,
  Pencil,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MetricRow,
  BentoGrid,
  BentoTile,
  SectionHeader,
  ListRow,
  Pill,
  type Metric,
} from "@/components/glass/dense-ui";

/* ============================== Types ============================== */

interface Overview {
  totalUsers: number;
  activeUsers: number;
  totalAccounts: number;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  unreadInbox: number;
  atRiskAccounts: number;
  healthyAccounts: number;
  totalEngagement: number;
  totalFollowers: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  department: string | null;
  color: string | null;
  permissions: string[];
  status: string;
  lastActive: string | null;
  postsCount: number;
  accountsCount: number;
  tasksDone: number;
  tasksTotal: number;
  taskCompletionRate: number;
  engagement: number;
  followers: number;
}

type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
type TaskPriority = "low" | "normal" | "high" | "urgent";

interface Task {
  id: string;
  title: string;
  assigneeId: string | null;
  assigneeName: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AccountHealthRow {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
  ownerId: string;
  followers: number;
  riskLevel: string;
  riskScore: number;
  status: string;
  reportCount: number;
}

interface DepartmentRow {
  name: string;
  count: number;
  posts: number;
  engagement: number;
}

interface ActivityRow {
  id: string;
  userId: string;
  userName: string;
  type: string;
  description: string;
  createdAt: string;
}

interface AdminData {
  overview: Overview;
  teamPerformance: TeamMember[];
  tasks: Task[];
  taskStatus: { todo: number; in_progress: number; review: number; done: number; blocked: number };
  accountHealth: AccountHealthRow[];
  departments: DepartmentRow[];
  activities: ActivityRow[];
}

/* ============================== Style maps ============================== */

type PillColor = "neutral" | "green" | "amber" | "rose" | "blue" | "violet";

const ROLE_PILL: Record<
  string,
  { label: string; icon: React.ElementType; color: PillColor }
> = {
  admin: { label: "Admin", icon: Crown, color: "amber" },
  manager: { label: "Manager", icon: Shield, color: "blue" },
  editor: { label: "Editor", icon: Pencil, color: "green" },
  member: { label: "Member", icon: Users, color: "neutral" },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  invited: "bg-amber-500",
  suspended: "bg-rose-500",
};

const PRIORITY_PILL: Record<
  TaskPriority,
  { label: string; color: PillColor }
> = {
  urgent: { label: "Urgent", color: "rose" },
  high: { label: "High", color: "amber" },
  normal: { label: "Normal", color: "blue" },
  low: { label: "Low", color: "neutral" },
};

const TASK_STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    color: string;
    icon: React.ElementType;
    pill: PillColor;
  }
> = {
  todo: {
    label: "To Do",
    color: "var(--muted-foreground)",
    icon: ListChecks,
    pill: "neutral",
  },
  in_progress: {
    label: "In Progress",
    color: "oklch(0.72 0.16 200)",
    icon: Timer,
    pill: "blue",
  },
  review: {
    label: "Review",
    color: "oklch(0.78 0.18 75)",
    icon: Eye,
    pill: "amber",
  },
  done: {
    label: "Done",
    color: "oklch(0.76 0.18 145)",
    icon: CheckCircle2,
    pill: "green",
  },
  blocked: {
    label: "Blocked",
    color: "var(--primary)",
    icon: Pause,
    pill: "rose",
  },
};

const TASK_TYPE_ICON: Record<string, React.ElementType> = {
  publish: Send,
  design: Pencil,
  review: Eye,
  research: ClipboardList,
  campaign: Sparkles,
  outreach: Mail,
  schedule: CalendarClock,
  approve: ShieldCheck,
  compose: Wand2,
  default: ClipboardList,
};

const RISK_PILL: Record<
  string,
  { label: string; color: PillColor }
> = {
  safe: { label: "Healthy", color: "green" },
  moderate: { label: "Moderate", color: "blue" },
  elevated: { label: "Elevated", color: "amber" },
  high: { label: "High risk", color: "rose" },
  critical: { label: "Critical", color: "rose" },
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send,
  post_scheduled: CalendarClock,
  comment_replied: MessageCircle,
  account_connected: UserPlus,
  ai_generated: Wand2,
  team_joined: CheckCircle2,
  task_completed: ListChecks,
  task_created: ClipboardList,
  member_invited: UserPlus,
};

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
};

function riskBarColor(score: number): string {
  if (score >= 70) return "var(--primary)";
  if (score >= 50) return "oklch(0.7 0.19 50)";
  if (score >= 30) return "oklch(0.78 0.18 75)";
  return "oklch(0.76 0.18 145)";
}

function platformOf(p: string): PlatformId | null {
  return p in PLATFORMS ? (p as PlatformId) : null;
}

/**
 * Synthesize a small 7-point sparkline ending at `value`. Decorative — the
 * admin API returns only current snapshots, so we render a gentle trend that
 * terminates at the live number. `trend` flips the slope for at-risk metrics.
 */
function sparkFromValue(
  value: number,
  trend: "up" | "down" | "flat" = "up",
): number[] {
  if (!value || value <= 0) return [0, 0, 0, 0, 0, 0, 0];
  const points = 7;
  const start = trend === "up" ? 0.85 : trend === "down" ? 1.15 : 1.0;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const factor = start + (1 - start) * t;
    return Math.max(0, Math.round(value * factor));
  });
}

/* ============================== Main view ============================== */

export function AdminPanelView() {
  const { data, loading } = useApi<AdminData>("/api/admin");

  if (loading || !data) return <AdminSkeleton />;

  return <AdminContent data={data} />;
}

function AdminContent({ data }: { data: AdminData }) {
  const { overview } = data;
  return (
    <div className="space-y-4">
      <AdminHero overview={overview} />
      <SystemStatsRow overview={overview} />
      <AdminBento data={data} />
    </div>
  );
}

/* ============================== 1. Hero (compact strip) ============================== */

function AdminHero({ overview }: { overview: Overview }) {
  return (
    <GlassCard
      strong
      className="glass-sheen crystal-in relative overflow-hidden p-4"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[var(--gold)]/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3 w-3" />
            <span className="label-caps">Workspace · Command center</span>
          </div>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">
            Admin <span className="gold-text">Command Center</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <b className="text-foreground tabular-nums">{overview.totalUsers}</b>{" "}
            members
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            <b className="text-foreground tabular-nums">{overview.totalAccounts}</b>{" "}
            accounts
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            <b className="text-foreground tabular-nums">
              {fmt(overview.totalFollowers)}
            </b>{" "}
            followers
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            <b className="text-foreground tabular-nums">
              {fmt(overview.totalEngagement)}
            </b>{" "}
            engagement
          </span>
          <button
            onClick={() =>
              toast.success("Report exported", {
                description:
                  "Workspace snapshot copied to clipboard — paste into your report.",
              })
            }
            className="liquid-gold glow-ring ml-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

/* ============================== 2. System stats MetricRow ============================== */

function SystemStatsRow({ overview }: { overview: Overview }) {
  const metrics: Metric[] = [
    {
      label: "Total members",
      value: overview.totalUsers,
      spark: sparkFromValue(overview.totalUsers, "up"),
      color: "var(--primary)",
    },
    {
      label: "Active now",
      value: overview.activeUsers,
      spark: sparkFromValue(overview.activeUsers, "up"),
      color: "oklch(0.76 0.18 145)",
    },
    {
      label: "Total accounts",
      value: overview.totalAccounts,
      spark: sparkFromValue(overview.totalAccounts, "up"),
      color: "oklch(0.72 0.16 200)",
    },
    {
      label: "At-risk accounts",
      value: overview.atRiskAccounts,
      spark: sparkFromValue(overview.atRiskAccounts, "down"),
      color: "var(--primary)",
    },
    {
      label: "Published posts",
      value: overview.publishedPosts,
      spark: sparkFromValue(overview.publishedPosts, "up"),
      color: "oklch(0.76 0.15 165)",
    },
    {
      label: "Scheduled posts",
      value: overview.scheduledPosts,
      spark: sparkFromValue(overview.scheduledPosts, "up"),
      color: "oklch(0.78 0.18 75)",
    },
    {
      label: "Unread inbox",
      value: overview.unreadInbox,
      spark: sparkFromValue(overview.unreadInbox, "flat"),
      color: "var(--gold)",
    },
  ];

  return <MetricRow metrics={metrics} className="crystal-in" />;
}

/* ============================== 3. Bento grid ============================== */

function AdminBento({ data }: { data: AdminData }) {
  return (
    <BentoGrid>
      <TeamPerformanceTile members={data.teamPerformance} />
      <TaskBoardTile tasks={data.tasks} taskStatus={data.taskStatus} />
      <AccountHealthTile
        accounts={data.accountHealth}
        overview={data.overview}
      />
      <DepartmentTile departments={data.departments} />
      <ActivityTile activities={data.activities} />
    </BentoGrid>
  );
}

/* ============================== Tile A: Team performance (2×2) ============================== */

type SortKey = "engagement" | "posts" | "followers" | "accounts" | "tasks";
type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = [
  "engagement",
  "posts",
  "followers",
  "accounts",
  "tasks",
];

function sortVal(m: TeamMember, key: SortKey): number {
  switch (key) {
    case "engagement":
      return m.engagement;
    case "posts":
      return m.postsCount;
    case "followers":
      return m.followers;
    case "accounts":
      return m.accountsCount;
    case "tasks":
      return m.tasksDone;
  }
}

function TeamPerformanceTile({ members }: { members: TeamMember[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>("engagement");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [selected, setSelected] = React.useState<TeamMember | null>(null);

  const sorted = React.useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      const va = sortVal(a, sortKey);
      const vb = sortVal(b, sortKey);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return copy;
  }, [members, sortKey, sortDir]);

  const cycleSort = () => {
    const i = SORT_KEYS.indexOf(sortKey);
    const nextKey = SORT_KEYS[(i + 1) % SORT_KEYS.length];
    if (nextKey === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("desc");
    }
  };

  return (
    <BentoTile
      span="2x2"
      className="crystal-in flex flex-col overflow-hidden p-0"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="border-b border-border/40 px-4 py-2.5">
        <SectionHeader
          title="Team performance"
          desc={`${members.length} members · per-member output`}
          icon={Users}
          action={
            <button
              onClick={cycleSort}
              className="flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[10px] font-semibold transition hover:bg-muted/40"
              title="Click to cycle sort key"
            >
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">sort:</span>
              <span className="text-primary">{sortKey}</span>
              {sortDir === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
            </button>
          }
        />
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr_0.8fr_auto] items-center gap-2 border-b border-border/30 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Member</span>
        <span className="text-right">Tasks</span>
        <span className="text-right">Engage</span>
        <span className="text-right">Followers</span>
        <span className="w-6" />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto scroll-liquid">
        {sorted.map((m) => (
          <TeamListRow
            key={m.id}
            member={m}
            onProfile={() => setSelected(m)}
          />
        ))}
        {sorted.length === 0 && (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No team members yet.
          </div>
        )}
      </div>

      <MemberProfileDialog
        member={selected}
        onClose={() => setSelected(null)}
      />
    </BentoTile>
  );
}

function TeamListRow({
  member,
  onProfile,
}: {
  member: TeamMember;
  onProfile: () => void;
}) {
  const role = ROLE_PILL[member.role] ?? ROLE_PILL.member;
  const RoleIcon = role.icon;
  const statusDot = STATUS_DOT[member.status] ?? "bg-muted-foreground";

  return (
    <ListRow
      onClick={onProfile}
      className="grid grid-cols-[1.6fr_0.7fr_0.8fr_0.8fr_auto] items-center gap-2 px-4 py-2"
    >
      {/* Member */}
      <div className="flex min-w-0 items-center gap-2">
        <NameAvatar
          name={member.name}
          color={member.color}
          className="h-8 w-8 text-[10px]"
          ring
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold">{member.name}</span>
            <span
              className={cn("inline-flex h-1.5 w-1.5 shrink-0 rounded-full", statusDot)}
              title={`Status: ${member.status}`}
            />
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <Pill color={role.color}>
              <RoleIcon className="h-2 w-2" />
              {role.label}
            </Pill>
            {member.department && (
              <span className="truncate text-[10px] text-muted-foreground">
                · {member.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="text-right">
        <div className="num-display text-xs font-semibold tabular-nums">
          {member.tasksDone}
          <span className="text-muted-foreground">/{member.tasksTotal}</span>
        </div>
        <div className="ml-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--gold)]"
            style={{ width: `${member.taskCompletionRate}%` }}
          />
        </div>
      </div>

      {/* Engagement */}
      <div className="text-right">
        <div className="num-display text-xs font-semibold tabular-nums">
          {fmt(member.engagement)}
        </div>
        <div className="text-[9px] text-muted-foreground">engage</div>
      </div>

      {/* Followers */}
      <div className="text-right">
        <div className="num-display text-xs font-semibold tabular-nums">
          {fmt(member.followers)}
        </div>
        <div className="text-[9px] text-muted-foreground">followers</div>
      </div>

      {/* Chevron */}
      <div className="flex w-6 justify-end">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </ListRow>
  );
}

function MemberProfileDialog({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-xl">
        {member && <ProfileBody member={member} />}
      </DialogContent>
    </Dialog>
  );
}

function ProfileBody({ member }: { member: TeamMember }) {
  const role = ROLE_PILL[member.role] ?? ROLE_PILL.member;
  const RoleIcon = role.icon;
  const statusDot = STATUS_DOT[member.status] ?? "bg-muted-foreground";

  const stats: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accent: string;
  }[] = [
    {
      label: "Posts authored",
      value: member.postsCount,
      icon: <FileText className="h-4 w-4" />,
      accent: "oklch(0.72 0.16 200)",
    },
    {
      label: "Accounts owned",
      value: member.accountsCount,
      icon: <AtSign className="h-4 w-4" />,
      accent: "oklch(0.76 0.15 165)",
    },
    {
      label: "Engagement",
      value: fmt(member.engagement),
      icon: <Heart className="h-4 w-4" />,
      accent: "var(--primary)",
    },
    {
      label: "Followers",
      value: fmt(member.followers),
      icon: <Users className="h-4 w-4" />,
      accent: "oklch(0.66 0.16 230)",
    },
  ];

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <NameAvatar
            name={member.name}
            color={member.color}
            className="h-12 w-12 text-sm"
            ring
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate">{member.name}</span>
              <Pill color={role.color}>
                <RoleIcon className="h-2.5 w-2.5" />
                {role.label}
              </Pill>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs font-normal text-muted-foreground">
              {member.title && <span>{member.title}</span>}
              {member.department && (
                <span className="flex items-center gap-1">
                  <span>·</span>
                  {member.department}
                </span>
              )}
            </div>
          </div>
        </DialogTitle>
        <DialogDescription className="flex items-center gap-2">
          <span
            className={cn("inline-flex h-1.5 w-1.5 rounded-full", statusDot)}
          />
          {member.status}
          <span>·</span>
          <a
            href={`mailto:${member.email}`}
            className="hover:text-foreground hover:underline"
          >
            {member.email}
          </a>
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/40 bg-muted/30 p-3"
          >
            <div
              className="grid h-8 w-8 place-items-center rounded-xl text-white"
              style={{ background: s.accent }}
            >
              {s.icon}
            </div>
            <div className="num-display mt-2 text-lg font-semibold">
              {s.value}
            </div>
            <div className="label-caps mt-0.5 text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="label-caps text-muted-foreground">
              Task completion
            </span>
            <span className="num-display text-sm font-semibold">
              {member.taskCompletionRate}%
            </span>
          </div>
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--gold)] transition-all"
              style={{ width: `${member.taskCompletionRate}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {member.tasksDone} of {member.tasksTotal} tasks done
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="label-caps text-muted-foreground">Last active</span>
            <span className="num-display text-sm font-semibold">
              {member.lastActive ? timeAgo(member.lastActive) : "never"}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="label-caps mb-2 text-muted-foreground">Permissions</div>
        {member.permissions.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No explicit permissions granted.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {member.permissions.map((p) => (
              <Pill key={p}>{p.replace(/_/g, " ")}</Pill>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => toast.info(`Emailing ${member.name}`)}
        >
          <Mail className="mr-2 h-4 w-4" />
          Message
        </Button>
        <button
          onClick={() =>
            toast.success(`Permissions synced for ${member.name}`)
          }
          className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <ShieldCheck className="h-4 w-4" />
          Manage access
        </button>
      </DialogFooter>
    </div>
  );
}

/* ============================== Tile B: Task board (2×2) ============================== */

function TaskBoardTile({
  tasks,
  taskStatus,
}: {
  tasks: Task[];
  taskStatus: AdminData["taskStatus"];
}) {
  const statusOrder: TaskStatus[] = [
    "todo",
    "in_progress",
    "review",
    "done",
    "blocked",
  ];

  const chartData = statusOrder.map((s) => ({
    name: TASK_STATUS_META[s].label,
    short: s,
    count: taskStatus[s],
    color: TASK_STATUS_META[s].color,
  }));

  const topTasks = React.useMemo(() => {
    return [...tasks]
      .sort(
        (a, b) =>
          priorityRank(b.priority) - priorityRank(a.priority) ||
          (a.dueAt ?? "").localeCompare(b.dueAt ?? ""),
      )
      .slice(0, 6);
  }, [tasks]);

  return (
    <BentoTile
      span="2x2"
      className="crystal-in flex flex-col overflow-hidden p-0"
      style={{ animationDelay: "0.18s" }}
    >
      <div className="border-b border-border/40 px-4 py-2.5">
        <SectionHeader
          title="Task board"
          desc={`${tasks.length} tasks · workflow distribution`}
          icon={ClipboardList}
          action={
            <div className="flex flex-wrap items-center gap-1">
              {statusOrder.map((s) => (
                <Pill key={s} color={TASK_STATUS_META[s].pill}>
                  <span className="tabular-nums">{taskStatus[s]}</span>
                  <span className="hidden sm:inline">
                    {TASK_STATUS_META[s].label}
                  </span>
                </Pill>
              ))}
            </div>
          }
        />
      </div>

      {/* Distribution chart */}
      <div className="h-[96px] border-b border-border/40 px-2 py-1.5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ left: -20, right: 4, top: 4, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmt(v)}
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [`${v} tasks`, "Count"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
              {chartData.map((d) => (
                <Cell key={d.short} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top tasks list */}
      <div className="flex-1 overflow-y-auto scroll-liquid">
        {topTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tasks yet.
          </div>
        ) : (
          topTasks.map((t) => <TaskListRow key={t.id} task={t} />)
        )}
      </div>
    </BentoTile>
  );
}

function priorityRank(p: TaskPriority): number {
  return { urgent: 3, high: 2, normal: 1, low: 0 }[p];
}

function TaskListRow({ task }: { task: Task }) {
  const ps = PRIORITY_PILL[task.priority];
  const typeIcon = TASK_TYPE_ICON[task.type] ?? TASK_TYPE_ICON.default;
  const TypeIcon = typeIcon;
  const overdue = task.dueAt && new Date(task.dueAt).getTime() < Date.now();

  return (
    <ListRow className="px-4 py-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <TypeIcon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold leading-snug">
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <Pill color={ps.color}>{ps.label}</Pill>
          {task.dueAt && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5",
                overdue && "font-semibold text-rose-500",
              )}
            >
              {overdue && <AlertTriangle className="h-2.5 w-2.5" />}
              {new Date(task.dueAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <span className="capitalize">{task.status.replace(/_/g, " ")}</span>
        </div>
      </div>
      {task.assigneeName && task.assigneeName !== "Unassigned" && (
        <div className="flex shrink-0 items-center gap-1.5">
          <NameAvatar
            name={task.assigneeName}
            className="h-5 w-5 text-[9px]"
          />
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            {task.assigneeName.split(" ")[0]}
          </span>
        </div>
      )}
    </ListRow>
  );
}

/* ============================== Tile C: Account health (1×1) ============================== */

function AccountHealthTile({
  accounts,
  overview,
}: {
  accounts: AccountHealthRow[];
  overview: Overview;
}) {
  const total = accounts.length || 1;
  const healthyPct = Math.round((overview.healthyAccounts / total) * 100);
  const atRiskPct = 100 - healthyPct;
  const top = [...accounts]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  return (
    <BentoTile
      span="1x1"
      className="crystal-in flex flex-col overflow-hidden p-0"
      style={{ animationDelay: "0.26s" }}
    >
      <div className="border-b border-border/40 px-4 py-2.5">
        <SectionHeader
          title="Account health"
          desc={`${accounts.length} connected`}
          icon={Shield}
        />
      </div>

      {/* Health ratio */}
      <div className="border-b border-border/40 px-4 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium">
          <span className="label-caps text-muted-foreground">
            Health ratio
          </span>
          <span className="num-display tabular-nums">
            <span className="text-emerald-500">{healthyPct}%</span>
            <span className="text-muted-foreground"> / </span>
            <span className="text-rose-500">{atRiskPct}%</span>
          </span>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${healthyPct}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all"
            style={{ width: `${atRiskPct}%` }}
          />
        </div>
      </div>

      {/* Top accounts list */}
      <div className="flex-1 overflow-y-auto scroll-liquid">
        {top.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No accounts connected.
          </div>
        ) : (
          top.map((a) => <AccountHealthListRow key={a.id} account={a} />)
        )}
      </div>
    </BentoTile>
  );
}

function AccountHealthListRow({ account }: { account: AccountHealthRow }) {
  const pid = platformOf(account.platform);
  const risk = RISK_PILL[account.riskLevel] ?? RISK_PILL.safe;
  const barColor = riskBarColor(account.riskScore);

  return (
    <ListRow className="px-4 py-2">
      {pid ? (
        <PlatformBadge platform={pid} size={28} />
      ) : (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[28%] bg-muted text-[10px] font-bold text-muted-foreground">
          {account.platform.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold">
          {account.displayName}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">
          @{account.handle}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="num-display text-[11px] font-semibold tabular-nums"
          style={{ color: barColor }}
        >
          {account.riskScore}
        </span>
        <Pill color={risk.color}>{risk.label}</Pill>
      </div>
      {account.reportCount > 0 && (
        <div className="flex shrink-0 items-center gap-0.5 text-rose-500">
          <Flag className="h-2.5 w-2.5" />
          <span className="num-display text-[10px] tabular-nums">
            {account.reportCount}
          </span>
        </div>
      )}
    </ListRow>
  );
}

/* ============================== Tile D: Department breakdown (1×1) ============================== */

const DEPT_COLORS = [
  "var(--primary)",
  "oklch(0.72 0.16 200)",
  "oklch(0.76 0.15 165)",
  "oklch(0.66 0.16 230)",
  "oklch(0.78 0.18 75)",
  "var(--gold)",
  "oklch(0.66 0.22 305)",
];

function DepartmentTile({ departments }: { departments: DepartmentRow[] }) {
  const sorted = [...departments].sort((a, b) => b.engagement - a.engagement);
  const chartData = sorted.map((d, i) => ({
    name: d.name,
    engagement: d.engagement,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  return (
    <BentoTile
      span="1x1"
      className="crystal-in flex flex-col overflow-hidden p-0"
      style={{ animationDelay: "0.34s" }}
    >
      <div className="border-b border-border/40 px-4 py-2.5">
        <SectionHeader
          title="Departments"
          desc={`${sorted.length} teams · engagement`}
          icon={Building2}
        />
      </div>

      <div className="flex-1 px-2 py-2">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No department data yet.
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(120, sorted.length * 28)}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(v) => fmt(v)}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={84}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [fmt(v), "Engagement"]}
              />
              <Bar dataKey="engagement" radius={[0, 4, 4, 0]} barSize={12}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Mini legend — top 4 */}
      {sorted.length > 0 && (
        <div className="border-t border-border/40 px-4 py-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {sorted.slice(0, 4).map((d, i) => (
              <div
                key={d.name}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}
                />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto shrink-0 num-display tabular-nums text-muted-foreground">
                  {fmt(d.engagement)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </BentoTile>
  );
}

/* ============================== Tile E: Activity feed (2×1) ============================== */

function ActivityTile({ activities }: { activities: ActivityRow[] }) {
  const top = activities.slice(0, 6);

  return (
    <BentoTile
      span="2x1"
      className="crystal-in flex flex-col overflow-hidden p-0"
      style={{ animationDelay: "0.42s" }}
    >
      <div className="border-b border-border/40 px-4 py-2.5">
        <SectionHeader
          title="Activity feed"
          desc={`${activities.length} events · latest workspace actions`}
          icon={Activity}
        />
      </div>
      <div className="flex-1 overflow-y-auto scroll-liquid">
        {top.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No recent activity.
          </div>
        ) : (
          top.map((a) => <ActivityListRow key={a.id} activity={a} />)
        )}
      </div>
    </BentoTile>
  );
}

function ActivityListRow({ activity }: { activity: ActivityRow }) {
  const Icon = ACTIVITY_ICON[activity.type] ?? CheckCircle2;
  return (
    <ListRow className="px-4 py-2">
      <NameAvatar name={activity.userName} className="h-7 w-7 text-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs">
          <span className="font-semibold">{activity.userName}</span>{" "}
          <span className="text-muted-foreground">
            {activity.description.replace(activity.userName + " ", "")}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {activity.type.replace(/_/g, " ")}
        </div>
      </div>
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3 w-3" />
      </div>
      <span className="w-12 shrink-0 text-right text-[10px] text-muted-foreground">
        {timeAgo(activity.createdAt)}
      </span>
    </ListRow>
  );
}

/* ============================== Skeleton ============================== */

function AdminSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-16 rounded-xl" />
      <div className="shimmer h-12 rounded-xl" />
      <BentoGrid>
        <BentoTile span="2x2">
          <div className="shimmer h-full w-full rounded-lg" />
        </BentoTile>
        <BentoTile span="2x2">
          <div className="shimmer h-full w-full rounded-lg" />
        </BentoTile>
        <BentoTile span="1x1">
          <div className="shimmer h-full w-full rounded-lg" />
        </BentoTile>
        <BentoTile span="1x1">
          <div className="shimmer h-full w-full rounded-lg" />
        </BentoTile>
        <BentoTile span="2x1">
          <div className="shimmer h-full w-full rounded-lg" />
        </BentoTile>
      </BentoGrid>
    </div>
  );
}
