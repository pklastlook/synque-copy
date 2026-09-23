"use client";

import * as React from "react";
import {
  Wand2,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Video,
  Layers,
  CalendarClock,
  Send,
  RefreshCw,
  Check,
  Hash,
  Search,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Upload,
  Link2,
  Lightbulb,
  AlertCircle,
  X,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge, VerifiedTick } from "@/components/glass/platform-badge";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AccountData {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  followers: number;
  verified: boolean;
  ownerName: string;
  ownerColor: string | null;
}

interface Variant {
  content: string;
  hashtags: string;
}

const TONES = [
  "Professional",
  "Friendly",
  "Energetic",
  "Inspirational",
  "Witty",
  "Educational",
  "Luxurious",
];

interface MediaAssetLite {
  id: string;
  name: string;
  type: string;
  url: string;
}

interface MediaLibraryResponse {
  assets: MediaAssetLite[];
}

type Step = 1 | 2 | 3 | 4 | 5;
type MediaType = "image" | "video" | "carousel";

interface ComposerState {
  step: Step;
  selectedAccountIds: string[];
  caption: string;
  tone: string;
  mediaUrl: string;
  mediaType: MediaType;
  altText: string;
  variants: Record<string, Variant>;
  scheduledAt: string;
  scheduleEnabled: boolean;
}

const STEPS: { id: Step; label: string; short: string; icon: LucideIcon }[] = [
  { id: 1, label: "Select Accounts", short: "Accounts", icon: CheckCircle2 },
  { id: 2, label: "Text Content", short: "Text", icon: Sparkles },
  { id: 3, label: "Graphics / Media", short: "Media", icon: ImageIcon },
  { id: 4, label: "Preview", short: "Preview", icon: Wand2 },
  { id: 5, label: "Post", short: "Publish", icon: Send },
];

const MEDIA_TYPE_OPTIONS: { id: MediaType; label: string; icon: LucideIcon }[] = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "carousel", label: "Carousel", icon: Layers },
];

const DEFAULT_STATE: ComposerState = {
  step: 1,
  selectedAccountIds: [],
  caption: "",
  tone: "Friendly",
  mediaUrl: "",
  mediaType: "image",
  altText: "",
  variants: {},
  scheduledAt: "",
  scheduleEnabled: false,
};

export function ComposerView() {
  const { composerSeed, clearComposerSeed } = useNav();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const { data: accounts } = useApi<AccountData[]>("/api/accounts");
  const { data: mediaData } = useApi<MediaLibraryResponse>("/api/media");
  const mediaAssets = React.useMemo(
    () => (mediaData?.assets ?? []).filter((a) => a.type === "image"),
    [mediaData]
  );

  const [state, setState] = React.useState<ComposerState>(DEFAULT_STATE);
  const [generating, setGenerating] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [cropAspect, setCropAspect] = React.useState("1:1");

  const initRef = React.useRef(false);

  // Preselect the top 4 accounts by followers (the /api/accounts route
  // already sorts by followers desc) so the composer opens with a sensible
  // multi-platform default — without relying on hardcoded seeded IDs.
  React.useEffect(() => {
    if (initRef.current || !accounts || accounts.length === 0) return;
    initRef.current = true;
    const presets = accounts.slice(0, 4).map((a) => a.id);
    if (presets.length) {
      setState((s) => ({ ...s, selectedAccountIds: presets }));
    }
  }, [accounts]);

  // Composer seed prefill — set caption + jump to step 2 (keeps existing behavior)
  React.useEffect(() => {
    if (composerSeed) {
      setState((s) => ({ ...s, caption: composerSeed, step: 2 }));
      clearComposerSeed();
    }
  }, [composerSeed, clearComposerSeed]);

  const update = React.useCallback((patch: Partial<ComposerState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const accountsList = accounts ?? [];
  const selectedAccounts = accountsList.filter((a) =>
    state.selectedAccountIds.includes(a.id)
  );
  const filteredAccounts = accountsList.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.displayName.toLowerCase().includes(q) ||
      a.handle.toLowerCase().includes(q) ||
      PLATFORMS[a.platform].name.toLowerCase().includes(q)
    );
  });

  function toggleAccount(id: string) {
    setState((s) => {
      const next = new Set(s.selectedAccountIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, selectedAccountIds: Array.from(next) };
    });
  }

  const selectAll = () =>
    setState((s) => ({ ...s, selectedAccountIds: accountsList.map((a) => a.id) }));
  const clearAll = () => setState((s) => ({ ...s, selectedAccountIds: [] }));

  const goToStep = (step: Step) => setState((s) => ({ ...s, step }));
  const next = () =>
    setState((s) => ({ ...s, step: Math.min(5, (s.step as number) + 1) as Step }));
  const back = () =>
    setState((s) => ({ ...s, step: Math.max(1, (s.step as number) - 1) as Step }));

  async function generate(regenerateOnly?: string) {
    if (!state.caption.trim()) {
      toast.error("Write a caption first");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Select at least one account");
      return;
    }
    if (!user) {
      toast.error("Your session is loading — please try again in a moment");
      return;
    }
    setGenerating(true);
    const targets = selectedAccounts.map((a) => ({
      accountId: a.id,
      platform: a.platform,
      handle: a.handle,
    }));
    const bodyTargets = regenerateOnly
      ? targets.filter((t) => t.accountId === regenerateOnly)
      : targets;
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: state.caption,
          tone: state.tone,
          targets: bodyTargets,
          mediaHint: state.mediaUrl ? "attached visual" : "no media",
          userId: currentUserId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const incoming = json.variants ?? json.fallback?.variants;
      if (incoming && typeof incoming === "object") {
        const normalized: Record<string, Variant> = {};
        for (const k of Object.keys(incoming)) {
          normalized[k] = {
            content: incoming[k]?.content ?? "",
            hashtags: incoming[k]?.hashtags ?? "",
          };
        }
        if (regenerateOnly) {
          const nv = normalized[regenerateOnly];
          if (nv) {
            setState((s) => ({
              ...s,
              variants: { ...s.variants, [regenerateOnly]: nv },
            }));
            toast.success("Regenerated variant");
          } else {
            toast.error("Variant not found in AI response");
          }
        } else {
          setState((s) => ({ ...s, variants: normalized }));
          toast.success(
            `Generated ${Object.keys(normalized).length} platform-native captions`
          );
        }
      } else {
        toast.error(json.error ?? "Generation failed");
      }
    } catch {
      toast.error("Network error generating captions");
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    if (!user) {
      toast.error("Your session is loading — please try again in a moment");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Select accounts");
      return;
    }
    setPublishing(true);
    try {
      // 1. Save the post to the database
      const v: Record<string, { content: string; hashtags?: string }> = {};
      for (const a of selectedAccounts) {
        const ex = state.variants[a.id];
        v[a.id] = ex ?? { content: state.caption, hashtags: "" };
      }
      const scheduledAt =
        state.scheduleEnabled && state.scheduledAt
          ? new Date(state.scheduledAt).toISOString()
          : null;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.caption.slice(0, 50).trim() || "Untitled",
          caption: state.caption,
          mediaUrl: state.mediaUrl || null,
          tone: state.tone,
          scheduledAt,
          accountIds: selectedAccounts.map((a) => a.id),
          variants: v,
          authorId: currentUserId,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save post");
        return;
      }

      // 2. If scheduled, skip real posting (will be posted later)
      if (state.scheduleEnabled && scheduledAt) {
        toast.success("Post scheduled", {
          description: `Will be published on ${new Date(scheduledAt).toLocaleString()}`,
        });
        setState(DEFAULT_STATE);
        return;
      }

      // 3. Attempt REAL platform publishing for each selected account
      const results: { account: string; platform: string; success: boolean; message: string; url?: string }[] = [];

      for (const a of selectedAccounts) {
        const variant = v[a.id];
        const content = variant.hashtags
          ? `${variant.content}\n\n${variant.hashtags.split(",").map(t => `#${t.trim()}`).join(" ")}`
          : variant.content;

        // Map platform id to API platform name
        const apiPlatform = a.platform === "x" ? "twitter" : a.platform;

        try {
          const pubRes = await fetch(`/api/publish/${apiPlatform}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUserId,
              accountId: a.id,
              content,
            }),
          });
          const pubJson = await pubRes.json();

          if (pubRes.ok && pubJson.ok) {
            results.push({
              account: a.displayName,
              platform: a.platform,
              success: true,
              message: "Published successfully",
              url: pubJson.url,
            });
          } else {
            results.push({
              account: a.displayName,
              platform: a.platform,
              success: false,
              message: pubJson.error ?? "Failed to publish",
            });
          }
        } catch {
          results.push({
            account: a.displayName,
            platform: a.platform,
            success: false,
            message: "Network error during publish",
          });
        }
      }

      // 4. Show results with iOS-style popups
      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (succeeded.length > 0 && failed.length === 0) {
        toast.success("Published!", {
          description: `Posted to ${succeeded.length} account${succeeded.length > 1 ? "s" : ""}.`,
        });
        succeeded.forEach((r) => {
          if (r.url) {
            toast.success(r.account, {
              description: `View tweet: ${r.url}`,
              duration: 6000,
            });
          }
        });
      } else if (succeeded.length > 0 && failed.length > 0) {
        toast.warning("Partial publish", {
          description: `Published to ${succeeded.length}, failed ${failed.length}.`,
          duration: 6000,
        });
        failed.forEach((r) => {
          toast.error(`Failed: ${r.account}`, {
            description: r.message.slice(0, 120),
            duration: 8000,
          });
        });
      } else {
        // All failed — check if it's a 402 (Free tier paywall)
        const firstError = failed[0];
        const is402 = firstError?.message.includes("Free tier") || firstError?.message.includes("doesn't allow posting");

        if (is402) {
          // Copy content to clipboard for manual posting
          const contentToCopy = selectedAccounts.map(a => {
            const variant = v[a.id];
            return variant.hashtags
              ? `${variant.content}\n\n${variant.hashtags.split(",").map(t => `#${t.trim()}`).join(" ")}`
              : variant.content;
          }).join("\n\n---\n\n");

          try {
            await navigator.clipboard.writeText(contentToCopy);
            toast.warning("Post saved — copy to clipboard ready", {
              description: "Twitter Free tier doesn't allow API posting. Content copied! Click 'Open X' to paste manually.",
              duration: 10000,
              action: {
                label: "Open X",
                onClick: () => window.open("https://x.com/compose/post", "_blank"),
              },
            });
          } catch {
            toast.warning("Post saved — manual posting required", {
              description: "Twitter Free tier doesn't allow API posting. Upgrade to Basic ($100/mo) or post manually at x.com/compose/post",
              duration: 10000,
              action: {
                label: "Open X",
                onClick: () => window.open("https://x.com/compose/post", "_blank"),
              },
            });
          }
        } else {
          toast.error("Post saved but not published", {
            description: firstError?.message?.slice(0, 150) ?? "Unknown error.",
            duration: 8000,
          });
        }
      }

      setState(DEFAULT_STATE);
    } catch {
      toast.error("Network error");
    } finally {
      setPublishing(false);
    }
  }

  function submitUrl() {
    if (!urlInput.trim()) {
      toast.error("Enter an image URL");
      return;
    }
    update({ mediaUrl: urlInput.trim() });
    setUrlInput("");
    setUploadOpen(false);
    toast.success("Media URL added");
  }

  const canContinue =
    state.step === 1
      ? selectedAccounts.length > 0
      : state.step === 2
      ? state.caption.trim().length > 0
      : state.step === 3
      ? !!state.mediaUrl
      : state.step === 4
      ? true
      : false;

  return (
    <div className="space-y-5 pb-28">
      <StepIndicator step={state.step} onStep={goToStep} />

      <div className="mx-auto w-full max-w-3xl space-y-5">
        {state.step === 1 && (
          <Step1
            accounts={filteredAccounts}
            selectedIds={state.selectedAccountIds}
            onToggle={toggleAccount}
            onSelectAll={selectAll}
            onClear={clearAll}
            search={search}
            onSearch={setSearch}
            selectedAccounts={selectedAccounts}
          />
        )}
        {state.step === 2 && (
          <Step2
            caption={state.caption}
            onCaption={(caption) => update({ caption })}
            tone={state.tone}
            onTone={(tone) => update({ tone })}
            onGenerate={() => generate()}
            generating={generating}
            hasVariants={Object.keys(state.variants).length > 0}
            selectedCount={selectedAccounts.length}
            variants={state.variants}
            selectedAccounts={selectedAccounts}
          />
        )}
        {state.step === 3 && (
          <Step3
            mediaUrl={state.mediaUrl}
            mediaType={state.mediaType}
            altText={state.altText}
            onMedia={(mediaUrl) => update({ mediaUrl })}
            onMediaType={(mediaType) => update({ mediaType })}
            onAltText={(altText) => update({ altText })}
            uploadOpen={uploadOpen}
            onUploadOpen={setUploadOpen}
            urlInput={urlInput}
            onUrlInput={setUrlInput}
            onUrlSubmit={submitUrl}
            mediaAssets={mediaAssets}
            user={user}
            cropAspect={cropAspect}
            onCropAspect={setCropAspect}
          />
        )}
        {state.step === 4 && (
          <Step4
            accounts={selectedAccounts}
            variants={state.variants}
            onVariantChange={(id, v) =>
              setState((s) => ({ ...s, variants: { ...s.variants, [id]: v } }))
            }
            mediaUrl={state.mediaUrl}
            caption={state.caption}
            onRegenerate={(id) => generate(id)}
            onRegenerateAll={() => generate()}
            generating={generating}
          />
        )}
        {state.step === 5 && (
          <Step5
            accounts={selectedAccounts}
            mediaUrl={state.mediaUrl}
            mediaType={state.mediaType}
            tone={state.tone}
            caption={state.caption}
            scheduleEnabled={state.scheduleEnabled}
            onScheduleEnabled={(scheduleEnabled) => update({ scheduleEnabled })}
            scheduledAt={state.scheduledAt}
            onScheduledAt={(scheduledAt) => update({ scheduledAt })}
            hasVariants={Object.keys(state.variants).length > 0}
          />
        )}
      </div>

      <StepFooter
        step={state.step}
        onBack={back}
        onNext={next}
        canContinue={canContinue}
        onPublish={publish}
        publishing={publishing}
        scheduleEnabled={state.scheduleEnabled}
      />
    </div>
  );
}

/* ============================================================
   Step indicator — sticky, responsive (collapses on mobile)
   ============================================================ */
function StepIndicator({
  step,
  onStep,
}: {
  step: Step;
  onStep: (s: Step) => void;
}) {
  const current = STEPS.find((s) => s.id === step) ?? STEPS[0];
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="glass-strong glass-sheen rounded-2xl px-4 py-3 sm:px-5">
        {/* Mobile — compact */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground glow-pulse">
              {step}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Step {step} of {STEPS.length}
              </div>
              <div className="truncate text-sm font-semibold">{current.label}</div>
            </div>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  s.id === step
                    ? "w-5 bg-primary"
                    : s.id < step
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Desktop — full stepper */}
        <div className="hidden items-center sm:flex">
          {STEPS.map((s, i) => {
            const done = s.id < step;
            const active = s.id === step;
            const clickable = s.id <= step;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStep(s.id)}
                  className={cn(
                    "group flex shrink-0 items-center gap-2.5 transition",
                    clickable ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground glow-pulse"
                        : done
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : s.id}
                  </span>
                  <div className="text-left">
                    <div
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        active
                          ? "text-foreground"
                          : done
                          ? "text-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </div>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "mx-2 h-0.5 flex-1 rounded-full transition-all",
                      s.id < step ? "bg-primary/50" : "bg-border"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step 1 — Select Accounts
   ============================================================ */
function Step1({
  accounts,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  search,
  onSearch,
  selectedAccounts,
}: {
  accounts: AccountData[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  search: string;
  onSearch: (v: string) => void;
  selectedAccounts: AccountData[];
}) {
  const combinedReach = selectedAccounts.reduce((s, a) => s + a.followers, 0);
  return (
    <GlassCard
      strong
      className="crystal-in glass-sheen relative overflow-hidden p-5 sm:p-7"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
      <SectionTitle
        title="Where should we publish?"
        desc="Pick the destination accounts. We'll adapt your message for each platform."
        action={
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onSelectAll}
              className="font-medium text-primary hover:underline"
            >
              Select all
            </button>
            <span className="text-muted-foreground/60">·</span>
            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name, handle, or platform…"
          className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* Account grid */}
        <div className="scroll-liquid max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {accounts.length === 0 ? (
            <div className="grid place-items-center py-12 text-center text-sm text-muted-foreground">
              No accounts match your search.
            </div>
          ) : (
            accounts.map((a, i) => {
              const on = selectedIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => onToggle(a.id)}
                  style={{ animationDelay: `${0.05 + i * 0.03}s` }}
                  className={cn(
                    "crystal-in flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                    on
                      ? "border-primary/40 bg-primary/10 ring-1 ring-primary/30"
                      : "border-border/40 hover:border-border hover:bg-muted/50"
                  )}
                >
                  <PlatformBadge platform={a.platform} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-semibold">
                        {a.displayName}
                      </span>
                      {a.verified && <VerifiedTick className="text-primary" />}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {a.handle} · {fmt(a.followers)} followers
                    </div>
                  </div>
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full border transition",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Summary panel — desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="label-caps text-muted-foreground">Selected</div>
              <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {selectedIds.length}
              </span>
            </div>
            <div className="scroll-liquid max-h-[340px] space-y-1 overflow-y-auto pr-1">
              {selectedAccounts.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nothing selected yet.
                </div>
              ) : (
                selectedAccounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/40"
                  >
                    <PlatformBadge platform={a.platform} size={22} />
                    <span className="truncate text-xs font-medium">
                      {a.displayName}
                    </span>
                    <button
                      onClick={() => onToggle(a.id)}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${a.displayName}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {selectedAccounts.length > 0 && (
              <div className="mt-3 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                Combined reach:{" "}
                <b className="text-foreground">{fmt(combinedReach)}</b> followers
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile inline summary */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground lg:hidden">
        <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-primary px-1.5 font-bold text-primary-foreground">
          {selectedIds.length}
        </span>
        accounts selected · combined reach{" "}
        <b className="text-foreground">{fmt(combinedReach)}</b>
      </div>
    </GlassCard>
  );
}

/* ============================================================
   Step 2 — Text Content
   ============================================================ */
function Step2({
  caption,
  onCaption,
  tone,
  onTone,
  onGenerate,
  generating,
  hasVariants,
  selectedCount,
  variants,
  selectedAccounts,
}: {
  caption: string;
  onCaption: (v: string) => void;
  tone: string;
  onTone: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
  hasVariants: boolean;
  selectedCount: number;
  variants: Record<string, Variant>;
  selectedAccounts: { id: string; platform: PlatformId; handle: string; displayName: string }[];
}) {
  const charCount = caption.length;
  return (
    <GlassCard
      strong
      className="crystal-in glass-sheen relative overflow-hidden p-5 sm:p-7"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[oklch(0.72_0.13_190)]/20 blur-3xl" />
      <SectionTitle
        title="What's the message?"
        desc="Write your brief once. Our AI adapts it natively for each platform in the next step."
      />

      <div className="relative">
        <textarea
          value={caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="e.g. Introducing our new collection — designed for creators who move fast. Built to last, made to inspire."
          className="scroll-liquid min-h-[160px] w-full resize-y rounded-2xl border border-border/50 bg-muted/30 p-4 text-[15px] outline-none transition focus:border-primary/50 focus:bg-background/60"
        />
        <div className="pointer-events-none absolute bottom-3 right-3">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[10px] font-medium",
              charCount > 500
                ? "bg-rose-500/15 text-rose-500"
                : "bg-muted/70 text-muted-foreground"
            )}
          >
            {charCount} chars
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Tone of voice
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => onTone(t)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                tone === t
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={generating || !caption.trim() || selectedCount === 0}
          className="liquid-gold glow-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {generating
            ? "Generating…"
            : hasVariants
            ? "Regenerate AI variants"
            : "Generate AI variants"}
        </button>
        {selectedCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            For{" "}
            <b className="text-foreground">{selectedCount}</b> selected account
            {selectedCount === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Select accounts in step 1 first
          </span>
        )}
      </div>

      {/* === Generated variants preview — shown immediately after AI completes === */}
      {hasVariants && !generating && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {Object.keys(variants).length} AI-generated variant{Object.keys(variants).length === 1 ? "" : "s"} ready
          </div>
          {selectedAccounts.map((a) => {
            const v = variants[a.id];
            if (!v) return null;
            const p = PLATFORMS[a.platform];
            return (
              <div key={a.id} className="crystal-in rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                    <PlatformBadge platform={a.platform} size={18} />
                  </div>
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground">{a.handle}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{v.content.length} chars</span>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{v.content}</p>
                {v.hashtags && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.hashtags.split(",").map((tag, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="text-xs leading-relaxed text-foreground/80">
            <b className="text-foreground">Tip:</b> Front-load your hook in the
            first 1–2 lines. Mention the offer or emotion early — our AI will
            keep your angle but reshape length, hashtags, and tone per platform.
            Aim for 60–280 characters for best results.
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ============================================================
   Step 3 — Graphics / Media Upload
   ============================================================ */
function Step3({
  mediaUrl,
  mediaType,
  altText,
  onMedia,
  onMediaType,
  onAltText,
  uploadOpen,
  onUploadOpen,
  urlInput,
  onUrlInput,
  onUrlSubmit,
  mediaAssets,
  user,
  cropAspect,
  onCropAspect,
}: {
  mediaUrl: string;
  mediaType: MediaType;
  altText: string;
  onMedia: (v: string) => void;
  onMediaType: (v: MediaType) => void;
  onAltText: (v: string) => void;
  uploadOpen: boolean;
  onUploadOpen: (o: boolean) => void;
  urlInput: string;
  onUrlInput: (v: string) => void;
  onUrlSubmit: () => void;
  mediaAssets: MediaAssetLite[];
  user?: { id: string } | null;
  cropAspect: string;
  onCropAspect: (v: string) => void;
}) {
  return (
    <GlassCard
      strong
      className="crystal-in glass-sheen relative overflow-hidden p-5 sm:p-7"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[oklch(0.74_0.12_145)]/20 blur-3xl" />
      <SectionTitle
        title="Add visuals"
        desc="Pick from your media library, or paste an image URL."
      />

      {/* Media type toggle */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {MEDIA_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onMediaType(opt.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              mediaType === opt.id
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <opt.icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Drop zone / preview */}
      <button
        type="button"
        onClick={() => onUploadOpen(true)}
        className={cn(
          "group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-2 transition hover:border-primary/50 hover:bg-muted/40",
          mediaUrl ? "min-h-[280px]" : "min-h-[220px]"
        )}
      >
        {mediaUrl ? (
          <>
            <div className="flex items-center justify-center" style={{ aspectRatio: cropAspect.replace(":", "/") }}>
              <img
                src={mediaUrl}
                alt={altText || "Selected media"}
                className="max-h-[340px] w-full rounded-xl object-cover"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
                <RefreshCw className="h-3 w-3" /> Replace media
              </span>
            </div>
          </>
        ) : (
          <div className="grid place-items-center py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-medium">Click to browse or upload</div>
            <div className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, MP4 · up to 50MB
            </div>
          </div>
        )}
      </button>

      {/* Media library grid */}
      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Media library
        </div>
        {mediaAssets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
            No media yet. Paste a URL above, or upload assets from the Media
            Library view first.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {mediaAssets.map((m) => (
              <button
                key={m.id}
                onClick={() => onMedia(m.url)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-xl ring-2 transition",
                  mediaUrl === m.url ? "ring-primary" : "ring-transparent hover:ring-border"
                )}
              >
                <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                {mediaUrl === m.url && (
                  <span className="absolute inset-0 grid place-items-center bg-primary/30">
                    <Check className="h-4 w-4 text-white drop-shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alt text + crop hint */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">
            Alt text (accessibility)
          </Label>
          <input
            value={altText}
            onChange={(e) => onAltText(e.target.value)}
            placeholder="Describe the image for screen readers"
            className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">Crop aspect</Label>
          <div className="flex flex-wrap gap-1.5">
            {["1:1", "4:5", "16:9", "9:16"].map((c) => (
              <button
                key={c}
                onClick={() => onCropAspect(c)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-xs font-medium transition",
                  cropAspect === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={onUploadOpen}
        onPick={(m) => {
          onMedia(m);
          onUploadOpen(false);
        }}
        urlInput={urlInput}
        onUrlInput={onUrlInput}
        onUrlSubmit={onUrlSubmit}
        current={mediaUrl}
        mediaAssets={mediaAssets}
        userId={user?.id}
      />
    </GlassCard>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  onPick,
  urlInput,
  onUrlInput,
  onUrlSubmit,
  current,
  mediaAssets,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (m: string) => void;
  urlInput: string;
  onUrlInput: (v: string) => void;
  onUrlSubmit: () => void;
  current: string;
  mediaAssets: MediaAssetLite[];
  userId?: string;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!userId) {
      toast.error("Sign in to upload files");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("File too large (max 1.5MB). Use a URL for larger files.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadedById", userId);
      fd.append("folder", "root");
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.url) {
        toast.success(`"${file.name}" uploaded`);
        onPick(json.url);
        onOpenChange(false);
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose media</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* === Direct file upload (drag-and-drop) === */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition",
              dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/40",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <div className="text-sm font-medium">
              {uploading ? "Uploading…" : "Drop a file or click to upload"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              PNG, JPG, MP4 · max 1.5MB
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border/40" />
            or paste URL
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {/* URL input */}
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">Image URL</Label>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => onUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
              />
              <button
                onClick={onUrlSubmit}
                className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <Link2 className="h-3.5 w-3.5" /> Use URL
              </button>
            </div>
          </div>

          {/* Media library grid */}
          {mediaAssets.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="h-px flex-1 bg-border/40" />
                or pick from library
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {mediaAssets.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onPick(m.url);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl ring-2 transition",
                      current === m.url ? "ring-primary" : "ring-transparent hover:ring-border"
                    )}
                  >
                    <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                    {current === m.url && (
                      <span className="absolute inset-0 grid place-items-center bg-primary/30">
                        <Check className="h-4 w-4 text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <DialogClose asChild>
            <button className="rounded-xl border border-border/50 bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted">
              Done
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Step 4 — Preview
   ============================================================ */
function Step4({
  accounts,
  variants,
  onVariantChange,
  mediaUrl,
  caption,
  onRegenerate,
  onRegenerateAll,
  generating,
}: {
  accounts: AccountData[];
  variants: Record<string, Variant>;
  onVariantChange: (id: string, v: Variant) => void;
  mediaUrl: string;
  caption: string;
  onRegenerate: (id: string) => void;
  onRegenerateAll: () => void;
  generating: boolean;
}) {
  const hasVariants = Object.keys(variants).length > 0;

  if (accounts.length === 0) {
    return (
      <GlassCard className="crystal-in grid place-items-center p-10 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Go back to step 1 and select at least one account to preview your
          posts.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      strong
      className="crystal-in glass-sheen relative overflow-hidden p-5 sm:p-7"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[oklch(0.66_0.11_220)]/20 blur-3xl" />
      <SectionTitle
        title="Review your posts"
        desc="AI-generated per platform. Edit freely — these will be published as-is."
        action={
          <button
            onClick={onRegenerateAll}
            disabled={generating}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
            Regenerate all
          </button>
        }
      />

      <Tabs defaultValue={accounts[0]?.id} className="w-full">
        <div className="scroll-liquid mb-4 max-w-full overflow-x-auto pb-1">
          <TabsList className="h-auto flex w-max gap-1 bg-muted/40 p-1">
            {accounts.map((a) => (
              <TabsTrigger
                key={a.id}
                value={a.id}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <PlatformBadge platform={a.platform} size={20} />
                <span className="hidden sm:inline">{a.handle}</span>
                <span className="sm:hidden">{PLATFORMS[a.platform].short}</span>
                {variants[a.id] && (
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500/30 text-emerald-500">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {accounts.map((a) => {
          const p = PLATFORMS[a.platform];
          const variant = variants[a.id];
          const content = variant?.content ?? caption;
          const hashtags = variant?.hashtags ?? "";
          const overLimit = content.length > p.charLimit;
          return (
            <TabsContent key={a.id} value={a.id} className="mt-0">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Editor */}
                <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <PlatformBadge platform={a.platform} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        {a.displayName}
                        {a.verified && <VerifiedTick className="text-primary" />}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {a.handle} · {p.name}
                      </div>
                    </div>
                    {variant && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                    <button
                      onClick={() => onRegenerate(a.id)}
                      disabled={generating}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary disabled:opacity-50"
                      title="Regenerate this variant"
                      aria-label={`Regenerate ${a.displayName} variant`}
                    >
                      <RefreshCw
                        className={cn("h-3.5 w-3.5", generating && "animate-spin")}
                      />
                    </button>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) =>
                      onVariantChange(a.id, {
                        content: e.target.value,
                        hashtags,
                      })
                    }
                    placeholder={`Write a ${p.name}-native caption…`}
                    className="scroll-liquid min-h-[120px] w-full resize-y rounded-xl border border-border/40 bg-background/60 p-3 text-sm outline-none transition focus:border-primary/50"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      value={hashtags}
                      onChange={(e) =>
                        onVariantChange(a.id, {
                          content,
                          hashtags: e.target.value,
                        })
                      }
                      placeholder="hashtags, comma, separated"
                      className="flex-1 rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5 text-xs outline-none focus:border-primary/50"
                    />
                    <span
                      className={cn(
                        "shrink-0 text-[10px]",
                        overLimit
                          ? "font-semibold text-rose-500"
                          : "text-muted-foreground"
                      )}
                    >
                      {content.length}/{p.charLimit}
                    </span>
                  </div>
                </div>

                {/* Phone preview */}
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Preview
                  </div>
                  <PhonePreview
                    account={a}
                    content={content}
                    mediaUrl={mediaUrl}
                    hashtags={hashtags}
                  />
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {!hasVariants && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            No AI variants yet — these previews show your base caption. Go back
            to step 2 and tap{" "}
            <b className="text-foreground">Generate AI variants</b> for
            platform-native rewrites.
          </span>
        </div>
      )}
    </GlassCard>
  );
}

function PhonePreview({
  account,
  content,
  mediaUrl,
  hashtags,
}: {
  account: AccountData;
  content: string;
  mediaUrl: string;
  hashtags: string;
}) {
  const tags = hashtags
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
  return (
    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-3xl border border-border/60 bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <PlatformBadge platform={account.platform} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="truncate">{account.displayName}</span>
            {account.verified && <VerifiedTick className="text-primary" />}
          </div>
          <div className="text-[10px] text-muted-foreground">{account.handle}</div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Body */}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-3 text-muted-foreground">
          <Heart className="h-4 w-4" />
          <MessageCircle className="h-4 w-4" />
          <Send className="h-4 w-4" />
          <Bookmark className="ml-auto h-4 w-4" />
        </div>
        <div className="text-[10px] font-semibold">
          {fmt(account.followers)} followers
        </div>
        <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-foreground/90">
          {content || "Your caption will appear here…"}
        </p>
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-1 text-[11px] font-medium text-primary">
            {tags.slice(0, 6).map((t, i) => (
              <span key={t + i}>#{t}</span>
            ))}
          </div>
        )}
        <div className="mt-2 text-[9px] uppercase tracking-wide text-muted-foreground">
          {PLATFORMS[account.platform].name}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step 5 — Post
   ============================================================ */
function Step5({
  accounts,
  mediaUrl,
  mediaType,
  tone,
  caption,
  scheduleEnabled,
  onScheduleEnabled,
  scheduledAt,
  onScheduledAt,
  hasVariants,
}: {
  accounts: AccountData[];
  mediaUrl: string;
  mediaType: MediaType;
  tone: string;
  caption: string;
  scheduleEnabled: boolean;
  onScheduleEnabled: (v: boolean) => void;
  scheduledAt: string;
  onScheduledAt: (v: string) => void;
  hasVariants: boolean;
}) {
  const checklist = [
    { label: `Accounts selected (${accounts.length})`, done: accounts.length > 0 },
    { label: "Content written", done: caption.trim().length > 0 },
    { label: "Media added", done: !!mediaUrl },
    { label: "AI variants ready", done: hasVariants },
  ];
  const allDone = checklist.every((c) => c.done);
  const combinedReach = accounts.reduce((s, a) => s + a.followers, 0);

  return (
    <GlassCard
      strong
      className="crystal-in glass-sheen relative overflow-hidden p-5 sm:p-7"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[oklch(0.72_0.13_190)]/20 blur-3xl" />
      <SectionTitle
        title="Ready to publish"
        desc="Review everything and hit publish. You can also schedule for later."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Summary */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="label-caps mb-3 text-muted-foreground">Summary</div>
            <div className="space-y-2.5">
              <Row
                label="Accounts"
                value={`${accounts.length} selected · ${fmt(combinedReach)} reach`}
              />
              <Row
                label="Media type"
                value={mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}
              />
              <Row label="Tone" value={tone} />
              <Row
                label="Caption"
                value={
                  <span className="line-clamp-2 italic text-muted-foreground">
                    “{caption.slice(0, 80) || "(empty)"}
                    {caption.length > 80 ? "…" : ""}”
                  </span>
                }
              />
            </div>
            {mediaUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border/40">
                <img
                  src={mediaUrl}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="label-caps mb-3 text-muted-foreground">
              Destination accounts
            </div>
            <div className="scroll-liquid max-h-44 space-y-1 overflow-y-auto pr-1">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/40"
                >
                  <PlatformBadge platform={a.platform} size={22} />
                  <span className="truncate text-xs font-medium">
                    {a.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {a.handle}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {fmt(a.followers)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule + checklist */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Publish now</div>
                <div className="text-[11px] text-muted-foreground">
                  Send immediately to all selected accounts
                </div>
              </div>
              <Switch
                checked={!scheduleEnabled}
                onCheckedChange={(v) => onScheduleEnabled(!v)}
                aria-label="Publish now"
              />
            </div>
            <div className="my-3 border-t border-border/40" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Schedule for later</div>
                <div className="text-[11px] text-muted-foreground">
                  Pick a future date &amp; time
                </div>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={onScheduleEnabled}
                aria-label="Schedule for later"
              />
            </div>
            {scheduleEnabled && (
              <div className="mt-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => onScheduledAt(e.target.value)}
                  className="flex-1 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="label-caps mb-3 text-muted-foreground">
              Pre-publish checklist
            </div>
            <div className="space-y-2">
              {checklist.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                      c.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {c.done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                  </span>
                  <span className={c.done ? "text-foreground" : "text-muted-foreground"}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
            <div
              className={cn(
                "mt-3 flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium",
                allDone
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {allDone ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {allDone
                ? "All set — ready to publish."
                : "Some items need attention before publishing."}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-xs font-medium">{value}</span>
    </div>
  );
}

/* ============================================================
   Sticky footer with Back / Continue / Publish
   ============================================================ */
function StepFooter({
  step,
  onBack,
  onNext,
  canContinue,
  onPublish,
  publishing,
  scheduleEnabled,
}: {
  step: Step;
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
  onPublish: () => void;
  publishing: boolean;
  scheduleEnabled: boolean;
}) {
  const isPublish = step === 5;
  return (
    <div className="sticky bottom-0 z-30 -mx-4 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="glass-strong flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Step {step} of 5
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPublish ? (
            <button
              onClick={onPublish}
              disabled={publishing}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : scheduleEnabled ? (
                <CalendarClock className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {publishing
                ? "Publishing…"
                : scheduleEnabled
                ? "Schedule post"
                : "Publish now"}
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canContinue}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
