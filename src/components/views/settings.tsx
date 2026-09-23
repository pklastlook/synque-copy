"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  // Tabs (shared with app-sidebar via SETTINGS_TABS export)
  User,
  Building2,
  Palette,
  Bell,
  Shield,
  AtSign,
  ShieldCheck,
  Plug,
  Zap,
  CreditCard,
  Database,
  AlertTriangle,
  Users,
  Settings,
  ChevronRight,
  // Profile / Workspace
  Camera,
  // Appearance
  Sun,
  Moon,
  Monitor,
  Check,
  // Team
  UserPlus,
  Crown,
  // Security
  KeyRound,
  Smartphone,
  MonitorSmartphone,
  LogOut,
  Copy,
  QrCode,
  // Integrations
  BarChart3,
  Image as ImageIcon,
  MessageSquare,
  Mail,
  // Data
  Download,
  Upload,
  Trash2,
  FileWarning,
  // Danger
  UserX,
  ArrowLeftRight,
  Ban,
  // Generic
  Save,
  Eye,
  EyeOff,
  MoreHorizontal,
  Send,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { GlassCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { useApi } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
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

export type SettingsTab =
  | "profile"
  | "workspace"
  | "appearance"
  | "team-roles"
  | "notifications"
  | "security"
  | "platforms"
  | "integrations"
  | "billing"
  | "data"
  | "danger";

export interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
}

/**
 * Settings sub-sections. Shared between the main app sidebar (so the
 * Settings group expands to show these as children) and the SettingsView
 * (which renders the matching section based on `useNav().settingsTab`).
 */
export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "team-roles", label: "Team Roles", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "platforms", label: "Platforms", icon: AtSign },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "data", label: "Data & Privacy", icon: Database },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

const SECTION_DESC: Record<SettingsTab, string> = {
  profile: "Your personal information visible to your team.",
  workspace: "Defaults applied across compose, schedule, and AI generation.",
  appearance: "Personalize how SocialFlow looks on this device.",
  "team-roles": "Manage who can access what. Changes are staged locally — save to sync.",
  notifications: "Choose what reaches your inbox and how often.",
  security: "Password, 2FA, sessions, API keys, and IP allowlist.",
  platforms: "Manage which social accounts are connected to SocialFlow.",
  integrations: "Connect SocialFlow with the tools your team already uses.",
  billing: "Plan, usage, payment method, and invoices.",
  data: "Control how your data is stored, shared, and exported.",
  danger: "Irreversible and destructive actions. Proceed with caution.",
};

// ===== Shared types & lookups =====
type Role = "admin" | "manager" | "editor" | "member" | "viewer";
type MemberStatus = "active" | "invited" | "suspended";
type Department = "Leadership" | "Content" | "Community" | "Paid Social" | "Design";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  color: string | null;
  role: Role;
  title: string;
  department: Department;
  status: MemberStatus;
  permissions: string[];
}

const CAPABILITIES = [
  "Posts/Create",
  "Posts/Publish",
  "Analytics/View",
  "Team/Manage",
  "Accounts/Connect",
] as const;

const PERMISSION_MATRIX: Record<Role, Record<string, boolean>> = {
  admin: { "Posts/Create": true, "Posts/Publish": true, "Analytics/View": true, "Team/Manage": true, "Accounts/Connect": true },
  manager: { "Posts/Create": true, "Posts/Publish": true, "Analytics/View": true, "Team/Manage": false, "Accounts/Connect": true },
  editor: { "Posts/Create": true, "Posts/Publish": false, "Analytics/View": true, "Team/Manage": false, "Accounts/Connect": false },
  member: { "Posts/Create": true, "Posts/Publish": false, "Analytics/View": true, "Team/Manage": false, "Accounts/Connect": false },
  viewer: { "Posts/Create": false, "Posts/Publish": false, "Analytics/View": true, "Team/Manage": false, "Accounts/Connect": false },
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: "bg-primary/15 text-primary",
  manager: "bg-[oklch(0.82_0.14_85)]/20 text-[oklch(0.6_0.14_85)]",
  editor: "bg-[oklch(0.74_0.18_165)]/20 text-[oklch(0.55_0.18_165)]",
  member: "bg-muted text-muted-foreground",
  viewer: "bg-muted text-muted-foreground",
};

const STATUS_BADGE: Record<MemberStatus, { label: string; class: string; dot: string }> = {
  active: { label: "Active", class: "bg-emerald-500/15 text-emerald-500", dot: "bg-emerald-500" },
  invited: { label: "Invited", class: "bg-amber-500/15 text-amber-500", dot: "bg-amber-500" },
  suspended: { label: "Suspended", class: "bg-rose-500/15 text-rose-500", dot: "bg-rose-500" },
};

const DEPARTMENTS: Department[] = ["Leadership", "Content", "Community", "Paid Social", "Design"];

const TIMEZONES = [
  "America/Los_Angeles", "America/New_York", "America/Chicago", "America/Denver",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Kolkata", "Asia/Dubai",
  "Australia/Sydney", "Pacific/Auckland",
];

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
];

const ACCENTS: { name: string; value: string }[] = [
  { name: "Navy", value: "oklch(0.48 0.17 258)" },
  { name: "Gold", value: "oklch(0.82 0.14 85)" },
  { name: "Sky", value: "oklch(0.72 0.16 200)" },
  { name: "Teal", value: "oklch(0.7 0.15 165)" },
  { name: "Indigo", value: "oklch(0.6 0.16 230)" },
  { name: "Emerald", value: "oklch(0.76 0.18 145)" },
];

const DEFAULT_ACCENT = ACCENTS[0].value;

// ===== Main component =====
export function SettingsView() {
  const { settingsTab } = useNav();
  const tab: SettingsTab = (settingsTab as SettingsTab) || "team-roles";
  const activeDef = SETTINGS_TABS.find((t) => t.id === tab) ?? SETTINGS_TABS[0];
  const ActiveIcon = activeDef.icon;

  return (
    <div className="animate-rise space-y-4">
      {/* Breadcrumb header — section is driven by the main sidebar */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <ActiveIcon className="h-3.5 w-3.5" />
                {activeDef.label}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{activeDef.label}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {SECTION_DESC[tab] ?? "Manage your workspace."}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Full-width content panel — active tab driven by useNav().settingsTab */}
      <div className="min-w-0 space-y-4">
        {tab === "profile" && <ProfileSection />}
        {tab === "workspace" && <WorkspaceSection />}
        {tab === "appearance" && <AppearanceSection />}
        {tab === "team-roles" && <TeamRolesSection />}
        {tab === "notifications" && <NotificationsSection />}
        {tab === "security" && <SecuritySection />}
        {tab === "platforms" && <PlatformsSection />}
        {tab === "integrations" && <IntegrationsSection />}
        {tab === "billing" && <BillingSection />}
        {tab === "data" && <DataSection />}
        {tab === "danger" && <DangerSection />}
      </div>
    </div>
  );
}

// ===== 1. Profile =====
function ProfileSection() {
  const { user } = useAuth();
  const { data, reload } = useApi<ApiUser[]>("/api/users");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState<Department>("Leadership");
  const [bio, setBio] = React.useState("");
  const [timezone, setTimezone] = React.useState("America/Los_Angeles");
  const [language, setLanguage] = React.useState("en-US");
  const [saving, setSaving] = React.useState(false);

  // Load real user data — prefer department from /api/users (the auth-store's
  // AuthUser shape doesn't carry department).
  React.useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setTitle(user.title ?? "");
    const dbUser = (data ?? []).find((u) => u.id === user.id);
    const dept = dbUser?.department as Department | undefined;
    if (dept && (DEPARTMENTS as string[]).includes(dept)) {
      setDepartment(dept);
    } else {
      setDepartment("Leadership");
    }
  }, [user, data]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, name, email, title, department }),
      });
      toast.success("Profile saved", { description: "Your changes have been synced." });
      reload();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle
        title="Profile"
        desc="Your personal information visible to your team."
        action={
          <button
            onClick={save}
            disabled={saving}
            className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {/* Avatar */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl bg-muted/30 p-4">
        <NameAvatar name={name} color="rose" className="h-20 w-20 text-lg" />
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">PNG / JPG up to 4MB · square recommended</div>
          <div className="flex gap-2">
            <button
              onClick={() => toast.info("Avatar upload — configure a storage provider in Integrations")}
              className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <Camera className="h-3.5 w-3.5" /> Change
            </button>
            <button
              onClick={() => toast("Remove current avatar?")}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/60"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Title / Designation">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Department">
          <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Timezone" hint="Used for scheduling & digests">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIMEZONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Language">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Bio" className="mt-4">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={280}
          className="resize-none"
        />
        <div className="mt-1 text-right text-[11px] text-muted-foreground">{bio.length} / 280</div>
      </Field>
    </GlassCard>
  );
}

// ===== 2. Workspace =====
interface WorkspaceData {
  id: string;
  name: string;
  timezone: string;
  cadence: string;
  startTime: string;
  endTime: string;
  autoVariants: boolean;
  tone: string;
  brandVoice: string;
  colors: string[];
  ownerId: string;
}
function WorkspaceSection() {
  const { user } = useAuth();
  const { data: ws, reload } = useApi<WorkspaceData>(user?.id ? `/api/workspace?ownerId=${user.id}` : null);

  const [name, setName] = React.useState("My Workspace");
  const [tz, setTz] = React.useState("America/Los_Angeles");
  const [cadence, setCadence] = React.useState("3/day");
  const [start, setStart] = React.useState("09:00");
  const [end, setEnd] = React.useState("18:00");
  const [autoVariants, setAutoVariants] = React.useState(true);
  const [tone, setTone] = React.useState("Confident");
  const [brandVoice, setBrandVoice] = React.useState("");
  const [colors, setColors] = React.useState<string[]>(["#1B2A57", "#D4A24E", "#5BC0BE"]);
  const [saving, setSaving] = React.useState(false);

  // Load real workspace data from the database
  React.useEffect(() => {
    if (!ws) return;
    setName(ws.name);
    setTz(ws.timezone);
    setCadence(ws.cadence);
    setStart(ws.startTime);
    setEnd(ws.endTime);
    setAutoVariants(ws.autoVariants);
    setTone(ws.tone);
    setBrandVoice(ws.brandVoice ?? "");
    if (ws.colors && Array.isArray(ws.colors) && ws.colors.length > 0) setColors(ws.colors);
  }, [ws]);

  const updateColor = (i: number, v: string) =>
    setColors((prev) => prev.map((c, idx) => (idx === i ? v : c)));

  const save = async () => {
    if (!user?.id) {
      toast.error("Sign in to save workspace settings");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: user.id,
          name,
          timezone: tz,
          cadence,
          startTime: start,
          endTime: end,
          autoVariants,
          tone,
          brandVoice,
          colors,
        }),
      });
      if (res.ok) {
        toast.success("Workspace saved", { description: "Defaults updated for all team members." });
        reload();
      } else {
        toast.error("Failed to save workspace");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle
        title="Workspace"
        desc="Defaults applied across compose, schedule, and AI generation."
        action={
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {/* Identity */}
      <div className="mb-4 flex items-center gap-4 rounded-2xl bg-muted/30 p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-xl font-bold text-white shadow-lg">
          P
        </div>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">SVG / PNG · square recommended</div>
          <button
            onClick={() => toast.info("Logo upload — configure in Integrations")}
            className="mt-2 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/60"
          >
            Upload logo
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Workspace name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Default timezone">
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {TIMEZONES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Default posting cadence">
          <Select value={cadence} onValueChange={setCadence}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1/day">1 post / day</SelectItem>
              <SelectItem value="3/day">3 posts / day</SelectItem>
              <SelectItem value="1/week">1 post / week</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Default tone">
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Confident", "Warm", "Playful", "Authoritative", "Minimal", "Bold"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Working hours — start">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Working hours — end">
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      <ToggleRow
        className="mt-4"
        label="Auto-generate AI variants on compose"
        desc="Each connected account gets a tailored caption suggestion automatically."
        checked={autoVariants}
        onChange={(v) => {
          setAutoVariants(v);
          toast.success(`AI auto-variants ${v ? "enabled" : "disabled"}`);
        }}
      />

      <Field label="Brand voice" className="mt-4">
        <Textarea
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </Field>

      <Field label="Brand colors" className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
              <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md ring-1 ring-border" style={{ background: c }}>
                <input
                  type="color"
                  value={c}
                  onChange={(e) => updateColor(i, e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <Input
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="h-7 w-24 font-mono text-xs"
              />
            </div>
          ))}
          <button
            onClick={() => setColors((prev) => [...prev, "#FFFFFF"])}
            className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted/40"
          >
            + Add
          </button>
        </div>
      </Field>
    </GlassCard>
  );
}

// ===== 3. Appearance =====
function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = React.useState(DEFAULT_ACCENT);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [glassEffects, setGlassEffects] = React.useState(true);
  const [compact, setCompact] = React.useState(false);
  const [fontSize, setFontSize] = React.useState(14);

  const themeOptions = [
    { id: "light" as const, label: "Light", icon: Sun },
    { id: "dark" as const, label: "Dark", icon: Moon },
    { id: "system" as const, label: "System", icon: Monitor },
  ];

  const applyAccent = (value: string, name: string) => {
    setAccent(value);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary", value);
    }
    toast.success(`Accent set to ${name}`);
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle title="Appearance" desc="Personalize how SocialFlow looks on this device." />

      {/* Theme cards */}
      <div className="grid grid-cols-3 gap-3">
        {themeOptions.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.id;
          const previewBg =
            opt.id === "light"
              ? "bg-[oklch(0.97_0.008_250)]"
              : opt.id === "dark"
                ? "bg-[oklch(0.16_0.025_258)]"
                : "bg-gradient-to-br from-[oklch(0.97_0.008_250)] to-[oklch(0.16_0.025_258)]";
          return (
            <button
              key={opt.id}
              onClick={() => {
                setTheme(opt.id);
                toast.success(`Theme: ${opt.label}`);
              }}
              className={cn(
                "rounded-2xl border-2 p-3 text-left transition",
                active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
              )}
            >
              <div className={cn("mb-2 flex h-16 items-end gap-1 overflow-hidden rounded-xl p-2", previewBg)}>
                <div className={cn("h-full w-1/3 rounded-md", opt.id === "dark" ? "bg-white/15" : "bg-primary/80")} />
                <div className="flex-1 space-y-1">
                  <div className={cn("h-2 w-full rounded", opt.id === "dark" ? "bg-white/20" : "bg-primary/30")} />
                  <div className={cn("h-2 w-2/3 rounded", opt.id === "dark" ? "bg-white/10" : "bg-primary/20")} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{opt.label}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </div>
              <Icon className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <Separator className="my-5" />

      {/* Accent picker */}
      <div>
        <div className="text-sm font-medium">Accent color</div>
        <div className="text-xs text-muted-foreground">Updates the primary brand color across the app.</div>
        <div className="mt-3 flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = accent === a.value;
            return (
              <button
                key={a.name}
                onClick={() => applyAccent(a.value, a.name)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-xl border px-3 py-2 transition",
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:bg-muted/40"
                )}
                title={a.name}
              >
                <span className="h-6 w-6 rounded-full ring-1 ring-border" style={{ background: a.value }} />
                <span className="text-xs font-medium">{a.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="my-5" />

      {/* Toggles */}
      <div className="space-y-1">
        <ToggleRow
          label="Reduce motion"
          desc="Disable entrance animations and crystal shimmer."
          checked={reduceMotion}
          onChange={(v) => {
            setReduceMotion(v);
            toast.success(`Reduce motion ${v ? "on" : "off"}`);
          }}
        />
        <ToggleRow
          label="Liquid glass effects"
          desc="Translucent layers, blur, and sheen across the app."
          checked={glassEffects}
          onChange={(v) => {
            setGlassEffects(v);
            toast.success(`Glass effects ${v ? "on" : "off"}`);
          }}
        />
        <ToggleRow
          label="Compact mode"
          desc="Tighten spacing to see more content per screen."
          checked={compact}
          onChange={(v) => {
            setCompact(v);
            toast.success(`Compact mode ${v ? "on" : "off"}`);
          }}
        />
      </div>

      <Separator className="my-5" />

      {/* Font size */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Font size</div>
            <div className="text-xs text-muted-foreground">Default base font size for the interface.</div>
          </div>
          <span className="num-display text-lg font-semibold tabular-nums">{fontSize}px</span>
        </div>
        <div className="mt-3 px-1">
          <Slider
            value={[fontSize]}
            min={12}
            max={18}
            step={1}
            onValueChange={(v) => {
              setFontSize(v[0]);
              if (typeof document !== "undefined") {
                document.documentElement.style.fontSize = `${v[0]}px`;
              }
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>A</span><span>Default</span><span>A</span>
        </div>
      </div>
    </GlassCard>
  );
}

// ===== 4. Team Roles & Permissions =====
interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  department: string | null;
  color: string | null;
  permissions: string[];
  status: MemberStatus;
  lastActive: string | null;
}

function TeamRolesSection() {
  const { data, loading } = useApi<ApiUser[]>("/api/users");
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Role>("member");
  const [invitePassword, setInvitePassword] = React.useState("");
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load real users from database
  React.useEffect(() => {
    if (!data) return;
    const next: TeamMember[] = data.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      color: (u.color as TeamMember["color"]) ?? "blue",
      role: u.role,
      title: u.title ?? "",
      department: (u.department as Department) ?? "General",
      status: u.status,
      permissions: u.permissions ?? [],
    }));
    setMembers(next);
  }, [data]);

  const update = (id: string, patch: Partial<TeamMember>) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const removeMember = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        toast.success(`Removed ${name}`);
      } else {
        toast.error("Failed to remove member");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(
        members.map((m) =>
          fetch("/api/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: m.id,
              role: m.role,
              title: m.title,
              department: m.department,
              status: m.status,
            }),
          })
        )
      );
      toast.success("Team saved", { description: `${members.length} members updated.` });
    } catch {
      toast.error("Failed to save team changes");
    } finally {
      setSaving(false);
    }
  };

  const invite = async () => {
    if (!inviteName.trim() || !inviteEmail.includes("@")) {
      toast.error("Enter a valid name and email");
      return;
    }
    if (invitePassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setInviteLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim(), password: invitePassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        // Set the new user's role via PATCH
        if (inviteRole !== "member") {
          await fetch("/api/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.user.id, role: inviteRole, title: inviteRole === "admin" ? "Administrator" : "Team Member" }),
          }).catch(() => {});
        }
        toast.success("User created", { description: `${inviteName} → ${ROLE_LABEL[inviteRole]}` });
        setInviteName(""); setInviteEmail(""); setInviteRole("member"); setInvitePassword("");
        setInviteOpen(false);
        // Reload members
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to create user");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) return <TeamSkeleton />;

  return (
    <div className="space-y-4">
      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Team Roles & Permissions"
          desc="Manage who can access what. Changes are staged locally — save to sync."
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setInviteOpen(true)}
                className="liquid-gold flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
              >
                <UserPlus className="h-3.5 w-3.5" /> Invite member
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          }
        />

        {/* Member grid */}
        <div className="grid gap-3 lg:grid-cols-2">
          {members.map((m) => {
            const status = STATUS_BADGE[m.status];
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-border/60 bg-muted/20 p-4 transition hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <NameAvatar name={m.name} color={m.color} className="h-11 w-11 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{m.name}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", ROLE_BADGE_CLASS[m.role])}>
                        {ROLE_LABEL[m.role]}
                      </span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", status.class)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.email}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => toast(`Resend invite to ${m.email}`)}>
                        <Send className="mr-2 h-3.5 w-3.5" /> Resend invite
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update(m.id, { status: m.status === "suspended" ? "active" : "suspended" })}>
                        <Ban className="mr-2 h-3.5 w-3.5" /> {m.status === "suspended" ? "Reactivate" : "Suspend"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-500 focus:text-rose-500"
                        onClick={() => removeMember(m.id, m.name)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Field label="Role" compact>
                    <Select value={m.role} onValueChange={(v) => update(m.id, { role: v as Role })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Designation" compact>
                    <Input
                      value={m.title}
                      onChange={(e) => update(m.id, { title: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </Field>
                  <Field label="Department" compact>
                    <Select value={m.department} onValueChange={(v) => update(m.id, { department: v as Department })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CAPABILITIES.map((cap) => {
                    const allowed = PERMISSION_MATRIX[m.role][cap];
                    return (
                      <span
                        key={cap}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          allowed
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/60 text-muted-foreground/60 line-through"
                        )}
                      >
                        {cap}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Permissions matrix */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Permissions matrix"
          desc="What each role can do across the platform."
        />
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Capability</th>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <th key={r} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap, i) => (
                <tr key={cap} className={cn(i % 2 === 0 ? "bg-muted/20" : "")}>
                  <td className="rounded-l-lg px-3 py-2.5 text-xs font-medium">{cap}</td>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => {
                    const allowed = PERMISSION_MATRIX[r][cap];
                    return (
                      <td key={r} className="rounded-r-lg px-3 py-2.5 text-center">
                        {allowed ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They'll receive an email invitation to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Full name">
              <Input
                placeholder="John Smith"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                placeholder="teammate@socialflow.app"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
              />
            </Field>
            <Field label="Role">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <button
              onClick={invite}
              disabled={inviteLoading}
              className="liquid-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" /> {inviteLoading ? "Creating…" : "Create user"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 5. Notifications =====
function NotificationsSection() {
  const [engagement, setEngagement] = React.useState<Record<string, boolean>>({
    newComment: true,
    mention: true,
    newFollower: true,
    postLiked: false,
  });
  const [workflow, setWorkflow] = React.useState<Record<string, boolean>>({
    taskAssigned: true,
    taskOverdue: true,
  });
  const [reports, setReports] = React.useState<Record<string, boolean>>({
    weeklyDigest: true,
    monthlySummary: false,
    competitorAlert: true,
  });
  const [system, setSystem] = React.useState<Record<string, boolean>>({
    accountWarning: true,
    mailQuota: true,
    security: true,
  });
  const [quietStart, setQuietStart] = React.useState("22:00");
  const [quietEnd, setQuietEnd] = React.useState("07:00");
  const [digest, setDigest] = React.useState("instant");

  const flip = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    key: string
  ) => (v: boolean) => {
    setter((prev) => ({ ...prev, [key]: v }));
    toast.success("Notifications updated");
  };

  const save = () => toast.success("Notification preferences saved");

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle
        title="Notifications"
        desc="Choose what reaches your inbox and how often."
        action={
          <button onClick={save} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold">
            <Save className="h-3.5 w-3.5" /> Save preferences
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <NotificationGroup title="Engagement" desc="Audience interactions">
          <ToggleRow label="New comment" desc="Someone comments on your post." checked={engagement.newComment} onChange={flip(setEngagement, "newComment")} />
          <ToggleRow label="Mentions" desc="You're tagged in a comment or post." checked={engagement.mention} onChange={flip(setEngagement, "mention")} />
          <ToggleRow label="New follower" desc="Your account gains a follower." checked={engagement.newFollower} onChange={flip(setEngagement, "newFollower")} />
          <ToggleRow label="Post liked" desc="High-velocity likes spike on a post." checked={engagement.postLiked} onChange={flip(setEngagement, "postLiked")} />
        </NotificationGroup>

        <NotificationGroup title="Workflow" desc="Task events">
          <ToggleRow label="Task assigned" desc="You're assigned a new task." checked={workflow.taskAssigned} onChange={flip(setWorkflow, "taskAssigned")} />
          <ToggleRow label="Task overdue" desc="A task passes its due date." checked={workflow.taskOverdue} onChange={flip(setWorkflow, "taskOverdue")} />
        </NotificationGroup>

        <NotificationGroup title="Reports" desc="Periodic summaries and alerts">
          <ToggleRow label="Weekly digest" desc="Every Monday at 9am local time." checked={reports.weeklyDigest} onChange={flip(setReports, "weeklyDigest")} />
          <ToggleRow label="Monthly summary" desc="First of the month recap." checked={reports.monthlySummary} onChange={flip(setReports, "monthlySummary")} />
          <ToggleRow label="Competitor alert" desc="A tracked competitor posts something notable." checked={reports.competitorAlert} onChange={flip(setReports, "competitorAlert")} />
        </NotificationGroup>

        <NotificationGroup title="System" desc="Account and platform health">
          <ToggleRow label="Account warning" desc="A connected account has token issues." checked={system.accountWarning} onChange={flip(setSystem, "accountWarning")} />
          <ToggleRow label="Mail quota" desc="Approaching monthly send limit." checked={system.mailQuota} onChange={flip(setSystem, "mailQuota")} />
          <ToggleRow label="Security" desc="New device sign-in or password change." checked={system.security} onChange={flip(setSystem, "security")} />
        </NotificationGroup>
      </div>

      <Separator className="my-5" />

      {/* Quiet hours + digest */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quiet hours — start">
          <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
        </Field>
        <Field label="Quiet hours — end">
          <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
        </Field>
        <Field label="Digest frequency">
          <Select value={digest} onValueChange={setDigest}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </GlassCard>
  );
}

// ===== 6. Security =====
interface SettingsApiKey {
  id: string;
  name: string;
  key: string;
  status: string;
  lastUsed: string | null;
  createdAt: string;
}

function SecuritySection() {
  const { user } = useAuth();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [twoFA, setTwoFA] = React.useState(false);
  const [setup2FA, setSetup2FA] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [ipAllow, setIpAllow] = React.useState("192.168.1.0/24\n10.0.0.0/8");
  const [genName, setGenName] = React.useState("");
  const [genOpen, setGenOpen] = React.useState(false);
  const [genBusy, setGenBusy] = React.useState(false);
  const [newKey, setNewKey] = React.useState<string | null>(null);

  const { data: apiKeys, loading: apiKeysLoading, reload: reloadKeys } =
    useApi<SettingsApiKey[]>("/api/api-keys");
  const keys = apiKeys ?? [];

  const changePwd = async () => {
    if (!user) return;
    if (!current || !next) return toast.error("Fill in current and new password");
    if (next !== confirm) return toast.error("Passwords do not match");
    if (next.length < 8) return toast.error("Password must be at least 8 characters");
    try {
      // 1. Verify the current password by attempting a login.
      const verifyRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password: current }),
      });
      if (!verifyRes.ok) {
        throw new Error("Current password is incorrect");
      }
      // 2. Patch the new (already-validated) password via /api/users.
      const patchRes = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, password: next }),
      });
      if (!patchRes.ok) {
        const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to update password");
      }
      toast.success("Password updated");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    }
  };

  // Sessions and login history are not yet tracked in the database.
  // Honest empty states instead of fabricated device rows.
  const sessions: { id: string; device: string; location: string; ip: string; last: string; current: boolean }[] = [];
  const history: { id: string; device: string; location: string; time: string; status: string }[] = [];

  const generateKey = async () => {
    if (!genName.trim()) return toast.error("Enter a name for the key");
    setGenBusy(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: genName.trim(), permissions: ["*"] }),
      });
      const data = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || !data.key) throw new Error(data.error ?? "Failed");
      setNewKey(data.key);
      setGenName("");
      setGenOpen(false);
      reloadKeys();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate key");
    } finally {
      setGenBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("API key revoked");
      reloadKeys();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const deleteKey = async (id: string) => {
    if (!window.confirm("Delete this API key permanently?")) return;
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("API key deleted");
      reloadKeys();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard?.writeText(key).catch(() => {});
    setCopiedKey(key);
    toast.success("API key copied");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Password */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Password" desc="Update your password regularly to keep your account secure." />
        <div className="grid gap-3 sm:max-w-md">
          <Field label="Current password">
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="New password">
            <Input type={showPwd ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <Input type={showPwd ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <button
            onClick={changePwd}
            className="liquid-pill mt-1 flex items-center gap-1.5 self-start rounded-xl px-3.5 py-1.5 text-xs font-semibold"
          >
            <KeyRound className="h-3.5 w-3.5" /> Update password
          </button>
        </div>
      </GlassCard>

      {/* 2FA */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Two-factor authentication" desc="Add an extra layer of security to your account." />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium">{twoFA ? "Authenticator app enabled" : "Two-factor authentication"}</div>
              <div className="text-xs text-muted-foreground">
                {twoFA ? "Your account is protected with TOTP." : "Protect your account with an authenticator app."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!twoFA) setSetup2FA(true);
                else toast.success("2FA disabled");
                setTwoFA(!twoFA);
              }}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-semibold",
                twoFA ? "border border-border bg-background text-foreground" : "liquid-gold"
              )}
            >
              {twoFA ? "Disable" : "Set up"}
            </button>
            <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); if (v) setSetup2FA(true); }} />
          </div>
        </div>
      </GlassCard>

      {/* Active sessions */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Active sessions" desc="Devices currently signed in to your account." />
        {sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No session tracking yet. Active sessions will appear here once device
            tracking is enabled.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/20 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {s.device.includes("iPhone") || s.device.includes("iPad") || s.device.includes("Pixel") ? (
                    <Smartphone className="h-4 w-4" />
                  ) : (
                    <MonitorSmartphone className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.device}</span>
                    {s.current && <Badge className="bg-emerald-500/15 text-emerald-500">This device</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.location} · {s.ip} · {s.last}
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => toast.success(`Session revoked (${s.device})`)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-500/10"
                  >
                    <LogOut className="h-3 w-3" /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Login history */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Login history" desc="Recent sign-in attempts on your account." />
        {history.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No login history yet. Recent sign-ins will be logged here.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Device</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Time</th>
                  <th className="px-2 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-border/50">
                    <td className="px-2 py-2.5 text-xs">{h.device}</td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">{h.location}</td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">{h.time}</td>
                    <td className="px-2 py-2.5 text-right">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        h.status === "Success" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                      )}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* API keys */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="API keys"
          desc="Use these to authenticate with the SocialFlow API."
          action={
            <button
              onClick={() => { setNewKey(null); setGenOpen(true); }}
              className="liquid-gold flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
            >
              <KeyRound className="h-3.5 w-3.5" /> Generate key
            </button>
          }
        />
        {apiKeysLoading ? (
          <div className="space-y-2">
            <div className="shimmer h-12 rounded-2xl" />
            <div className="shimmer h-12 rounded-2xl" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No API keys yet. Generate one to authenticate external integrations.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="rounded-2xl bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{k.name}</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        k.status === "active" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                      )}>
                        {k.status}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {k.key.slice(0, 14)}{"•".repeat(18)}{k.key.slice(-4)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyKey(k.key)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:bg-muted/60"
                    >
                      {copiedKey === k.key ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />} Copy
                    </button>
                    {k.status === "active" && (
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-500 transition hover:bg-amber-500/10"
                      >
                        <Ban className="h-3 w-3" /> Revoke
                      </button>
                    )}
                    <button
                      onClick={() => deleteKey(k.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsed && ` · Last used ${new Date(k.lastUsed).toLocaleDateString()}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* IP allowlist */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="IP allowlist"
          desc="Restrict API access to known IP ranges. One per line."
          action={
            <button
              onClick={() => toast.success("IP allowlist saved")}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          }
        />
        <Textarea
          value={ipAllow}
          onChange={(e) => setIpAllow(e.target.value)}
          rows={4}
          className="resize-none font-mono text-xs"
          placeholder="0.0.0.0/0"
        />
      </GlassCard>

      {/* 2FA setup dialog */}
      <Dialog open={setup2FA} onOpenChange={setSetup2FA}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app, then enter the 6-digit code.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Mock QR code */}
            <div className="grid h-44 w-44 place-items-center rounded-2xl border border-border bg-background p-3">
              <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-px">
                {Array.from({ length: 64 }).map((_, i) => {
                  // deterministic pattern
                  const on = (i * 37 + (i % 5) * 11) % 3 === 0;
                  const corner = (i < 3 || i % 8 < 3 || i % 8 > 4 || i > 40) && (i < 24 || i > 39);
                  return (
                    <div
                      key={i}
                      className={cn("rounded-[1px]", on || corner ? "bg-foreground" : "bg-transparent")}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <QrCode className="h-3.5 w-3.5" />
              Or enter manually: <span className="font-mono">JBSWY3DPEHPK3PXP</span>
            </div>
            <Input placeholder="Enter 6-digit code" maxLength={6} className="text-center font-mono tracking-[0.4em]" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSetup2FA(false)}>Cancel</Button>
            <button
              onClick={() => { toast.success("2FA enabled"); setSetup2FA(false); }}
              className="liquid-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <ShieldCheck className="h-4 w-4" /> Verify & enable
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate API key dialog */}
      <Dialog
        open={genOpen || !!newKey}
        onOpenChange={(v) => { setGenOpen(v); if (!v) setNewKey(null); }}
      >
        <DialogContent className="sm:max-w-md">
          {newKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Key generated
                </DialogTitle>
                <DialogDescription>
                  Copy this key now — it won&apos;t be shown in full again.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <code className="break-all font-mono text-xs">{newKey}</code>
              </div>
              <DialogFooter>
                <button
                  onClick={() => copyKey(newKey)}
                  className="liquid-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  <Copy className="h-4 w-4" /> Copy key
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Generate API key</DialogTitle>
                <DialogDescription>
                  Create a new key for external integrations.
                </DialogDescription>
              </DialogHeader>
              <Field label="Key name">
                <Input
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  placeholder="Production API"
                />
              </Field>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
                <button
                  onClick={generateKey}
                  disabled={genBusy || !genName.trim()}
                  className="liquid-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" /> {genBusy ? "Generating…" : "Generate"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 7. Connected Platforms =====
function PlatformsSection() {
  // Deterministic connection state per platform
  const initial = React.useMemo(() => {
    const connected: Record<PlatformId, { connected: boolean; accounts: number }> = {
      instagram: { connected: true, accounts: 3 },
      facebook: { connected: true, accounts: 2 },
      x: { connected: true, accounts: 1 },
      linkedin: { connected: true, accounts: 1 },
      tiktok: { connected: true, accounts: 1 },
      youtube: { connected: true, accounts: 1 },
      threads: { connected: false, accounts: 0 },
    };
    return connected;
  }, []);
  const [state, setState] = React.useState(initial);

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle
        title="Connected platforms"
        desc="Manage which social accounts are connected to SocialFlow."
        action={
          <button
            onClick={() => toast("Choose a platform below to connect")}
            className="liquid-gold flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
          >
            <Plug className="h-3.5 w-3.5" /> Connect new
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_LIST.map((p) => {
          const s = state[p.id];
          return (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <PlatformBadge platform={p.id} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.connected ? `${s.accounts} account${s.accounts === 1 ? "" : "s"}` : "Not connected"}
                  </div>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    s.connected ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.connected ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                  {s.connected ? "Connected" : "Off"}
                </span>
              </div>
              <button
                onClick={() => {
                  setState((prev) => ({ ...prev, [p.id]: { connected: !prev[p.id].connected, accounts: !prev[p.id].connected ? 1 : 0 } }));
                  toast.success(`${p.name} ${s.connected ? "disconnected" : "connected"}`);
                }}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  s.connected
                    ? "border border-border bg-background text-foreground hover:bg-muted/60"
                    : "liquid-pill"
                )}
              >
                {s.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ===== 8. Integrations =====
function IntegrationsSection() {
  const integrations = [
    { id: "mail", name: "Mail Server", desc: "Send digests & alerts from your own SMTP.", icon: Mail, status: "Connected" },
    { id: "zapier", name: "Zapier", desc: "Trigger SocialFlow actions from 6,000+ apps.", icon: Zap, status: "Connected" },
    { id: "slack", name: "Slack", desc: "Pipe alerts and notifications into your channels.", icon: MessageSquare, status: "Disconnected" },
    { id: "ga", name: "Google Analytics", desc: "Pull GA4 traffic data into analytics reports.", icon: BarChart3, status: "Connected" },
    { id: "canva", name: "Canva", desc: "Import Canva designs straight into your media library.", icon: ImageIcon, status: "Disconnected" },
    { id: "unsplash", name: "Unsplash", desc: "Free stock photography for your next post.", icon: ImageIcon, status: "Connected" },
  ] as const;

  const [state, setState] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(integrations.map((i) => [i.id, i.status === "Connected"]))
  );

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle title="Integrations" desc="Connect SocialFlow with the tools your team already uses." />
      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((it) => {
          const Icon = it.icon;
          const on = state[it.id];
          return (
            <div key={it.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 transition hover:bg-muted/40">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{it.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      on ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {on ? "Connected" : "Off"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
              </div>
              <button
                onClick={() => {
                  setState((prev) => ({ ...prev, [it.id]: !prev[it.id] }));
                  toast.success(`${it.name} ${on ? "disconnected" : "connected"}`);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  on ? "border border-border bg-background text-foreground hover:bg-muted/60" : "liquid-gold"
                )}
              >
                {on ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ===== 9. Billing =====
interface BillingInvoice {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  total: number;
}

function BillingSection() {
  // Real invoices from the database (POST /api/invoices is managed by the
  // Owner Panel — here we only read them).
  const { data: invoicesData, loading: invoicesLoading } =
    useApi<BillingInvoice[]>("/api/invoices");
  const invoices = invoicesData ?? [];

  // Local-only usage snapshot — no DB backing yet, so we keep these as
  // honestly-zero defaults rather than fabricated "184/500" numbers.
  const usage = [
    { label: "Posts this month", used: 0, limit: 500, unit: "" },
    { label: "Connected accounts", used: 0, limit: 25, unit: "" },
    { label: "AI generations", used: 0, limit: 2000, unit: "" },
    { label: "Media storage", used: 0, limit: 50, unit: "GB" },
    { label: "Team seats", used: 0, limit: 15, unit: "" },
  ];

  return (
    <div className="space-y-4">
      {/* Plan card */}
      <GlassCard className="crystal-in glass-sheen relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[var(--gold)]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Crown className="h-3.5 w-3.5 text-[var(--gold)]" />
              Current plan
            </div>
            <h3 className="mt-1 bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Enterprise
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlimited workspaces · 24/7 priority support · Dedicated CSM
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold">$499</span>
              <span className="text-sm text-muted-foreground">/mo</span>
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                Renews Apr 1
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => toast.info("Stripe not connected — add a payment gateway in Integrations")}
              className="liquid-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Crown className="h-4 w-4" /> Upgrade plan
            </button>
            <button
              onClick={() => toast.info("Stripe not connected — add a payment gateway in Integrations")}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
            >
              Manage billing
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Usage */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Usage this cycle" desc="Resets Apr 1, 2025" />
        <div className="grid gap-4 sm:grid-cols-2">
          {usage.map((u) => {
            const pct = Math.min(100, Math.round((u.used / u.limit) * 100));
            const tone = pct > 85 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-primary";
            return (
              <div key={u.label} className="rounded-2xl bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{u.label}</span>
                  <span className="text-xs font-semibold tabular-nums">
                    {u.used}{u.unit} <span className="text-muted-foreground">/ {u.limit}{u.unit}</span>
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-right text-[10px] text-muted-foreground">{pct}% used</div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Payment method */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Payment method"
          desc="Card used for subscription renewals."
          action={
            <button
              onClick={() => toast.info("Stripe not connected — add a payment gateway in Integrations")}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/60"
            >
              Update
            </button>
          }
        />
        <div className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4">
          <div className="grid h-10 w-14 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.4_0.16_258)] to-[oklch(0.2_0.03_258)] text-[10px] font-bold text-white">
            VISA
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Visa ending in 4242</div>
            <div className="text-xs text-muted-foreground">Expires 08 / 2027</div>
          </div>
          <Badge className="bg-primary/15 text-primary">Primary</Badge>
        </div>
      </GlassCard>

      {/* Invoices */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Invoices" desc="Download past invoices and receipts." />
        {invoicesLoading ? (
          <div className="space-y-2">
            <div className="shimmer h-8 rounded-lg" />
            <div className="shimmer h-8 rounded-lg" />
            <div className="shimmer h-8 rounded-lg" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No invoices yet. Owner-Panel invoices will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Invoice</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border/50">
                    <td className="px-2 py-2.5 text-xs font-medium">{inv.number}</td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2.5 text-xs">
                      ${inv.total.toFixed(2)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        inv.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : inv.status === "overdue"
                            ? "bg-rose-500/15 text-rose-500"
                            : "bg-amber-500/15 text-amber-500"
                      )}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ===== 10. Data & Privacy =====
function DataSection() {
  const [retention, setRetention] = React.useState({
    analytics: "2-years",
    media: "forever",
    audit: "1-year",
  });
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({
    gdprExport: true,
    anonymizeIp: true,
    shareUsage: false,
    optOutAI: false,
  });

  const flip = (k: string) => (v: boolean) => {
    setToggles((prev) => ({ ...prev, [k]: v }));
    toast.success("Privacy setting updated");
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle title="Data & Privacy" desc="Control how your data is stored, shared, and exported." />

      {/* Export / Import */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => toast.success("Exporting data…", { description: "We'll email you when the ZIP is ready." })}
          className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:bg-muted/40"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Export data</div>
            <div className="text-xs text-muted-foreground">Posts, analytics, team, and inbox (JSON + CSV).</div>
          </div>
        </button>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:bg-muted/40">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Import data</div>
            <div className="text-xs text-muted-foreground">Migrate from Buffer, Hootsuite, or CSV.</div>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={() => toast.success("File received — parsing…")}
          />
        </label>
      </div>

      <Separator className="my-5" />

      {/* Retention */}
      <div>
        <div className="text-sm font-medium">Data retention</div>
        <div className="text-xs text-muted-foreground">How long we keep different categories of data.</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Analytics">
            <Select value={retention.analytics} onValueChange={(v) => setRetention((p) => ({ ...p, analytics: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30-days">30 days</SelectItem>
                <SelectItem value="1-year">1 year</SelectItem>
                <SelectItem value="2-years">2 years</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Media assets">
            <Select value={retention.media} onValueChange={(v) => setRetention((p) => ({ ...p, media: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30-days">30 days</SelectItem>
                <SelectItem value="1-year">1 year</SelectItem>
                <SelectItem value="forever">Forever</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Audit logs">
            <Select value={retention.audit} onValueChange={(v) => setRetention((p) => ({ ...p, audit: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30-days">30 days</SelectItem>
                <SelectItem value="1-year">1 year</SelectItem>
                <SelectItem value="2-years">2 years</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <Separator className="my-5" />

      {/* GDPR toggles */}
      <div className="space-y-1">
        <ToggleRow label="Right to export (GDPR)" desc="Allow any team member to request a data export." checked={toggles.gdprExport} onChange={flip("gdprExport")} />
        <ToggleRow label="Anonymize IP addresses" desc="Strip the last octet from stored IP addresses." checked={toggles.anonymizeIp} onChange={flip("anonymizeIp")} />
        <ToggleRow label="Share usage analytics" desc="Help us improve SocialFlow by sending anonymous telemetry." checked={toggles.shareUsage} onChange={flip("shareUsage")} />
        <ToggleRow label="Opt out of AI training" desc="Prevent your content from being used to improve AI models." checked={toggles.optOutAI} onChange={flip("optOutAI")} />
      </div>

      {/* Danger: delete workspace */}
      <div className="mt-5 rounded-2xl border-2 border-rose-500/40 bg-rose-500/5 p-4">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-rose-500" />
          <span className="text-sm font-semibold text-rose-500">Delete workspace</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently delete this workspace, all posts, analytics, and team members. This cannot be undone.
        </p>
        <DeleteConfirm
          label="Type the workspace name 'Prism Studio' to confirm"
          placeholder="Prism Studio"
          confirmText="Prism Studio"
          buttonLabel="Delete workspace"
          onConfirm={() => toast.info("Contact support to schedule workspace deletion")}
        />
      </div>
    </GlassCard>
  );
}

// ===== 11. Danger Zone =====
function DangerSection() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<ApiUser[]>("/api/users");
  const users = data ?? [];
  // Exclude the current user from both suspend and transfer lists.
  const others = users.filter((u) => u.id !== user?.id);
  const [suspendId, setSuspendId] = React.useState("");
  const [transferTo, setTransferTo] = React.useState("");
  const [acting, setActing] = React.useState(false);

  // Keep selects valid once data arrives.
  React.useEffect(() => {
    if (!others.length) return;
    if (!suspendId || !others.some((u) => u.id === suspendId)) {
      setSuspendId(others[0].id);
    }
    if (!transferTo || !others.some((u) => u.id === transferTo)) {
      setTransferTo(others[0].id);
    }
  }, [others, suspendId, transferTo]);

  const patchUser = async (id: string, patch: Record<string, unknown>) => {
    setActing(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Request failed");
      }
      reload();
    } finally {
      setActing(false);
    }
  };

  const suspend = async () => {
    const target = users.find((u) => u.id === suspendId);
    if (!target) return;
    try {
      await patchUser(target.id, { status: "suspended" });
      toast.success(`Suspended ${target.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend");
    }
  };

  const transfer = async () => {
    const target = users.find((u) => u.id === transferTo);
    if (!target) return;
    try {
      await patchUser(target.id, { role: "admin" });
      toast.success(`Ownership transferred to ${target.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to transfer");
    }
  };

  return (
    <GlassCard className="crystal-in border-2 border-rose-500/40 p-5">
      <SectionTitle
        title="Danger Zone"
        desc="Irreversible and destructive actions. Proceed with caution."
      />

      <div className="space-y-3">
        {/* Suspend a member */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
            <UserX className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Suspend a member</div>
            <div className="text-xs text-muted-foreground">Temporarily revoke access. They keep their content history.</div>
          </div>
          {loading ? (
            <div className="shimmer h-9 w-44 rounded-lg" />
          ) : others.length === 0 ? (
            <span className="text-xs text-muted-foreground">No other members</span>
          ) : (
            <Select value={suspendId} onValueChange={setSuspendId}>
              <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {others.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            onClick={suspend}
            disabled={acting || !suspendId}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-3.5 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            <Ban className="h-3.5 w-3.5" /> Suspend
          </button>
        </div>

        {/* Transfer ownership */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Transfer ownership</div>
            <div className="text-xs text-muted-foreground">Hand over workspace admin rights to another member.</div>
          </div>
          {loading ? (
            <div className="shimmer h-9 w-44 rounded-lg" />
          ) : others.length === 0 ? (
            <span className="text-xs text-muted-foreground">No other members</span>
          ) : (
            <Select value={transferTo} onValueChange={setTransferTo}>
              <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {others.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            onClick={transfer}
            disabled={acting || !transferTo}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 px-3.5 py-1.5 text-xs font-semibold text-amber-500 transition hover:bg-amber-500/10 disabled:opacity-60"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
          </button>
        </div>

        {/* Delete account */}
        <div className="rounded-2xl border-2 border-rose-500/50 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-semibold text-rose-500">Delete account</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently delete your user account, all personal data, and revoke your sessions. This cannot be undone.
          </p>
          <DeleteConfirm
            label='Type "DELETE" to confirm'
            placeholder="DELETE"
            confirmText="DELETE"
            buttonLabel="Delete my account"
            onConfirm={() => toast.info("Contact support to schedule account deletion")}
          />
        </div>
      </div>
    </GlassCard>
  );
}

// ===== Reusable pieces =====
function Field({
  label,
  hint,
  children,
  className,
  compact,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <Label className={cn("text-xs font-medium", compact ? "mb-1" : "mb-1.5")}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  className,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/30", className)}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NotificationGroup({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DeleteConfirm({
  label,
  placeholder,
  confirmText,
  buttonLabel,
  onConfirm,
}: {
  label: string;
  placeholder: string;
  confirmText: string;
  buttonLabel: string;
  onConfirm: () => void;
}) {
  const [value, setValue] = React.useState("");
  const matches = value.trim() === confirmText;
  return (
    <div className="mt-3">
      <Label className="mb-1.5 text-xs font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="max-w-xs font-mono text-sm"
        />
        <button
          onClick={() => {
            if (!matches) {
              toast.error(`Type "${confirmText}" to confirm`);
              return;
            }
            onConfirm();
            setValue("");
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition",
            matches
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600"
              : "border border-border bg-muted/40 text-muted-foreground"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" /> {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ===== Skeleton =====
function TeamSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-40 rounded-3xl" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-44 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
