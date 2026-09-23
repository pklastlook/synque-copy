"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
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
  Heart,
  CalendarClock,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  UserPlus,
  Send,
  Wand2,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge, VerifiedTick } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";

interface DashboardData {
  kpis: {
    totalFollowers: { value: number; display: string; delta: number };
    impressions: { value: number; display: string; delta: number };
    engagement: { value: number; display: string; delta: number };
    published: number;
    scheduled: number;
    pendingInbox: number;
    accounts: number;
  };
  series: { date: string; impressions: number; reach: number; engagement: number; followers: number }[];
  byPlatform: Record<string, { followers: number; impressions: number; engagement: number }>;
  topPosts: {
    id: string;
    title: string;
    mediaUrl: string | null;
    status: string;
    authorName: string;
    engagement: number;
    reach: number;
    accounts: number;
  }[];
  activities: { id: string; userName: string; type: string; description: string; createdAt: string }[];
  upcoming: {
    id: string;
    title: string;
    mediaUrl: string | null;
    scheduledAt: string | null;
    accounts: number;
    authorName: string;
  }[];
}

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send,
  post_scheduled: CalendarClock,
  comment_replied: MessageCircle,
  account_connected: UserPlus,
  ai_generated: Wand2,
  team_joined: CheckCircle2,
};

export function DashboardView() {
  const { data, loading } = useApi<DashboardData>("/api/dashboard");
  const { setView } = useNav();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  if (loading || !data) return <DashboardSkeleton />;

  const platformData = Object.entries(data.byPlatform).map(([k, v]) => ({
    platform: k as PlatformId,
    name: PLATFORMS[k as PlatformId].name,
    value: v.followers,
    impressions: v.impressions,
    color: PLATFORMS[k as PlatformId].color,
  }));
  const totalFollowers = platformData.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-5">
      {/* Hero greeting */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">
              Good day, <span className="retaina-text">{firstName}</span>
            </h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              You have <span className="font-bold text-foreground">{data.kpis.scheduled}</span> posts scheduled and{" "}
              <span className="font-bold text-foreground">{data.kpis.pendingInbox}</span> conversations waiting.
            </p>
          </div>
          <button
            onClick={() => setView("composer")}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
          >
            <Wand2 className="h-4 w-4" />
            Compose with AI
          </button>
        </div>
      </GlassCard>

      {/* KPIs — real data bars from database analytics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Followers"
          value={data.kpis.totalFollowers.display}
          delta={data.kpis.totalFollowers.delta}
          icon={<Users className="h-5 w-5" />}
          accent="oklch(0.55 0.2 255)"
          hint={`across ${data.kpis.accounts} accounts`}
          delay={50}
          series={data.series.map((s) => s.followers)}
        />
        <KpiCard
          label="Impressions"
          value={data.kpis.impressions.display}
          delta={data.kpis.impressions.delta}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.62 0.22 300)"
          hint="last 14 days"
          delay={120}
          series={data.series.map((s) => s.impressions)}
        />
        <KpiCard
          label="Engagement"
          value={data.kpis.engagement.display}
          delta={data.kpis.engagement.delta}
          icon={<Heart className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          hint="likes + comments + shares"
          delay={190}
          series={data.series.map((s) => s.engagement)}
        />
        <KpiCard
          label="Scheduled"
          value={data.kpis.scheduled}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="oklch(0.68 0.22 145)"
          hint={`${data.kpis.published} published`}
          delay={260}
          series={data.series.map((s) => s.reach)}
        />
      </div>

      {/* Chart + platform donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.3s" }}>
          <SectionTitle
            title="Performance trend"
            desc="Impressions & engagement across all accounts"
            action={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Impressions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.74_0.18_165)]" /> Engagement
                </span>
              </div>
            }
          />
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.22 300)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.72 0.22 300)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
                  }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  formatter={(v: number, n) => [fmt(v), n === "impressions" ? "Impressions" : "Engagement"]}
                />
                <Area type="monotone" dataKey="impressions" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gImp)" isAnimationActive animationBegin={200} animationDuration={1200} />
                <Area type="monotone" dataKey="engagement" stroke="oklch(0.72 0.22 300)" strokeWidth={2.5} fill="url(#gEng)" isAnimationActive animationBegin={450} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.38s" }}>
          <SectionTitle title="Followers" desc="By platform" />
          {platformData.length > 0 ? (
            <>
              <div className="relative mx-auto h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={platformData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                      {platformData.map((p) => (
                        <Cell key={p.platform} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number, n) => [fmt(v), n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="num-display text-2xl font-bold">{fmt(totalFollowers)}</span>
                  <span className="text-[10px] text-muted-foreground">total reach</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {platformData.map((p) => (
                  <div key={p.platform} className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="truncate text-muted-foreground">{p.name}</span>
                    <span className="ml-auto font-medium">{fmt(p.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">No accounts connected</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Connect a social account to see follower breakdown</p>
              </div>
              <button
                onClick={() => setView("accounts")}
                className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
              >
                Connect account
              </button>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Top posts + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.46s" }}>
          <SectionTitle title="Top performing posts" desc="By total engagement across platforms" action={
            <button onClick={() => setView("analytics")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          }/>
          <div className="space-y-2">
            {data.topPosts.length > 0 ? (
              data.topPosts.map((p, i) => (
              <div key={p.id} className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-muted/50">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {p.mediaUrl ? (
                     
                    <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-bold text-white">#{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{p.accounts} accounts</span>
                    <span>·</span>
                    <span>{p.authorName}</span>
                  </div>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <div className="text-sm font-bold">{fmt(p.engagement)}</div>
                    <div className="text-[10px] text-muted-foreground">engagement</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-bold">{fmt(p.reach)}</div>
                    <div className="text-[10px] text-muted-foreground">reach</div>
                  </div>
                </div>
              </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No published posts yet</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Publish your first post to see performance</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.54s" }}>
          <SectionTitle title="Upcoming" desc="Scheduled posts" action={
            <button onClick={() => setView("calendar")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Calendar <ArrowUpRight className="h-3 w-3" />
            </button>
          }/>
          <div className="space-y-2">
            {data.upcoming.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-muted/50">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-center">
                  <div>
                    <div className="text-sm font-bold leading-none">
                      {p.scheduledAt ? new Date(p.scheduledAt).getDate() : "—"}
                    </div>
                    <div className="text-[9px] uppercase text-muted-foreground">
                      {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString(undefined, { month: "short" }) : ""}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {p.scheduledAt && new Date(p.scheduledAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit" })}
                    <span>·</span>
                    <span>{p.accounts} accounts</span>
                  </div>
                </div>
              </div>
            ))}
            {data.upcoming.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No scheduled posts</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Draft and schedule your first post</p>
                </div>
                <button
                  onClick={() => setView("composer")}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  Open composer
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Activity feed */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.62s" }}>
        <SectionTitle title="Team activity" desc="Recent actions across your workspace" />
        <div className="space-y-1">
          {data.activities.length > 0 ? (
            data.activities.map((a) => {
            const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50">
                <NameAvatar name={a.userName} className="h-8 w-8 text-[11px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    <span className="font-semibold">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{a.description.replace(a.userName + " ", "")}</span>
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
            })
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">No recent activity</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Actions across your workspace will appear here</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[320px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[320px] rounded-3xl" />
      </div>
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
