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
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { useAuth } from "@/lib/auth-store";
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
  const maxPosts = Math.max(1, ...sorted.map((m) => m.postsCount));
  const adminCount = sorted.filter((m) => m.role === "admin").length;

  const workloadData = sorted.map((m) => ({
    name: m.name,
    posts: m.postsCount,
    fill: m.role === "admin" ? ADMIN_COLOR : MEMBER_COLOR,
  }));

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
    <div className="animate-rise space-y-5">
      <HelpText module="team"><strong className="text-foreground">Team</strong> shows all workspace members and their roles. Invite teammates to collaborate on content.</HelpText>
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm font-semibold transition hover:bg-muted/40"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Invite member</span>
              <span className="sm:hidden">Invite</span>
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add member</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </GlassCard>

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
                  Links the user to the selected customer's tenant database. They will only see that customer's data.
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
            onReload={reload}
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

function MemberCard({
  member,
  maxPosts,
  isYou,
  onReload,
}: {
  member: TeamMember;
  maxPosts: number;
  isYou: boolean;
  onReload: () => void;
}) {
  const { setView } = useNav();
  const workload = Math.round((member.postsCount / maxPosts) * 100);

  return (
    <GlassCard hover className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <NameAvatar
          name={member.name}
          src={member.avatar}
          color={member.color}
          gender={(member as any)?.gender ?? undefined}
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
