"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { useApi } from "@/lib/hooks";
import { GlassCard, SectionTitle } from "@/components/glass/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import {
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  KeyRound,
  Trash2,
  Youtube,
} from "lucide-react";

interface PlatformCredential {
  id: string;
  platform: string;
  connected: boolean;
  clientId: string | null;
  apiKey: string | null;
  accessToken: string | null;
  bearerToken: string | null;
  pageId: string | null;
  profileId: string | null;
  hasClientSecret: boolean;
  hasApiSecret: boolean;
  hasAccessSecret: boolean;
  updatedAt: string;
}

const PLATFORM_CONFIG: Record<string, {
  icon: React.ElementType;
  name: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; required?: boolean; type?: string }[];
  docsUrl: string;
  helpText: string;
}> = {
  twitter: {
    icon: Twitter,
    name: "Twitter / X",
    color: "oklch(0.2 0 0)",
    fields: [
      // OAuth 2.0 (for login redirect — one-click connect)
      { key: "clientId", label: "OAuth 2.0 Client ID", placeholder: "From Twitter Developer Portal → OAuth 2.0 Client ID", required: true },
      { key: "clientSecret", label: "OAuth 2.0 Client Secret", placeholder: "From Twitter Developer Portal → OAuth 2.0 Client Secret", required: true, type: "password" },
      // OAuth 1.0a (for posting — required on Free tier)
      { key: "apiKey", label: "Consumer Key (API Key)", placeholder: "From Twitter Developer Portal → Consumer Keys → API Key", required: true },
      { key: "apiSecret", label: "Consumer Secret (API Secret)", placeholder: "From Twitter Developer Portal → Consumer Keys → API Secret", required: true, type: "password" },
      { key: "accessToken", label: "Access Token (OAuth 1.0a)", placeholder: "From Twitter Developer Portal → Authentication Tokens → Access Token", required: true },
      { key: "accessSecret", label: "Access Token Secret (OAuth 1.0a)", placeholder: "From Twitter Developer Portal → Authentication Tokens → Access Token Secret", required: true, type: "password" },
    ],
    docsUrl: "https://developer.twitter.com/en/portal/dashboard",
    helpText: "Go to developer.twitter.com → your app → Keys and tokens tab. Copy ALL 6 values: OAuth 2.0 Client ID + Secret (for login), Consumer Key + Secret (API keys), and Access Token + Secret (OAuth 1.0a — needed for posting on Free tier). Set app permissions to 'Read and Write'.",
  },
  instagram: {
    icon: Instagram,
    name: "Instagram",
    color: "oklch(0.635 0.217 17)",
    fields: [
      { key: "clientId", label: "Meta App ID", placeholder: "Your Meta App ID", required: true },
      { key: "clientSecret", label: "Meta App Secret", placeholder: "Your Meta App Secret", required: true, type: "password" },
      { key: "pageId", label: "IG Business Account ID", placeholder: "Fetched automatically after OAuth login" },
    ],
    docsUrl: "https://developers.facebook.com/docs/instagram-api/getting-started",
    helpText: "Create a Meta Developer app → add Instagram Graph API → set OAuth redirect URI to your app URL + /api/oauth/callback/instagram. Users then click 'Connect Instagram' and get redirected to login.",
  },
  linkedin: {
    icon: Linkedin,
    name: "LinkedIn",
    color: "oklch(0.54 0.16 250)",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Your LinkedIn App Client ID", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Your LinkedIn App Client Secret", required: true, type: "password" },
      { key: "profileId", label: "Member URN", placeholder: "Fetched automatically after OAuth login" },
    ],
    docsUrl: "https://www.linkedin.com/developers/apps",
    helpText: "Create a LinkedIn Developer app → add 'Share on LinkedIn' product → set redirect URL to your app URL + /api/oauth/callback/linkedin. Users click 'Connect LinkedIn' and get redirected to login.",
  },
  facebook: {
    icon: Facebook,
    name: "Facebook",
    color: "oklch(0.588 0.167 254)",
    fields: [
      { key: "clientId", label: "Meta App ID", placeholder: "Your Meta App ID", required: true },
      { key: "clientSecret", label: "Meta App Secret", placeholder: "Your Meta App Secret", required: true, type: "password" },
      { key: "pageId", label: "Facebook Page ID", placeholder: "Fetched automatically after OAuth login" },
    ],
    docsUrl: "https://developers.facebook.com/docs/pages-api",
    helpText: "Create a Meta Developer app → add Facebook Login product → set OAuth redirect URI to your app URL + /api/oauth/callback/facebook. Users click 'Connect Facebook' and get redirected to login → pick their page.",
  },
  tiktok: {
    icon: Youtube, // placeholder — will use TikTok icon when available
    name: "TikTok",
    color: "oklch(0.3 0.02 250)",
    fields: [
      { key: "clientId", label: "Client Key", placeholder: "From TikTok Developers → Client Key", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "From TikTok Developers → Client Secret", required: true, type: "password" },
      { key: "pageId", label: "Open ID", placeholder: "Fetched automatically after OAuth login" },
    ],
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web/",
    helpText: "Go to developers.tiktok.com → create an app → add Login Kit → set redirect URI to your app URL + /api/oauth/callback/tiktok. Request scopes: user.info.basic, video.publish, video.list.",
  },
  youtube: {
    icon: Youtube,
    name: "YouTube",
    color: "oklch(0.626 0.225 27)",
    fields: [
      { key: "clientId", label: "Google Client ID", placeholder: "From Google Cloud Console → OAuth Client ID", required: true },
      { key: "clientSecret", label: "Google Client Secret", placeholder: "From Google Cloud Console → OAuth Client Secret", required: true, type: "password" },
      { key: "pageId", label: "Channel ID", placeholder: "Fetched automatically after OAuth login" },
    ],
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    helpText: "Go to Google Cloud Console → create a project → enable YouTube Data API v3 → create OAuth 2.0 credentials → set redirect URI to your app URL + /api/oauth/callback/youtube. Request scopes: youtube.upload, youtube.readonly.",
  },
};

export function PlatformApiSection() {
  const { user } = useAuth();
  const { data: creds, reload } = useApi<PlatformCredential[]>(
    user?.id ? `/api/platform-credentials?userId=${user.id}` : null
  );
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("twitter");
  const [formValues, setFormValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState<string | null>(null);

  const config = PLATFORM_CONFIG[selectedPlatform];
  const existingCred = creds?.find((c) => c.platform === selectedPlatform);

  const handleSave = async () => {
    if (!user?.id) return;
    const required = config.fields.filter((f) => f.required);
    for (const f of required) {
      if (!formValues[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/platform-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          platform: selectedPlatform,
          ...formValues,
        }),
      });
      if (res.ok) {
        toast.success(`${config.name} credentials saved`, {
          description: "You can now sync real data and post content.",
        });
        setFormValues({});
        reload();
      } else {
        toast.error("Failed to save credentials");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (accountId: string) => {
    if (!user?.id) return;
    setSyncing(accountId);
    try {
      const res = await fetch(`/api/platform-credentials/${selectedPlatform}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, accountId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Profile synced", {
          description: `Real data from ${config.name}: ${json.synced?.followers ?? 0} followers, ${json.synced?.postsCount ?? 0} posts`,
        });
      } else {
        toast.error(json.error ?? "Sync failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async () => {
    if (!user?.id) return;
    try {
      await fetch(`/api/platform-credentials?userId=${user.id}&platform=${selectedPlatform}`, {
        method: "DELETE",
      });
      toast.success(`${config.name} credentials removed`);
      setFormValues({});
      reload();
    } catch {
      toast.error("Failed to remove credentials");
    }
  };

  return (
    <div className="space-y-5">
      <HelpText module="platform-api">
        <strong className="text-foreground">Platform API Keys</strong> connect SocialFlow to real social media APIs.
        Enter your developer credentials here to enable <strong className="text-foreground">real posting</strong> and
        <strong className="text-foreground">automatic profile sync</strong>. Without these, the system can only store
        data you enter manually.
      </HelpText>

      <GlassCard className="p-5">
        <SectionTitle
          title="Platform API Keys"
          desc="Connect real platform APIs for live posting and data sync"
        />

        {/* Platform selector tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const cred = creds?.find((c) => c.platform === key);
            const active = selectedPlatform === key;
            return (
              <button
                key={key}
                onClick={() => { setSelectedPlatform(key); setFormValues({}); }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                {cfg.name}
                {cred?.connected && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Status banner */}
        {existingCred?.connected ? (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[12px]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-muted-foreground">
              <strong className="font-semibold text-emerald-600 dark:text-emerald-400">Connected.</strong>{" "}
              {config.name} API credentials are active. Last updated {new Date(existingCred.updatedAt).toLocaleDateString()}.
            </span>
          </div>
        ) : (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[12px]">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-muted-foreground">
              <strong className="font-semibold text-amber-600 dark:text-amber-400">Not connected.</strong>{" "}
              You need {config.name} API credentials to enable real posting and automatic profile sync.{" "}
              <a href={config.docsUrl} target="_blank" rel="noopener" className="font-medium text-primary hover:underline">
                Get API keys →
              </a>
            </span>
          </div>
        )}

        {/* Credential form */}
        <div className="space-y-3">
          {config.fields.map((field) => (
            <div key={field.key}>
              <Label className="text-xs font-semibold">
                {field.label}
                {field.required && <span className="ml-1 text-rose-500">*</span>}
              </Label>
              <Input
                type={field.type ?? "text"}
                value={formValues[field.key] ?? ""}
                onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="mt-1.5 font-mono text-xs"
              />
              {existingCred?.connected && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Currently set: {field.key === "clientId" && existingCred.clientId}
                  {field.key === "clientSecret" && (existingCred.hasClientSecret ? "••••••••" : "not set")}
                  {field.key === "apiKey" && existingCred.apiKey}
                  {field.key === "accessToken" && existingCred.accessToken}
                  {field.key === "apiSecret" && (existingCred.hasApiSecret ? "••••••••" : "not set")}
                  {field.key === "accessSecret" && (existingCred.hasAccessSecret ? "••••••••" : "not set")}
                  {field.key === "pageId" && existingCred.pageId}
                  {field.key === "profileId" && existingCred.profileId}
                </p>
              )}
            </div>
          ))}

          {/* Help text for this platform */}
          <div className="rounded-xl bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">How to get {config.name} API keys:</strong>{" "}
            {config.helpText}{" "}
            <a href={config.docsUrl} target="_blank" rel="noopener" className="font-medium text-primary hover:underline">
              Open {config.name} Developer Portal <ExternalLink className="inline h-2.5 w-2.5" />
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="liquid-pill flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {saving ? "Saving…" : "Save credentials"}
            </Button>
            {existingCred?.connected && (
              <Button
                onClick={handleDelete}
                variant="ghost"
                className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Connected accounts + sync buttons */}
      {existingCred?.connected && (
        <SyncAccountsSection platform={selectedPlatform} userId={user?.id ?? ""} onSync={handleSync} syncing={syncing} />
      )}
    </div>
  );
}

/** Shows accounts for a platform with a "Sync from API" button each */
function SyncAccountsSection({
  platform,
  userId,
  onSync,
  syncing,
}: {
  platform: string;
  userId: string;
  onSync: (accountId: string) => void;
  syncing: string | null;
}) {
  const { data: accounts } = useApi<{ id: string; platform: string; handle: string; displayName: string; followers: number }[]>(
    "/api/accounts"
  );

  const platformAccounts = accounts?.filter((a) => {
    if (platform === "twitter") return a.platform === "x" || a.platform === "twitter";
    return a.platform === platform;
  }) ?? [];

  if (platformAccounts.length === 0) {
    return (
      <GlassCard className="p-5">
        <SectionTitle title={`Connected ${PLATFORM_CONFIG[platform]?.name ?? platform} accounts`} />
        <div className="py-8 text-center text-sm text-muted-foreground">
          No {PLATFORM_CONFIG[platform]?.name} accounts connected. Go to Accounts → Connect account to add one.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <SectionTitle
        title={`Sync ${PLATFORM_CONFIG[platform]?.name} accounts`}
        desc="Fetch real follower counts, post counts, and verification status from the platform API"
      />
      <div className="space-y-2">
        {platformAccounts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{a.displayName}</div>
              <div className="text-[11px] text-muted-foreground">
                {a.handle} · {a.followers.toLocaleString()} followers (current)
              </div>
            </div>
            <button
              onClick={() => onSync(a.id)}
              disabled={syncing === a.id}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
            >
              {syncing === a.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncing === a.id ? "Syncing…" : "Sync from API"}
            </button>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
