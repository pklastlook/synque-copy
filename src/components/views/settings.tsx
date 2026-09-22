"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  User,
  Building2,
  Palette,
  Bell,
  Plug,
  CreditCard,
  Check,
  Sun,
  Moon,
  Monitor,
  Crown,
  Zap,
  AtSign,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SettingsTab =
  | "profile"
  | "workspace"
  | "appearance"
  | "notifications"
  | "platforms"
  | "billing";

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "platforms", label: "Connected platforms", icon: Plug },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const ACCENT_SWATCHES: { id: string; name: string; color: string }[] = [
  { id: "rose", name: "Rose", color: "oklch(0.7 0.24 14)" },
  { id: "teal", name: "Teal", color: "oklch(0.74 0.18 165)" },
  { id: "amber", name: "Amber", color: "oklch(0.78 0.18 75)" },
  { id: "magenta", name: "Magenta", color: "oklch(0.66 0.22 305)" },
  { id: "green", name: "Green", color: "oklch(0.76 0.18 145)" },
];

const THEME_OPTIONS: {
  value: "light" | "dark" | "system";
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { value: "light", label: "Light", icon: Sun, desc: "Bright daylight surface" },
  { value: "dark", label: "Dark", icon: Moon, desc: "Low-light liquid glass" },
  { value: "system", label: "System", icon: Monitor, desc: "Match your Mac" },
];

const NOTIF_ITEMS: { id: string; label: string; desc: string; on: boolean }[] = [
  {
    id: "comments",
    label: "New comment on your post",
    desc: "When someone comments on a post you authored.",
    on: true,
  },
  {
    id: "mentions",
    label: "Mentions",
    desc: "When your brand or accounts are mentioned.",
    on: true,
  },
  {
    id: "scheduled",
    label: "Scheduled post published",
    desc: "Confirmation when a scheduled post goes live.",
    on: true,
  },
  {
    id: "digest",
    label: "Weekly performance digest",
    desc: "A Monday-morning summary of last week's KPIs.",
    on: false,
  },
  {
    id: "team",
    label: "Team member activity",
    desc: "When teammates publish, schedule or connect accounts.",
    on: false,
  },
];

const CONNECTED_PLATFORMS: Record<PlatformId, { connected: boolean; accounts: number }> = {
  instagram: { connected: true, accounts: 2 },
  facebook: { connected: true, accounts: 1 },
  x: { connected: true, accounts: 1 },
  linkedin: { connected: true, accounts: 1 },
  tiktok: { connected: false, accounts: 0 },
  youtube: { connected: false, accounts: 0 },
  threads: { connected: false, accounts: 0 },
};

const TIMEZONES = [
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const CADENCES = [
  "Daily — once a day",
  "3× per week",
  "Weekly",
  "Bi-weekly",
  "Custom schedule",
];

export function SettingsView() {
  const [tab, setTab] = React.useState<SettingsTab>("appearance");
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = React.useState("rose");
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [liquidGlass, setLiquidGlass] = React.useState(true);

  return (
    <div className="animate-rise space-y-5">
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace preferences
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tune your Prism workspace — appearance, identity, notifications and
            billing.
          </p>
        </div>
      </GlassCard>

      <GlassCard strong className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Vertical nav (desktop) / horizontal pills (mobile) */}
          <nav
            className="no-scrollbar flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="Settings sections"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Content panel */}
          <div className="min-w-0">
            {tab === "appearance" && (
              <AppearanceTab
                theme={theme}
                setTheme={setTheme}
                accent={accent}
                setAccent={setAccent}
                reduceMotion={reduceMotion}
                setReduceMotion={setReduceMotion}
                liquidGlass={liquidGlass}
                setLiquidGlass={setLiquidGlass}
              />
            )}
            {tab === "profile" && <ProfileTab />}
            {tab === "workspace" && <WorkspaceTab />}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "platforms" && <PlatformsTab />}
            {tab === "billing" && <BillingTab />}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* -------------------- Appearance -------------------- */

function AppearanceTab({
  theme,
  setTheme,
  accent,
  setAccent,
  reduceMotion,
  setReduceMotion,
  liquidGlass,
  setLiquidGlass,
}: {
  theme: string | undefined;
  setTheme: (t: "light" | "dark" | "system") => void;
  accent: string;
  setAccent: (a: string) => void;
  reduceMotion: boolean;
  setReduceMotion: (b: boolean) => void;
  liquidGlass: boolean;
  setLiquidGlass: (b: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <SectionTitle
          title="Theme"
          desc="Choose how Prism looks on this device."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <ThemePreview value={opt.value} />
                <div className="mt-3 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {active && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle
          title="Accent color"
          desc="The vibrant hue used across charts, buttons and highlights."
        />
        <div className="flex flex-wrap items-center gap-3">
          {ACCENT_SWATCHES.map((s) => {
            const active = accent === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setAccent(s.id);
                  toast.info("Accent updated");
                }}
                className="group flex items-center gap-2 rounded-2xl border border-transparent p-1.5 transition-all hover:bg-muted/50"
                aria-label={s.name}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full text-white shadow-md transition-transform group-hover:scale-110",
                    active && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                  style={{ background: s.color }}
                >
                  {active && <Check className="h-4 w-4" />}
                </span>
                <span className="text-xs font-medium">{s.name}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle
          title="Motion & surfaces"
          desc="Tune the visual feel of the workspace."
        />
        <div className="space-y-3">
          <SettingRow
            label="Liquid glass effects"
            desc="Translucent, layered surfaces with backdrop blur."
          >
            <Switch checked={liquidGlass} onCheckedChange={setLiquidGlass} />
          </SettingRow>
          <SettingRow
            label="Reduce motion"
            desc="Minimise animations and transitions."
          >
            <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </SettingRow>
        </div>
      </GlassCard>
    </div>
  );
}

function ThemePreview({
  value,
}: {
  value: "light" | "dark" | "system";
}) {
  if (value === "system") {
    return (
      <div className="grid h-20 grid-cols-2 overflow-hidden rounded-xl border">
        <div className="bg-gradient-to-br from-white to-neutral-200 p-2">
          <div className="h-1.5 w-8 rounded-full bg-neutral-400" />
          <div className="mt-1 h-1 w-10 rounded-full bg-neutral-300" />
          <div className="mt-2 h-3 w-3 rounded-full bg-rose-400" />
        </div>
        <div className="bg-gradient-to-br from-neutral-800 to-black p-2">
          <div className="h-1.5 w-8 rounded-full bg-neutral-500" />
          <div className="mt-1 h-1 w-10 rounded-full bg-neutral-600" />
          <div className="mt-2 h-3 w-3 rounded-full bg-rose-400" />
        </div>
      </div>
    );
  }
  const isDark = value === "dark";
  return (
    <div
      className={cn(
        "h-20 rounded-xl border p-2",
        isDark
          ? "bg-gradient-to-br from-neutral-800 to-black"
          : "bg-gradient-to-br from-white to-neutral-200",
      )}
    >
      <div
        className={cn(
          "h-1.5 w-8 rounded-full",
          isDark ? "bg-neutral-500" : "bg-neutral-400",
        )}
      />
      <div
        className={cn(
          "mt-1 h-1 w-10 rounded-full",
          isDark ? "bg-neutral-600" : "bg-neutral-300",
        )}
      />
      <div className="mt-2 h-3 w-3 rounded-full bg-[oklch(0.7_0.24_14)]" />
    </div>
  );
}

/* -------------------- Profile -------------------- */

function ProfileTab() {
  const [name, setName] = React.useState("Maya Reyes");
  const [email, setEmail] = React.useState("maya@prismstudio.com");
  const [title, setTitle] = React.useState("Head of Social");
  const [bio, setBio] = React.useState(
    "Building Prism — the calmest way to publish across every platform at once.",
  );

  return (
    <GlassCard className="p-5">
      <SectionTitle
        title="Profile"
        desc="How you appear to teammates and collaborators."
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <NameAvatar name={name} className="h-20 w-20 text-xl" ring />
          <button
            onClick={() => toast.info("Upload a new photo")}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Change photo
          </button>
        </div>
        <div className="grid flex-1 gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-title">Title</Label>
            <Input
              id="profile-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => toast.success("Profile saved")}
              className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Check className="h-4 w-4" />
              Save changes
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* -------------------- Workspace -------------------- */

function WorkspaceTab() {
  const [name, setName] = React.useState("Prism Studio");
  const [tz, setTz] = React.useState("America/Los_Angeles");
  const [cadence, setCadence] = React.useState(CADENCES[1]);
  const [autoVariants, setAutoVariants] = React.useState(true);

  return (
    <GlassCard className="p-5">
      <SectionTitle
        title="Workspace"
        desc="Defaults that apply across your Prism workspace."
      />
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default timezone</Label>
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default posting cadence</Label>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SettingRow
          label="Auto-generate AI variants on compose"
          desc="Generate per-platform caption variants automatically when composing."
        >
          <Switch checked={autoVariants} onCheckedChange={setAutoVariants} />
        </SettingRow>
        <div className="flex justify-end">
          <button
            onClick={() => toast.success("Workspace saved")}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Check className="h-4 w-4" />
            Save changes
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

/* -------------------- Notifications -------------------- */

function NotificationsTab() {
  const [state, setState] = React.useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_ITEMS.map((n) => [n.id, n.on])),
  );

  return (
    <GlassCard className="p-5">
      <SectionTitle
        title="Notifications"
        desc="Choose what Prism pings you about."
      />
      <div className="space-y-2">
        {NOTIF_ITEMS.map((n) => (
          <SettingRow
            key={n.id}
            label={n.label}
            desc={n.desc}
            stackedOnMobile
          >
            <Switch
              checked={state[n.id]}
              onCheckedChange={(b) => {
                setState((s) => ({ ...s, [n.id]: b }));
                toast.success(
                  `${n.label} ${b ? "enabled" : "disabled"}`,
                );
              }}
            />
          </SettingRow>
        ))}
      </div>
    </GlassCard>
  );
}

/* -------------------- Connected platforms -------------------- */

function PlatformsTab() {
  const [state, setState] = React.useState(CONNECTED_PLATFORMS);

  const toggle = (p: PlatformId) => {
    setState((s) => ({
      ...s,
      [p]: {
        connected: !s[p].connected,
        accounts: !s[p].connected ? 1 : 0,
      },
    }));
    const wasConnected = state[p].connected;
    toast.success(
      wasConnected ? `${p} disconnected` : `${p} connected`,
    );
  };

  return (
    <GlassCard className="p-5">
      <SectionTitle
        title="Connected platforms"
        desc="Manage which social accounts Prism can publish to."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_LIST.map((p) => {
          const info = state[p.id];
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border bg-card/40 p-3 transition hover:bg-muted/40"
            >
              <PlatformBadge platform={p.id} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {info.connected
                    ? `${info.accounts} account${info.accounts === 1 ? "" : "s"}`
                    : "Not connected"}
                </div>
              </div>
              <Button
                size="sm"
                variant={info.connected ? "secondary" : "default"}
                className={cn(
                  "h-8 rounded-xl",
                  info.connected
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "liquid-pill",
                )}
                onClick={() => toggle(p.id)}
              >
                {info.connected ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Connected
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* -------------------- Billing -------------------- */

function BillingTab() {
  const usage = [
    {
      id: "posts",
      label: "Posts this month",
      icon: FileText,
      used: 124,
      limit: 250,
      color: "var(--primary)",
    },
    {
      id: "accounts",
      label: "Connected accounts",
      icon: AtSign,
      used: 5,
      limit: 10,
      color: "oklch(0.74 0.18 165)",
    },
    {
      id: "ai",
      label: "AI generations",
      icon: Sparkles,
      used: 412,
      limit: 1000,
      color: "oklch(0.66 0.22 305)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Plan card */}
      <GlassCard className="glass-sheen relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.7_0.24_14)] to-[oklch(0.66_0.22_305)] text-white shadow-md">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">Pro</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Current plan
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                $49 / month · renews on the 1st
              </p>
            </div>
          </div>
          <button
            onClick={() => toast.info("Opening upgrade options")}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Zap className="h-4 w-4" />
            Upgrade
          </button>
        </div>
      </GlassCard>

      {/* Usage bars */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Usage this month"
          desc="Resets on the 1st of each month."
        />
        <div className="space-y-4">
          {usage.map((u) => {
            const Icon = u.icon;
            const pct = Math.min(100, Math.round((u.used / u.limit) * 100));
            return (
              <div key={u.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {u.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{u.used}</span>{" "}
                    / {u.limit}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: u.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

/* -------------------- Shared helpers -------------------- */

function SettingRow({
  label,
  desc,
  children,
  stackedOnMobile = false,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
  stackedOnMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border bg-card/40 p-3",
        stackedOnMobile && "flex-col items-start sm:flex-row sm:items-center",
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
