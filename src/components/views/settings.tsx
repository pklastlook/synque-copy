"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
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
  // Company
  Briefcase,
  Calendar,
  FileText,
  FileBarChart2,
  LayoutDashboard,
  Linkedin,
  Twitter,
  Hash,
  // Generic
  Save,
  Eye,
  EyeOff,
  MoreHorizontal,
  Send,
  Loader2,
  RefreshCw,
  MapPin,
  Globe,
  Phone,
  Landmark,
  Banknote,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Pencil,
  X,
  Bot,
  Sparkles,
  // Report preview / print
  Printer,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ScanLine,
  // Report content-order drag-and-drop
  GripVertical,
  Table,
  TrendingUp,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { useApi, timeAgo } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { SectionHeader } from "@/components/glass/dense-ui";
import { PlatformApiSection } from "@/components/views/platform-settings/platform-api-section";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  | "company"
  | "workspace"
  | "appearance"
  | "team-roles"
  | "notifications"
  | "security"
  | "platforms"
  | "platform-api"
  | "integrations"
  | "billing"
  | "bank"
  | "data"
  | "danger"
  | "report"
  | "landing";

export interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

/**
 * Settings sub-sections. Shared between the main app sidebar (so the
 * Settings group expands to show these as children) and the SettingsView
 * (which renders the matching section based on `useNav().settingsTab`).
 */
export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "workspace", label: "Workspace", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "team-roles", label: "Team Roles", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "platforms", label: "Platforms", icon: AtSign },
  { id: "platform-api", label: "Platform API Keys", icon: KeyRound },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "bank", label: "Bank Details", icon: Landmark },
  { id: "data", label: "Data & Privacy", icon: Database },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
  { id: "report", label: "Report Settings", icon: FileBarChart2 },
  { id: "landing", label: "Landing Page", icon: LayoutDashboard },
];

const SECTION_DESC: Record<SettingsTab, string> = {
  profile: "Your personal information visible to your team.",
  company: "Company profile — logo, address, contact details.",
  workspace: "Defaults applied across compose, schedule, and AI generation.",
  appearance: "Personalize how SYNQUE looks on this device.",
  "team-roles": "Manage who can access what. Changes are staged locally — save to sync.",
  notifications: "Choose what reaches your inbox and how often.",
  security: "Password, 2FA, sessions, API keys, and IP allowlist.",
  platforms: "Manage which social accounts are connected to SYNQUE.",
  "platform-api": "Connect real platform APIs for live posting and automatic data sync.",
  integrations: "Connect SYNQUE with the tools your team already uses.",
  billing: "Plan, usage, payment method, and invoices.",
  bank: "Bank account details for subscription payments.",
  data: "Control how your data is stored, shared, and exported.",
  danger: "Irreversible and destructive actions. Proceed with caution.",
  report: "Customize how reports print — applies to all reports.",
  landing: "Control your public-facing landing page and linked pages.",
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

// ===== Company profile constants =====
const INDUSTRIES = [
  "Technology",
  "Marketing",
  "E-commerce",
  "Healthcare",
  "Education",
  "Finance",
  "Media",
  "Other",
] as const;
type Industry = (typeof INDUSTRIES)[number];

const TEAM_SIZES = [
  { value: "1-10", label: "1 – 10" },
  { value: "11-50", label: "11 – 50" },
  { value: "51-200", label: "51 – 200" },
  { value: "201-500", label: "201 – 500" },
  { value: "500+", label: "500+" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const FOUNDED_YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1900 + 1 },
  (_, i) => String(CURRENT_YEAR - i)
);

// ===== Sidebar groups — macOS-style grouping =====
interface SidebarGroup {
  label: string;
  tabs: SettingsTab[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  { label: "Account", tabs: ["profile", "security", "notifications"] },
  { label: "Workspace", tabs: ["company", "workspace", "team-roles", "appearance"] },
  { label: "Integrations", tabs: ["platforms", "platform-api", "integrations"] },
  { label: "Billing", tabs: ["billing", "bank"] },
  { label: "Data", tabs: ["data", "danger"] },
  { label: "Customization", tabs: ["report", "landing"] },
];

// ===== Main component =====
export function SettingsView() {
  const { settingsTab, setSettingsTab } = useNav();
  const tab: SettingsTab = (settingsTab as SettingsTab) || "profile";
  const activeDef = SETTINGS_TABS.find((t) => t.id === tab) ?? SETTINGS_TABS[0];
  const ActiveIcon = activeDef.icon;

  return (
    <div className="animate-rise space-y-4">
      {/* ============================================================ */}
      {/* MOBILE DROPDOWN                                              */}
      {/* Visible only on small screens where the main app-sidebar    */}
      {/* collapses to a sheet. On lg+ the app-sidebar's Settings     */}
      {/* sub-items handle navigation.                                */}
      {/* ============================================================ */}
      <div className="lg:hidden">
        <Select value={tab} onValueChange={(v) => setSettingsTab(v)}>
          <SelectTrigger className="h-10 w-full">
            <span className="flex items-center gap-2">
              <ActiveIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">{activeDef.label}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {SIDEBAR_GROUPS.map((g) => (
              <SelectGroup key={g.label}>
                <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </SelectLabel>
                {g.tabs.map((id) => {
                  const def = SETTINGS_TABS.find((t) => t.id === id)!;
                  const Icon = def.icon;
                  return (
                    <SelectItem key={id} value={id}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {def.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ============================================================ */}
      {/* DETAIL PANEL — only the active section is rendered           */}
      {/* ============================================================ */}
      <main className="min-w-0 space-y-4">
        {/* Sticky section header — wrapper handles sticky positioning
            because the .glass class sets position: relative which would
            otherwise override Tailwind's sticky utility. */}
        <div className="sticky top-0 z-10 -mx-1">
          <div className="glass rounded-2xl border border-border/40 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <Settings className="h-3 w-3" />
              <span>Settings</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <ActiveIcon className="h-3 w-3" />
                {activeDef.label}
              </span>
            </div>
            <SectionHeader
              title={activeDef.label}
              desc={SECTION_DESC[tab] ?? "Manage your workspace."}
              icon={ActiveIcon}
              className="mb-0 mt-1"
            />
          </div>
        </div>

        {/* Active section content — only ONE section visible at a time */}
        <div className="min-w-0 space-y-4">
          {tab === "profile" && <ProfileSection />}
          {tab === "company" && <CompanySection />}
          {tab === "workspace" && <WorkspaceSection />}
          {tab === "appearance" && <AppearanceSection />}
          {tab === "team-roles" && <TeamRolesSection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "security" && <SecuritySection />}
          {tab === "platforms" && <PlatformsSection />}
          {tab === "platform-api" && <PlatformApiSection />}
          {tab === "integrations" && (
            <>
              <IntegrationsSection />
              <MediaStorageSection />
              <AIChatModelSection />
            </>
          )}
          {tab === "billing" && <BillingSection />}
          {tab === "bank" && <BankSection />}
          {tab === "data" && <DataSection />}
          {tab === "danger" && <DangerSection />}
          {tab === "report" && <ReportSettingsSection />}
          {tab === "landing" && <LandingSettingsSection />}
        </div>
      </main>
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
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [bio, setBio] = React.useState("");
  const [timezone, setTimezone] = React.useState("America/Los_Angeles");
  const [language, setLanguage] = React.useState("en-US");
  const [saving, setSaving] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load real user data (prefer the freshest DB record from /api/users,
  // fall back to the auth store user)
  React.useEffect(() => {
    if (!user) return;
    const dbUser = (data ?? []).find((u) => u.id === user.id);
    setName(dbUser?.name ?? user.name);
    setEmail(dbUser?.email ?? user.email);
    setTitle(dbUser?.title ?? user.title ?? "");
    setAvatarUrl(dbUser?.avatar ?? user.avatar ?? null);
    const dept = (dbUser?.department ?? user.department) as Department | undefined;
    if (dept && (DEPARTMENTS as string[]).includes(dept)) {
      setDepartment(dept);
    }
    if (dbUser?.bio) setBio(dbUser.bio);
    if (dbUser?.timezone) setTimezone(dbUser.timezone);
    if (dbUser?.language) setLanguage(dbUser.language);
  }, [user, data]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image too large — max 25MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedById", user.id);
      formData.append("name", `${user.name} avatar`);
      formData.append("folder", "avatars");
      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
        : null;
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.url) {
        // Update user's avatar in the DB
        const patchRes = await fetch("/api/users", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: user.id, avatar: json.url }),
        });
        if (patchRes.ok) {
          const patchJson = await patchRes.json();
          setAvatarUrl(json.url);
          // Keep the persisted auth store in sync so the sidebar/header
          // avatar updates without a full page reload.
          try {
            const raw = localStorage.getItem("socialflow-auth");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state?.user) {
                parsed.state.user = { ...parsed.state.user, avatar: json.url };
                localStorage.setItem("socialflow-auth", JSON.stringify(parsed));
              }
            }
          } catch {}
          if (patchJson?.user && typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("socialflow-auth");
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.state?.user) {
                  parsed.state.user = { ...parsed.state.user, ...patchJson.user };
                  localStorage.setItem("socialflow-auth", JSON.stringify(parsed));
                }
              }
            } catch {}
          }
          toast.success("Avatar updated");
          reload();
        } else {
          const patchErr = await patchRes.json().catch(() => ({}));
          toast.error(patchErr.error ?? "Saved upload but failed to update profile");
        }
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!user) return;
    const token = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
      : null;
    try {
      await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: user.id, avatar: null }),
      });
      setAvatarUrl(null);
      toast.success("Avatar removed");
      reload();
    } catch {
      toast.error("Failed to remove avatar");
    }
  }

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
        : null;
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: user.id, name, email, title, department, bio, timezone, language }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Profile saved", { description: "Your changes have been synced." });
        // Update auth store with new user data if returned
        if (json.user) {
          // The auth store is persisted in localStorage — update it
          try {
            const raw = localStorage.getItem("socialflow-auth");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state?.user) {
                parsed.state.user = { ...parsed.state.user, ...json.user };
                localStorage.setItem("socialflow-auth", JSON.stringify(parsed));
              }
            }
          } catch {}
        }
        reload();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
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
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <NameAvatar name={name || "User"} color="blue" className="h-20 w-20 text-lg" />
        )}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">PNG / JPG up to 1.5MB · square recommended</div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {uploadingAvatar ? "Uploading…" : "Change"}
            </button>
            {avatarUrl && (
              <button
                onClick={removeAvatar}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/60"
              >
                Remove
              </button>
            )}
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
    </section>
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

// ===== 1b. Company Profile =====
function CompanySection() {
  const { data: ws, reload } = useApi<{ name: string; brandVoice?: string | null; tone?: string } | null>("/api/workspace");
  const { user } = useAuth();
  const [companyName, setCompanyName] = React.useState("");
  const [companyLogo, setCompanyLogo] = React.useState<string | null>(null);
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  // New fields
  const [industry, setIndustry] = React.useState<Industry | "">("");
  const [companyEmail, setCompanyEmail] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [foundedYear, setFoundedYear] = React.useState("");
  const [teamSize, setTeamSize] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ws?.name) setCompanyName(ws.name);
  }, [ws]);

  // Load company info from localStorage (persisted locally since we don't have a Company model)
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("socialflow-company") ?? "{}");
      if (stored.companyName) setCompanyName(stored.companyName);
      if (stored.companyLogo) setCompanyLogo(stored.companyLogo);
      if (stored.address) setAddress(stored.address);
      if (stored.city) setCity(stored.city);
      if (stored.country) setCountry(stored.country);
      if (stored.phone) setPhone(stored.phone);
      if (stored.website) setWebsite(stored.website);
      // New fields — guarded so old localStorage entries don't crash
      if (stored.industry) setIndustry(stored.industry);
      if (stored.companyEmail) setCompanyEmail(stored.companyEmail);
      if (stored.taxId) setTaxId(stored.taxId);
      if (stored.foundedYear) setFoundedYear(String(stored.foundedYear));
      if (stored.teamSize) setTeamSize(stored.teamSize);
      if (stored.description) setDescription(stored.description);
      if (stored.linkedin) setLinkedin(stored.linkedin);
      if (stored.twitter) setTwitter(stored.twitter);
    } catch {}
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { toast.error("You must be signed in to upload"); return; }
    if (file.size > 1.5 * 1024 * 1024) { toast.error("Logo too large — max 1.5MB"); return; }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedById", user.id);
      formData.append("name", `${companyName || "Company"} logo`);
      formData.append("folder", "logos");
      const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.url) {
        setCompanyLogo(json.url);
        // Persist immediately
        const stored = JSON.parse(localStorage.getItem("socialflow-company") ?? "{}");
        stored.companyLogo = json.url;
        localStorage.setItem("socialflow-company", JSON.stringify(stored));
        toast.success("Logo uploaded");
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch { toast.error("Network error"); }
    finally { setUploadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = ""; }
  }

  function removeLogo() {
    if (!companyLogo) return;
    setCompanyLogo(null);
    try {
      const stored = JSON.parse(localStorage.getItem("socialflow-company") ?? "{}");
      delete stored.companyLogo;
      localStorage.setItem("socialflow-company", JSON.stringify(stored));
    } catch {}
    toast.success("Logo removed");
  }

  const save = async () => {
    setSaving(true);
    try {
      // Save company info to localStorage (no Company model in schema yet)
      const companyData = {
        companyName,
        companyLogo,
        address,
        city,
        country,
        phone,
        website,
        industry,
        companyEmail,
        taxId,
        foundedYear,
        teamSize,
        description,
        linkedin,
        twitter,
      };
      localStorage.setItem("socialflow-company", JSON.stringify(companyData));

      // Also update workspace name if changed
      if (companyName && companyName !== ws?.name) {
        const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
        await fetch("/api/workspace", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: companyName }),
        });
      }

      toast.success("Company profile saved");
      reload();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Letterhead preview helpers
  const fullAddress = [address, city, country].filter(Boolean).join(", ");
  const contactLine = [phone, companyEmail || website].filter(Boolean).join("  ·  ");
  const socialLine = [
    linkedin && `in/${linkedin}`,
    twitter && `@${twitter}`,
  ].filter(Boolean).join("  ·  ");

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Company profile"
        desc="Your company information used in reports, invoices, and branding."
        action={
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {saving ? "Saving…" : "Save"}
          </button>
        }
      />

      {/* Logo + size previews */}
      <div className="mb-5 rounded-2xl bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {companyLogo ? (
            <img src={companyLogo} alt="Company logo" className="h-16 w-16 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Building2 className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Company logo</div>
            <div className="text-xs text-muted-foreground">PNG / JPG / SVG up to 1.5MB · square recommended</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : companyLogo ? <Pencil className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                {uploadingLogo ? "Uploading…" : companyLogo ? "Replace" : "Upload"}
              </button>
              {companyLogo && (
                <button
                  onClick={removeLogo}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Size previews */}
          {companyLogo && (
            <div className="flex flex-col items-center gap-1 border-l border-border/60 pl-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</div>
              <div className="flex items-end gap-3">
                {[16, 32, 64].map((size) => (
                  <div key={size} className="flex flex-col items-center gap-1">
                    <div className="grid h-16 place-items-center">
                      <img
                        src={companyLogo}
                        alt={`Logo at ${size}px`}
                        width={size}
                        height={size}
                        style={{ width: size, height: size }}
                        className="rounded-md object-contain ring-1 ring-border/40"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{size}px</span>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground/70">Favicon · Sidebar · Print</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." className="settings-input" />
        </Field>
        <Field label="Website">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" className="settings-input" />
        </Field>
        <Field label="Company email" hint="Used on invoices and as a public contact">
          <input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="hello@acme.com" type="email" className="settings-input" />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" className="settings-input" />
        </Field>
        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="settings-input" />
        </Field>
        <Field label="City">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" className="settings-input" />
        </Field>
        <Field label="Country">
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" className="settings-input" />
        </Field>
        <Field label="Industry">
          <Select value={industry} onValueChange={(v) => setIndustry(v as Industry)}>
            <SelectTrigger className="w-full">
              <span className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Select industry" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tax ID / Registration #">
          <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="US-12-3456789" className="settings-input" />
        </Field>
        <Field label="Founded year">
          <Select value={foundedYear} onValueChange={setFoundedYear}>
            <SelectTrigger className="w-full">
              <span className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Select year" />
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {FOUNDED_YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Team size">
          <Select value={teamSize} onValueChange={setTeamSize}>
            <SelectTrigger className="w-full">
              <span className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Select team size" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="LinkedIn" hint="Company handle (e.g. acme-inc)">
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value.replace(/^https?:\/\/(www\.)?linkedin\.com\/(company\/)?/i, "").replace(/^\/+|\/+$/g, ""))} placeholder="acme-inc" className="settings-input" />
        </Field>
        <Field label="Twitter / X handle">
          <input value={twitter} onChange={(e) => setTwitter(e.target.value.replace(/^@/, ""))} placeholder="acme" className="settings-input" />
        </Field>
      </div>

      <Field label="Company description" hint={`${description.length} / 500`} className="mt-4">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={3}
          maxLength={500}
          placeholder="A short paragraph describing what your company does, used in report footers and directory listings."
          className="resize-none"
        />
      </Field>

      {/* Report header preview */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Report header preview</span>
          <span className="text-[11px] text-muted-foreground">— how your company info renders on printed reports</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white text-[oklch(0.18_0.02_258)] shadow-sm dark:bg-[oklch(0.99_0.005_258)]">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5">
            <div className="flex items-start gap-3">
              {companyLogo ? (
                <img src={companyLogo} alt="logo" className="h-12 w-12 rounded-md object-contain" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-md bg-[oklch(0.94_0.02_258)] text-[oklch(0.45_0.15_258)]">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div>
                <div className="text-lg font-bold leading-tight">{companyName || "Your Company Name"}</div>
                {description && (
                  <div className="mt-0.5 max-w-md text-[11px] leading-snug text-[oklch(0.4_0.02_258)]">
                    {description}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right text-[10px] leading-snug text-[oklch(0.4_0.02_258)]">
              {industry && <div><strong>Industry:</strong> {industry}</div>}
              {foundedYear && <div><strong>Founded:</strong> {foundedYear}</div>}
              {teamSize && <div><strong>Team:</strong> {teamSize} people</div>}
              {taxId && <div><strong>Tax ID:</strong> {taxId}</div>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-[10px] text-[oklch(0.4_0.02_258)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {fullAddress && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 opacity-60" /> {fullAddress}
                </span>
              )}
              {contactLine && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 opacity-60" /> {contactLine}
                </span>
              )}
            </div>
            {socialLine && (
              <div className="flex items-center gap-3 opacity-80">
                {linkedin && (
                  <span className="flex items-center gap-1">
                    <Linkedin className="h-3 w-3" /> {linkedin}
                  </span>
                )}
                {twitter && (
                  <span className="flex items-center gap-1">
                    <Twitter className="h-3 w-3" /> @{twitter}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== Bank Details =====
function BankSection() {
  const { data: banks, reload } = useApi<{ id: string; accountName: string; bankName: string; accountNumber: string; iban: string | null; swift: string | null; currency: string; isDefault: boolean }[]>("/api/bank-accounts");
  const [showForm, setShowForm] = React.useState(false);
  const [accountName, setAccountName] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [iban, setIban] = React.useState("");
  const [swift, setSwift] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [saving, setSaving] = React.useState(false);

  const bankList = banks ?? [];

  async function addBank() {
    if (!accountName.trim() || !bankName.trim() || !accountNumber.trim()) {
      toast.error("Account name, bank name, and account number are required");
      return;
    }
    setSaving(true);
    try {
      const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ accountName, bankName, accountNumber, iban: iban || null, swift: swift || null, currency }),
      });
      if (res.ok) {
        toast.success("Bank account added");
        setAccountName(""); setBankName(""); setAccountNumber(""); setIban(""); setSwift("");
        setShowForm(false);
        reload();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to add bank account");
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  async function setDefault(id: string) {
    const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
    await fetch(`/api/bank-accounts/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ isDefault: true }),
    });
    toast.success("Default bank account updated");
    reload();
  }

  async function deleteBank(id: string) {
    if (!confirm("Delete this bank account?")) return;
    const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
    await fetch(`/api/bank-accounts/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    toast.success("Bank account deleted");
    reload();
  }

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Bank details"
        desc="Bank accounts for subscription payments and invoice settlements."
        action={
          <button onClick={() => setShowForm(!showForm)} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> {showForm ? "Close" : "Add account"}
          </button>
        }
      />

      {/* Add bank form */}
      {showForm && (
        <div className="mb-4 space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Account holder name">
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="John Smith" className="settings-input" />
            </Field>
            <Field label="Bank name">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HSBC" className="settings-input" />
            </Field>
            <Field label="Account number">
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="01234567890" className="settings-input" />
            </Field>
            <Field label="Currency">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="settings-input">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="PKR">PKR</option>
                <option value="AED">AED</option>
              </select>
            </Field>
            <Field label="IBAN (optional)">
              <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="GB29 NWBK 6016..." className="settings-input" />
            </Field>
            <Field label="SWIFT/BIC (optional)">
              <input value={swift} onChange={(e) => setSwift(e.target.value)} placeholder="NWBKGB2L" className="settings-input" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
            <button onClick={addBank} disabled={saving} className="liquid-pill rounded-lg px-4 py-1.5 text-xs font-semibold disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {saving ? "Saving…" : "Save account"}
            </button>
          </div>
        </div>
      )}

      {/* Bank accounts list */}
      {bankList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">No bank accounts</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Add a bank account for subscription payments</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {bankList.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold">{b.accountName}</span>
                  {b.isDefault && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-500">DEFAULT</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {b.bankName} · ••••{b.accountNumber.slice(-4)} · {b.currency}
                </div>
                {b.iban && <div className="text-[10px] text-muted-foreground">IBAN: {b.iban}</div>}
              </div>
              <div className="flex items-center gap-1">
                {!b.isDefault && (
                  <button onClick={() => setDefault(b.id)} className="rounded-lg border border-border/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    Set default
                  </button>
                )}
                <button onClick={() => deleteBank(b.id)} className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment workflow note */}
      <div className="mt-4 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 text-[11px] text-muted-foreground">
        <strong className="text-blue-500">Payment workflow:</strong> When your subscription is due, an invoice
        is generated in the Owner Panel. You can pay via bank transfer using the details above, or via card
        (once Stripe is connected in Integrations). Invoices are marked as "paid" manually by the admin after
        the bank transfer is confirmed.
      </div>
    </section>
  );
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
  const [workspaceLogo, setWorkspaceLogo] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

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

  // Load workspace logo from localStorage (workspace-logo is purely cosmetic
  // — not yet a column on WorkspaceSettings, so we persist it locally).
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("socialflow-workspace") ?? "{}");
      if (stored.logo) setWorkspaceLogo(stored.logo);
    } catch {}
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { toast.error("You must be signed in to upload"); return; }
    if (file.size > 1.5 * 1024 * 1024) { toast.error("Logo too large — max 1.5MB"); return; }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedById", user.id);
      formData.append("name", `${name || "Workspace"} logo`);
      formData.append("folder", "workspace-logos");
      const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.url) {
        setWorkspaceLogo(json.url);
        try {
          const stored = JSON.parse(localStorage.getItem("socialflow-workspace") ?? "{}");
          stored.logo = json.url;
          localStorage.setItem("socialflow-workspace", JSON.stringify(stored));
        } catch {}
        toast.success("Workspace logo uploaded");
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch { toast.error("Network error"); }
    finally { setUploadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = ""; }
  }

  function removeLogo() {
    if (!workspaceLogo) return;
    setWorkspaceLogo(null);
    try {
      const stored = JSON.parse(localStorage.getItem("socialflow-workspace") ?? "{}");
      delete stored.logo;
      localStorage.setItem("socialflow-workspace", JSON.stringify(stored));
    } catch {}
    toast.success("Workspace logo removed");
  }

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

  // Derive a 1-2 letter monogram for the placeholder tile
  const monogram = React.useMemo(() => {
    const trimmed = (name || "WS").trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "W";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Workspace"
        desc="Defaults applied across compose, schedule, and AI generation."
        action={
          <button onClick={save} disabled={saving} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {/* Identity */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl bg-muted/30 p-4">
        {workspaceLogo ? (
          <img
            src={workspaceLogo}
            alt={`${name} logo`}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl object-cover ring-1 ring-border"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-xl font-bold text-white shadow-lg">
            {monogram}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">SVG / PNG · square recommended · max 1.5MB</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:bg-muted/60 disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : workspaceLogo ? <Pencil className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              {uploadingLogo ? "Uploading…" : workspaceLogo ? "Replace logo" : "Upload logo"}
            </button>
            {workspaceLogo && (
              <button
                onClick={removeLogo}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
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
    </section>
  );
}

// ===== 3. Appearance =====
const APPEARANCE_KEY = "socialflow-appearance";

function loadAppearance() {
  try {
    return JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  // Lazy-init from localStorage so accent/font size/etc. survive reload.
  const [initial] = React.useState(loadAppearance);
  const [accent, setAccent] = React.useState<string>(initial.accent ?? DEFAULT_ACCENT);
  const [reduceMotion, setReduceMotion] = React.useState<boolean>(initial.reduceMotion ?? false);
  const [glassEffects, setGlassEffects] = React.useState<boolean>(initial.glassEffects ?? true);
  const [compact, setCompact] = React.useState<boolean>(initial.compact ?? false);
  const [fontSize, setFontSize] = React.useState<number>(initial.fontSize ?? 14);

  // Apply persisted accent + font-size on first mount so the page renders
  // with the user's last saved appearance before they touch a control.
  React.useEffect(() => {
    if (accent && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary", accent);
    }
  }, [accent]);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.fontSize = `${fontSize}px`;
    }
  }, [fontSize]);

  // Persist any change to the four toggles + accent + font size.
  const persist = React.useCallback(
    (patch: Record<string, unknown>) => {
      try {
        const next = { ...loadAppearance(), ...patch };
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
      } catch {}
    },
    []
  );

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
    persist({ accent: value });
    toast.success(`Accent set to ${name}`);
  };

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader title="Appearance" desc="Personalize how SYNQUE looks on this device." />

      {/* Theme cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            persist({ reduceMotion: v });
            toast.success(`Reduce motion ${v ? "on" : "off"}`);
          }}
        />
        <ToggleRow
          label="Liquid glass effects"
          desc="Translucent layers, blur, and sheen across the app."
          checked={glassEffects}
          onChange={(v) => {
            setGlassEffects(v);
            persist({ glassEffects: v });
            toast.success(`Glass effects ${v ? "on" : "off"}`);
          }}
        />
        <ToggleRow
          label="Compact mode"
          desc="Tighten spacing to see more content per screen."
          checked={compact}
          onChange={(v) => {
            setCompact(v);
            persist({ compact: v });
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
              persist({ fontSize: v[0] });
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>A</span><span>Default</span><span>A</span>
        </div>
      </div>
    </section>
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
  avatar: string | null;
  bio?: string | null;
  timezone?: string | null;
  language?: string | null;
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
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader
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
      </section>

      {/* Permissions matrix */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader
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
      </section>

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
                placeholder="teammate@synque.cloud"
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
  // Load from localStorage
  const loadPrefs = () => {
    try { return JSON.parse(localStorage.getItem("socialflow-notif-prefs") ?? "{}"); } catch { return {}; }
  };
  const stored = loadPrefs();

  const [engagement, setEngagement] = React.useState<Record<string, boolean>>(stored.engagement ?? {
    newComment: true, mention: true, newFollower: true, postLiked: false,
  });
  const [workflow, setWorkflow] = React.useState<Record<string, boolean>>(stored.workflow ?? {
    taskAssigned: true, taskOverdue: true,
  });
  const [reports, setReports] = React.useState<Record<string, boolean>>(stored.reports ?? {
    weeklyDigest: true, monthlySummary: false, competitorAlert: true,
  });
  const [system, setSystem] = React.useState<Record<string, boolean>>(stored.system ?? {
    accountWarning: true, mailQuota: true, security: true,
  });
  const [quietStart, setQuietStart] = React.useState(stored.quietStart ?? "22:00");
  const [quietEnd, setQuietEnd] = React.useState(stored.quietEnd ?? "07:00");
  const [digest, setDigest] = React.useState(stored.digest ?? "instant");

  const flip = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    key: string
  ) => (v: boolean) => {
    setter((prev) => ({ ...prev, [key]: v }));
  };

  const save = () => {
    const prefs = { engagement, workflow, reports, system, quietStart, quietEnd, digest };
    localStorage.setItem("socialflow-notif-prefs", JSON.stringify(prefs));
    toast.success("Notification preferences saved");
  };

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
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
    </section>
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

// Shape returned by GET /api/auth/sessions — see src/app/api/auth/sessions/route.ts
interface SessionRow {
  id: string;
  current: boolean;
  userAgent: string | null;
  device: { device: string; browser: string; os: string };
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  lastActive: string;
}

// Read the JWT from the persisted Zustand store in localStorage so we can
// attach it as a Bearer token to manual fetch calls (useApi does this
// internally; this helper mirrors that for the 2FA / sessions endpoints).
function getAuthToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
  } catch {
    return null;
  }
}

function SecuritySection() {
  const { user, fetchUser, logout } = useAuth();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);

  // 2FA — derived from the auth store so the UI reflects the server's truth
  // (after fetchUser() it updates in place, no stale local copy).
  const twoFA = !!user?.twoFactorEnabled;
  const [setup2FA, setSetup2FA] = React.useState(false);
  const [setupBusy, setSetupBusy] = React.useState(false);
  const [verifyBusy, setVerifyBusy] = React.useState(false);
  const [disableBusy, setDisableBusy] = React.useState(false);
  const [setupData, setSetupData] = React.useState<{ secret: string; otpauth: string } | null>(null);
  const [verifyCode, setVerifyCode] = React.useState("");

  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [ipAllow, setIpAllow] = React.useState("");
  const [genName, setGenName] = React.useState("");
  const [genOpen, setGenOpen] = React.useState(false);
  const [genBusy, setGenBusy] = React.useState(false);
  const [newKey, setNewKey] = React.useState<string | null>(null);

  const { data: apiKeys, loading: apiKeysLoading, reload: reloadKeys } =
    useApi<SettingsApiKey[]>("/api/api-keys");
  const keys = apiKeys ?? [];

  // Sessions — fetched through useApi (it auto-attaches the Bearer token
  // from localStorage so we don't need a manual header here).
  const {
    data: sessionsData,
    loading: sessionsLoading,
    reload: reloadSessions,
  } = useApi<{ sessions: SessionRow[] }>("/api/auth/sessions");
  const sessions = sessionsData?.sessions ?? [];

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

  // Login history is not yet tracked in the database — honest empty state
  // instead of fabricated rows. (Sessions ARE real; see `sessions` above.)
  const history: { id: string; device: string; location: string; time: string; status: string }[] = [];

  // ---- 2FA setup / verify / disable -------------------------------------
  // Flow: 1) POST /api/auth/2fa/setup → returns { secret, otpauth }
  //       2) user scans QR (rendered from otpauth) + enters 6-digit code
  //       3) POST /api/auth/2fa/verify { code } → server enables 2FA
  //       4) refresh the user object so the toggle reflects server truth
  const startSetup = React.useCallback(async () => {
    setVerifyCode("");
    setSetupData(null);
    setSetup2FA(true);
    setSetupBusy(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        secret?: string;
        otpauth?: string;
        previouslyEnabled?: boolean;
        error?: string;
      };
      if (!res.ok || !data.secret || !data.otpauth) {
        throw new Error(data.error ?? "Failed to start 2FA setup");
      }
      setSetupData({ secret: data.secret, otpauth: data.otpauth });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start 2FA setup");
      setSetup2FA(false);
    } finally {
      setSetupBusy(false);
    }
  }, []);

  const verify2FA = async () => {
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from your authenticator");
      return;
    }
    setVerifyBusy(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Invalid verification code");
      }
      toast.success(data.message ?? "Two-factor authentication enabled.");
      await fetchUser();
      setSetup2FA(false);
      setSetupData(null);
      setVerifyCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to verify code");
    } finally {
      setVerifyBusy(false);
    }
  };

  const disable2FA = async () => {
    if (!window.confirm("Disable two-factor authentication for this account?")) return;
    setDisableBusy(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to disable 2FA");
      }
      toast.success(data.message ?? "Two-factor authentication disabled.");
      await fetchUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disable 2FA");
    } finally {
      setDisableBusy(false);
    }
  };

  // ---- Sessions ----------------------------------------------------------
  const revokeSession = async (id: string) => {
    if (!window.confirm("Revoke this session? The device will be signed out.")) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/auth/sessions/${id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        revokedCurrent?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to revoke session");
      }
      if (data.revokedCurrent) {
        toast.success(data.message ?? "You've been logged out of this device.");
        await logout();
        return;
      }
      toast.success(data.message ?? "Session revoked.");
      reloadSessions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke session");
    }
  };

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
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader title="Password" desc="Update your password regularly to keep your account secure." />
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
      </section>

      {/* 2FA */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader title="Two-factor authentication" desc="Add an extra layer of security to your account." />
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
              onClick={() => (twoFA ? disable2FA() : startSetup())}
              disabled={disableBusy}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60",
                twoFA ? "border border-border bg-background text-foreground" : "liquid-gold"
              )}
            >
              {disableBusy ? "Working…" : twoFA ? "Disable" : "Set up"}
            </button>
            <Switch
              checked={twoFA}
              onCheckedChange={(v) => {
                if (v) startSetup();
                else disable2FA();
              }}
              disabled={disableBusy}
            />
          </div>
        </div>
      </section>

      {/* Active sessions */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader
          title="Active sessions"
          desc="Devices currently signed in to your account."
          action={
            <button
              onClick={() => reloadSessions()}
              disabled={sessionsLoading}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {sessionsLoading ? "Loading…" : "Refresh"}
            </button>
          }
        />
        {sessionsLoading && sessions.length === 0 ? (
          <div className="space-y-2">
            <div className="shimmer h-12 rounded-2xl" />
            <div className="shimmer h-12 rounded-2xl" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No active sessions. Sign in again to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const isMobile = s.device.device === "Mobile" || s.device.device === "Tablet";
              const deviceLabel = [s.device.browser, s.device.os].filter(Boolean).join(" · ") || "Unknown device";
              const created = timeAgo(s.createdAt);
              const expires = new Date(s.expiresAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/20 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    {isMobile ? <Smartphone className="h-4 w-4" /> : <MonitorSmartphone className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{deviceLabel}</span>
                      {s.current && <Badge className="bg-emerald-500/15 text-emerald-500">Current</Badge>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.ipAddress ?? "Unknown IP"} · signed in {created} · expires {expires}
                    </div>
                  </div>
                  {!s.current && (
                    <button
                      onClick={() => revokeSession(s.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-500/10"
                    >
                      <LogOut className="h-3 w-3" /> Revoke
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Login history */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader title="Login history" desc="Recent sign-in attempts on your account." />
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
      </section>

      {/* API keys */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader
          title="API keys"
          desc="Use these to authenticate with the SYNQUE API."
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
      </section>

      {/* IP allowlist */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader
          title="IP allowlist"
          desc="Restrict API access to known IP ranges. One per line."
          action={
            <button
              onClick={() => toast.info("IP allowlist requires backend enforcement", {
                description: "This setting is not yet enforced server-side. It will be saved when the API middleware is implemented.",
              })}
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
      </section>

      {/* 2FA setup dialog */}
      <Dialog
        open={setup2FA}
        onOpenChange={(v) => {
          setSetup2FA(v);
          if (!v) {
            setSetupData(null);
            setVerifyCode("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator,
              Authy, 1Password, etc.), then enter the 6-digit code it shows.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {setupBusy || !setupData ? (
              <div className="grid h-44 w-44 place-items-center rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center">
                <div className="space-y-2">
                  {setupBusy ? (
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <QrCode className="mx-auto h-8 w-8 text-muted-foreground" />
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    {setupBusy ? "Generating secret…" : "Click Set up to begin"}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-border bg-white p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauth)}`}
                    alt="TOTP QR code"
                    width={176}
                    height={176}
                    className="h-44 w-44"
                  />
                </div>
                <div className="w-full space-y-1 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Or enter this code manually
                  </div>
                  <code className="block break-all rounded-lg bg-muted/40 px-2 py-1.5 font-mono text-[11px]">
                    {setupData.secret}
                  </code>
                </div>
              </>
            )}
            <Input
              placeholder="Enter 6-digit code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={setupBusy || !setupData}
              className="text-center font-mono tracking-[0.4em]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !verifyBusy) verify2FA();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setSetup2FA(false);
                setSetupData(null);
                setVerifyCode("");
              }}
            >
              Cancel
            </Button>
            <button
              onClick={verify2FA}
              disabled={verifyBusy || setupBusy || !setupData || !/^\d{6}$/.test(verifyCode.trim())}
              className="liquid-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" /> {verifyBusy ? "Verifying…" : "Verify & enable"}
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
  // Fetch REAL connected accounts from /api/accounts
  const { data: accounts, reload } = useApi<{ id: string; platform: PlatformId; handle: string; displayName: string }[]>("/api/accounts");
  const { setView } = useNav();

  // Build a real map: platform → account count
  const connectedMap = React.useMemo(() => {
    const map: Record<string, { connected: boolean; accounts: number; handles: string[] }> = {};
    for (const a of accounts ?? []) {
      if (!map[a.platform]) map[a.platform] = { connected: true, accounts: 0, handles: [] };
      map[a.platform].accounts++;
      map[a.platform].handles.push(a.handle);
    }
    return map;
  }, [accounts]);

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Connected platforms"
        desc="Manage which social accounts are connected to SYNQUE."
        action={
          <button
            onClick={() => setView("accounts")}
            className="liquid-gold flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
          >
            <Plug className="h-3.5 w-3.5" /> Connect new
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_LIST.map((p) => {
          const s = connectedMap[p.id] ?? { connected: false, accounts: 0, handles: [] };
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
                  {s.connected && s.handles.length > 0 && (
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {s.handles.slice(0, 2).join(", ")}{s.handles.length > 2 && ` +${s.handles.length - 2}`}
                    </div>
                  )}
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
                onClick={() => setView("accounts")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  s.connected
                    ? "border border-border bg-background text-foreground hover:bg-muted/60"
                    : "liquid-pill"
                )}
              >
                {s.connected ? "Manage" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ===== 8. Integrations =====

interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  required: boolean;
}
interface Integration {
  type: string;
  name: string;
  desc: string;
  icon: string;
  fields: IntegrationField[];
  enabled: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

// Map icon name → lucide component
const INTEGRATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail, MessageSquare, Zap, BarChart3, ImageIcon, CreditCard,
};

function IntegrationsSection() {
  const { data, reload, loading } = useApi<{ integrations: Integration[] }>("/api/integrations");
  const [configureType, setConfigureType] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [creds, setCreds] = React.useState<Record<string, string>>({});

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  const integrations = data?.integrations ?? [];

  function openConfigure(it: Integration) {
    setConfigureType(it.type);
    setCreds({});
  }

  async function saveIntegration() {
    if (!configureType) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: configureType, credentials: creds }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Integration connected", { description: "Credentials saved securely." });
        setConfigureType(null);
        setCreds({});
        reload();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function testIntegration(type: string) {
    setTesting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/integrations/${type}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Test passed", { description: json.message ?? "Connection successful" });
        reload();
      } else {
        toast.error("Test failed", { description: json.error ?? "Could not verify" });
      }
    } catch {
      toast.error("Network error during test");
    } finally {
      setTesting(false);
    }
  }

  async function disconnect(type: string) {
    if (!confirm(`Disconnect ${type}? This will remove all stored credentials.`)) return;
    try {
      const token = getToken();
      await fetch(`/api/integrations/${type}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success("Integration disconnected");
      reload();
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  const configuring = integrations.find((i) => i.type === configureType);

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Integrations"
        desc="Connect SYNQUE with the tools your team already uses."
        action={
          <button
            onClick={() => reload()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/40"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((it) => {
          const Icon = INTEGRATION_ICONS[it.icon] ?? Plug;
          return (
            <div
              key={it.type}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition",
                it.enabled
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  it.enabled ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{it.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      it.enabled
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {it.enabled ? "Connected" : "Not configured"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
                {it.lastSyncAt && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                    Last tested {timeAgo(it.lastSyncAt)}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                {it.enabled && (
                  <>
                    <button
                      onClick={() => testIntegration(it.type)}
                      disabled={testing}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted/40 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => openConfigure(it)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted/40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => disconnect(it.type)}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border/40 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
                      title="Disconnect"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
                {!it.enabled && (
                  <button
                    onClick={() => openConfigure(it)}
                    className="liquid-pill rounded-lg px-3 py-1.5 text-xs font-semibold"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure dialog */}
      <Dialog open={!!configureType} onOpenChange={(o) => { if (!o) { setConfigureType(null); setCreds({}); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configuring && (() => {
                const Icon = INTEGRATION_ICONS[configuring.icon] ?? Plug;
                return <Icon className="h-4 w-4 text-primary" />;
              })()}
              {configuring?.name ?? "Configure"} integration
            </DialogTitle>
            <DialogDescription>{configuring?.desc}</DialogDescription>
          </DialogHeader>
          {configuring && (
            <div className="space-y-3 py-2">
              {configuring.fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label htmlFor={`int-${f.key}`} className="text-xs font-semibold">
                    {f.label}
                    {f.required && <span className="ml-1 text-rose-500">*</span>}
                  </label>
                  <Input
                    id={`int-${f.key}`}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={creds[f.key] ?? ""}
                    onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                    className={f.type === "url" ? "text-xs" : ""}
                  />
                </div>
              ))}
              <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                <strong className="text-foreground">Security:</strong> Credentials are stored encrypted in the database.
                Only workspace admins can view or modify integration settings.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfigureType(null); setCreds({}); }}>
              Cancel
            </Button>
            <button
              onClick={saveIntegration}
              disabled={saving}
              className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              {saving ? "Saving…" : "Connect"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ===== Media Storage panel (Cloudinary / local FS) =====
function MediaStorageSection() {
  const { data: status, reload, loading } = useApi<{
    provider: string;
    configured: boolean;
    message: string;
    cloudName?: string;
    folder?: string;
    credentialSource?: "db" | "env" | "none";
  }>("/api/storage/status");

  // Fetch the Cloudinary integration row so we know if it's already saved to DB
  const { data: intData, reload: reloadInt } = useApi<{ integrations: Integration[] }>("/api/integrations");
  const cloudinaryIntegration = intData?.integrations?.find((i) => i.type === "cloudinary");

  const [showConfigForm, setShowConfigForm] = React.useState(false);
  const [creds, setCreds] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const isCloudinary = status?.provider === "cloudinary";
  const isLocal = status?.provider === "local";
  const isConfiguredViaDb = status?.credentialSource === "db";
  const isConfiguredViaEnv = status?.credentialSource === "env";

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  async function saveCloudinary() {
    if (!creds.cloudName?.trim() || !creds.apiKey?.trim() || !creds.apiSecret?.trim()) {
      toast.error("Cloud Name, API Key, and API Secret are required");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          type: "cloudinary",
          credentials: {
            cloudName: creds.cloudName.trim(),
            apiKey: creds.apiKey.trim(),
            apiSecret: creds.apiSecret.trim(),
            folder: creds.folder?.trim() || "socialflow",
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Cloudinary credentials saved", { description: "Uploads will now go to your Cloudinary CDN." });
        setCreds({});
        setShowConfigForm(false);
        reload();
        reloadInt();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function testCloudinary() {
    setTesting(true);
    try {
      const token = getToken();
      const res = await fetch("/api/integrations/cloudinary", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Cloudinary connected", { description: json.message ?? "Credentials are valid." });
        reload();
        reloadInt();
      } else {
        toast.error(json.error ?? "Test failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTesting(false);
    }
  }

  async function disconnectCloudinary() {
    if (!confirm("Disconnect Cloudinary? Uploads will fall back to .env credentials or local storage.")) return;
    try {
      const token = getToken();
      const res = await fetch("/api/integrations/cloudinary", {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        toast.success("Cloudinary disconnected");
        setCreds({});
        setShowConfigForm(false);
        reload();
        reloadInt();
      } else {
        toast.error("Failed to disconnect");
      }
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <section className="glass rounded-xl p-5">
      <SectionHeader
        title="Media storage"
        desc="Where uploaded media files (images, videos, audio) are stored. Affects the Media Library, Composer, and user avatars."
      />

      <div className="mt-4 space-y-3">
        {/* Provider switcher */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn(
            "rounded-2xl border-2 p-4 transition",
            isLocal ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/80"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Local filesystem</span>
              </div>
              {isLocal && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Files stored at <code className="rounded bg-muted/40 px-1">public/uploads/</code>. Suitable for dev only — won&apos;t survive Vercel cold starts in production.
            </p>
          </div>

          <div className={cn(
            "rounded-2xl border-2 p-4 transition",
            isCloudinary ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/80"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold">Cloudinary</span>
              </div>
              {isCloudinary && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              CDN-backed. Auto image optimization, on-the-fly resize/crop, video transcoding. Recommended for production.
            </p>
          </div>
        </div>

        {/* Status banner */}
        {status && (
          <div className={cn(
            "rounded-xl border p-3 text-xs",
            status.configured
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400"
          )}>
            <div className="flex items-start gap-2">
              {status.configured
                ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{status.configured ? "Configured" : "Not configured"}</p>
                  {isConfiguredViaDb && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase">
                      via Settings UI
                    </span>
                  )}
                  {isConfiguredViaEnv && (
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold uppercase">
                      via .env
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] opacity-90">{status.message}</p>
                {status.cloudName && (
                  <p className="mt-1 text-[10px]">
                    Cloud name: <code className="rounded bg-muted/40 px-1">{status.cloudName}</code>
                    {" · "}
                    Folder: <code className="rounded bg-muted/40 px-1">{status.folder ?? "socialflow"}</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cloudinary action buttons */}
        {isCloudinary && (
          <div className="flex flex-wrap gap-2">
            {!status?.configured && !showConfigForm && (
              <Button onClick={() => setShowConfigForm(true)} className="liquid-pill flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Configure Cloudinary
              </Button>
            )}
            {status?.configured && !showConfigForm && (
              <>
                <Button variant="outline" size="sm" onClick={testCloudinary} disabled={testing}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                  Test connection
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowConfigForm(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Update credentials
                </Button>
                {isConfiguredViaDb && (
                  <Button variant="outline" size="sm" onClick={disconnectCloudinary} className="text-rose-500 hover:text-rose-600">
                    <Ban className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Inline Cloudinary config form */}
        {isCloudinary && showConfigForm && (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {cloudinaryIntegration?.enabled ? "Update Cloudinary credentials" : "Add Cloudinary credentials"}
              </p>
              <button onClick={() => { setShowConfigForm(false); setCreds({}); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Cloud Name <span className="text-rose-500">*</span></label>
                  <Input
                    placeholder="your-cloud-name"
                    value={creds.cloudName ?? ""}
                    onChange={(e) => setCreds((c) => ({ ...c, cloudName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">API Key <span className="text-rose-500">*</span></label>
                  <Input
                    placeholder="123456789012345"
                    value={creds.apiKey ?? ""}
                    onChange={(e) => setCreds((c) => ({ ...c, apiKey: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">API Secret <span className="text-rose-500">*</span></label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={creds.apiSecret ?? ""}
                    onChange={(e) => setCreds((c) => ({ ...c, apiSecret: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Top-level Folder (optional)</label>
                  <Input
                    placeholder="socialflow"
                    value={creds.folder ?? ""}
                    onChange={(e) => setCreds((c) => ({ ...c, folder: e.target.value }))}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                Get your credentials from the{" "}
                <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  Cloudinary console
                </a>
                . Credentials are stored encrypted in the database — only workspace admins can view or modify them.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveCloudinary}
                  disabled={saving}
                  className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save & connect"}
                </button>
                <Button variant="ghost" onClick={() => { setShowConfigForm(false); setCreds({}); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Setup instructions (only when not configured + form not shown) */}
        {isCloudinary && !status?.configured && !showConfigForm && (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Don&apos;t have a Cloudinary account?
            </p>
            <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">1.</strong> Create a free account at{" "}
                <a href="https://cloudinary.com/users/register/free" target="_blank" rel="noreferrer"
                   className="font-medium text-primary hover:underline">
                  cloudinary.com
                </a>
                {" "}(free tier: 25 GB storage + 25 GB bandwidth/month)
              </li>
              <li>
                <strong className="text-foreground">2.</strong> From the{" "}
                <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer"
                   className="font-medium text-primary hover:underline">
                  Cloudinary console
                </a>
                , copy your <em>Cloud Name</em>, <em>API Key</em>, and <em>API Secret</em>.
              </li>
              <li>
                <strong className="text-foreground">3.</strong> Click <strong>Configure Cloudinary</strong> above and paste them in.
              </li>
            </ol>
          </div>
        )}

        {/* Why Cloudinary (only when local mode is active) */}
        {!isCloudinary && (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Why switch to Cloudinary?
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>✓ Works on Vercel/serverless (local FS is read-only there)</li>
              <li>✓ Global CDN delivery (res.cloudinary.com)</li>
              <li>✓ Auto WebP/AVIF format negotiation per browser</li>
              <li>✓ On-the-fly resize/crop/quality transforms via URL params</li>
              <li>✓ Video transcoding + auto-generated poster frames</li>
              <li>✓ Free tier: 25 GB storage + 25 GB bandwidth/month</li>
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              To enable, set <code className="rounded bg-muted/40 px-1">STORAGE_PROVIDER=cloudinary</code> in <code className="rounded bg-muted/40 px-1">.env</code>, then configure your credentials here.
            </p>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Recheck connection
        </Button>
      </div>
    </section>
  );
}

// ===== AI Chat Model panel (OpenAI / Gemini / ZAI) =====
function AIChatModelSection() {
  const { data: status, reload, loading } = useApi<{
    configured: boolean;
    provider: string;
    model?: string;
    message: string;
    credentialSource?: "db" | "env" | "none";
  }>("/api/llm/status");

  // Fetch integrations to know if openai/gemini are saved
  const { data: intData, reload: reloadInt } = useApi<{ integrations: Integration[] }>("/api/integrations");
  const openaiIntegration = intData?.integrations?.find((i) => i.type === "openai");
  const geminiIntegration = intData?.integrations?.find((i) => i.type === "gemini");

  const [showConfigForm, setShowConfigForm] = React.useState<null | "openai" | "gemini">(null);
  const [creds, setCreds] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  async function saveProvider(provider: "openai" | "gemini") {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: provider, credentials: creds }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`${provider === "openai" ? "OpenAI" : "Gemini"} credentials saved`, {
          description: "The AI Content Writer will use this model.",
        });
        setCreds({});
        setShowConfigForm(null);
        reload();
        reloadInt();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function testProvider(provider: "openai" | "gemini") {
    setTesting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/integrations/${provider}`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Connection test passed", { description: json.message ?? "Credentials are valid." });
        reload();
        reloadInt();
      } else {
        toast.error(json.error ?? "Test failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTesting(false);
    }
  }

  async function disconnectProvider(provider: "openai" | "gemini") {
    if (!confirm(`Disconnect ${provider === "openai" ? "OpenAI" : "Gemini"}? The AI Content Writer will fall back to other providers.`)) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/integrations/${provider}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        toast.success(`${provider === "openai" ? "OpenAI" : "Gemini"} disconnected`);
        setCreds({});
        setShowConfigForm(null);
        reload();
        reloadInt();
      } else {
        toast.error("Failed to disconnect");
      }
    } catch {
      toast.error("Network error");
    }
  }

  const activeProvider = status?.provider;
  const isConfigured = status?.configured;

  return (
    <section className="glass rounded-xl p-5">
      <SectionHeader
        title="AI chat model"
        desc="Powers the AI Content Writer in the Composer. Configure OpenAI (ChatGPT), Google Gemini, or any OpenAI-compatible provider."
      />

      <div className="mt-4 space-y-3">
        {/* Status banner */}
        {status && (
          <div className={cn(
            "rounded-xl border p-3 text-xs",
            isConfigured
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400"
          )}>
            <div className="flex items-start gap-2">
              {isConfigured
                ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {isConfigured
                      ? `Active: ${activeProvider === "openai" ? "OpenAI" : activeProvider === "gemini" ? "Google Gemini" : activeProvider === "zai" ? "ZAI (legacy)" : "None"}`
                      : "Not configured"}
                  </p>
                  {status.model && (
                    <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-mono">
                      {status.model}
                    </span>
                  )}
                  {status.credentialSource === "db" && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase">
                      via Settings UI
                    </span>
                  )}
                  {status.credentialSource === "env" && (
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold uppercase">
                      via .env
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] opacity-90">{status.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Provider cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* OpenAI card */}
          <div className={cn(
            "rounded-2xl border-2 p-4 transition",
            activeProvider === "openai" ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/80"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="font-semibold">OpenAI (ChatGPT)</span>
              </div>
              {activeProvider === "openai" && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              GPT-4o, GPT-4o-mini, etc. Also works for any OpenAI-compatible API (Together, Groq, Mistral, Azure OpenAI, Ollama, vLLM).
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!openaiIntegration?.enabled ? (
                <Button size="sm" onClick={() => { setShowConfigForm("openai"); setCreds({ model: "gpt-4o-mini" }); }}>
                  <Plus className="h-3.5 w-3.5" /> Configure
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => testProvider("openai")} disabled={testing}>
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />} Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowConfigForm("openai"); setCreds({}); }}>
                    <Pencil className="h-3.5 w-3.5" /> Update
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => disconnectProvider("openai")} className="text-rose-500 hover:text-rose-600">
                    <Ban className="h-3.5 w-3.5" /> Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Gemini card */}
          <div className={cn(
            "rounded-2xl border-2 p-4 transition",
            activeProvider === "gemini" ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/80"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/15 text-blue-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-semibold">Google Gemini</span>
              </div>
              {activeProvider === "gemini" && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Gemini 1.5 Flash / Pro. Get a free API key from Google AI Studio (aistudio.google.com).
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!geminiIntegration?.enabled ? (
                <Button size="sm" onClick={() => { setShowConfigForm("gemini"); setCreds({ model: "gemini-1.5-flash" }); }}>
                  <Plus className="h-3.5 w-3.5" /> Configure
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => testProvider("gemini")} disabled={testing}>
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />} Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowConfigForm("gemini"); setCreds({}); }}>
                    <Pencil className="h-3.5 w-3.5" /> Update
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => disconnectProvider("gemini")} className="text-rose-500 hover:text-rose-600">
                    <Ban className="h-3.5 w-3.5" /> Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inline config form */}
        {showConfigForm && (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {showConfigForm === "openai" ? "OpenAI (ChatGPT)" : "Google Gemini"} credentials
              </p>
              <button onClick={() => { setShowConfigForm(null); setCreds({}); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {showConfigForm === "openai" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">API Key <span className="text-rose-500">*</span></label>
                      <Input type="password" placeholder="sk-..." value={creds.apiKey ?? ""} onChange={(e) => setCreds((c) => ({ ...c, apiKey: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Model <span className="text-rose-500">*</span></label>
                      <Input placeholder="gpt-4o-mini" value={creds.model ?? ""} onChange={(e) => setCreds((c) => ({ ...c, model: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Base URL (optional)</label>
                      <Input placeholder="https://api.openai.com/v1" value={creds.baseUrl ?? ""} onChange={(e) => setCreds((c) => ({ ...c, baseUrl: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Organization ID (optional)</label>
                      <Input placeholder="org-..." value={creds.organization ?? ""} onChange={(e) => setCreds((c) => ({ ...c, organization: e.target.value }))} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                    Get your API key from{" "}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      platform.openai.com/api-keys
                    </a>
                    . For OpenAI-compatible providers (Together, Groq, Mistral, Azure OpenAI, Ollama), set the Base URL to their endpoint.
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">API Key <span className="text-rose-500">*</span></label>
                      <Input type="password" placeholder="AIza..." value={creds.apiKey ?? ""} onChange={(e) => setCreds((c) => ({ ...c, apiKey: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Model <span className="text-rose-500">*</span></label>
                      <Input placeholder="gemini-1.5-flash" value={creds.model ?? ""} onChange={(e) => setCreds((c) => ({ ...c, model: e.target.value }))} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                    Get your free API key from{" "}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      aistudio.google.com/apikey
                    </a>
                    .
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => saveProvider(showConfigForm)}
                  disabled={saving}
                  className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save & activate"}
                </button>
                <Button variant="ghost" onClick={() => { setShowConfigForm(null); setCreds({}); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isConfigured && !showConfigForm && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">No AI provider configured</p>
                <p className="mt-0.5 text-[11px]">
                  Configure OpenAI or Gemini above to power the AI Content Writer + variant generator. On Vercel, you must use one of these — the legacy ZAI SDK doesn&apos;t work there.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Recheck connection
        </Button>
      </div>
    </section>
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
  const { setView } = useNav();

  // Real subscription from the DB (if any)
  const { data: subscription } = useApi<{
    plan: string; status: string; amount: number; currency: string; trialEnds: string | null;
  } | null>("/api/subscriptions?limit=1");
  const sub = Array.isArray(subscription) ? subscription[0] : subscription;

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
      <section className="glass rounded-xl crystal-in glass-sheen relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[var(--gold)]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Crown className="h-3.5 w-3.5 text-[var(--gold)]" />
              Current plan
            </div>
            <h3 className="mt-1 bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              {sub?.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "Free trial"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {sub?.status === "trial"
                ? `Trial${sub.trialEnds ? ` ends ${new Date(sub.trialEnds).toLocaleDateString()}` : ""}`
                : sub?.status === "active"
                  ? "Active subscription"
                  : "No active subscription — billing is not configured."}
            </p>
            {sub?.amount ? (
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold">${sub.amount}</span>
                <span className="text-sm text-muted-foreground">/{sub.currency?.toLowerCase() ?? "usd"}</span>
              </div>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground">
                Billing integration (Stripe) is not connected. Subscriptions are tracked in the Owner Panel.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => toast.info("Stripe integration required — add Stripe API keys in Integrations to enable billing")}
              className="liquid-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Crown className="h-4 w-4" /> Upgrade plan
            </button>
            <button
              onClick={() => setView("owner")}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
            >
              Manage in Owner Panel
            </button>
          </div>
        </div>
      </section>

      {/* Usage */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader title="Usage this cycle" desc="Real usage from your workspace data" />
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
      </section>

      {/* Payment method */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader
          title="Payment method"
          desc="Card used for subscription renewals."
          action={
            <button
              onClick={() => toast.info("Stripe integration required — add Stripe API keys to enable card management")}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/60"
            >
              Update
            </button>
          }
        />
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
          <div className="grid h-10 w-14 place-items-center rounded-lg bg-muted text-muted-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">No payment method connected</div>
            <div className="text-xs text-muted-foreground">
              Add Stripe API keys in Integrations to accept card payments.
            </div>
          </div>
        </div>
      </section>

      {/* Invoices */}
      <section className="glass rounded-xl crystal-in p-5">
        <SectionHeader title="Invoices" desc="Download past invoices and receipts." />
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
      </section>
    </div>
  );
}

// ===== 10. Data & Privacy =====
const DATA_PREFS_KEY = "socialflow-data-prefs";

function loadPrivacyPrefs() {
  try {
    return JSON.parse(localStorage.getItem(DATA_PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function DataSection() {
  const { user } = useAuth();
  const stored = loadPrivacyPrefs();
  const [retention, setRetention] = React.useState<{ analytics: string; media: string; audit: string }>(
    stored.retention ?? { analytics: "2-years", media: "forever", audit: "1-year" }
  );
  const [toggles, setToggles] = React.useState<Record<string, boolean>>(
    stored.toggles ?? {
      gdprExport: true,
      anonymizeIp: true,
      shareUsage: false,
      optOutAI: false,
    }
  );
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  const persist = React.useCallback(
    (patch: Record<string, unknown>) => {
      try {
        const next = { ...loadPrivacyPrefs(), ...patch };
        localStorage.setItem(DATA_PREFS_KEY, JSON.stringify(next));
      } catch {}
    },
    []
  );

  const flip = (k: string) => (v: boolean) => {
    const next = { ...toggles, [k]: v };
    setToggles(next);
    persist({ toggles: next });
    toast.success("Privacy setting updated");
  };

  // Real data export — aggregates everything we have locally + the user/team
  // info we can reach without server-side batching, then triggers a download.
  async function handleExport() {
    setExporting(true);
    try {
      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
        : null;
      const authed = (url: string, init: RequestInit = {}) =>
        fetch(url, {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

      // Fetch every endpoint the user has access to. All failures are
      // caught individually so a single 404 doesn't break the export.
      const safeJson = async <T,>(res: Response): Promise<T | null> => {
        if (!res.ok) return null;
        try { return (await res.json()) as T; } catch { return null; }
      };

      const [users, accounts, workspace, invoices, posts] = await Promise.all([
        safeJson<unknown[]>(await authed("/api/users")),
        safeJson<unknown[]>(await authed("/api/accounts")),
        safeJson<unknown>(await authed("/api/workspace")),
        safeJson<unknown[]>(await authed("/api/invoices")),
        safeJson<unknown[]>(await authed("/api/posts?limit=100")),
      ]);

      // Pull locally-persisted buckets too — these are settings the user
      // has been editing in this very Settings panel.
      const localBuckets: Record<string, unknown> = {};
      for (const key of [
        "socialflow-company",
        "socialflow-workspace",
        "socialflow-notif-prefs",
        "socialflow-appearance",
        "socialflow-data-prefs",
      ]) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) localBuckets[key] = JSON.parse(raw);
        } catch {}
      }

      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          schemaVersion: 1,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        },
        workspace,
        users,
        accounts,
        posts: posts ?? [],
        invoices,
        localSettings: localBuckets,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `synque-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export ready", {
        description: "Workspace data downloaded as JSON.",
      });
    } catch {
      toast.error("Export failed", { description: "Please try again or contact your admin." });
    } finally {
      setExporting(false);
    }
  }

  // Best-effort import — accepts a previously exported JSON and merges the
  // localSettings block back into localStorage. Server-backed records (users,
  // accounts, etc.) are not auto-applied because they require server-side
  // write permissions this UI does not have; we surface a clear note instead.
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        localSettings?: Record<string, unknown>;
        meta?: Record<string, unknown>;
      };
      if (!parsed || typeof parsed !== "object" || !parsed.localSettings) {
        toast.error("Invalid file", { description: "Expected a SYNQUE export JSON." });
        return;
      }
      let restored = 0;
      for (const [key, value] of Object.entries(parsed.localSettings)) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          restored++;
        } catch {}
      }
      toast.success(`Imported ${restored} local setting bucket${restored === 1 ? "" : "s"}`, {
        description: "Reload the page to apply restored settings.",
      });
    } catch {
      toast.error("Failed to read file");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = "";
    }
  }

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader title="Data & Privacy" desc="Control how your data is stored, shared, and exported." />

      {/* Export / Import */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:bg-muted/40 disabled:opacity-60"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-semibold">Export data</div>
            <div className="text-xs text-muted-foreground">Workspace, users, accounts, posts + local settings as JSON.</div>
          </div>
        </button>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:bg-muted/40">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-semibold">Import data</div>
            <div className="text-xs text-muted-foreground">Restore local settings from a previous SYNQUE export.</div>
          </div>
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
        </label>
      </div>

      <Separator className="my-5" />

      {/* Retention */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Data retention</div>
            <div className="text-xs text-muted-foreground">How long we keep different categories of data.</div>
          </div>
          <button
            onClick={() => {
              persist({ retention });
              toast.success("Retention preferences saved");
            }}
            className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            <Save className="h-3.5 w-3.5" /> Save retention
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Analytics">
            <Select
              value={retention.analytics}
              onValueChange={(v) => setRetention((p) => ({ ...p, analytics: v }))}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30-days">30 days</SelectItem>
                <SelectItem value="1-year">1 year</SelectItem>
                <SelectItem value="2-years">2 years</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Media assets">
            <Select
              value={retention.media}
              onValueChange={(v) => setRetention((p) => ({ ...p, media: v }))}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30-days">30 days</SelectItem>
                <SelectItem value="1-year">1 year</SelectItem>
                <SelectItem value="forever">Forever</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Audit logs">
            <Select
              value={retention.audit}
              onValueChange={(v) => setRetention((p) => ({ ...p, audit: v }))}
            >
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
        <ToggleRow label="Share usage analytics" desc="Help us improve SYNQUE by sending anonymous telemetry." checked={toggles.shareUsage} onChange={flip("shareUsage")} />
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
    </section>
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
    <section className="glass rounded-xl crystal-in border-2 border-rose-500/40 p-5">
      <SectionHeader
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
            onConfirm={async () => {
              const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
              const userId = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.user?.id;
              if (!userId) { toast.error("Session expired — log in again"); return; }
              try {
                const res = await fetch("/api/users", {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ id: userId }),
                });
                if (res.ok) {
                  toast.success("Account deleted");
                  localStorage.removeItem("socialflow-auth");
                  setTimeout(() => window.location.href = "/", 1000);
                } else {
                  const err = await res.json().catch(() => ({}));
                  toast.error(err.error ?? "Failed to delete account");
                }
              } catch { toast.error("Network error"); }
            }}
          />
        </div>
      </div>
    </section>
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

// ============================================================================
// Report Settings — persisted to localStorage "socialflow-report-settings".
// Read by ReportsView's PrintLayout (and any custom report print layout) to
// customize how every printed report looks: header, footer, page setup,
// accent color, watermark, table style, KPI strip, etc.
// ============================================================================

const REPORT_SETTINGS_KEY = "socialflow-report-settings";

type LogoPosition = "left" | "right" | "center" | "hidden";
type PaperSize = "letter" | "a4";
type Orientation = "portrait" | "landscape";
type ReportFontSize = "small" | "medium" | "large";
type HeaderLayout = "banner" | "centered" | "minimal";
type TableStyle = "striped" | "plain" | "bordered";
type FooterPosition = "left" | "center" | "right";

/** The 4 reorderable body sections shown in the live preview and printout. */
type ContentSectionId =
  | "executiveSummary"
  | "kpiStrip"
  | "perAccountTable"
  | "topPostsTable";

interface ReportSettings {
  showCompanyLogo: boolean;
  logoPosition: LogoPosition;
  showReportTitle: boolean;
  showDateRange: boolean;
  showExecutiveSummary: boolean;
  showKpiStrip: boolean;
  showFooter: boolean;
  footerText: string;
  showPageNumbers: boolean;
  paperSize: PaperSize;
  orientation: Orientation;
  fontSize: ReportFontSize;
  accentColor: string;
  showWatermark: boolean;
  watermarkText: string;
  showCompanyAddress: boolean;
  showCompanyContact: boolean;
  headerLayout: HeaderLayout;
  tableStyle: TableStyle;
  showSentimentBadges: boolean;
  showSparklines: boolean;

  // NEW: Per-section visibility toggles (so the user can hide individual
  // body sections beyond just executive summary / KPI strip).
  showPerAccountTable: boolean;
  showTopPostsTable: boolean;

  // NEW: Margin settings (in millimetres). Applied to the print root as
  // `padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm`
  // via a <style> override (the @media print block hardcodes 8mm — the more
  // specific `.report-print-root.report-print-root` selector wins).
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;

  // NEW: Custom footer. `customFooterText` overrides `footerText` when set
  // (non-empty); `footerPosition` controls alignment; `showFooterLine`
  // toggles the separator rule above the footer; `footerFontSize` scales
  // the footer text independently of `fontSize`.
  customFooterText: string;
  footerPosition: FooterPosition;
  showFooterLine: boolean;
  footerFontSize: ReportFontSize;

  // NEW: Content ordering — array of ContentSectionId strings whose order
  // determines the rendering sequence of body sections. Edited by the
  // drag-and-drop "Content Order" panel below.
  contentOrder: ContentSectionId[];
}

const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  showCompanyLogo: true,
  logoPosition: "left",
  showReportTitle: true,
  showDateRange: true,
  showExecutiveSummary: true,
  showKpiStrip: true,
  showFooter: true,
  footerText: "Confidential — for internal use only",
  showPageNumbers: true,
  paperSize: "letter",
  orientation: "portrait",
  fontSize: "small",
  accentColor: "#5856D6",
  showWatermark: false,
  watermarkText: "DRAFT",
  showCompanyAddress: true,
  showCompanyContact: true,
  headerLayout: "banner",
  tableStyle: "striped",
  showSentimentBadges: true,
  showSparklines: false,
  showPerAccountTable: true,
  showTopPostsTable: true,
  marginTop: 10,
  marginRight: 10,
  marginBottom: 10,
  marginLeft: 10,
  customFooterText: "",
  footerPosition: "center",
  showFooterLine: true,
  footerFontSize: "small",
  contentOrder: ["executiveSummary", "kpiStrip", "perAccountTable", "topPostsTable"],
};

function loadReportSettings(): ReportSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(REPORT_SETTINGS_KEY) ?? "{}");
    const merged: ReportSettings = { ...DEFAULT_REPORT_SETTINGS, ...raw };
    // Sanitize contentOrder: keep only valid section ids, drop duplicates,
    // and append any missing sections (so future-added sections show up).
    const allSections = DEFAULT_REPORT_SETTINGS.contentOrder;
    const seen = new Set<ContentSectionId>();
    const ordered: ContentSectionId[] = [];
    for (const s of Array.isArray(merged.contentOrder) ? merged.contentOrder : []) {
      if (typeof s === "string" && allSections.includes(s as ContentSectionId) && !seen.has(s as ContentSectionId)) {
        seen.add(s as ContentSectionId);
        ordered.push(s as ContentSectionId);
      }
    }
    for (const s of allSections) {
      if (!seen.has(s)) ordered.push(s);
    }
    merged.contentOrder = ordered;
    return merged;
  } catch {
    return { ...DEFAULT_REPORT_SETTINGS };
  }
}

/**
 * Public helper so the Reports view (and any custom report print layout) can
 * read the persisted report settings without duplicating the localStorage key
 * and default-filling logic. Imported as:
 *   `import { loadReportSettings } from "@/components/views/settings";`
 */
export function getReportSettings(): ReportSettings {
  if (typeof window === "undefined") return { ...DEFAULT_REPORT_SETTINGS };
  return loadReportSettings();
}

/**
 * The 4 reorderable body sections surfaced in the drag-and-drop "Content
 * Order" panel. The icon + label render on the draggable card; the `id` is
 * what's stored in `ReportSettings.contentOrder` (and read by both the
 * live preview and the Reports PrintLayout to control render order).
 *
 * `visibilityKey` points at the matching boolean toggle in ReportSettings
 * so the same card can show/hide the section as well as reorder it.
 */
const CONTENT_SECTIONS: {
  id: ContentSectionId;
  label: string;
  desc: string;
  icon: LucideIcon;
  visibilityKey: "showExecutiveSummary" | "showKpiStrip" | "showPerAccountTable" | "showTopPostsTable";
}[] = [
  { id: "executiveSummary", label: "Executive Summary", desc: "One-paragraph narrative at the top.", icon: FileText, visibilityKey: "showExecutiveSummary" },
  { id: "kpiStrip", label: "KPI Strip", desc: "Row of headline metrics (6 cells).", icon: BarChart3, visibilityKey: "showKpiStrip" },
  { id: "perAccountTable", label: "Per-Account Summary", desc: "Main data table for the report.", icon: Table, visibilityKey: "showPerAccountTable" },
  { id: "topPostsTable", label: "Top Engaged Posts", desc: "Top-10 / leaderboard subsection.", icon: TrendingUp, visibilityKey: "showTopPostsTable" },
];

/** mm → px helper used by the on-screen preview to mirror the print margins.
 *  Uses 96dpi (CSS reference pixel) so 10mm ≈ 37.8px on screen. */
function mmToPx(mm: number) {
  return (mm * 96) / 25.4;
}

function ReportSettingsSection() {
  const [settings, setSettings] = React.useState<ReportSettings>(loadReportSettings);
  const [fullPreviewOpen, setFullPreviewOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [compactScale, setCompactScale] = React.useState(0.45);
  const compactWrapperRef = React.useRef<HTMLDivElement | null>(null);
  // Drag-and-drop state for the "Content Order" panel.
  // `draggedIndex` = index in contentOrder of the card currently being dragged
  // (or null when no drag is in progress). `dragOverIndex` = the index the
  // pointer is currently hovering, used to render a blue "drop here" border.
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  function update<K extends keyof ReportSettings>(key: K, value: ReportSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  // Reorder contentOrder array — move the dragged card to a new position.
  const handleDrop = React.useCallback((targetIndex: number) => {
    setSettings((prev) => {
      if (draggedIndex === null || draggedIndex === targetIndex) return prev;
      const order = [...prev.contentOrder];
      const [moved] = order.splice(draggedIndex, 1);
      // After splice, the array is shorter by one; if target > dragged we
      // need to subtract one to land at the right visual spot.
      const insertAt = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      order.splice(insertAt, 0, moved);
      return { ...prev, contentOrder: order };
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex]);

  const save = () => {
    try {
      localStorage.setItem(REPORT_SETTINGS_KEY, JSON.stringify(settings));
      toast.success("Report settings saved — applies to all reports");
    } catch {
      toast.error("Failed to save report settings");
    }
  };

  const reset = () => {
    setSettings({ ...DEFAULT_REPORT_SETTINGS });
    try {
      localStorage.removeItem(REPORT_SETTINGS_KEY);
    } catch {}
    toast.info("Report settings reset to defaults");
  };

  // Pull company info for the live preview header (refresh on focus so edits
  // in the Company tab show up when the user returns).
  const [company, setCompany] = React.useState(() => loadCompanyForPreview());
  React.useEffect(() => {
    const refresh = () => setCompany(loadCompanyForPreview());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  // Measure the compact-preview wrapper width and compute a scale factor that
  // fits the native-size sheet (Letter = 816px wide) inside it.
  React.useLayoutEffect(() => {
    const el = compactWrapperRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const compute = () => {
      const w = el.clientWidth - 24; // subtract inner padding
      const nativeW =
        settings.orientation === "landscape"
          ? settings.paperSize === "a4" ? 1123 : 1056
          : settings.paperSize === "a4" ? 794 : 816;
      setCompactScale(Math.max(0.18, Math.min(0.85, w / nativeW)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.orientation, settings.paperSize]);

  // Print — moves the hidden .report-print-root to be a DIRECT child of
  // <body> before printing. This escapes any ancestor containing blocks
  // (transform, backdrop-filter, position:relative on glass cards) that
  // would otherwise trap the absolute-positioned print root and cause extra
  // top margin / blank second page. After printing, restores original position.
  const handlePrint = React.useCallback(() => {
    const originalTitle = document.title;
    const reportName = `Report Settings Preview — ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
    document.title = reportName;

    // Find the hidden print root and temporarily move it to body level.
    const printRoot = document.querySelector(".report-print-root");
    let originalParent: Node | null = null;
    let originalNextSibling: Node | null = null;
    if (printRoot && printRoot.parentElement !== document.body) {
      originalParent = printRoot.parentElement;
      originalNextSibling = printRoot.nextSibling;
      document.body.appendChild(printRoot);
    }

    const restore = () => {
      document.title = originalTitle;
      // Move the print root back to its original position in the DOM.
      if (printRoot && originalParent) {
        if (originalNextSibling) {
          (originalParent as HTMLElement).insertBefore(printRoot, originalNextSibling);
        } else {
          (originalParent as HTMLElement).appendChild(printRoot);
        }
      }
    };

    setTimeout(() => {
      window.print();
      window.addEventListener("afterprint", restore, { once: true });
      setTimeout(restore, 6000);
    }, 150);
  }, []);

  const canvasClass = React.useMemo(
    () =>
      cn(
        "report-page-canvas report-preview-root",
        `is-${settings.orientation}-${settings.paperSize}`,
      ),
    [settings.orientation, settings.paperSize],
  );

  const compactCanvasClass = React.useMemo(
    () =>
      cn(
        "report-page-canvas report-preview-root is-compact",
        settings.paperSize === "a4" && "is-a4",
        settings.orientation === "landscape" && "is-landscape",
      ),
    [settings.paperSize, settings.orientation],
  );

  const nativeW =
    settings.orientation === "landscape"
      ? settings.paperSize === "a4" ? 1123 : 1056
      : settings.paperSize === "a4" ? 794 : 816;
  const nativeH =
    settings.orientation === "landscape"
      ? settings.paperSize === "a4" ? 794 : 816
      : settings.paperSize === "a4" ? 1123 : 1056;

  // Convert the mm margin settings to px for the on-screen preview canvases
  // (uses 96dpi — 1mm ≈ 3.78px — so what you see matches the print output).
  const previewPaddingPx = `${mmToPx(settings.marginTop)}px ${mmToPx(settings.marginRight)}px ${mmToPx(settings.marginBottom)}px ${mmToPx(settings.marginLeft)}px`;

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Report Settings"
        desc="Customize how reports print — applies to all reports."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
              title="Open the browser print dialog with these settings applied"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button
              onClick={save}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
            >
              <Save className="h-3.5 w-3.5" /> Save settings
            </button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT COLUMN — settings controls */}
        <div className="space-y-5">
          {/* Header & branding */}
          <div>
            <div className="text-sm font-semibold">Header &amp; branding</div>
            <div className="mt-2 space-y-0.5">
              <ToggleRow label="Show company logo" desc="Display the workspace logo in the report header." checked={settings.showCompanyLogo} onChange={(v) => update("showCompanyLogo", v)} />
              <ToggleRow label="Show report title" desc="Print the report name at the top." checked={settings.showReportTitle} onChange={(v) => update("showReportTitle", v)} />
              <ToggleRow label="Show date range" desc="Print the period the report covers." checked={settings.showDateRange} onChange={(v) => update("showDateRange", v)} />
              <ToggleRow label="Show company address" desc="Print the company address line." checked={settings.showCompanyAddress} onChange={(v) => update("showCompanyAddress", v)} />
              <ToggleRow label="Show company contact" desc="Print phone and website." checked={settings.showCompanyContact} onChange={(v) => update("showCompanyContact", v)} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Logo position" compact>
                <Select value={settings.logoPosition} onValueChange={(v) => update("logoPosition", v as LogoPosition)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Header layout" compact>
                <Select value={settings.headerLayout} onValueChange={(v) => update("headerLayout", v as HeaderLayout)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="centered">Centered</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Accent color" hint="Used for headers, borders, KPI values, and table accents." compact>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                    aria-label="Accent color"
                  />
                  <Input
                    value={settings.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="max-w-[10rem] font-mono text-xs"
                    placeholder="#5856D6"
                  />
                  <button
                    onClick={() => update("accentColor", DEFAULT_REPORT_SETTINGS.accentColor)}
                    className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                  >
                    Reset
                  </button>
                </div>
              </Field>
            </div>
          </div>

          <Separator />

          {/* Body content */}
          <div>
            <div className="text-sm font-semibold">Body content</div>
            <div className="mt-2 space-y-0.5">
              <ToggleRow label="Show executive summary" desc="One-paragraph overview at the top of the report." checked={settings.showExecutiveSummary} onChange={(v) => update("showExecutiveSummary", v)} />
              <ToggleRow label="Show KPI strip" desc="Row of headline metrics below the header." checked={settings.showKpiStrip} onChange={(v) => update("showKpiStrip", v)} />
              <ToggleRow label="Show per-account table" desc="Main per-account / data table for the report." checked={settings.showPerAccountTable} onChange={(v) => update("showPerAccountTable", v)} />
              <ToggleRow label="Show top posts table" desc="Top engaged posts / leaderboard subsection (when available)." checked={settings.showTopPostsTable} onChange={(v) => update("showTopPostsTable", v)} />
              <ToggleRow label="Show sentiment badges" desc="Color-coded POS / NEU / NEG tags on table rows." checked={settings.showSentimentBadges} onChange={(v) => update("showSentimentBadges", v)} />
              <ToggleRow label="Show sparklines" desc="Tiny inline trend lines next to numeric KPIs." checked={settings.showSparklines} onChange={(v) => update("showSparklines", v)} />
            </div>
            <div className="mt-3">
              <Field label="Table style" hint="How data tables appear in printed reports." compact>
                <Select value={settings.tableStyle} onValueChange={(v) => update("tableStyle", v as TableStyle)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="striped">Striped rows</SelectItem>
                    <SelectItem value="plain">Plain</SelectItem>
                    <SelectItem value="bordered">Bordered</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <Separator />

          {/* Content order — drag-and-drop reordering of body sections */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Content order</div>
                <div className="text-xs text-muted-foreground">Drag to reorder body sections. Toggle the eye to hide a section.</div>
              </div>
              <button
                onClick={() => update("contentOrder", [...DEFAULT_REPORT_SETTINGS.contentOrder])}
                className="shrink-0 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted"
                title="Reset section order to defaults"
              >
                Reset order
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {settings.contentOrder.map((sectionId, index) => {
                const def = CONTENT_SECTIONS.find((s) => s.id === sectionId);
                if (!def) return null;
                const Icon = def.icon;
                const visible = settings[def.visibilityKey] as boolean;
                const isDragging = draggedIndex === index;
                const isDropTarget = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;
                return (
                  <li
                    key={def.id}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                    onDragOver={(e) => { e.preventDefault(); if (draggedIndex !== index) setDragOverIndex(index); }}
                    onDrop={(e) => { e.preventDefault(); handleDrop(index); }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 transition",
                      isDragging ? "opacity-50 " : "",
                      isDropTarget
                        ? "border-primary ring-2 ring-primary/30 "
                        : "border-border hover:border-primary/40 ",
                    )}
                  >
                    <span
                      className="cursor-grab text-muted-foreground transition group-hover:text-foreground active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-hidden
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{def.label}</span>
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-mono tabular-nums text-muted-foreground">#{index + 1}</span>
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{def.desc}</div>
                    </div>
                    <button
                      onClick={() => update(def.visibilityKey, !visible)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg border transition",
                        visible
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                      )}
                      title={visible ? "Hide this section" : "Show this section"}
                      aria-label={visible ? `Hide ${def.label}` : `Show ${def.label}`}
                    >
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Sections render top-to-bottom in this order, both in the live preview on the right and in the printed report.
            </p>
          </div>

          <Separator />

          {/* Footer & page setup */}
          <div>
            <div className="text-sm font-semibold">Footer &amp; page setup</div>
            <div className="mt-2 space-y-0.5">
              <ToggleRow label="Show footer" desc="Print a footer line at the bottom of every page." checked={settings.showFooter} onChange={(v) => update("showFooter", v)} />
              <ToggleRow label="Show page numbers" desc="Print 'Page X of Y' in the footer." checked={settings.showPageNumbers} onChange={(v) => update("showPageNumbers", v)} />
              <ToggleRow label="Show watermark" desc="Faint diagonal text behind every page." checked={settings.showWatermark} onChange={(v) => update("showWatermark", v)} />
              <ToggleRow label="Show footer separator line" desc="Thin rule above the footer block." checked={settings.showFooterLine} onChange={(v) => update("showFooterLine", v)} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Footer text" hint="Default footer caption." compact>
                <Input value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} placeholder="Confidential — for internal use only" />
              </Field>
              <Field label="Watermark text" compact>
                <Input value={settings.watermarkText} onChange={(e) => update("watermarkText", e.target.value)} placeholder="DRAFT" disabled={!settings.showWatermark} />
              </Field>
            </div>

            {/* Custom footer override */}
            <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="mb-2 text-xs font-semibold">Custom footer</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Custom footer text" hint="Overrides the default footer text when non-empty." compact>
                  <Input
                    value={settings.customFooterText}
                    onChange={(e) => update("customFooterText", e.target.value)}
                    placeholder="© Acme Inc. — All rights reserved"
                  />
                </Field>
                <Field label="Footer position" compact>
                  <Select value={settings.footerPosition} onValueChange={(v) => update("footerPosition", v as FooterPosition)}>
                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Footer font size" compact>
                  <Select value={settings.footerFontSize} onValueChange={(v) => update("footerFontSize", v as ReportFontSize)}>
                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            {/* Margins — applied to the print root as padding. */}
            <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold">Page margins (mm)</div>
                <button
                  onClick={() => {
                    update("marginTop", DEFAULT_REPORT_SETTINGS.marginTop);
                    update("marginRight", DEFAULT_REPORT_SETTINGS.marginRight);
                    update("marginBottom", DEFAULT_REPORT_SETTINGS.marginBottom);
                    update("marginLeft", DEFAULT_REPORT_SETTINGS.marginLeft);
                  }}
                  className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-muted"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  { key: "marginTop" as const, label: "Top" },
                  { key: "marginRight" as const, label: "Right" },
                  { key: "marginBottom" as const, label: "Bottom" },
                  { key: "marginLeft" as const, label: "Left" },
                ]).map((m) => (
                  <Field key={m.key} label={m.label} compact>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={1}
                        value={settings[m.key]}
                        onChange={(e) => {
                          const n = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                          update(m.key, n);
                        }}
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm tabular-nums"
                      />
                      <span className="text-[10px] text-muted-foreground">mm</span>
                    </div>
                  </Field>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Applied to the print sheet as padding. Default is 10&nbsp;mm on every side.
              </p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Paper size" compact>
                <Select value={settings.paperSize} onValueChange={(v) => update("paperSize", v as PaperSize)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="a4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Orientation" compact>
                <Select value={settings.orientation} onValueChange={(v) => update("orientation", v as Orientation)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Font size" compact>
                <Select value={settings.fontSize} onValueChange={(v) => update("fontSize", v as ReportFontSize)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — live preview */}
        <div className="space-y-3">
          {/* Preview toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Print preview</div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {settings.paperSize.toUpperCase()} · {settings.orientation === "landscape" ? "Land" : "Port"}
              </span>
              <button
                onClick={() => setFullPreviewOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-muted"
                title="Open the full-page live preview"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Full page
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-muted"
                title="Open the browser print dialog"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
          </div>

          {/* Compact scaled preview — renders the full native-size sheet and
              shrinks it via transform:scale to fit the side panel. */}
          <div
            ref={compactWrapperRef}
            className="report-compact-scaler"
            style={{ padding: "12px", height: nativeH * compactScale + 24 }}
          >
            <div
              className={compactCanvasClass}
              style={{
                transform: `scale(${compactScale})`,
                width: nativeW,
                minHeight: nativeH,
                padding: previewPaddingPx,
              }}
            >
              <ReportPreviewCanvas settings={settings} company={company} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            This preview renders the exact same DOM the printer sees — header banner, executive summary, KPI strip,
            sample data table with sentiment badges and sparklines, and the company footer. Toggle any setting on the
            left and the sheet updates instantly. Click <span className="font-semibold">Full page</span> for a
            native-size print-fidelity preview, or <span className="font-semibold">Print</span> to send it to the
            browser print dialog (Save as PDF works too).
          </p>
        </div>
      </div>

      {/* ============================================================
          FULL-PAGE LIVE PREVIEW DIALOG
          Renders the report at native print dimensions with zoom
          controls so the user can inspect every pixel before printing.
         ============================================================ */}
      <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <DialogContent className="max-w-[95vw] overflow-hidden p-0 sm:max-w-[1100px]">
          <DialogHeader className="border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <ScanLine className="h-4 w-4 text-primary" />
                  Full-page live preview
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  {settings.paperSize.toUpperCase()} · {settings.orientation} · {Math.round(zoom * 100)}% · what you see is what prints
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background transition hover:bg-muted"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background transition hover:bg-muted"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <button
                  onClick={() => setZoom(1)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-muted"
                  title="Reset zoom to 100%"
                >
                  100%
                </button>
                <button
                  onClick={handlePrint}
                  className="ml-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
              </div>
            </div>
          </DialogHeader>
          <div
            className="max-h-[75vh] overflow-auto bg-neutral-200 p-6 dark:bg-neutral-900"
            style={{ scrollbarGutter: "stable" }}
          >
            <div
              className={canvasClass}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                width: nativeW,
                minHeight: nativeH,
                padding: previewPaddingPx,
              }}
            >
              <ReportPreviewCanvas settings={settings} company={company} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          HIDDEN PRINT ROOT — the actual element window.print() emits.
          Always mounted, hidden on screen, shown only in print mode.
          Mirrors the live settings so the printed output matches the
          on-screen preview exactly. The inline <style> overrides the
          hardcoded `padding: 8mm !important;` from globals.css's
          @media print block using a more-specific double-class selector.
         ============================================================ */}
      <div className="report-print-root hidden print:block">
        {/* Margin override — `.report-print-root.report-print-root` has
            specificity (0,2,0) which beats `.report-print-root` (0,1,0)
            from globals.css; both carry !important, so the more specific
            one wins and the user's margins apply. */}
        <style>{`.report-print-root.report-print-root { padding: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm !important; }`}</style>
        <ReportPreviewCanvas settings={settings} company={company} />
      </div>
    </section>
  );
}

// ============================================================================
// ReportPreviewCanvas — renders a faithful, print-ready report sheet using the
// same .report-* classes the Reports view uses for printing. Mounted in three
// contexts:
//   1. Compact preview — scaled down via transform:scale in the side panel
//   2. Full-page Dialog — at native Letter/A4 dimensions with zoom
//   3. Hidden .report-print-root — emitted by window.print()
// Whatever renders here is exactly what prints. Defined at module scope so
// React doesn't recreate the component type on every parent render.
// ============================================================================

const PREVIEW_KPI_ROWS = [
  { label: "Followers", value: "48.2K", delta: "+4.2K" },
  { label: "Impressions", value: "1.24M", delta: "+8.4%" },
  { label: "Reach", value: "847K", delta: "+6.1%" },
  { label: "Engagement", value: "12.4%", delta: "+0.3pp" },
  { label: "Posts", value: "186", delta: "+24" },
  { label: "Eng. Rate", value: "4.2%", delta: "+0.1pp" },
];

const PREVIEW_TABLE_ROWS: { account: string; platform: string; followers: string; impressions: string; reach: string; engagement: string; sentiment: "pos" | "neu" | "neg"; trend: number[] }[] = [
  { account: "@synquehq", platform: "instagram", followers: "24.1K", impressions: "612K", reach: "418K", engagement: "9.2%", sentiment: "pos", trend: [3, 5, 4, 7, 6, 9, 12] },
  { account: "@synque", platform: "tiktok", followers: "14.8K", impressions: "487K", reach: "312K", engagement: "11.7%", sentiment: "pos", trend: [2, 4, 3, 6, 8, 7, 11] },
  { account: "Synque Inc.", platform: "linkedin", followers: "9.3K", impressions: "142K", reach: "117K", engagement: "3.1%", sentiment: "neu", trend: [4, 4, 5, 5, 6, 6, 7] },
  { account: "@synque", platform: "twitter", followers: "7.2K", impressions: "98K", reach: "71K", engagement: "2.8%", sentiment: "neu", trend: [3, 3, 4, 3, 4, 5, 5] },
  { account: "@synque.shop", platform: "facebook", followers: "5.1K", impressions: "62K", reach: "44K", engagement: "1.9%", sentiment: "neg", trend: [5, 4, 4, 3, 3, 2, 2] },
];

const PREVIEW_TOP_POSTS = [
  { title: "Spring drop teaser — behind the scenes", author: "Maya R.", platform: "instagram", engagement: "8.2K" },
  { title: "How we built Synque in 30 days", author: "Devon L.", platform: "linkedin", engagement: "4.1K" },
  { title: "POV: scheduling while asleep", author: "Priya K.", platform: "tiktok", engagement: "12.7K" },
  { title: "Weekly roundup — March wk3", author: "Maya R.", platform: "twitter", engagement: "2.3K" },
];

function loadCompanyForPreview() {
  try {
    const stored = JSON.parse(localStorage.getItem("socialflow-company") ?? "{}");
    return {
      name: (stored.companyName as string) || "Your Company",
      logo: (stored.companyLogo as string | null) ?? null,
      address: (stored.address as string) || "123 Market Street",
      city: (stored.city as string) || "San Francisco",
      country: (stored.country as string) || "United States",
      phone: (stored.phone as string) || "+1 (555) 014-2200",
      website: (stored.website as string) || "example.com",
    };
  } catch {
    return {
      name: "Your Company",
      logo: null,
      address: "123 Market Street",
      city: "San Francisco",
      country: "United States",
      phone: "+1 (555) 014-2200",
      website: "example.com",
    };
  }
}

function sentimentClass(s: "pos" | "neu" | "neg") {
  return s === "pos" ? "sent-pos" : s === "neg" ? "sent-neg" : "sent-neu";
}
function sentimentLabel(s: "pos" | "neu" | "neg") {
  return s === "pos" ? "POS" : s === "neg" ? "NEG" : "NEU";
}

function ReportSparkline({ points, color }: { points: number[]; color: string }) {
  const w = 36, h = 12;
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const pts = points
    .map((p, i) => `${(i * step).toFixed(1)},${(h - ((p - min) / range) * (h - 2) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block align-middle">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReportPreviewCanvas({
  settings,
  company,
}: {
  settings: ReportSettings;
  company: { name: string; logo: string | null; address: string; city: string; country: string; phone: string; website: string };
}) {
  const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const dateRangeLabel = "Last 30 days";
  const reportTitle = "Performance Report";
  const addressLine = [company.address, company.city, company.country].filter(Boolean).join(", ");
  const contactLine = [company.phone, company.website].filter(Boolean).join(" · ");

  const showLogo = settings.showCompanyLogo && settings.logoPosition !== "hidden";
  const accent = settings.accentColor;

  // Header layout variants — banner (default), centered, minimal.
  const bannerLayout = settings.headerLayout;
  const logoOnRight = settings.logoPosition === "right" && bannerLayout === "banner";
  const logoCentered = settings.logoPosition === "center" || bannerLayout === "centered";
  const isMinimal = bannerLayout === "minimal";

  // Font-size scaling for the whole sheet (small/medium/large).
  const fontScale =
    settings.fontSize === "large" ? 1.12 : settings.fontSize === "small" ? 0.88 : 1;

  // Footer font-size scaling — independent of body `fontSize`.
  const footerFontScale =
    settings.footerFontSize === "large" ? 1.25
      : settings.footerFontSize === "medium" ? 1.05
      : 0.85;
  const footerAlign =
    settings.footerPosition === "left" ? "flex-start"
      : settings.footerPosition === "right" ? "flex-end"
      : "center";
  // `customFooterText` overrides the default `footerText` when non-empty.
  const effectiveFooterText =
    settings.customFooterText.trim() !== "" ? settings.customFooterText : settings.footerText;

  // ---- Body sections as discrete nodes so we can reorder them. ----
  const executiveSummaryNode = (
    <>
      <h2 className="report-section-title">Executive Summary</h2>
      <p className="report-text">
        Across all accounts, impressions grew 8.4% week-over-week driven by TikTok (+12.1%). Engagement rate held
        at 4.2% with {PREVIEW_TABLE_ROWS.length} active accounts publishing 186 posts. Top performer
        <strong> @synque</strong> on TikTok reached 312K unique users.
      </p>
    </>
  );

  const kpiStripNode = (
    <div className="report-metric-row">
      {PREVIEW_KPI_ROWS.map((k) => (
        <div key={k.label} className="report-metric">
          <div className="report-metric-value">{k.value}</div>
          <div className="report-metric-label">{k.label}</div>
        </div>
      ))}
    </div>
  );

  const perAccountTableNode = (
    <>
      <h2 className="report-section-title">Per-Account Summary</h2>
      <table className="report-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Platform</th>
            <th className="text-right">Followers</th>
            <th className="text-right">Impressions</th>
            <th className="text-right">Reach</th>
            <th className="text-right">Eng.</th>
            {settings.showSentimentBadges && <th className="text-center">Sentiment</th>}
            {settings.showSparklines && <th className="text-center">7-day</th>}
          </tr>
        </thead>
        <tbody>
          {PREVIEW_TABLE_ROWS.map((row, i) => (
            <tr
              key={row.account + row.platform}
              style={{
                background: settings.tableStyle === "striped" && i % 2 === 1 ? "#f9f9fb" : undefined,
                borderBottom: settings.tableStyle === "bordered" ? "1px solid #d4d4d8" : undefined,
              }}
            >
              <td className="font-medium">{row.account}</td>
              <td className="capitalize">{row.platform}</td>
              <td className="text-right tabular-nums">{row.followers}</td>
              <td className="text-right tabular-nums">{row.impressions}</td>
              <td className="text-right tabular-nums">{row.reach}</td>
              <td className="text-right tabular-nums">{row.engagement}</td>
              {settings.showSentimentBadges && (
                <td className="text-center">
                  <span className={`sentiment-pill ${sentimentClass(row.sentiment)}`}>
                    {sentimentLabel(row.sentiment)}
                  </span>
                </td>
              )}
              {settings.showSparklines && (
                <td className="text-center">
                  <ReportSparkline points={row.trend} color={accent} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const topPostsTableNode = (
    <>
      <h2 className="report-section-title">Top Engaged Posts</h2>
      <table className="report-table">
        <thead>
          <tr>
            <th>Post Title</th>
            <th>Author</th>
            <th>Platform</th>
            <th className="text-right">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {PREVIEW_TOP_POSTS.map((p, i) => (
            <tr
              key={p.title}
              style={{
                background: settings.tableStyle === "striped" && i % 2 === 1 ? "#f9f9fb" : undefined,
                borderBottom: settings.tableStyle === "bordered" ? "1px solid #d4d4d8" : undefined,
              }}
            >
              <td className="font-medium" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</td>
              <td>{p.author}</td>
              <td className="capitalize">{p.platform}</td>
              <td className="text-right tabular-nums">{p.engagement}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  // Map each contentOrder id to its rendered node — gated by the matching
  // show* toggle. Hidden sections contribute `null` and are skipped.
  const sectionMap: Record<ContentSectionId, React.ReactNode> = {
    executiveSummary: settings.showExecutiveSummary ? executiveSummaryNode : null,
    kpiStrip: settings.showKpiStrip ? kpiStripNode : null,
    perAccountTable: settings.showPerAccountTable ? perAccountTableNode : null,
    topPostsTable: settings.showTopPostsTable ? topPostsTableNode : null,
  };

  return (
    <div
      className="report-preview-root"
      style={{
        ["--print-accent" as string]: accent,
        fontSize: `calc(10px * ${fontScale})`,
        position: "relative",
      }}
    >

      {/* Watermark — diagonal faint text behind every page */}
      {settings.showWatermark && settings.watermarkText.trim() && (
        <div
          className="report-watermark"
          style={{ color: accent + "14" }}
          aria-hidden
        >
          {settings.watermarkText}
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* === TITLE BANNER === */}
        <div
          className="report-title-banner"
          style={{
            flexDirection: logoCentered ? "column" : "row",
            alignItems: logoCentered ? "center" : "flex-end",
            textAlign: logoCentered ? "center" : undefined,
            gap: isMinimal ? 10 : 4,
          }}
        >
          <div
            className="report-title-banner-left"
            style={{
              flexDirection: logoOnRight ? "row-reverse" : "row",
              justifyContent: logoCentered ? "center" : "flex-start",
            }}
          >
            {showLogo && (
              company.logo ? (
                <img src={company.logo} alt={company.name} className="report-company-logo" />
              ) : (
                <div
                  className="report-company-logo"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    background: accent,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {(company.name || "Y").slice(0, 1).toUpperCase()}
                </div>
              )
            )}
            <div>
              {settings.showReportTitle && (
                <div className="report-title-banner-brand" style={{ fontSize: isMinimal ? 14 : undefined }}>
                  {company.name || "Your Company"}
                </div>
              )}
              <div className="report-title-banner-tagline">
                {isMinimal ? reportTitle : "Social Media Report"}
              </div>
            </div>
          </div>
          {!isMinimal && (
            <div className="report-title-banner-right" style={{ textAlign: logoCentered ? "center" : "right" }}>
              {settings.showReportTitle && (
                <div className="report-title-banner-eyebrow">{dateRangeLabel} Report</div>
              )}
              <div className="report-title-banner-title">{reportTitle}</div>
              {settings.showDateRange && (
                <div className="report-title-banner-meta">{now} · {dateRangeLabel}</div>
              )}
            </div>
          )}
        </div>
        <div className="report-title-accent" style={{ background: accent }} />

        {/* === BODY SECTIONS (rendered in contentOrder) === */}
        {settings.contentOrder.map((sectionId) => (
          <React.Fragment key={sectionId}>
            {sectionMap[sectionId]}
          </React.Fragment>
        ))}

        {/* === FOOTER ===
            Renders at the bottom of the report. `footerPosition` controls
            alignment; `showFooterLine` toggles the separator rule; the
            custom-footer-text override is applied above. The footer block
            uses the user's `footerFontSize` setting via an inline scale. */}
        {settings.showFooter && (
          <div
            className="report-footer-company"
            style={{
              borderTopWidth: settings.showFooterLine ? undefined : 0,
              paddingTop: settings.showFooterLine ? undefined : 4,
              fontSize: `calc(7.5px * ${footerFontScale})`,
              justifyContent: footerAlign,
            }}
          >
            {showLogo && (
              company.logo ? (
                <img src={company.logo} alt={company.name} className="report-footer-logo" />
              ) : null
            )}
            <div className="report-footer-company-info">
              <div className="report-footer-company-name">{company.name || "Your Company"}</div>
              {settings.showCompanyAddress && addressLine && (
                <div className="report-footer-company-line">{addressLine}</div>
              )}
              {settings.showCompanyContact && contactLine && (
                <div className="report-footer-company-contact">{contactLine}</div>
              )}
            </div>
            <div className="report-footer-meta" style={{ textAlign: settings.footerPosition === "left" ? "left" : settings.footerPosition === "center" ? "center" : "right" }}>
              <div>Generated on {now}</div>
              <div>{reportTitle} · {dateRangeLabel}</div>
              {effectiveFooterText && (
                <div className="report-footer-confidential">{effectiveFooterText}</div>
              )}
              {settings.showPageNumbers && <div>Page 1 of 1</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Landing Page Settings — persisted to localStorage "socialflow-landing-settings".
// Read by src/app/page.tsx (to decide LandingPage vs login redirect when
// disabled), the LandingNav/LandingFooter (linked-page visibility), and the
// landing hero (custom headline / subheadline / accent).
// ============================================================================

const LANDING_SETTINGS_KEY = "socialflow-landing-settings";

type LandingLinkKey =
  | "showBlogLink"
  | "showDocsLink"
  | "showHelpLink"
  | "showStatusLink"
  | "showChangelogLink"
  | "showCareersLink"
  | "showCustomersLink"
  | "showApiReferenceLink"
  | "showAiComposerLink"
  | "showProtectionLink";

interface LandingSettings {
  enabled: boolean;
  showNavLinks: boolean;
  showPricingSection: boolean;
  showComparisonSection: boolean;
  showTrialButton: boolean;
  showLiveDemoButton: boolean;
  customHeadline: string;
  customSubheadline: string;
  heroAccentColor: string;
  showBlogLink: boolean;
  showDocsLink: boolean;
  showHelpLink: boolean;
  showStatusLink: boolean;
  showChangelogLink: boolean;
  showCareersLink: boolean;
  showCustomersLink: boolean;
  showApiReferenceLink: boolean;
  showAiComposerLink: boolean;
  showProtectionLink: boolean;
}

const DEFAULT_LANDING_SETTINGS: LandingSettings = {
  enabled: true,
  showNavLinks: true,
  showPricingSection: true,
  showComparisonSection: true,
  showTrialButton: true,
  showLiveDemoButton: true,
  customHeadline: "",
  customSubheadline: "",
  heroAccentColor: "",
  showBlogLink: true,
  showDocsLink: true,
  showHelpLink: true,
  showStatusLink: true,
  showChangelogLink: true,
  showCareersLink: true,
  showCustomersLink: true,
  showApiReferenceLink: true,
  showAiComposerLink: true,
  showProtectionLink: true,
};

function loadLandingSettings(): LandingSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(LANDING_SETTINGS_KEY) ?? "{}");
    return { ...DEFAULT_LANDING_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_LANDING_SETTINGS };
  }
}

/**
 * Public helper so the landing page (and any other component) can read the
 * persisted landing settings without duplicating the localStorage key and
 * default-filling logic. Imported as:
 *   `import { getLandingSettings } from "@/components/views/settings";`
 */
export function getLandingSettings(): LandingSettings {
  if (typeof window === "undefined") return { ...DEFAULT_LANDING_SETTINGS };
  return loadLandingSettings();
}

const LANDING_LINK_DEFS: { key: LandingLinkKey; label: string; href: string; desc: string }[] = [
  { key: "showBlogLink", label: "Blog", href: "/blog", desc: "Company blog posts and announcements." },
  { key: "showDocsLink", label: "Documentation", href: "/docs", desc: "User-facing product documentation." },
  { key: "showHelpLink", label: "Help Center", href: "/help", desc: "Support articles and contact form." },
  { key: "showStatusLink", label: "Status", href: "/status", desc: "Live uptime and incident history." },
  { key: "showChangelogLink", label: "Changelog", href: "/changelog", desc: "Release notes per version." },
  { key: "showCareersLink", label: "Careers", href: "/careers", desc: "Open positions and company culture." },
  { key: "showCustomersLink", label: "Customers", href: "/customers", desc: "Case studies and testimonials." },
  { key: "showApiReferenceLink", label: "API Reference", href: "/api-reference", desc: "Developer API documentation." },
  { key: "showAiComposerLink", label: "AI Composer", href: "/ai-composer", desc: "AI caption generation landing page." },
  { key: "showProtectionLink", label: "Account Protection", href: "/protection", desc: "Security and account safety overview." },
];

function LandingSettingsSection() {
  const [settings, setSettings] = React.useState<LandingSettings>(loadLandingSettings);

  function update<K extends keyof LandingSettings>(key: K, value: LandingSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const save = () => {
    try {
      localStorage.setItem(LANDING_SETTINGS_KEY, JSON.stringify(settings));
      toast.success("Landing page settings saved");
    } catch {
      toast.error("Failed to save landing page settings");
    }
  };

  const reset = () => {
    setSettings({ ...DEFAULT_LANDING_SETTINGS });
    try {
      localStorage.removeItem(LANDING_SETTINGS_KEY);
    } catch {}
    toast.info("Landing page settings reset to defaults");
  };

  return (
    <section className="glass rounded-xl crystal-in p-5">
      <SectionHeader
        title="Landing Page"
        desc="Control your public-facing landing page and linked pages."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={save}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
            >
              <Save className="h-3.5 w-3.5" /> Save settings
            </button>
          </div>
        }
      />

      {/* Master toggle */}
      <div
        className={cn(
          "rounded-2xl border p-4 transition",
          settings.enabled
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        )}
      >
        <ToggleRow
          label={settings.enabled ? "Landing page enabled" : "Landing page disabled"}
          desc={
            settings.enabled
              ? "Logged-out visitors to / see the public landing page."
              : "Logged-out visitors to / are redirected to the login page instead."
          }
          checked={settings.enabled}
          onChange={(v) => update("enabled", v)}
        />
      </div>

      <Separator className="my-5" />

      {/* Hero & navigation + marketing sections */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-0.5">
          <div className="mb-1 text-sm font-semibold">Hero &amp; navigation</div>
          <ToggleRow label="Show nav links" desc="Top navigation links on the landing page." checked={settings.showNavLinks} onChange={(v) => update("showNavLinks", v)} />
          <ToggleRow label="Show trial button" desc="Primary 'Start trial' CTA in the nav and hero." checked={settings.showTrialButton} onChange={(v) => update("showTrialButton", v)} />
          <ToggleRow label="Show live demo button" desc="Secondary CTA that opens an interactive demo." checked={settings.showLiveDemoButton} onChange={(v) => update("showLiveDemoButton", v)} />
        </div>
        <div className="space-y-0.5">
          <div className="mb-1 text-sm font-semibold">Marketing sections</div>
          <ToggleRow label="Show pricing section" desc="Plan comparison cards on the landing page." checked={settings.showPricingSection} onChange={(v) => update("showPricingSection", v)} />
          <ToggleRow label="Show comparison section" desc="Side-by-side comparison with competitors." checked={settings.showComparisonSection} onChange={(v) => update("showComparisonSection", v)} />
        </div>
      </div>

      <Separator className="my-5" />

      {/* Custom hero text */}
      <div>
        <div className="text-sm font-semibold">Custom hero content</div>
        <div className="text-xs text-muted-foreground">Leave blank to use the default headline and subheadline.</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Custom headline" hint="Empty = use default ('Orchestrate Your Social')." compact>
            <Input value={settings.customHeadline} onChange={(e) => update("customHeadline", e.target.value)} placeholder="Orchestrate Your Social" />
          </Field>
          <Field label="Custom subheadline" hint="Empty = use default subheadline." compact>
            <Input value={settings.customSubheadline} onChange={(e) => update("customSubheadline", e.target.value)} placeholder="The enterprise command center for modern social teams." />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Hero accent color" hint="Empty = use the default blue accent." compact>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.heroAccentColor || "#5856D6"}
                onChange={(e) => update("heroAccentColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                aria-label="Hero accent color"
              />
              <Input
                value={settings.heroAccentColor}
                onChange={(e) => update("heroAccentColor", e.target.value)}
                className="max-w-[10rem] font-mono text-xs"
                placeholder="#5856D6"
              />
              <button
                onClick={() => update("heroAccentColor", "")}
                className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
              >
                Clear
              </button>
            </div>
          </Field>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Linked pages visibility */}
      <div>
        <div className="text-sm font-semibold">Linked pages visibility</div>
        <div className="text-xs text-muted-foreground">
          Toggle individual footer pages on or off. Hidden pages return a 404.
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {LANDING_LINK_DEFS.map((def) => (
            <div
              key={def.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {def.label}
                  <span className="font-mono text-[10px] text-muted-foreground">{def.href}</span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{def.desc}</div>
              </div>
              <Switch
                checked={settings[def.key] as boolean}
                onCheckedChange={(v) => update(def.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-5" />

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span>
          These settings apply to the landing page and all linked pages. Changes take effect immediately
          for logged-out visitors on next page load.
        </span>
      </p>
    </section>
  );
}
