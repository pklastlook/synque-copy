"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AtSign,
  FileText,
  Heart,
  Users,
  UserPlus,
  MoreVertical,
  Shield,
  Eye,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "admin" | "member";
  title: string | null;
  color: string | null;
  accountsCount: number;
  postsCount: number;
  variantCount: number;
  engagement: number;
  followers: number;
}

const ADMIN_COLOR = "var(--primary)";
const MEMBER_COLOR = "oklch(0.74 0.18 165)";

export function TeamView() {
  const { data, loading } = useApi<TeamMember[]>("/api/team");
  const { currentUserId } = useNav();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "member">("member");

  if (loading || !data) return <TeamSkeleton />;

  // Sort admins first; preserve relative order otherwise.
  const sorted = [...data].sort((a, b) => {
    if (a.role === b.role) return 0;
    return a.role === "admin" ? -1 : 1;
  });

  const totals = sorted.reduce(
    (acc, m) => {
      acc.accounts += m.accountsCount;
      acc.posts += m.postsCount;
      acc.engagement += m.engagement;
      return acc;
    },
    { accounts: 0, posts: 0, engagement: 0 },
  );
  const maxPosts = Math.max(1, ...sorted.map((m) => m.postsCount));
  const adminCount = sorted.filter((m) => m.role === "admin").length;

  const workloadData = sorted.map((m) => ({
    name: m.name,
    posts: m.postsCount,
    fill: m.role === "admin" ? ADMIN_COLOR : MEMBER_COLOR,
  }));

  const onInvite = () => {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    toast.success("Invitation sent");
    setEmail("");
    setRole("member");
    setInviteOpen(false);
  };

  return (
    <div className="animate-rise space-y-5">
      {/* Header */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Shield className="h-3.5 w-3.5" />
              Admin · Team management
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Your team
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{sorted.length}</span>{" "}
              members managing{" "}
              <span className="font-semibold text-foreground">{totals.accounts}</span>{" "}
              social accounts.
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Invite member
          </button>
        </div>
      </GlassCard>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They will get an email invitation to join your Prism workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "admin" | "member")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    Member — can publish &amp; manage
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin — full workspace access
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={onInvite}
              className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Send className="h-4 w-4" />
              Send invitation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Team members"
          value={sorted.length}
          icon={<Users className="h-5 w-5" />}
          accent="var(--primary)"
          hint={`${adminCount} admin${adminCount === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Accounts managed"
          value={totals.accounts}
          icon={<AtSign className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="across all members"
        />
        <KpiCard
          label="Total posts"
          value={totals.posts}
          icon={<FileText className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="authored by team"
        />
        <KpiCard
          label="Total engagement"
          value={fmt(totals.engagement)}
          icon={<Heart className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="likes + comments + shares"
        />
      </div>

      {/* Member cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            maxPosts={maxPosts}
            isYou={m.id === currentUserId}
          />
        ))}
      </div>

      {/* Workload distribution */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Workload distribution"
          desc="Posts authored per member · admins in rose, members in teal"
        />
        <div
          style={{ height: Math.max(140, sorted.length * 44) }}
          className="w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={workloadData}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={104}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
                }}
                formatter={(v: number) => [`${v} posts`, "Authored"]}
              />
              <Bar dataKey="posts" radius={[6, 6, 6, 6]} barSize={18}>
                {workloadData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Admin
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: MEMBER_COLOR }}
            />
            Member
          </span>
        </div>
      </GlassCard>
    </div>
  );
}

function MemberCard({
  member,
  maxPosts,
  isYou,
}: {
  member: TeamMember;
  maxPosts: number;
  isYou: boolean;
}) {
  const workload = Math.round((member.postsCount / maxPosts) * 100);

  return (
    <GlassCard hover className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <NameAvatar
          name={member.name}
          src={member.avatar}
          color={member.color}
          className="h-16 w-16 text-base"
          ring
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold leading-tight">
              {member.name}
            </span>
            {isYou && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                You
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                member.role === "admin"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {member.role === "admin" && <Shield className="h-3 w-3" />}
              {member.role === "admin" ? "Admin" : "Member"}
            </span>
            {member.title && (
              <span className="truncate text-[11px] text-muted-foreground">
                {member.title}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
            {member.email}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Member actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            {member.role === "admin" ? (
              <DropdownMenuItem
                onClick={() => toast.success(`${member.name} is now a member`)}
              >
                <Shield className="mr-2 h-4 w-4" /> Make member
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => toast.success(`${member.name} is now an admin`)}
              >
                <Shield className="mr-2 h-4 w-4" /> Make admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => toast.info(`Opening ${member.name}'s activity`)}
            >
              <Eye className="mr-2 h-4 w-4" /> View activity
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-500 focus:text-rose-500"
              onClick={() =>
                toast.error(`${member.name} removed from workspace`)
              }
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats 2x2 grid */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat
          icon={<AtSign className="h-3.5 w-3.5" />}
          value={member.accountsCount}
          label="Accounts"
        />
        <Stat
          icon={<FileText className="h-3.5 w-3.5" />}
          value={member.postsCount}
          label="Posts"
        />
        <Stat
          icon={<Heart className="h-3.5 w-3.5" />}
          value={fmt(member.engagement)}
          label="Engagement"
        />
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          value={fmt(member.followers)}
          label="Reach"
        />
      </div>

      {/* Workload bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Workload</span>
          <span className="font-medium text-foreground">{workload}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--gold)] transition-all"
            style={{ width: `${workload}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl"
          onClick={() => toast.info(`Opening ${member.name}'s profile`)}
        >
          View profile
        </Button>
      </div>
    </GlassCard>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-72 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
