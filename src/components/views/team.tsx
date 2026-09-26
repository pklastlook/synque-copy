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
  KeyRound,
  Copy,
  Check,
  EyeOff,
  UserCheck,
  Mail,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/store";
import {
  MetricRow,
  SectionHeader,
  HeroChart,
  ListRow,
  Pill,
  Sparkline,
  BentoGrid,
  BentoTile,
} from "@/components/glass/dense-ui";
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
  role: "admin" | "manager" | "editor" | "member" | "viewer";
  title: string | null;
  department?: string | null;
  status?: string;
  color: string | null;
  accountsCount: number;
  postsCount: number;
  variantCount: number;
  engagement: number;
  followers: number;
}

const ADMIN_COLOR = "var(--primary)";
const MEMBER_COLOR = "oklch(0.74 0.18 165)";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, "rose" | "violet" | "blue" | "green" | "neutral"> = {
  admin: "rose",
  manager: "violet",
  editor: "blue",
  member: "green",
  viewer: "neutral",
};

export function TeamView() {
  const { data, loading, reload } = useApi<TeamMember[]>("/api/team");
  const { data: customers } = useApi<{ id: string; name: string; company: string | null }[]>("/api/customers");
  const { user } = useAuth();
  const currentUserId = user?.id;
  // Invite dialog (email-only invitation)
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "member">("member");
  // Add Member dialog (full credentials — admin creates a login for the member)
  const [addOpen, setAddOpen] = React.useState(false);
  const [mName, setMName] = React.useState("");
  const [mEmail, setMEmail] = React.useState("");
  const [mPassword, setMPassword] = React.useState("");
  const [mRole, setMRole] = React.useState<"admin" | "manager" | "editor" | "member" | "viewer">("member");
  const [mTitle, setMTitle] = React.useState("");
  const [mDepartment, setMDepartment] = React.useState("");
  const [mGender, setMGender] = React.useState("");
  const [mBirthDate, setMBirthDate] = React.useState("");
  const [mPhone, setMPhone] = React.useState("");
  const [mCustomerId, setMCustomerId] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  // Success dialog — shows the created credentials so admin can share them
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{ name: string; email: string; password: string; role: string } | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

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

  const adminCount = sorted.filter((m) => m.role === "admin").length;
  const activeCount = sorted.filter((m) => (m.status ?? "active") === "active").length;

  // Department aggregation — uses department when present, falls back to title.
  const deptKey = (m: TeamMember) => m.department ?? m.title ?? null;
  const deptNames = Array.from(
    new Set(sorted.map(deptKey).filter((d): d is string => Boolean(d))),
  );
  const deptDist = deptNames
    .map((name) => ({
      name,
      count: sorted.filter((m) => deptKey(m) === name).length,
    }))
    .sort((a, b) => b.count - a.count);

  // Role counts in priority order
  const roleOrder = ["admin", "manager", "editor", "member", "viewer"];
  const roleCounts = roleOrder
    .map((r) => ({ role: r, count: sorted.filter((m) => m.role === r).length }))
    .filter((r) => r.count > 0);

  // Top contributors by engagement (top 5)
  const topContributors = [...sorted]
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  // Sparkline inputs — derived from real workload/role data
  const memberSpark = sorted.slice(0, 8).map((m) => m.postsCount);
  const activeSpark = sorted.slice(0, 8).map((m) => Math.max(1, m.postsCount + m.variantCount));
  const deptSpark = deptDist.slice(0, 8).map((d) => d.count);
  const roleSpark = roleCounts.map((r) => r.count);

  const onInvite = async () => {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    try {
      const token = getToken();
      const res = await fetch("/api/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to invite");
      }
      toast.success("Invitation sent", { description: `${email} has been added to the team.` });
      setEmail("");
      setRole("member");
      setInviteOpen(false);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to invite");
    }
  };

  function generatePassword() {
    // Memorable-ish: 3 segments of alphanumerics
    const seg = () => Math.random().toString(36).slice(2, 6).padEnd(4, "0");
    const n = Math.floor(100 + Math.random() * 900);
    setMPassword(`${seg()}-${seg()}-${n}`);
  }

  async function onAddMember() {
    if (!mName.trim() || !mEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!mPassword.trim() || mPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setAdding(true);
    try {
      const token = getToken();
      const res = await fetch("/api/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: mName.trim(),
          email: mEmail.trim(),
          password: mPassword.trim(),
          role: mRole,
          title: mTitle.trim() || undefined,
          department: mDepartment.trim() || undefined,
          gender: mGender || undefined,
          birthDate: mBirthDate || undefined,
          phone: mPhone.trim() || undefined,
          customerId: mCustomerId || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to create member");
      }
      // Success — show the credentials dialog so admin can share login details
      setCreatedCreds({ name: mName.trim(), email: mEmail.trim(), password: mPassword.trim(), role: mRole });
      setSuccessOpen(true);
      // Reset add form
      setMName(""); setMEmail(""); setMPassword(""); setMTitle(""); setMDepartment("");
      setMGender(""); setMBirthDate(""); setMPhone(""); setMCustomerId("");
      setMRole("member"); setShowPassword(false);
      setAddOpen(false);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  function copyToClipboard(label: string, text: string) {
    try {
      navigator.clipboard?.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  }

  function copyAllCreds() {
    if (!createdCreds) return;
    const text =
      `SocialFlow Login Details\n` +
      `———————————————\n` +
      `Name: ${createdCreds.name}\n` +
      `Email: ${createdCreds.email}\n` +
      `Password: ${createdCreds.password}\n` +
      `Role: ${createdCreds.role}\n` +
      `———————————————\n` +
      `Sign in at: ${window.location.origin}`;
    copyToClipboard("Login details", text);
  }

  return (
    <div className="animate-rise space-y-4">
      <HelpText module="team"><strong className="text-foreground">Team</strong> shows all workspace members and their roles. Invite teammates to collaborate on content.</HelpText>

      {/* Header — compact SectionHeader with action buttons */}
      <SectionHeader
        title="Your team"
        desc={`${sorted.length} members · ${totals.accounts} accounts · ${adminCount} admin${adminCount === 1 ? "" : "s"}`}
        icon={Shield}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="liquid-pill">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add member</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* Invite dialog (email-only) */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They will get an email invitation to join your SocialFlow workspace.
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

      {/* Add Member dialog — admin creates a login with credentials */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Add team member
            </DialogTitle>
            <DialogDescription>
              Create a login for a new member. You can share the credentials with them after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-name">Full name *</Label>
                <Input
                  id="m-name"
                  placeholder="Jane Doe"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-email">Email *</Label>
                <Input
                  id="m-email"
                  type="email"
                  placeholder="jane@studio.com"
                  value={mEmail}
                  onChange={(e) => setMEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">Title / designation</Label>
                <Input
                  id="m-title"
                  placeholder="Content Lead"
                  value={mTitle}
                  onChange={(e) => setMTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-dept">Department</Label>
                <Input
                  id="m-dept"
                  placeholder="Content"
                  value={mDepartment}
                  onChange={(e) => setMDepartment(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-phone">Phone</Label>
                <Input
                  id="m-phone"
                  placeholder="+1 555 0100"
                  value={mPhone}
                  onChange={(e) => setMPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-gender">Gender</Label>
                <Select value={mGender || "__none__"} onValueChange={(v) => setMGender(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-birthdate">Birth date</Label>
              <Input
                id="m-birthdate"
                type="date"
                value={mBirthDate}
                onChange={(e) => setMBirthDate(e.target.value)}
              />
            </div>

            {/* Customer / Company selector — links user to a tenant database */}
            {customers && customers.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="m-customer">Customer / Company</Label>
                <Select value={mCustomerId || "__none__"} onValueChange={(v) => setMCustomerId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No customer (super-admin)</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company ?? c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Links the user to the selected customer&apos;s tenant database. They will only see that customer&apos;s data.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="m-role">Role</Label>
              <Select value={mRole} onValueChange={(v) => setMRole(v as typeof mRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                  <SelectItem value="member">Member — publish &amp; manage</SelectItem>
                  <SelectItem value="editor">Editor — create &amp; edit content</SelectItem>
                  <SelectItem value="manager">Manager — manage team &amp; settings</SelectItem>
                  <SelectItem value="admin">Admin — full workspace access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="m-password">Password *</Label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                >
                  <KeyRound className="h-3 w-3" />
                  Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  id="m-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={mPassword}
                  onChange={(e) => setMPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                The member will use this password to sign in. You can share it after creation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={onAddMember}
              disabled={adding}
              className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {adding ? <UserCheck className="h-4 w-4 animate-pulse" /> : <UserPlus className="h-4 w-4" />}
              {adding ? "Creating…" : "Create member"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog — share login details with the new member */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-4 w-4" />
              </span>
              Member created
            </DialogTitle>
            <DialogDescription>
              Share these login details with {createdCreds?.name} so they can sign in.
            </DialogDescription>
          </DialogHeader>
          {createdCreds && (
            <div className="space-y-3 py-2">
              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  Login credentials
                </div>
                <div className="space-y-2.5">
                  <CredRow
                    label="Name"
                    value={createdCreds.name}
                    copied={copied === "Name"}
                    onCopy={() => copyToClipboard("Name", createdCreds.name)}
                  />
                  <CredRow
                    label="Email"
                    value={createdCreds.email}
                    copied={copied === "Email"}
                    onCopy={() => copyToClipboard("Email", createdCreds.email)}
                  />
                  <CredRow
                    label="Password"
                    value={createdCreds.password}
                    copied={copied === "Password"}
                    onCopy={() => copyToClipboard("Password", createdCreds.password)}
                  />
                  <CredRow
                    label="Role"
                    value={createdCreds.role}
                    copied={copied === "Role"}
                    onCopy={() => copyToClipboard("Role", createdCreds.role)}
                  />
                  <CredRow
                    label="Sign-in URL"
                    value={typeof window !== "undefined" ? window.location.origin : ""}
                    copied={copied === "Sign-in URL"}
                    onCopy={() => copyToClipboard("Sign-in URL", typeof window !== "undefined" ? window.location.origin : "")}
                  />
                </div>
              </div>
              <button
                onClick={copyAllCreds}
                className="liquid-pill flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                {copied === "Login details" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy all login details
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                For security, ask the member to change their password after first sign-in.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuccessOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MetricRow — replaces 4-KpiCard grid. Dense, sparklines inline. */}
      <MetricRow
        metrics={[
          { label: "Members", value: sorted.length, spark: memberSpark, color: ADMIN_COLOR },
          { label: "Active", value: activeCount, spark: activeSpark, color: MEMBER_COLOR },
          { label: "Departments", value: deptNames.length, spark: deptSpark, color: "oklch(0.66 0.22 305)" },
          { label: "Roles", value: roleCounts.length, spark: roleSpark, color: "oklch(0.78 0.18 75)" },
        ]}
      />

      {/* Member directory — dense ListRow layout (scannable, like a contacts table) */}
      <HeroChart
        title={`Team directory (${sorted.length})`}
        desc="All workspace members · admins first"
        action={<Pill color="blue">{sorted.length} shown</Pill>}
      >
        <div className="-mx-3 -mb-3 max-h-[640px] overflow-y-auto scroll-liquid">
          {/* Header row */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            <div className="min-w-[200px] flex-1">Member</div>
            <div className="w-20">Role</div>
            <div className="hidden w-28 md:block">Department</div>
            <div className="w-16 text-right">Posts</div>
            <div className="hidden w-16 text-right sm:block">Reach</div>
            <div className="w-16 text-right">Eng.</div>
            <div className="w-8 text-right">·</div>
          </div>
          {sorted.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isYou={m.id === currentUserId}
              onReload={reload}
            />
          ))}
          {sorted.length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              No team members yet — invite a teammate to get started.
            </div>
          )}
        </div>
      </HeroChart>

      {/* Bento grid — 3 tiles (department chart, roles, top contributors) */}
      <BentoGrid>
        {/* Department distribution — the single allowed chart */}
        <BentoTile span="2x1" className="sm:col-span-2">
          <SectionHeader
            title="Department distribution"
            desc="Members grouped by department or title"
            icon={Briefcase}
            action={<Pill>{deptNames.length} depts</Pill>}
          />
          {deptDist.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No department data — add departments when inviting members.
            </div>
          ) : (
            <div
              style={{ height: Math.max(120, deptDist.length * 36) }}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptDist}
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
                    formatter={(v: number) => [`${v} members`, "In dept"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={14}>
                    {deptDist.map((d, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? ADMIN_COLOR : MEMBER_COLOR}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </BentoTile>

        {/* Roles breakdown */}
        <BentoTile span="1x1">
          <SectionHeader
            title="Roles"
            desc="By access level"
            icon={Shield}
          />
          <div className="flex flex-wrap gap-1.5">
            {roleCounts.length === 0 && (
              <p className="text-xs text-muted-foreground">No roles assigned.</p>
            )}
            {roleCounts.map((r) => (
              <Pill key={r.role} color={ROLE_COLORS[r.role] ?? "neutral"}>
                {r.role === "admin" && <Shield className="h-2.5 w-2.5" />}
                <span className="capitalize">{ROLE_LABELS[r.role] ?? r.role}</span>
                <span className="tabular-nums">{r.count}</span>
              </Pill>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
            <AtSign className="h-3 w-3" />
            <span>{totals.accounts} accounts managed</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{totals.posts} posts authored</span>
          </div>
        </BentoTile>

        {/* Top contributors — sparkline-driven */}
        <BentoTile span="2x1" className="sm:col-span-2">
          <SectionHeader
            title="Top contributors"
            desc="Ranked by engagement"
            icon={Heart}
            action={<Pill color="green">Top {topContributors.length}</Pill>}
          />
          {topContributors.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No engagement data yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {topContributors.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40">
                  <span className="num-display w-5 text-[11px] font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <NameAvatar
                    name={m.name}
                    src={m.avatar}
                    color={m.color}
                    className="h-7 w-7 text-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{m.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {m.title ?? m.department ?? m.email}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[11px] font-semibold tabular-nums">{fmt(m.engagement)}</div>
                    <div className="label-caps text-[9px] text-muted-foreground">engagement</div>
                  </div>
                  <Sparkline
                    data={[m.postsCount, m.variantCount, Math.round(m.engagement / 10), m.followers > 0 ? Math.round(Math.log10(m.followers + 1) * 10) : 0]}
                    color={m.role === "admin" ? ADMIN_COLOR : MEMBER_COLOR}
                    width={56}
                    height={20}
                  />
                </div>
              ))}
            </div>
          )}
        </BentoTile>
      </BentoGrid>
    </div>
  );
}

// Credential row used in the "Member created" success dialog — copyable field
function CredRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1 truncate rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5 text-xs font-medium">
        {value || "—"}
      </div>
      <button
        onClick={onCopy}
        title={`Copy ${label}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// MemberRow — dense ListRow replacement for the old MemberCard.
// Keeps all functionality: avatar, role pill, stats, dropdown (role change / view / remove).
function MemberRow({
  member,
  isYou,
  onReload,
}: {
  member: TeamMember;
  isYou: boolean;
  onReload: () => void;
}) {
  const { setView } = useNav();
  const roleColor = ROLE_COLORS[member.role] ?? "neutral";
  const roleLabel = ROLE_LABELS[member.role] ?? member.role;
  const deptLabel = member.department ?? member.title ?? null;

  return (
    <ListRow className="!py-2">
      {/* Avatar + name + email */}
      <div className="min-w-[200px] flex-1">
        <div className="flex items-center gap-2.5">
          <NameAvatar
            name={member.name}
            src={member.avatar}
            color={member.color}
            className="h-9 w-9 text-[11px]"
            ring
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold">{member.name}</span>
              {isYou && <Pill color="blue">You</Pill>}
            </div>
            <div className="truncate text-[10px] text-muted-foreground">{member.email}</div>
          </div>
        </div>
      </div>

      {/* Role */}
      <div className="w-20">
        <Pill color={roleColor}>
          {member.role === "admin" && <Shield className="h-2.5 w-2.5" />}
          <span className="capitalize">{roleLabel}</span>
        </Pill>
      </div>

      {/* Department / title */}
      <div className="hidden w-28 truncate text-xs md:block">
        {deptLabel ?? <span className="text-muted-foreground">—</span>}
      </div>

      {/* Posts */}
      <div className="w-16 text-right">
        <div className="text-xs font-semibold tabular-nums">{member.postsCount}</div>
        <div className="label-caps text-[9px] text-muted-foreground">posts</div>
      </div>

      {/* Reach */}
      <div className="hidden w-16 text-right sm:block">
        <div className="text-xs tabular-nums text-muted-foreground">{fmt(member.followers)}</div>
        <div className="label-caps text-[9px] text-muted-foreground/70">reach</div>
      </div>

      {/* Engagement */}
      <div className="w-16 text-right">
        <div className="text-xs tabular-nums text-muted-foreground">{fmt(member.engagement)}</div>
        <div className="label-caps text-[9px] text-muted-foreground/70">eng.</div>
      </div>

      {/* Actions dropdown — preserves role-change, view-activity, remove */}
      <div className="w-8 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Member actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            {member.role === "admin" ? (
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/team/${member.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ role: "member" }),
                    });
                    if (!res.ok) throw new Error("Failed to update role");
                    toast.success(`${member.name} is now a member`);
                    onReload();
                  } catch {
                    toast.error("Failed to update role");
                  }
                }}
              >
                <Shield className="mr-2 h-4 w-4" /> Make member
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/team/${member.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ role: "admin" }),
                    });
                    if (!res.ok) throw new Error("Failed to update role");
                    toast.success(`${member.name} is now an admin`);
                    onReload();
                  } catch {
                    toast.error("Failed to update role");
                  }
                }}
              >
                <Shield className="mr-2 h-4 w-4" /> Make admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setView("team-performance")}
            >
              <Eye className="mr-2 h-4 w-4" /> View activity
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-500 focus:text-rose-500"
              onClick={async () => {
                if (!confirm(`Remove ${member.name} from the workspace?`)) return;
                try {
                  const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
                  if (!res.ok) throw new Error("Failed to remove");
                  toast.success(`${member.name} removed from workspace`);
                  onReload();
                } catch {
                  toast.error("Failed to remove member");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </ListRow>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-10 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <div className="shimmer h-96 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
