"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Shield,
  Briefcase,
  BadgeCheck,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Save,
  Mail,
  Phone,
  Calendar,
  Globe,
  Crown,
  Loader2,
  Search,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Database,
  Server,
  Link2,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { useApi } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MetricRow,
  SectionHeader,
  HeroChart,
  ListRow,
  Pill,
  NavCard,
  type Metric,
} from "@/components/glass/dense-ui";
import { TeamView } from "@/components/views/team";

// ============================================================================
// Types & shared helpers
// ============================================================================

export type OrgTab =
  | "organisation"
  | "overview"
  | "users"
  | "team"
  | "roles"
  | "departments"
  | "designations";

interface OrgTabDef {
  id: OrgTab;
  label: string;
  icon: LucideIcon;
  description: string;
  accent: string;
}

const ORG_NAV: OrgTabDef[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutGrid,
    description: "Org-wide snapshot",
    accent: "oklch(0.62 0.22 300)",
  },
  {
    id: "organisation",
    label: "Organisation",
    icon: Building2,
    description: "Tenant profile & DB",
    accent: "oklch(0.55 0.2 255)",
  },
  {
    id: "users",
    label: "Members",
    icon: Users,
    description: "User directory & CRUD",
    accent: "oklch(0.66 0.18 200)",
  },
  {
    id: "team",
    label: "Team",
    icon: Shield,
    description: "Member cards & invites",
    accent: "oklch(0.55 0.2 25)",
  },
  {
    id: "roles",
    label: "Roles",
    icon: BadgeCheck,
    description: "Access levels",
    accent: "oklch(0.62 0.22 300)",
  },
  {
    id: "departments",
    label: "Departments",
    icon: Briefcase,
    description: "Org structure",
    accent: "oklch(0.68 0.2 145)",
  },
  {
    id: "designations",
    label: "Designations",
    icon: Crown,
    description: "Job titles & levels",
    accent: "oklch(0.78 0.18 75)",
  },
];

/** Backward-compat export consumed by app-sidebar (sub-tab list). */
export const ORG_TABS: ReadonlyArray<{ id: OrgTab; label: string; icon: LucideIcon }> = ORG_NAV.map((t) => ({
  id: t.id,
  label: t.label,
  icon: t.icon,
}));

function getToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

// ============================================================================
// Main component — dense two-pane layout (NavCard sidebar + content)
// ============================================================================

export function OrganizationView() {
  const { orgTab, setOrgTab } = useNav();
  const tab: OrgTab = (orgTab as OrgTab) || "overview";
  const activeDef = ORG_NAV.find((t) => t.id === tab) ?? ORG_NAV[0];
  const ActiveIcon = activeDef.icon;

  return (
    <div className="animate-rise grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* ---------- Sidebar (NavCard list) ---------- */}
      <aside className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <GlassCard strong className="glass-sheen relative overflow-hidden p-4">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>Organization</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <ActiveIcon className="h-3 w-3" />
                {activeDef.label}
              </span>
            </div>
            <h2 className="mt-1.5 text-base font-bold tracking-tight">{activeDef.label}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{activeDef.description}</p>
          </div>
        </GlassCard>

        <div className="space-y-2">
          {ORG_NAV.map((t) => (
            <NavCard
              key={t.id}
              icon={t.icon}
              title={t.label}
              desc={t.description}
              accent={t.accent}
              active={tab === t.id}
              onClick={() => setOrgTab(t.id)}
            />
          ))}
        </div>
      </aside>

      {/* ---------- Content pane ---------- */}
      <div className="min-w-0 space-y-4">
        {tab === "organisation" && <OrganisationSection />}
        {tab === "overview" && <OverviewSection />}
        {tab === "users" && <UsersSection />}
        {tab === "team" && (
          <div className="space-y-4">
            <HelpText module="organization-team">
              The <strong className="text-foreground">Team</strong> tab shows member cards, workload distribution, and lets you invite or create new members. Manage the <em>list</em> of available roles / departments / designations in their respective tabs in the sidebar.
            </HelpText>
            <TeamView />
          </div>
        )}
        {tab === "roles" && <RolesSection />}
        {tab === "departments" && <DepartmentsSection />}
        {tab === "designations" && <DesignationsSection />}
      </div>
    </div>
  );
}

// ============================================================================
// Organisation — the tenant itself (profile + dedicated database)
// ============================================================================

interface TenantDbInfo {
  dbName: string;
  dbUrl: string;
  status: string;
  createdAt: string;
}
interface OrgInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
  plan: string;
  createdAt: string;
  database?: TenantDbInfo | null;
}

function OrganisationSection() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "admin" && !user?.customerId;
  const { data: org, loading } = useApi<OrgInfo | OrgInfo[]>("/api/customers");
  const { data: users } = useApi<UserRow[]>("/api/users");

  const myOrg: OrgInfo | null = React.useMemo(() => {
    if (!org) return null;
    if (Array.isArray(org)) {
      if (isSuperAdmin) return org[0] ?? null;
      return (org as OrgInfo[]).find((c) => c.id === user?.customerId) ?? org[0] ?? null;
    }
    return org;
  }, [org, isSuperAdmin, user?.customerId]);

  const memberCount = React.useMemo(() => {
    if (!users) return 0;
    if (isSuperAdmin) return users.length;
    return users.filter((u) => u.customerId === user?.customerId).length;
  }, [users, isSuperAdmin, user?.customerId]);

  if (loading || !myOrg) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-24 rounded-xl" />
        <div className="shimmer h-48 rounded-xl" />
      </div>
    );
  }

  const dbInfo = myOrg.database;
  const planPill = myOrg.plan === "enterprise" ? "violet" : myOrg.plan === "pro" ? "blue" : "neutral";
  const statusPill =
    myOrg.status === "active" ? "green" : myOrg.status === "trial" ? "amber" : "rose";

  return (
    <div className="space-y-4">
      <HelpText module="organization-organisation">
        <strong className="text-foreground">Organisation</strong> is your tenant — a client workspace with its own dedicated database. All users, roles, departments, designations, posts, and accounts you create here are stored in this organisation&apos;s isolated database for full data isolation.
      </HelpText>

      {/* Tenant identity hero card — Card #1 */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-xl font-bold text-primary">
              {(myOrg.company ?? myOrg.name).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-lg font-bold tracking-tight">{myOrg.company ?? myOrg.name}</h3>
                <Pill color={statusPill as "green" | "amber" | "rose"}>{myOrg.status}</Pill>
                <Pill color={planPill as "violet" | "blue" | "neutral"}>Plan · {myOrg.plan}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {myOrg.email}{myOrg.phone ? ` · ${myOrg.phone}` : ""}{myOrg.country ? ` · ${myOrg.country}` : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                Member since {new Date(myOrg.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-border/40 bg-muted/30 px-3 py-1.5 text-[11px] font-semibold tabular-nums">
              {memberCount} member{memberCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Dedicated database panel — Card #2 */}
      <HeroChart
        title="Dedicated database"
        desc="Each organisation has its own isolated PostgreSQL database. All tenant-scoped data lives here."
        action={
          dbInfo ? (
            <Pill color="green">
              <Check className="h-2.5 w-2.5" /> Isolated
            </Pill>
          ) : (
            <Pill color="amber">
              <ShieldAlert className="h-2.5 w-2.5" /> Shared
            </Pill>
          )
        }
      >
        {dbInfo ? (
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <DbStat icon={<Database className="h-3.5 w-3.5" />} label="Database name" value={dbInfo.dbName} />
              <DbStat icon={<Server className="h-3.5 w-3.5" />} label="Status" value={dbInfo.status} badge />
              <DbStat icon={<Calendar className="h-3.5 w-3.5" />} label="Provisioned" value={new Date(dbInfo.createdAt).toLocaleString()} />
              <DbStat icon={<Link2 className="h-3.5 w-3.5" />} label="Connection" value={dbInfo.dbUrl ? `...${dbInfo.dbUrl.slice(-40)}` : "—"} />
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Database isolated.</span> Users in this organisation are linked to this database. Roles, departments, designations, posts, accounts, and analytics created here are isolated from other organisations.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              No dedicated database provisioned
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This organisation is currently using the shared main database with row-level filtering. Ask the workspace owner to provision a dedicated database from the <strong>Owner Panel → Customers</strong> screen for full data isolation.
            </p>
          </div>
        )}
      </HeroChart>

      {/* Contact / address — Card #3 (conditional) */}
      {(myOrg.address || myOrg.city || myOrg.country || myOrg.phone) && (
        <GlassCard className="p-4">
          <SectionHeader title="Contact & address" desc="Organisation contact details" icon={Building2} />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {myOrg.address && <DbStat icon={<Building2 className="h-3.5 w-3.5" />} label="Address" value={myOrg.address} />}
            {myOrg.city && <DbStat icon={<Building2 className="h-3.5 w-3.5" />} label="City" value={myOrg.city} />}
            {myOrg.country && <DbStat icon={<Globe className="h-3.5 w-3.5" />} label="Country" value={myOrg.country} />}
            {myOrg.phone && <DbStat icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={myOrg.phone} />}
            {myOrg.email && <DbStat icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={myOrg.email} />}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function DbStat({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: boolean }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 truncate text-xs font-semibold", badge && "capitalize")}>{value}</div>
    </div>
  );
}

// ============================================================================
// Overview — org-wide snapshot
// ============================================================================

function OverviewSection() {
  const { data: users } = useApi<any[]>("/api/users");
  const { data: roles } = useApi<any[]>("/api/organization/roles");
  const { data: departments } = useApi<any[]>("/api/organization/departments");
  const { data: designations } = useApi<any[]>("/api/organization/designations");

  const userCount = users?.length ?? 0;
  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;
  const activeCount = users?.filter((u) => u.status === "active").length ?? 0;
  const systemRoleCount = (roles ?? []).filter((r) => r.isSystem).length;

  const deptCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    (users ?? []).forEach((u) => {
      const d = u.department ?? "Unassigned";
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const roleCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    (users ?? []).forEach((u) => {
      const r = u.role ?? "member";
      map.set(r, (map.get(r) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const metrics: Metric[] = [
    { label: "Total users", value: userCount, color: "oklch(0.66 0.18 200)", spark: activeCount ? [userCount - activeCount, activeCount] : [userCount] },
    { label: "Active", value: activeCount, color: "oklch(0.68 0.2 145)" },
    { label: "Admins", value: adminCount, color: "oklch(0.55 0.2 25)" },
    { label: "Roles", value: roles?.length ?? 0, color: "oklch(0.62 0.22 300)" },
    { label: "Departments", value: departments?.length ?? 0, color: "oklch(0.78 0.18 75)" },
    { label: "Designations", value: designations?.length ?? 0, color: "oklch(0.72 0.18 165)" },
  ];

  return (
    <div className="space-y-4">
      <HelpText module="organization-overview">
        The <strong className="text-foreground">Organization</strong> module is your single hub for managing your team structure — users, team members, roles, departments, and designations. Use the sidebar to switch between management screens.
      </HelpText>

      {/* MetricRow replaces 4-KpiCard grid — Card #1 */}
      <MetricRow metrics={metrics} />

      {/* Department distribution — Card #2 */}
      <HeroChart
        title="Members per department"
        desc="Where your people sit today"
        action={<Pill>{deptCounts.length} groups</Pill>}
      >
        <div className="space-y-2">
          {deptCounts.length === 0 && (
            <p className="text-xs text-muted-foreground">No users yet.</p>
          )}
          {deptCounts.map(([name, count]) => {
            const max = Math.max(1, ...deptCounts.map((d) => d[1]));
            const pct = Math.round((count / max) * 100);
            const color = (departments ?? []).find((d) => d.name === name)?.color ?? "var(--primary)";
            return (
              <div key={name} className="flex items-center gap-3">
                <div className="w-28 truncate text-xs font-medium">{name}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="w-8 text-right text-xs font-semibold tabular-nums">{count}</div>
              </div>
            );
          })}
        </div>
      </HeroChart>

      {/* Role distribution — Card #3 */}
      <HeroChart
        title="Members per role"
        desc="Access-level distribution"
        action={<Pill color="violet">{systemRoleCount} system</Pill>}
      >
        <div className="space-y-2">
          {roleCounts.length === 0 && (
            <p className="text-xs text-muted-foreground">No users yet.</p>
          )}
          {roleCounts.map(([name, count]) => {
            const max = Math.max(1, ...roleCounts.map((d) => d[1]));
            const pct = Math.round((count / max) * 100);
            const isAdmin = name === "admin";
            return (
              <div key={name} className="flex items-center gap-3">
                <div className="w-28 truncate text-xs font-medium capitalize">{name}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: isAdmin ? "oklch(0.55 0.2 25)" : "var(--primary)" }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-semibold tabular-nums">{count}</div>
              </div>
            );
          })}
        </div>
      </HeroChart>

      {/* Designations pills — Card #4 */}
      <GlassCard className="p-4">
        <SectionHeader
          title="Designations"
          desc="Available job titles in your workspace"
          icon={Crown}
        />
        <div className="flex flex-wrap gap-1.5">
          {(designations ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No designations yet — switch to the Designations tab in the sidebar to add some.</p>
          )}
          {(designations ?? []).map((d) => (
            <Pill key={d.id} color="amber">
              <Crown className="h-2.5 w-2.5" />
              {d.name}
              <span className="opacity-70">Lv {d.level}</span>
            </Pill>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Users — full CRUD over all users in this tenant (Members section)
// ============================================================================

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  department: string | null;
  status: string;
  color: string | null;
  avatar: string | null;
  gender?: string | null;
  phone?: string | null;
  bio?: string | null;
  timezone?: string | null;
  language?: string | null;
  birthDate?: string | null;
  customerId?: string | null;
  lastActive?: string | null;
  createdAt?: string;
}

function UsersSection() {
  const { user: currentUser } = useAuth();
  const { data, loading, reload } = useApi<UserRow[]>("/api/users");
  const { data: roles } = useApi<any[]>("/api/organization/roles");
  const { data: departments } = useApi<any[]>("/api/organization/departments");
  const { data: designations } = useApi<any[]>("/api/organization/designations");

  const [search, setSearch] = React.useState("");
  const [filterRole, setFilterRole] = React.useState<string>("all");
  const [filterDept, setFilterDept] = React.useState<string>("all");
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(() => {
    const arr = (data ?? []).filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = filterRole === "all" || u.role === filterRole;
      const matchesDept = filterDept === "all" || (u.department ?? "") === filterDept;
      return matchesSearch && matchesRole && matchesDept;
    });
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search, filterRole, filterDept]);

  const metrics: Metric[] = React.useMemo(() => {
    const total = data?.length ?? 0;
    const active = (data ?? []).filter((u) => u.status === "active").length;
    const admins = (data ?? []).filter((u) => u.role === "admin").length;
    const suspended = (data ?? []).filter((u) => u.status === "suspended").length;
    return [
      { label: "Total members", value: total, color: "oklch(0.66 0.18 200)" },
      { label: "Active", value: active, color: "oklch(0.68 0.2 145)" },
      { label: "Admins", value: admins, color: "oklch(0.55 0.2 25)" },
      { label: "Suspended", value: suspended, color: "oklch(0.62 0.24 15)" },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-14 rounded-xl" />
        <div className="shimmer h-20 rounded-xl" />
        <div className="shimmer h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* MetricRow — Card #1 */}
      <MetricRow metrics={metrics} />

      {/* Toolbar — Card #2 */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {(roles ?? []).map((r) => (
                <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setCreating(true)}
            className="liquid-pill ml-auto flex items-center gap-2 rounded-xl"
          >
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        </div>
      </GlassCard>

      {/* Members list — Card #3 */}
      <HeroChart
        title={`Members (${filtered.length})`}
        desc="Full user directory with search and filters"
        action={<Pill color="blue">{filtered.length} shown</Pill>}
      >
        <div className="-mx-3 -mb-3 max-h-[640px] overflow-y-auto">
          {/* Header row */}
          <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0">
            <div className="min-w-[200px] flex-1">User</div>
            <div className="w-24">Role</div>
            <div className="w-28">Department</div>
            <div className="w-24">Designation</div>
            <div className="w-20">Status</div>
            <div className="w-8 text-right">·</div>
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              No users match your filters.
            </div>
          )}
          {filtered.map((u) => {
            const isYou = u.id === currentUser?.id;
            const roleColor =
              u.role === "admin" ? "rose"
              : u.role === "manager" ? "violet"
              : u.role === "editor" ? "blue"
              : "neutral";
            const statusColor =
              u.status === "active" ? "green"
              : u.status === "invited" ? "amber"
              : "rose";
            return (
              <ListRow key={u.id} className="!py-2">
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-2.5">
                    <NameAvatar name={u.name} src={u.avatar} color={u.color} gender={u.gender ?? undefined} className="h-8 w-8 text-[11px]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold">{u.name}</span>
                        {isYou && <Pill color="blue">You</Pill>}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </div>
                <div className="w-24">
                  <Pill color={roleColor as "rose" | "violet" | "blue" | "neutral"}>
                    {u.role === "admin" && <Shield className="h-2.5 w-2.5" />}
                    <span className="capitalize">{u.role}</span>
                  </Pill>
                </div>
                <div className="w-28 truncate text-xs">{u.department ?? <span className="text-muted-foreground">—</span>}</div>
                <div className="w-24 truncate text-xs">{u.title ?? <span className="text-muted-foreground">—</span>}</div>
                <div className="w-20">
                  <Pill color={statusColor as "green" | "amber" | "rose"}>
                    <span className="capitalize">{u.status}</span>
                  </Pill>
                </div>
                <div className="w-8 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0" aria-label="User actions">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl">
                      <DropdownMenuItem onClick={() => setEditing(u)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          apiFetch("/api/users", {
                            method: "PATCH",
                            body: JSON.stringify({ id: u.id, status: u.status === "suspended" ? "active" : "suspended" }),
                          }).then((r) => {
                            if (r.ok) { toast.success(u.status === "suspended" ? "User reactivated" : "User suspended"); reload(); }
                            else { toast.error("Failed to update status"); }
                          });
                        }}
                      >
                        <ShieldAlert className="mr-2 h-4 w-4" /> {u.status === "suspended" ? "Reactivate" : "Suspend"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-500 focus:text-rose-500"
                        disabled={u.role === "admin"}
                        onClick={async () => {
                          if (u.role === "admin") { toast.error("Cannot delete an admin — demote first"); return; }
                          if (!confirm(`Permanently delete ${u.name}? This removes their account.`)) return;
                          const res = await apiFetch(`/api/team/${u.id}?reassignTo=${currentUser?.id ?? ""}`, { method: "DELETE" });
                          if (res.ok) { toast.success("User deleted"); reload(); }
                          else { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed to delete"); }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ListRow>
            );
          })}
        </div>
      </HeroChart>

      {editing && (
        <UserEditDialog
          user={editing}
          roles={roles ?? []}
          departments={departments ?? []}
          designations={designations ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
      {creating && (
        <UserCreateDialog
          roles={roles ?? []}
          departments={departments ?? []}
          designations={designations ?? []}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload(); }}
        />
      )}
    </div>
  );
}

// ---- Edit dialog (functionality preserved) ----
function UserEditDialog({
  user,
  roles,
  departments,
  designations,
  onClose,
  onSaved,
}: {
  user: UserRow;
  roles: any[];
  departments: any[];
  designations: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(user.name);
  const [email, setEmail] = React.useState(user.email);
  const [role, setRole] = React.useState(user.role);
  const [title, setTitle] = React.useState(user.title ?? "");
  const [department, setDepartment] = React.useState(user.department ?? "");
  const [phone, setPhone] = React.useState(user.phone ?? "");
  const [status, setStatus] = React.useState(user.status);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: user.id,
          name: name.trim(),
          email: email.trim(),
          role,
          title: title.trim() || null,
          department: department || null,
          phone: phone.trim() || null,
          status,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("User updated"); onSaved(); }
      else toast.error(j.error ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4 text-primary" /> Edit user
          </DialogTitle>
          <DialogDescription>Update profile, role, department, and designation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground">
                      No roles configured. Add roles in the Roles tab first.
                    </div>
                  ) : (
                    roles.map((r) => (
                      <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={department || "__none__"} onValueChange={(v) => setDepartment(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Designation / title">
              <Select value={title || "__none__"} onValueChange={(v) => setTitle(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No designation</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Create dialog (functionality preserved) ----
function UserCreateDialog({
  roles,
  departments,
  designations,
  onClose,
  onSaved,
}: {
  roles: any[];
  departments: any[];
  designations: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{ name: string; email: string; password: string; role: string } | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  function generatePassword() {
    const seg = () => Math.random().toString(36).slice(2, 6).padEnd(4, "0");
    const n = Math.floor(100 + Math.random() * 900);
    setPassword(`${seg()}-${seg()}-${n}`);
  }

  async function save() {
    if (!name.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    if (!role) { toast.error("Please select a role"); return; }
    if (!password.trim() || password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/team", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          title: title || undefined,
          department: department || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreatedCreds({ name: name.trim(), email: email.trim(), password: password.trim(), role });
        setName(""); setEmail(""); setPassword(""); setTitle(""); setDepartment(""); setRole("");
        onSaved();
      } else {
        toast.error(j.error ?? "Failed to create user");
      }
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(label: string, text: string) {
    try {
      navigator.clipboard?.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        {createdCreds ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><Check className="h-4 w-4" /></span>
                User created
              </DialogTitle>
              <DialogDescription>Share these credentials with {createdCreds.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <CredRow label="Name" value={createdCreds.name} copied={copied === "Name"} onCopy={() => copyToClipboard("Name", createdCreds.name)} />
              <CredRow label="Email" value={createdCreds.email} copied={copied === "Email"} onCopy={() => copyToClipboard("Email", createdCreds.email)} />
              <CredRow label="Password" value={createdCreds.password} copied={copied === "Password"} onCopy={() => copyToClipboard("Password", createdCreds.password)} />
              <CredRow label="Role" value={createdCreds.role} copied={copied === "Role"} onCopy={() => copyToClipboard("Role", createdCreds.role)} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4 text-primary" /> Add new user
              </DialogTitle>
              <DialogDescription>Create a login for a new team member.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name *">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                </Field>
                <Field label="Email *">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@studio.com" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Role">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent>
                      {roles.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-muted-foreground">
                          No roles configured. Add roles in the Roles tab first.
                        </div>
                      ) : (
                        roles.map((r) => (
                          <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Department">
                  <Select value={department || "__none__"} onValueChange={(v) => setDepartment(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No department</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Designation">
                <Select value={title || "__none__"} onValueChange={(v) => setTitle(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No designation</SelectItem>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Password *">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={generatePassword} className="rounded-xl">
                    <KeyRound className="h-3.5 w-3.5" /> Generate
                  </Button>
                </div>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Create user
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1 truncate rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5 text-xs font-medium">{value || "—"}</div>
      <button onClick={onCopy} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ============================================================================
// Roles — CRUD (dense ListRow layout)
// ============================================================================

function RolesSection() {
  const { data, loading, reload } = useApi<any[]>("/api/organization/roles");
  const [editing, setEditing] = React.useState<any | null>(null);
  const [creating, setCreating] = React.useState(false);

  const metrics: Metric[] = React.useMemo(() => {
    const total = data?.length ?? 0;
    const system = (data ?? []).filter((r) => r.isSystem).length;
    const custom = total - system;
    const avgLevel = total ? Math.round((data ?? []).reduce((s, r) => s + (r.level ?? 0), 0) / total * 10) / 10 : 0;
    const maxLevel = total ? Math.max(...(data ?? []).map((r) => r.level ?? 0)) : 0;
    return [
      { label: "Total roles", value: total, color: "oklch(0.62 0.22 300)" },
      { label: "System roles", value: system, color: "oklch(0.55 0.2 25)" },
      { label: "Custom roles", value: custom, color: "oklch(0.78 0.18 75)" },
      { label: "Avg level", value: avgLevel, color: "oklch(0.68 0.2 145)" },
      { label: "Max level", value: maxLevel, color: "oklch(0.72 0.18 165)" },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-14 rounded-xl" />
        <div className="shimmer h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HelpText module="organization-roles">
        <strong className="text-foreground">Roles</strong> define the access levels available in the workspace. Add the roles your organisation needs — they&apos;ll appear as options when adding or editing users.
      </HelpText>

      {/* MetricRow — Card #1 */}
      <MetricRow metrics={metrics} />

      {/* Roles list — Card #2 */}
      <HeroChart
        title="Roles"
        desc="Access-level configuration"
        action={
          <Button onClick={() => setCreating(true)} className="liquid-pill flex items-center gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Add role
          </Button>
        }
      >
        <div className="-mx-3 -mb-3">
          {/* Header row */}
          <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="min-w-[200px] flex-1">Role</div>
            <div className="w-16">Type</div>
            <div className="w-16">Level</div>
            <div className="w-8 text-right">·</div>
          </div>
          {(data ?? []).length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              No roles yet. Click <strong>Add role</strong> to create one.
            </div>
          )}
          {(data ?? []).map((r) => (
            <ListRow key={r.id} className="!py-2.5">
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                    r.isSystem ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  )}>
                    {r.isSystem ? <Shield className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold capitalize">{r.name}</span>
                    {r.description && (
                      <div className="truncate text-[10px] text-muted-foreground">{r.description}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-16">
                <Pill color={r.isSystem ? "blue" : "amber"}>
                  {r.isSystem ? "system" : "custom"}
                </Pill>
              </div>
              <div className="w-16 text-xs font-semibold tabular-nums">L{r.level}</div>
              <div className="w-8 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0" aria-label="Role actions">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 rounded-xl">
                    <DropdownMenuItem onClick={() => setEditing(r)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {!r.isSystem && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-500"
                          onClick={async () => {
                            if (!confirm(`Delete the "${r.name}" role?`)) return;
                            const res = await apiFetch(`/api/organization/roles/${r.id}`, { method: "DELETE" });
                            const j = await res.json().catch(() => ({}));
                            if (res.ok) { toast.success("Role deleted"); reload(); }
                            else toast.error(j.error ?? "Failed to delete");
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListRow>
          ))}
        </div>
      </HeroChart>

      {creating && (
        <RoleDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />
      )}
      {editing && (
        <RoleDialog role={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function RoleDialog({ role, onClose, onSaved }: { role?: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(role?.name ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [level, setLevel] = React.useState<number>(role?.level ?? 2);
  const [saving, setSaving] = React.useState(false);
  const isSystem = role?.isSystem === true;

  async function save() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = role
        ? await apiFetch(`/api/organization/roles/${role.id}`, {
            method: "PATCH",
            body: JSON.stringify({ description: description.trim() || null, level }),
          })
        : await apiFetch("/api/organization/roles", {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null, level }),
          });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { toast.success(role ? "Role updated" : "Role created"); onSaved(); }
      else toast.error(j.error ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4 text-primary" /> {role ? "Edit role" : "Add role"}
          </DialogTitle>
          <DialogDescription>
            {isSystem ? "This is a built-in role — only the description and level can be changed." : "Define the name and metadata for this role."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSystem || !!role} placeholder="e.g. content-lead" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What does this role do?" />
          </Field>
          <Field label={`Level (1=viewer → 5=admin) — ${level}`}>
            <input
              type="range"
              min={1}
              max={5}
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--primary)]"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {role ? "Save" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Departments — CRUD (dense ListRow layout)
// ============================================================================

function DepartmentsSection() {
  const { data, loading, reload } = useApi<any[]>("/api/organization/departments");
  const { data: users } = useApi<UserRow[]>("/api/users");
  const [editing, setEditing] = React.useState<any | null>(null);
  const [creating, setCreating] = React.useState(false);

  const memberCount = React.useCallback((name: string) => (users ?? []).filter((u) => u.department === name).length, [users]);

  const metrics: Metric[] = React.useMemo(() => {
    const total = data?.length ?? 0;
    const totalMembers = users?.length ?? 0;
    const assigned = (users ?? []).filter((u) => !!u.department).length;
    const max = total ? Math.max(...(data ?? []).map((d) => memberCount(d.name))) : 0;
    const unassigned = totalMembers - assigned;
    return [
      { label: "Departments", value: total, color: "oklch(0.68 0.2 145)" },
      { label: "Assigned users", value: assigned, color: "oklch(0.66 0.18 200)" },
      { label: "Unassigned", value: unassigned, color: "oklch(0.62 0.24 15)" },
      { label: "Largest dept", value: max, color: "oklch(0.78 0.18 75)" },
    ];
  }, [data, users, memberCount]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-14 rounded-xl" />
        <div className="shimmer h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HelpText module="organization-departments">
        <strong className="text-foreground">Departments</strong> organize your people. Add or rename departments here — they appear as options when adding or editing users.
      </HelpText>

      {/* MetricRow — Card #1 */}
      <MetricRow metrics={metrics} />

      {/* Departments list — Card #2 */}
      <HeroChart
        title="Departments"
        desc="Org structure & member distribution"
        action={
          <Button onClick={() => setCreating(true)} className="liquid-pill flex items-center gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Add department
          </Button>
        }
      >
        <div className="-mx-3 -mb-3">
          <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="min-w-[220px] flex-1">Department</div>
            <div className="w-24">Members</div>
            <div className="w-8 text-right">·</div>
          </div>
          {(data ?? []).length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              No departments yet. Click <strong>Add department</strong> to create one.
            </div>
          )}
          {(data ?? []).map((d) => {
            const count = memberCount(d.name);
            return (
              <ListRow key={d.id} className="!py-2.5">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: (d.color ?? "var(--primary)") + "22", color: d.color ?? "var(--primary)" }}>
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold">{d.name}</span>
                      {d.description && (
                        <div className="truncate text-[10px] text-muted-foreground">{d.description}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-24">
                  <Pill color={count > 0 ? "green" : "neutral"}>{count} member{count === 1 ? "" : "s"}</Pill>
                </div>
                <div className="w-8 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0" aria-label="Department actions">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 rounded-xl">
                      <DropdownMenuItem onClick={() => setEditing(d)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-500 focus:text-rose-500"
                        onClick={async () => {
                          if (count > 0) { toast.error(`${count} user(s) are in this department. Reassign them first.`); return; }
                          if (!confirm(`Delete the "${d.name}" department?`)) return;
                          const res = await apiFetch(`/api/organization/departments/${d.id}`, { method: "DELETE" });
                          const j = await res.json().catch(() => ({}));
                          if (res.ok) { toast.success("Department deleted"); reload(); }
                          else toast.error(j.error ?? "Failed to delete");
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ListRow>
            );
          })}
        </div>
      </HeroChart>

      {creating && (
        <DepartmentDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} users={users ?? []} />
      )}
      {editing && (
        <DepartmentDialog department={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} users={users ?? []} />
      )}
    </div>
  );
}

function DepartmentDialog({ department, onClose, onSaved, users }: { department?: any; onClose: () => void; onSaved: () => void; users: UserRow[] }) {
  const [name, setName] = React.useState(department?.name ?? "");
  const [description, setDescription] = React.useState(department?.description ?? "");
  const [color, setColor] = React.useState(department?.color ?? "oklch(0.62 0.22 300)");
  const [headUserId, setHeadUserId] = React.useState(department?.headUserId ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = department
        ? await apiFetch(`/api/organization/departments/${department.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color: color || null, headUserId: headUserId || null }),
          })
        : await apiFetch("/api/organization/departments", {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color: color || null, headUserId: headUserId || null }),
          });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { toast.success(department ? "Department updated" : "Department created"); onSaved(); }
      else toast.error(j.error ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  const palette = [
    "oklch(0.55 0.2 255)", "oklch(0.68 0.2 145)", "oklch(0.66 0.18 200)",
    "oklch(0.7 0.2 25)", "oklch(0.62 0.22 300)", "oklch(0.72 0.18 75)",
    "oklch(0.78 0.18 165)", "oklch(0.6 0.16 230)",
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-primary" /> {department ? "Edit department" : "Add department"}
          </DialogTitle>
          <DialogDescription>Define the department name, color, and head.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Content" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("h-7 w-7 rounded-full transition", color === c && "ring-2 ring-offset-2 ring-offset-background ring-foreground/40")}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </Field>
          <Field label="Head of department (optional)">
            <Select value={headUserId || "__none__"} onValueChange={(v) => setHeadUserId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No head assigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} · {u.title ?? u.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {department ? "Save" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Designations — CRUD (dense ListRow layout)
// ============================================================================

function DesignationsSection() {
  const { data, loading, reload } = useApi<any[]>("/api/organization/designations");
  const { data: users } = useApi<UserRow[]>("/api/users");
  const [editing, setEditing] = React.useState<any | null>(null);
  const [creating, setCreating] = React.useState(false);

  const memberCount = React.useCallback((name: string) => (users ?? []).filter((u) => u.title === name).length, [users]);

  const metrics: Metric[] = React.useMemo(() => {
    const total = data?.length ?? 0;
    const maxLevel = total ? Math.max(...(data ?? []).map((d) => d.level ?? 0)) : 0;
    const minLevel = total ? Math.min(...(data ?? []).map((d) => d.level ?? 0)) : 0;
    const withMembers = (data ?? []).filter((d) => memberCount(d.name) > 0).length;
    const totalHolders = (users ?? []).filter((u) => !!u.title).length;
    return [
      { label: "Designations", value: total, color: "oklch(0.78 0.18 75)" },
      { label: "Title holders", value: totalHolders, color: "oklch(0.66 0.18 200)" },
      { label: "Active titles", value: withMembers, color: "oklch(0.68 0.2 145)" },
      { label: "Senior level", value: maxLevel, color: "oklch(0.55 0.2 25)" },
      { label: "Junior level", value: minLevel, color: "oklch(0.62 0.22 300)" },
    ];
  }, [data, users, memberCount]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-14 rounded-xl" />
        <div className="shimmer h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HelpText module="organization-designations">
        <strong className="text-foreground">Designations</strong> are job titles (e.g. Junior, Senior, Lead, Head). Manage the list here — these appear as options in the Add/Edit user dialogs.
      </HelpText>

      {/* MetricRow — Card #1 */}
      <MetricRow metrics={metrics} />

      {/* Designations list — Card #2 */}
      <HeroChart
        title="Designations"
        desc="Seniority ladder & job titles"
        action={
          <Button onClick={() => setCreating(true)} className="liquid-pill flex items-center gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Add designation
          </Button>
        }
      >
        <div className="-mx-3 -mb-3">
          <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="min-w-[220px] flex-1">Designation</div>
            <div className="w-16">Level</div>
            <div className="w-24">Holders</div>
            <div className="w-8 text-right">·</div>
          </div>
          {(data ?? []).length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              No designations yet. Click <strong>Add designation</strong> to create one.
            </div>
          )}
          {(data ?? []).map((d) => {
            const count = memberCount(d.name);
            const levelPill = d.level >= 5 ? "violet" : d.level >= 3 ? "blue" : "neutral";
            return (
              <ListRow key={d.id} className="!py-2.5">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Crown className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold">{d.name}</span>
                      {d.description && (
                        <div className="truncate text-[10px] text-muted-foreground">{d.description}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-16">
                  <Pill color={levelPill as "violet" | "blue" | "neutral"}>Lv {d.level}</Pill>
                </div>
                <div className="w-24">
                  <Pill color={count > 0 ? "green" : "neutral"}>{count} holder{count === 1 ? "" : "s"}</Pill>
                </div>
                <div className="w-8 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0" aria-label="Designation actions">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 rounded-xl">
                      <DropdownMenuItem onClick={() => setEditing(d)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-500 focus:text-rose-500"
                        onClick={async () => {
                          if (count > 0) { toast.error(`${count} user(s) have this designation. Reassign them first.`); return; }
                          if (!confirm(`Delete the "${d.name}" designation?`)) return;
                          const res = await apiFetch(`/api/organization/designations/${d.id}`, { method: "DELETE" });
                          const j = await res.json().catch(() => ({}));
                          if (res.ok) { toast.success("Designation deleted"); reload(); }
                          else toast.error(j.error ?? "Failed to delete");
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ListRow>
            );
          })}
        </div>
      </HeroChart>

      {creating && (
        <DesignationDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />
      )}
      {editing && (
        <DesignationDialog designation={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function DesignationDialog({ designation, onClose, onSaved }: { designation?: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(designation?.name ?? "");
  const [description, setDescription] = React.useState(designation?.description ?? "");
  const [level, setLevel] = React.useState<number>(designation?.level ?? 1);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = designation
        ? await apiFetch(`/api/organization/designations/${designation.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null, level }),
          })
        : await apiFetch("/api/organization/designations", {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null, level }),
          });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { toast.success(designation ? "Designation updated" : "Designation created"); onSaved(); }
      else toast.error(j.error ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" /> {designation ? "Edit designation" : "Add designation"}
          </DialogTitle>
          <DialogDescription>Define the title and seniority level.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label={`Seniority level (1=intern → 6=head) — ${level}`}>
            <input
              type="range"
              min={1}
              max={6}
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--primary)]"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {designation ? "Save" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
