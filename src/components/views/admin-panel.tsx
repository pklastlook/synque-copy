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
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Crown,
  Download,
  Eye,
  FileText,
  Flag,
  Heart,
  LayoutDashboard,
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
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
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

const ROLE_STYLE: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  admin: {
    label: "Admin",
    className: "bg-[var(--gold)]/15 text-[var(--gold)]",
    icon: Crown,
  },
  manager: {
    label: "Manager",
    className: "bg-primary/15 text-primary",
    icon: Shield,
  },
  editor: {
    label: "Editor",
    className: "bg-[oklch(0.76_0.15_165)]/15 text-[oklch(0.55_0.15_165)]",
    icon: Pencil,
  },
  member: {
    label: "Member",
    className: "bg-muted text-muted-foreground",
    icon: Users,
  },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  invited: "bg-amber-500",
  suspended: "bg-rose-500",
};

const PRIORITY_STYLE: Record<
  TaskPriority,
  { color: string; pill: string; label: string }
> = {
  urgent: {
    color: "var(--primary)",
    pill: "bg-primary/15 text-primary",
    label: "Urgent",
  },
  high: {
    color: "oklch(0.78 0.18 75)",
    pill: "bg-[oklch(0.78_0.18_75)]/15 text-[oklch(0.6_0.18_65)]",
    label: "High",
  },
  normal: {
    color: "oklch(0.76 0.15 165)",
    pill: "bg-[oklch(0.76_0.15_165)]/15 text-[oklch(0.55_0.15_165)]",
    label: "Normal",
  },
  low: {
    color: "var(--muted-foreground)",
    pill: "bg-muted text-muted-foreground",
    label: "Low",
  },
};

const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  todo: {
    label: "To Do",
    color: "var(--muted-foreground)",
    bg: "bg-muted/40",
    icon: ListChecks,
  },
  in_progress: {
    label: "In Progress",
    color: "oklch(0.72 0.16 200)",
    bg: "bg-[oklch(0.72_0.16_200)]/15",
    icon: Timer,
  },
  review: {
    label: "Review",
    color: "oklch(0.78 0.18 75)",
    bg: "bg-[oklch(0.78_0.18_75)]/15",
    icon: Eye,
  },
  done: {
    label: "Done",
    color: "oklch(0.76 0.18 145)",
    bg: "bg-[oklch(0.76_0.18_145)]/15",
    icon: CheckCircle2,
  },
  blocked: {
    label: "Blocked",
    color: "var(--primary)",
    bg: "bg-primary/15",
    icon: Pause,
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

const RISK_STYLE: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  safe: { color: "text-emerald-500", bg: "bg-emerald-500/15", label: "Healthy" },
  moderate: { color: "text-amber-500", bg: "bg-amber-500/15", label: "Moderate" },
  elevated: { color: "text-orange-500", bg: "bg-orange-500/15", label: "Elevated" },
  high: { color: "text-rose-500", bg: "bg-rose-500/15", label: "High risk" },
  critical: { color: "text-rose-600", bg: "bg-rose-600/20", label: "Critical" },
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

/* ============================== Main view ============================== */

export function AdminPanelView() {
  const { data, loading } = useApi<AdminData>("/api/admin");

  if (loading || !data) return <AdminSkeleton />;

  return <AdminContent data={data} />;
}

function AdminContent({ data }: { data: AdminData }) {
  const { overview } = data;

  return (
    <div className="space-y-6">
      <AdminHero overview={overview} />
      <OverviewKpiStrip overview={overview} />
      <TeamPerformanceSection members={data.teamPerformance} />
      <TaskBoardSection tasks={data.tasks} taskStatus={data.taskStatus} />
      <AccountHealthSection accounts={data.accountHealth} overview={overview} />
      <DepartmentSection departments={data.departments} />
      <ActivitySection activities={data.activities} />
    </div>
  );
}

/* ============================== 1. Hero ============================== */

function AdminHero({ overview }: { overview: Overview }) {
  return (
    <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-[var(--gold)]/25 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Workspace · Command center
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Admin <span className="gold-text">Command Center</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {overview.totalUsers}
            </span>{" "}
            members ·{" "}
            <span className="font-semibold text-foreground">
              {overview.totalAccounts}
            </span>{" "}
            accounts ·{" "}
            <span className="font-semibold text-foreground">
              {fmt(overview.totalFollowers)}
            </span>{" "}
            followers ·{" "}
            <span className="font-semibold text-foreground">
              {fmt(overview.totalEngagement)}
            </span>{" "}
            engagement
          </p>
        </div>
        <button
          onClick={() =>
            toast.success("Report exported", {
              description: "Workspace snapshot downloaded as PDF.",
            })
          }
          className="liquid-gold glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
        >
          <Download className="h-4 w-4" />
          Export report
        </button>
      </div>
    </GlassCard>
  );
}

/* ============================== 2. KPI strip ============================== */

function OverviewKpiStrip({ overview }: { overview: Overview }) {
  const cards: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accent: string;
    hint?: string;
  }[] = [
    {
      label: "Total members",
      value: overview.totalUsers,
      icon: <Users className="h-5 w-5" />,
      accent: "var(--primary)",
      hint: `${overview.activeUsers} active now`,
    },
    {
      label: "Active now",
      value: overview.activeUsers,
      icon: <Activity className="h-5 w-5" />,
      accent: "oklch(0.76 0.18 145)",
      hint: "online today",
    },
    {
      label: "Total accounts",
      value: overview.totalAccounts,
      icon: <AtSign className="h-5 w-5" />,
      accent: "oklch(0.72 0.16 200)",
      hint: "connected socials",
    },
    {
      label: "At-risk accounts",
      value: overview.atRiskAccounts,
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: "var(--primary)",
      hint: `${overview.healthyAccounts} healthy`,
    },
    {
      label: "Published posts",
      value: overview.publishedPosts,
      icon: <Send className="h-5 w-5" />,
      accent: "oklch(0.76 0.15 165)",
      hint: `${overview.totalPosts} total`,
    },
    {
      label: "Scheduled posts",
      value: overview.scheduledPosts,
      icon: <CalendarClock className="h-5 w-5" />,
      accent: "oklch(0.78 0.18 75)",
      hint: "queued for publish",
    },
      {
        label: "Unread inbox",
        value: overview.unreadInbox,
        icon: <Mail className="h-5 w-5" />,
      accent: "var(--gold)",
      hint: "conversations open",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="crystal-in"
          style={{ animationDelay: `${0.05 + i * 0.06}s` }}
        >
          <KpiCard
            label={c.label}
            value={typeof c.value === "number" ? fmt(c.value) : c.value}
            icon={c.icon}
            accent={c.accent}
            hint={c.hint}
          />
        </div>
      ))}
    </div>
  );
}

/* ============================== 3. Team performance table ============================== */

type SortKey = "engagement" | "posts" | "followers" | "accounts" | "tasks";
type SortDir = "asc" | "desc";

function TeamPerformanceSection({ members }: { members: TeamMember[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>("engagement");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [selected, setSelected] = React.useState<TeamMember | null>(null);

  const sorted = React.useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      const va =
        sortKey === "tasks"
          ? a.tasksDone
          : sortKey === "engagement"
            ? a.engagement
            : sortKey === "posts"
              ? a.postsCount
              : sortKey === "followers"
                ? a.followers
                : a.accountsCount;
      const vb =
        sortKey === "tasks"
          ? b.tasksDone
          : sortKey === "engagement"
            ? b.engagement
            : sortKey === "posts"
              ? b.postsCount
              : sortKey === "followers"
                ? b.followers
                : b.accountsCount;
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return copy;
  }, [members, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <GlassCard className="crystal-in overflow-hidden p-0" style={{ animationDelay: "0.5s" }}>
      <div className="p-5 pb-3">
        <SectionTitle
          title="Team performance"
          desc="Per-member output across accounts, posts, tasks & engagement"
          action={
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              sorted by{" "}
              <span className="font-medium text-foreground">{sortKey}</span>
            </div>
          }
        />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          {/* Header */}
          <div className="grid grid-cols-[2.2fr_0.8fr_0.8fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border/40 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <SortHeader
              label="Member"
              active={false}
              dir={sortDir}
              onClick={() => toggleSort("engagement")}
            />
            <SortHeader
              label="Accounts"
              active={sortKey === "accounts"}
              dir={sortDir}
              onClick={() => toggleSort("accounts")}
              align="right"
            />
            <SortHeader
              label="Posts"
              active={sortKey === "posts"}
              dir={sortDir}
              onClick={() => toggleSort("posts")}
              align="right"
            />
            <SortHeader
              label="Tasks"
              active={sortKey === "tasks"}
              dir={sortDir}
              onClick={() => toggleSort("tasks")}
              align="right"
            />
            <SortHeader
              label="Engagement"
              active={sortKey === "engagement"}
              dir={sortDir}
              onClick={() => toggleSort("engagement")}
              align="right"
            />
            <SortHeader
              label="Followers"
              active={sortKey === "followers"}
              dir={sortDir}
              onClick={() => toggleSort("followers")}
              align="right"
            />
            <span className="text-right">Profile</span>
          </div>

          {/* Rows */}
          <div className="max-h-[640px] overflow-y-auto scroll-liquid">
            {sorted.map((m) => (
              <TeamRow
                key={m.id}
                member={m}
                onProfile={() => setSelected(m)}
              />
            ))}
            {sorted.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No team members yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <MemberProfileDialog
        member={selected}
        onClose={() => setSelected(null)}
      />
    </GlassCard>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 transition hover:text-foreground",
        align === "right" ? "justify-end" : "justify-start",
        active && "text-foreground",
      )}
    >
      {label}
      {active &&
        (dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        ))}
    </button>
  );
}

function TeamRow({
  member,
  onProfile,
}: {
  member: TeamMember;
  onProfile: () => void;
}) {
  const role = ROLE_STYLE[member.role] ?? ROLE_STYLE.member;
  const RoleIcon = role.icon;
  const statusDot =
    STATUS_DOT[member.status] ?? "bg-muted-foreground";

  return (
    <button
      onClick={onProfile}
      className="grid w-full grid-cols-[2.2fr_0.8fr_0.8fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border/15 px-5 py-3 text-left transition hover:bg-muted/40 hover:shadow-[inset_2px_0_0_0_var(--primary)]"
    >
      {/* Member */}
      <div className="flex min-w-0 items-center gap-3">
        <NameAvatar
          name={member.name}
          color={member.color}
          className="h-10 w-10 text-[11px]"
          ring
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{member.name}</span>
            <span
              className={cn(
                "inline-flex h-1.5 w-1.5 rounded-full",
                statusDot,
              )}
              title={`Status: ${member.status}`}
            />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                role.className,
              )}
            >
              <RoleIcon className="h-2.5 w-2.5" />
              {role.label}
            </span>
            {member.title && (
              <span className="truncate">{member.title}</span>
            )}
            {member.department && (
              <span className="text-muted-foreground/60">
                · {member.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="text-right">
        <div className="num-display text-sm font-semibold">
          {member.accountsCount}
        </div>
      </div>

      {/* Posts */}
      <div className="text-right">
        <div className="num-display text-sm font-semibold">
          {member.postsCount}
        </div>
      </div>

      {/* Tasks */}
      <div className="text-right">
        <div className="num-display text-sm font-semibold">
          {member.tasksDone}
          <span className="text-muted-foreground">/{member.tasksTotal}</span>
        </div>
        <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--gold)]"
            style={{ width: `${member.taskCompletionRate}%` }}
          />
        </div>
      </div>

      {/* Engagement */}
      <div className="text-right">
        <div className="num-display text-sm font-semibold">
          {fmt(member.engagement)}
        </div>
        <div className="text-[10px] text-muted-foreground">engagement</div>
      </div>

      {/* Followers */}
      <div className="text-right">
        <div className="num-display text-sm font-semibold">
          {fmt(member.followers)}
        </div>
        <div className="text-[10px] text-muted-foreground">followers</div>
      </div>

      {/* Profile */}
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-primary transition group-hover:bg-primary/10">
          <Eye className="h-3.5 w-3.5" />
          View
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
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
  const role = ROLE_STYLE[member.role] ?? ROLE_STYLE.member;
  const RoleIcon = role.icon;
  const statusDot = STATUS_DOT[member.status] ?? "bg-muted-foreground";

  const stats: { label: string; value: string | number; icon: React.ReactNode; accent: string }[] = [
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
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  role.className,
                )}
              >
                <RoleIcon className="h-2.5 w-2.5" />
                {role.label}
              </span>
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

      {/* Stats grid */}
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

      {/* Task completion */}
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
            <span className="label-caps text-muted-foreground">
              Last active
            </span>
            <span className="num-display text-sm font-semibold">
              {member.lastActive ? timeAgo(member.lastActive) : "never"}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div>
        <div className="label-caps mb-2 text-muted-foreground">Permissions</div>
        {member.permissions.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No explicit permissions granted.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {member.permissions.map((p) => (
              <span
                key={p}
                className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
              >
                {p.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => toast.info(`Emailing ${member.name}`)}>
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

/* ============================== 4. Task board ============================== */

function TaskBoardSection({
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
  const totalTasks = tasks.length || 1;

  return (
    <GlassCard
      className="crystal-in p-5"
      style={{ animationDelay: "0.58s" }}
    >
      <SectionTitle
        title="Task board"
        desc="Workflow distribution across the workspace"
        action={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
            {tasks.length} tasks
          </div>
        }
      />

      {/* Distribution bar chart */}
      <div className="mb-5 h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmt(v)}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [`${v} tasks`, "Count"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
              {chartData.map((d) => (
                <Cell key={d.short} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kanban columns */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scroll-liquid">
        {statusOrder.map((s) => {
          const meta = TASK_STATUS_META[s];
          const Icon = meta.icon;
          const colTasks = tasks
            .filter((t) => t.status === s)
            .sort(
              (a, b) =>
                priorityRank(b.priority) - priorityRank(a.priority) ||
                (a.dueAt ?? "").localeCompare(b.dueAt ?? ""),
            );
          const ratio = Math.round(
            (colTasks.length / totalTasks) * 100,
          );
          return (
            <div
              key={s}
              className="flex w-[260px] shrink-0 flex-col rounded-2xl border border-border/40 bg-muted/20 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-xl",
                    meta.bg,
                  )}
                  style={{ color: meta.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    {meta.label}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {ratio}% of board
                  </div>
                </div>
              </div>

              <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1 scroll-liquid">
                {colTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/50 py-6 text-center text-[11px] text-muted-foreground">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function priorityRank(p: TaskPriority): number {
  return { urgent: 3, high: 2, normal: 1, low: 0 }[p];
}

function TaskCard({ task }: { task: Task }) {
  const ps = PRIORITY_STYLE[task.priority];
  const typeIcon =
    TASK_TYPE_ICON[task.type] ?? TASK_TYPE_ICON.default;
  const overdue =
    task.dueAt && new Date(task.dueAt).getTime() < Date.now();
  const TypeIcon = typeIcon;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 p-2.5 pl-3 transition hover:bg-muted/30"
      title={task.title}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: ps.color }}
      />
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <TypeIcon className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold leading-snug">
            {task.title}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                ps.pill,
              )}
            >
              {ps.label}
            </span>
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
          </div>
        </div>
      </div>
      {task.assigneeName && task.assigneeName !== "Unassigned" && (
        <div className="mt-2 flex items-center gap-1.5">
          <NameAvatar
            name={task.assigneeName}
            className="h-5 w-5 text-[9px]"
          />
          <span className="truncate text-[10px] text-muted-foreground">
            {task.assigneeName}
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================== 5. Account health ============================== */

function AccountHealthSection({
  accounts,
  overview,
}: {
  accounts: AccountHealthRow[];
  overview: Overview;
}) {
  const total = accounts.length || 1;
  const healthyPct = Math.round((overview.healthyAccounts / total) * 100);
  const atRiskPct = 100 - healthyPct;
  const sorted = [...accounts].sort(
    (a, b) => b.riskScore - a.riskScore,
  );

  return (
    <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.66s" }}>
      <SectionTitle
        title="Account health"
        desc="Risk, status & report signals across connected accounts"
        action={
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {overview.healthyAccounts} healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {overview.atRiskAccounts} at risk
            </span>
          </div>
        }
      />

      {/* Healthy vs at-risk bar */}
      <div className="mb-4 rounded-2xl border border-border/40 bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium">
          <span className="text-muted-foreground">Health ratio</span>
          <span className="num-display">
            <span className="text-emerald-500">{healthyPct}%</span>
            <span className="text-muted-foreground">
              {" "}
              /{" "}
              <span className="text-rose-500">{atRiskPct}%</span>
            </span>
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
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

      {/* List */}
      <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 scroll-liquid">
        {sorted.map((a) => (
          <AccountHealthRowCard key={a.id} account={a} />
        ))}
        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No accounts connected.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function AccountHealthRowCard({ account }: { account: AccountHealthRow }) {
  const pid = platformOf(account.platform);
  const risk =
    RISK_STYLE[account.riskLevel] ?? RISK_STYLE.safe;
  const atRisk = account.riskLevel !== "safe";
  const barColor = riskBarColor(account.riskScore);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border bg-background/50 p-3 transition hover:bg-muted/30",
        atRisk
          ? "border-primary/30 shadow-[inset_2px_0_0_0_var(--primary)]"
          : "border-border/40",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {pid ? (
          <PlatformBadge platform={pid} size={36} />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-[28%] bg-muted text-xs font-bold text-muted-foreground">
            {account.platform.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {account.displayName}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            @{account.handle}
          </div>
        </div>
      </div>

      {/* Followers */}
      <div className="text-right">
        <div className="num-display text-sm font-semibold">
          {fmt(account.followers)}
        </div>
        <div className="text-[10px] text-muted-foreground">followers</div>
      </div>

      {/* Risk score mini bar */}
      <div className="w-28">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Risk score</span>
          <span
            className="num-display font-semibold"
            style={{ color: barColor }}
          >
            {account.riskScore}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${account.riskScore}%`, background: barColor }}
          />
        </div>
      </div>

      {/* Risk badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          risk.bg,
          risk.color,
        )}
      >
        {atRisk && (
          <span
            className={cn(
              "inline-flex h-1.5 w-1.5 rounded-full",
              risk.color.replace("text-", "bg-"),
            )}
          />
        )}
        {risk.label}
      </span>

      {/* Status */}
      <span className="hidden text-[10px] text-muted-foreground capitalize sm:inline">
        {account.status}
      </span>

      {/* Reports */}
      <div className="flex items-center gap-1 text-[11px]">
        <Flag
          className={cn(
            "h-3 w-3",
            account.reportCount > 0 ? "text-rose-500" : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "num-display font-semibold",
            account.reportCount > 0 && "text-rose-500",
          )}
        >
          {account.reportCount}
        </span>
      </div>
    </div>
  );
}

/* ============================== 6. Department breakdown ============================== */

function DepartmentSection({ departments }: { departments: DepartmentRow[] }) {
  const sorted = [...departments].sort((a, b) => b.engagement - a.engagement);
  const maxEngagement = Math.max(1, ...sorted.map((d) => d.engagement));
  const colors = [
    "var(--primary)",
    "oklch(0.72 0.16 200)",
    "oklch(0.76 0.15 165)",
    "oklch(0.66 0.16 230)",
    "oklch(0.78 0.18 75)",
    "var(--gold)",
    "oklch(0.66 0.22 305)",
  ];
  const chartData = sorted.map((d, i) => ({
    name: d.name,
    engagement: d.engagement,
    fill: colors[i % colors.length],
  }));

  return (
    <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.74s" }}>
      <SectionTitle
        title="Department breakdown"
        desc="Engagement generated per department"
        action={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
            {sorted.length} departments
          </div>
        }
      />
      <div
        style={{ height: Math.max(180, sorted.length * 48) }}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={(v) => fmt(v)}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [fmt(v), "Engagement"]}
            />
            <Bar dataKey="engagement" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((d, i) => (
          <div
            key={d.name}
            className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 p-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium">{d.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {d.count} members · {fmt(d.engagement)}
              </div>
            </div>
            <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(d.engagement / maxEngagement) * 100}%`,
                  background: colors[i % colors.length],
                }}
              />
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No department data yet.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

/* ============================== 7. Activity feed ============================== */

function ActivitySection({ activities }: { activities: ActivityRow[] }) {
  const top = activities.slice(0, 15);

  return (
    <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.82s" }}>
      <SectionTitle
        title="Activity feed"
        desc="Latest actions across your workspace"
        action={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            {activities.length} events
          </div>
        }
      />
      <div className="space-y-1">
        {top.map((a) => {
          const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50"
            >
              <NameAvatar name={a.userName} className="h-8 w-8 text-[11px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  <span className="font-semibold">{a.userName}</span>{" "}
                  <span className="text-muted-foreground">
                    {a.description.replace(a.userName + " ", "")}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {a.type.replace(/_/g, " ")}
                </div>
              </div>
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="hidden w-16 text-right text-[11px] text-muted-foreground sm:block">
                {timeAgo(a.createdAt)}
              </span>
            </div>
          );
        })}
        {top.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No recent activity.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

/* ============================== Skeleton ============================== */

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-96 rounded-3xl" />
      <div className="shimmer h-[420px] rounded-3xl" />
      <div className="shimmer h-80 rounded-3xl" />
      <div className="shimmer h-72 rounded-3xl" />
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
