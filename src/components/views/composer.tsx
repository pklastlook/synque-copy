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
  Upload,
  Link2,
  Lightbulb,
  AlertCircle,
  X,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Bookmark,
  FileEdit,
  RotateCw,
  Pencil,
  Bot,
  User as UserIcon,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge, VerifiedTick } from "@/components/glass/platform-badge";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Post } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SectionHeader, Pill } from "@/components/glass/dense-ui";

/* ============================================================
   Types
   ============================================================ */
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

interface MediaAssetLite {
  id: string;
  name: string;
  type: string;
  url: string;
}

interface MediaLibraryResponse {
  assets: MediaAssetLite[];
}

type MediaType = "image" | "video" | "carousel";

interface ComposerState {
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

const TONES = [
  "Professional",
  "Friendly",
  "Energetic",
  "Inspirational",
  "Witty",
  "Educational",
  "Luxurious",
];

const MEDIA_TYPE_OPTIONS: { id: MediaType; label: string; icon: LucideIcon }[] = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "carousel", label: "Carousel", icon: Layers },
];

const DEFAULT_STATE: ComposerState = {
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

/* ============================================================
   ComposerView — single-column workflow with sticky preview.
   No wizard steps; the user reads top-to-bottom: accounts →
   brief → AI variants → media → schedule → publish. The phone
   preview floats in a sticky aside on desktop and stacks below
   on mobile.
   ============================================================ */
export function ComposerView() {
  const { composerSeed, clearComposerSeed, composerEditPost, clearComposerEditPost } = useNav();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const { data: accounts } = useApi<AccountData[]>("/api/accounts");
  const { data: mediaData } = useApi<MediaLibraryResponse>("/api/media");
  // Drafts (status=draft) + failed posts — eligible for republish.
  const { data: draftsData, reload: reloadDrafts } = useApi<Post[]>("/api/posts?status=draft");
  const { data: failedData } = useApi<Post[]>("/api/posts?status=failed");
  const draftsList = React.useMemo(() => {
    const drafts = draftsData ?? [];
    const failed = failedData ?? [];
    // De-dupe by id (a post can't be both draft + failed, but be safe).
    const seen = new Set(drafts.map((p) => p.id));
    return [...drafts, ...failed.filter((p) => !seen.has(p.id))].slice(0, 12);
  }, [draftsData, failedData]);
  const mediaAssets = React.useMemo(
    () => (mediaData?.assets ?? []).filter((a) => a.type === "image"),
    [mediaData]
  );

  const [state, setState] = React.useState<ComposerState>(DEFAULT_STATE);
  const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [cropAspect, setCropAspect] = React.useState("1:1");
  // Which account the sticky preview is showing.
  const [previewAccountId, setPreviewAccountId] = React.useState<string>("");
  // Inline AI Assistant panel toggle.
  const [aiAssistantOpen, setAiAssistantOpen] = React.useState(false);

  const initRef = React.useRef(false);
  const editHydrateRef = React.useRef<string | null>(null);

  /* ----------------------------------------------------------
     Effects — preselect accounts, seed caption, hydrate edit
     ---------------------------------------------------------- */
  // Preselect the top 4 accounts by followers (the /api/accounts
  // route already sorts by followers desc) so the composer opens
  // with a sensible multi-platform default — without relying on
  // hardcoded seeded IDs.
  React.useEffect(() => {
    if (initRef.current || !accounts || accounts.length === 0) return;
    initRef.current = true;
    const presets = accounts.slice(0, 4).map((a) => a.id);
    if (presets.length) {
      setState((s) => ({ ...s, selectedAccountIds: presets }));
    }
  }, [accounts]);

  // Composer seed prefill — set caption (no step jump, single flow).
  React.useEffect(() => {
    if (composerSeed) {
      setState((s) => ({ ...s, caption: composerSeed }));
      clearComposerSeed();
    }
  }, [composerSeed, clearComposerSeed]);

  // When openComposerWithPost(post) is called, hydrate the composer
  // state from the post's data so the user can edit + regenerate.
  React.useEffect(() => {
    if (!composerEditPost) return;
    if (editHydrateRef.current === composerEditPost.id) return; // already hydrated
    editHydrateRef.current = composerEditPost.id;

    const p = composerEditPost;
    const variantMap: Record<string, Variant> = {};
    for (const v of p.variants) {
      variantMap[v.accountId] = {
        content: v.content ?? "",
        hashtags: v.hashtags ?? "",
      };
    }
    let selectedAccountIds = p.variants.map((v) => v.accountId);

    // Some older drafts were saved without any variants (e.g. drafts
    // created from a partial /api/posts POST that never made it to
    // the publish step). If that's the case, preselect the top 4 user
    // accounts so the user has somewhere to publish to — and let them know.
    const hadNoVariants = selectedAccountIds.length === 0;
    if (hadNoVariants && accounts && accounts.length > 0) {
      selectedAccountIds = accounts.slice(0, 4).map((a) => a.id);
    }

    setState({
      selectedAccountIds,
      caption: p.caption ?? "",
      tone: p.tone ?? "Friendly",
      mediaUrl: p.mediaUrl ?? "",
      mediaType: (p.mediaType === "video" ? "video" : p.mediaType === "carousel" ? "carousel" : "image"),
      altText: "",
      variants: variantMap,
      scheduledAt: p.scheduledAt ?? "",
      scheduleEnabled: false,
    });
    setEditingPostId(p.id);
    toast.info(`Loaded draft "${p.title}"`, {
      description: hadNoVariants
        ? "Edit and publish when ready. (No destination accounts were saved — preselected for you.)"
        : "Edit and publish when ready. This will overwrite the existing draft.",
    });
  }, [composerEditPost, accounts]);

  // Keep previewAccountId valid as selection changes — auto-jump to
  // the first selected account if the current preview target is no
  // longer selected.
  const selectedAccounts = React.useMemo(
    () => (accounts ?? []).filter((a) => state.selectedAccountIds.includes(a.id)),
    [accounts, state.selectedAccountIds]
  );
  React.useEffect(() => {
    if (selectedAccounts.length === 0) {
      if (previewAccountId) setPreviewAccountId("");
      return;
    }
    if (!selectedAccounts.find((a) => a.id === previewAccountId)) {
      setPreviewAccountId(selectedAccounts[0].id);
    }
  }, [selectedAccounts, previewAccountId]);

  /* ----------------------------------------------------------
     Actions — discard, load draft, generate, publish, url
     ---------------------------------------------------------- */
  function discardEdit() {
    editHydrateRef.current = null;
    setEditingPostId(null);
    clearComposerEditPost();
    setState(DEFAULT_STATE);
    setPreviewAccountId("");
    setAiAssistantOpen(false);
    // Re-run account preselect if accounts already loaded.
    initRef.current = false;
  }

  function loadDraft(post: Post) {
    // Use the store so the same hydrate effect handles it.
    useNav.getState().openComposerWithPost(post);
  }

  const update = React.useCallback((patch: Partial<ComposerState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const accountsList = accounts ?? [];
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
          // Auto-select the first variant for preview/editing.
          if (!previewAccountId && selectedAccounts.length > 0) {
            setPreviewAccountId(selectedAccounts[0].id);
          }
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
      // 1. Save the post to the database — POST for new, PATCH for republish/edit.
      const v: Record<string, { content: string; hashtags?: string }> = {};
      for (const a of selectedAccounts) {
        const ex = state.variants[a.id];
        v[a.id] = ex ?? { content: state.caption, hashtags: "" };
      }
      const scheduledAt =
        state.scheduleEnabled && state.scheduledAt
          ? new Date(state.scheduledAt).toISOString()
          : null;

      const newStatus = scheduledAt ? "scheduled" : "published";
      const postPayload = {
        title: state.caption.slice(0, 50).trim() || "Untitled",
        caption: state.caption,
        mediaUrl: state.mediaUrl || null,
        tone: state.tone,
        scheduledAt,
        accountIds: selectedAccounts.map((a) => a.id),
        variants: v,
        authorId: currentUserId,
      };

      let savedPostId: string | null = editingPostId;

      if (editingPostId) {
        // Republish path — PATCH the existing draft/failed post.
        const res = await fetch(`/api/posts/${editingPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: postPayload.title,
            caption: postPayload.caption,
            mediaUrl: postPayload.mediaUrl,
            tone: postPayload.tone,
            status: newStatus,
            scheduledAt,
            variants: v,
          }),
        });
        if (!res.ok) {
          toast.error("Failed to update draft");
          return;
        }
      } else {
        // New post path — POST.
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postPayload),
        });
        if (!res.ok) {
          toast.error("Failed to save post");
          return;
        }
        const json = await res.json();
        savedPostId = json.id ?? null;
      }

      // 2. If scheduled, skip real posting (will be posted later)
      if (state.scheduleEnabled && scheduledAt) {
        toast.success(editingPostId ? "Draft updated & scheduled" : "Post scheduled", {
          description: `Will be published on ${new Date(scheduledAt).toLocaleString()}`,
        });
        editHydrateRef.current = null;
        setEditingPostId(null);
        clearComposerEditPost();
        setState(DEFAULT_STATE);
        setPreviewAccountId("");
        reloadDrafts();
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

      // 4. If every platform failed, flip the post status back to "failed"
      //    so the user can retry from the drafts list (instead of leaving
      //    it stranded as "published" with zero real delivery).
      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (savedPostId && succeeded.length === 0 && failed.length > 0) {
        await fetch(`/api/posts/${savedPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "failed" }),
        }).catch(() => null);
      }

      // 5. Show results with iOS-style popups
      if (succeeded.length > 0 && failed.length === 0) {
        toast.success(editingPostId ? "Republished!" : "Published!", {
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
          toast.error(editingPostId ? "Republish failed — draft restored" : "Post saved but not published", {
            description: firstError?.message?.slice(0, 150) ?? "Unknown error.",
            duration: 8000,
          });
        }
      }

      // Reset composer state on any "completed" outcome (success/partial/failure
      // with restored draft). User can re-load from the drafts list if needed.
      editHydrateRef.current = null;
      setEditingPostId(null);
      clearComposerEditPost();
      setState(DEFAULT_STATE);
      setPreviewAccountId("");
      reloadDrafts();
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

  /* ----------------------------------------------------------
     Derived view state
     ---------------------------------------------------------- */
  const hasVariants = Object.keys(state.variants).length > 0;
  const combinedReach = selectedAccounts.reduce((s, a) => s + a.followers, 0);
  const charCount = state.caption.length;
  const previewAccount = selectedAccounts.find((a) => a.id === previewAccountId) ?? selectedAccounts[0];
  const previewVariant = previewAccount ? state.variants[previewAccount.id] : undefined;
  const previewContent = previewVariant?.content ?? state.caption;
  const previewHashtags = previewVariant?.hashtags ?? "";
  const canPublish = selectedAccounts.length > 0 && state.caption.trim().length > 0;

  /* ----------------------------------------------------------
     Render
     ---------------------------------------------------------- */
  return (
    <div className="space-y-5 pb-24">
      {/* Editing / republish banner — inline, not a card */}
      {editingPostId && (
        <EditingBanner
          postId={editingPostId}
          title={state.caption.slice(0, 50).trim() || "Untitled"}
          onDiscard={discardEdit}
        />
      )}

      {/* Drafts / failed posts picker — only when NOT already editing */}
      {!editingPostId && (
        <DraftsPanel drafts={draftsList} onLoad={loadDraft} />
      )}

      {/* === Two-column layout: main flow + sticky preview === */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        {/* MAIN FLOW (scrollable) */}
        <main className="min-w-0 space-y-8">
          {/* === Step 1: Accounts === */}
          <section className="space-y-3">
            <SectionHeader
              title="1 · Accounts"
              desc="Pick destination accounts"
              icon={CheckCircle2}
              action={
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={selectAll}
                    className="font-medium text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/60">·</span>
                  <button
                    onClick={clearAll}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              }
            />

            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, handle, or platform…"
                className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
              />
            </div>

            {/* Account list — single column, dense rows */}
            <div className="scroll-liquid max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {filteredAccounts.length === 0 ? (
                <div className="grid place-items-center py-12 text-center text-sm text-muted-foreground">
                  No accounts match your search.
                </div>
              ) : (
                filteredAccounts.map((a) => {
                  const on = state.selectedAccountIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAccount(a.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition",
                        on
                          ? "border-primary/40 bg-primary/10 ring-1 ring-primary/30"
                          : "border-border/40 hover:border-border hover:bg-muted/40"
                      )}
                    >
                      <PlatformBadge platform={a.platform} size={32} />
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
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
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

            {/* Inline summary */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Pill color={selectedAccounts.length > 0 ? "green" : "neutral"}>
                {selectedAccounts.length} selected
              </Pill>
              {selectedAccounts.length > 0 && (
                <span>
                  · combined reach{" "}
                  <b className="text-foreground">{fmt(combinedReach)}</b> followers
                </span>
              )}
            </div>
          </section>

          {/* === Step 2: Brief === */}
          <section className="space-y-3">
            <SectionHeader
              title="2 · Brief"
              desc="Write your message — AI will adapt it per platform"
              icon={Pencil}
            />

            {/* Caption textarea */}
            <div className="relative">
              <textarea
                value={state.caption}
                onChange={(e) => update({ caption: e.target.value })}
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

            {/* Tone of voice — inline pills */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Tone of voice
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ tone: t })}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition",
                      state.tone === t
                        ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip + AI Assistant toggle */}
            {!aiAssistantOpen ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/80">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <b className="text-foreground">Tip:</b> Front-load your hook in
                      the first 1–2 lines. Mention the offer or emotion early — our
                      AI will keep your angle but reshape length, hashtags, and tone
                      per platform. Aim for 60–280 characters for best results.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setAiAssistantOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-left transition hover:border-primary hover:bg-primary/10"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">
                      Try the AI Assistant
                      <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                        New
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Chat conversationally to draft and refine your caption
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    AI Assistant
                  </div>
                  <button
                    onClick={() => setAiAssistantOpen(false)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Collapse
                  </button>
                </div>
                <AIChatPanel
                  caption={state.caption}
                  onApplyCaption={(text) => update({ caption: text })}
                  tone={state.tone}
                  platforms={selectedAccounts.map((a) => PLATFORMS[a.platform].name)}
                />
              </div>
            )}
          </section>

          {/* === Step 3: AI Variants === */}
          <section className="space-y-3">
            <SectionHeader
              title="3 · AI Variants"
              desc="Per-platform native rewrites"
              icon={Sparkles}
              action={
                <button
                  onClick={() => generate()}
                  disabled={generating || !state.caption.trim() || selectedAccounts.length === 0}
                  className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {hasVariants ? "Regenerate all" : "Generate"}
                </button>
              }
            />

            {hasVariants ? (
              <>
                {/* Variant pills — pick which platform to edit/preview */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedAccounts.map((a) => {
                    const active = previewAccountId === a.id;
                    const has = !!state.variants[a.id];
                    return (
                      <button
                        key={a.id}
                        onClick={() => setPreviewAccountId(a.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <PlatformBadge platform={a.platform} size={16} />
                        <span>{PLATFORMS[a.platform].short}</span>
                        {has && (
                          <span className="grid h-3 w-3 place-items-center rounded-full bg-emerald-500/40 text-emerald-500">
                            <Check className="h-2 w-2" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Inline editor for the selected variant */}
                {previewAccount && (
                  <VariantEditor
                    account={previewAccount}
                    variant={state.variants[previewAccount.id]}
                    onChange={(v) =>
                      setState((s) => ({
                        ...s,
                        variants: { ...s.variants, [previewAccount.id]: v },
                      }))
                    }
                    onRegenerate={() => generate(previewAccount.id)}
                    generating={generating}
                    fallbackContent={state.caption}
                  />
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                {selectedAccounts.length === 0
                  ? "Select accounts above to enable AI generation."
                  : state.caption.trim()
                  ? "Click Generate to create per-platform variants."
                  : "Write a brief first, then generate variants."}
              </div>
            )}
          </section>

          {/* === Step 4: Media === */}
          <section className="space-y-3">
            <SectionHeader
              title="4 · Media"
              desc="Add visuals"
              icon={ImageIcon}
            />

            {/* Media type toggle */}
            <div className="flex flex-wrap gap-1.5">
              {MEDIA_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update({ mediaType: opt.id })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                    state.mediaType === opt.id
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
              onClick={() => setUploadOpen(true)}
              className={cn(
                "group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-2 transition hover:border-primary/50 hover:bg-muted/40",
                state.mediaUrl ? "min-h-[200px]" : "min-h-[160px]"
              )}
            >
              {state.mediaUrl ? (
                <>
                  <div
                    className="flex items-center justify-center"
                    style={{ aspectRatio: cropAspect.replace(":", "/") }}
                  >
                    <img
                      src={state.mediaUrl}
                      alt={state.altText || "Selected media"}
                      className="max-h-[280px] w-full rounded-xl object-cover"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
                      <RefreshCw className="h-3 w-3" /> Replace media
                    </span>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center py-6 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-sm font-medium">Click to browse or upload</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    PNG, JPG, MP4 · up to 25MB
                  </div>
                </div>
              )}
            </button>

            {/* Media library grid */}
            {mediaAssets.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  Media library
                </div>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                  {mediaAssets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => update({ mediaUrl: m.url })}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-lg ring-2 transition",
                        state.mediaUrl === m.url
                          ? "ring-primary"
                          : "ring-transparent hover:ring-border"
                      )}
                    >
                      <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                      {state.mediaUrl === m.url && (
                        <span className="absolute inset-0 grid place-items-center bg-primary/30">
                          <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alt text + crop aspect */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1 text-[11px] text-muted-foreground">
                  Alt text (accessibility)
                </Label>
                <input
                  value={state.altText}
                  onChange={(e) => update({ altText: e.target.value })}
                  placeholder="Describe the image"
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
                />
              </div>
              <div>
                <Label className="mb-1 text-[11px] text-muted-foreground">Crop aspect</Label>
                <div className="flex flex-wrap gap-1">
                  {["1:1", "4:5", "16:9", "9:16"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCropAspect(c)}
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
              onOpenChange={setUploadOpen}
              onPick={(m) => {
                update({ mediaUrl: m });
                setUploadOpen(false);
              }}
              urlInput={urlInput}
              onUrlInput={setUrlInput}
              onUrlSubmit={submitUrl}
              current={state.mediaUrl}
              mediaAssets={mediaAssets}
              userId={user?.id}
            />
          </section>

          {/* === Step 5: Schedule === */}
          <section className="space-y-3">
            <SectionHeader
              title="5 · Schedule"
              desc="Publish now or pick a future time"
              icon={CalendarClock}
            />

            {/* Publish mode — two toggle buttons */}
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => update({ scheduleEnabled: false })}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  !state.scheduleEnabled
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/40 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <Send className="h-4 w-4 text-primary" />
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      !state.scheduleEnabled ? "text-primary" : "opacity-0"
                    )}
                  />
                </div>
                <div className="mt-2 text-xs font-bold">Publish now</div>
                <div className="text-[10px] text-muted-foreground">Send immediately</div>
              </button>
              <button
                onClick={() => update({ scheduleEnabled: true })}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  state.scheduleEnabled
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/40 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      state.scheduleEnabled ? "text-primary" : "opacity-0"
                    )}
                  />
                </div>
                <div className="mt-2 text-xs font-bold">Schedule for later</div>
                <div className="text-[10px] text-muted-foreground">Pick a future date &amp; time</div>
              </button>
            </div>

            {/* DateTime picker */}
            {state.scheduleEnabled && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                <input
                  type="datetime-local"
                  value={state.scheduledAt}
                  onChange={(e) => update({ scheduledAt: e.target.value })}
                  className="flex-1 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
                />
              </div>
            )}

            {/* Pre-publish checklist */}
            <PrePublishChecklist
              accounts={selectedAccounts}
              caption={state.caption}
              mediaUrl={state.mediaUrl}
              hasVariants={hasVariants}
            />
          </section>
        </main>

        {/* STICKY PREVIEW — desktop only (lg:block) */}
        {previewAccount && (
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <SectionHeader
                title="Live preview"
                desc="Updates as you type"
                icon={Eye}
              />

              {/* Platform switcher tabs */}
              <div className="scroll-liquid flex gap-1 overflow-x-auto pb-1">
                {selectedAccounts.map((a) => {
                  const active = previewAccountId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setPreviewAccountId(a.id)}
                      title={a.displayName}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <PlatformBadge platform={a.platform} size={16} />
                      <span>{PLATFORMS[a.platform].short}</span>
                    </button>
                  );
                })}
              </div>

              {/* Phone preview — the phone mockup frame */}
              <PhonePreview
                account={previewAccount}
                content={previewContent}
                mediaUrl={state.mediaUrl}
                hashtags={previewHashtags}
              />

              {/* Char-limit indicator */}
              <div className="text-center text-[10px] text-muted-foreground">
                <span
                  className={cn(
                    previewContent.length > PLATFORMS[previewAccount.platform].charLimit &&
                      "font-semibold text-rose-500"
                  )}
                >
                  {previewContent.length}
                </span>
                {" / "}
                {PLATFORMS[previewAccount.platform].charLimit} chars on{" "}
                {PLATFORMS[previewAccount.platform].name}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* === Mobile preview — below the flow, not sticky === */}
      {previewAccount && (
        <section className="space-y-3 lg:hidden">
          <SectionHeader
            title="Live preview"
            desc="Tap a platform to switch"
            icon={Eye}
          />
          <div className="scroll-liquid flex gap-1 overflow-x-auto pb-1">
            {selectedAccounts.map((a) => {
              const active = previewAccountId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setPreviewAccountId(a.id)}
                  title={a.displayName}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <PlatformBadge platform={a.platform} size={16} />
                  <span>{PLATFORMS[a.platform].short}</span>
                </button>
              );
            })}
          </div>
          <PhonePreview
            account={previewAccount}
            content={previewContent}
            mediaUrl={state.mediaUrl}
            hashtags={previewHashtags}
          />
        </section>
      )}

      {/* === Sticky publish bar — bottom of viewport === */}
      <StickyPublishBar
        onPublish={publish}
        publishing={publishing}
        scheduleEnabled={state.scheduleEnabled}
        editing={!!editingPostId}
        disabled={!canPublish}
        accountCount={selectedAccounts.length}
        combinedReach={combinedReach}
      />
    </div>
  );
}

/* ============================================================
   Editing banner — inline alert (not a card)
   ============================================================ */
function EditingBanner({
  postId,
  title,
  onDiscard,
}: {
  postId: string;
  title: string;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-r-xl border-l-2 border-primary bg-primary/5 px-3 py-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <RotateCw className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Republishing draft
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
            {postId.slice(-6)}
          </span>
        </div>
        <div className="truncate text-sm font-semibold">{title}</div>
      </div>
      <button
        onClick={onDiscard}
        className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
        <span className="hidden sm:inline">Discard</span>
      </button>
    </div>
  );
}

/* ============================================================
   Drafts panel — list of saved draft + failed posts.
   Rendered as a card so it stands apart from the flow.
   ============================================================ */
function DraftsPanel({
  drafts,
  onLoad,
}: {
  drafts: Post[];
  onLoad: (post: Post) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (drafts.length === 0) return null;

  const visible = expanded ? drafts : drafts.slice(0, 4);

  return (
    <GlassCard className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <FileEdit className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Drafts &amp; failed posts</div>
            <div className="text-[10px] text-muted-foreground">
              {drafts.length} saved — click to edit &amp; republish
            </div>
          </div>
        </div>
        {drafts.length > 4 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted"
          >
            {expanded ? "Show less" : `Show all (${drafts.length})`}
          </button>
        )}
      </div>

      <div className="scroll-liquid -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {visible.map((p) => {
          const isFailed = p.status === "failed";
          return (
            <button
              key={p.id}
              onClick={() => onLoad(p)}
              className="group relative w-56 shrink-0 rounded-xl border border-border/40 bg-muted/20 p-2.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="mb-1.5 flex items-center gap-1">
                {p.variants.slice(0, 4).map((v) => (
                  <PlatformBadge key={v.id} platform={v.platform} size={14} />
                ))}
                {p.variants.length > 4 && (
                  <span className="text-[9px] text-muted-foreground">
                    +{p.variants.length - 4}
                  </span>
                )}
                <span
                  className={cn(
                    "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                    isFailed
                      ? "bg-rose-500/15 text-rose-500"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {p.status}
                </span>
              </div>
              <div className="line-clamp-1 text-xs font-semibold">
                {p.title || "Untitled"}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                {p.caption || "(no caption)"}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">
                  {timeAgo(p.createdAt)}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                  <Pencil className="h-2.5 w-2.5" /> Edit
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* ============================================================
   AI Chat Panel — ChatGPT-style conversational assistant.
   Inline within the Brief section when expanded.
   ============================================================ */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Suggestions returned by the AI — each can be applied to the textbox. */
  suggestions?: string[];
}

function AIChatPanel({
  caption,
  onApplyCaption,
  tone,
  platforms,
}: {
  caption: string;
  onApplyCaption: (text: string) => void;
  tone: string;
  platforms: string[];
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || sending) return;
    setInput("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          tone,
          platforms,
          currentCaption: caption,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.reply,
            suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I couldn't generate a response. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error — please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function applySuggestion(text: string) {
    onApplyCaption(text);
    toast.success("Caption applied");
  }

  function clearChat() {
    setMessages([]);
  }

  const quickPrompts = [
    "Write 3 caption drafts for our product launch",
    "Make my caption shorter and punchier",
    "Add relevant hashtags for Instagram",
    "Rewrite in a more casual tone",
  ];

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-border/50 bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/15 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[11px] font-bold">AI Content Writer</div>
            <div className="text-[9px] text-muted-foreground">
              Chat to draft, refine, and ideate captions
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="scroll-liquid flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 && !sending && (
          <div className="space-y-3">
            <div className="rounded-xl bg-background/60 p-2.5 text-[11px] text-muted-foreground">
              👋 Hi! I&apos;m your AI content writer. Tell me what you want to post
              about, and I&apos;ll draft captions tailored to your platforms ({" "}
              <span className="font-medium text-foreground">
                {platforms.length > 0 ? platforms.join(", ") : "any platform"}
              </span>
              ) in a{" "}
              <span className="font-medium text-foreground">{tone}</span> tone.
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick prompts
              </div>
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="block w-full rounded-xl border border-border/40 bg-background/40 px-2.5 py-1.5 text-left text-[11px] text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {m.role === "assistant" && (
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] space-y-2 rounded-2xl px-3 py-2 text-[12px] leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/70 text-foreground"
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    Tap to apply ↓
                  </div>
                  {m.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => applySuggestion(s)}
                      className="block w-full rounded-xl border border-primary/30 bg-primary/5 p-2 text-left text-[11px] text-foreground transition hover:border-primary hover:bg-primary/10"
                    >
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <span className="whitespace-pre-wrap">{s}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-2">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-background/70 px-3 py-2.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border/40 p-2.5">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask the AI to write or refine your caption…"
            rows={1}
            className="scroll-liquid max-h-24 min-h-[36px] flex-1 resize-none rounded-xl border border-border/50 bg-background/60 px-2.5 py-1.5 text-[12px] outline-none transition focus:border-primary/50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="liquid-pill grid h-9 w-9 shrink-0 place-items-center rounded-xl disabled:opacity-50"
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="mt-1 text-[9px] text-muted-foreground">
          Press Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Variant editor — inline editor for the selected platform
   variant. Shows below the variant pills in the AI Variants
   section. Edits live-update the sticky preview.
   ============================================================ */
function VariantEditor({
  account,
  variant,
  onChange,
  onRegenerate,
  generating,
  fallbackContent,
}: {
  account: AccountData;
  variant: Variant | undefined;
  onChange: (v: Variant) => void;
  onRegenerate: () => void;
  generating: boolean;
  fallbackContent: string;
}) {
  const p = PLATFORMS[account.platform];
  const content = variant?.content ?? fallbackContent;
  const hashtags = variant?.hashtags ?? "";
  const overLimit = content.length > p.charLimit;

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <PlatformBadge platform={account.platform} size={22} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="truncate">{account.displayName}</span>
            {account.verified && <VerifiedTick className="text-primary" />}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {account.handle} · {p.name}
          </div>
        </div>
        {variant && (
          <Pill color="violet">
            <Sparkles className="h-2.5 w-2.5" /> AI
          </Pill>
        )}
        <button
          onClick={onRegenerate}
          disabled={generating}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-primary disabled:opacity-50"
          title="Regenerate this variant"
          aria-label={`Regenerate ${account.displayName} variant`}
        >
          <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange({ content: e.target.value, hashtags })}
        placeholder={`Write a ${p.name}-native caption…`}
        className="scroll-liquid min-h-[80px] w-full resize-y rounded-xl border border-border/40 bg-background/60 p-2.5 text-sm outline-none transition focus:border-primary/50"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={hashtags}
          onChange={(e) => onChange({ content, hashtags: e.target.value })}
          placeholder="hashtags, comma, separated"
          className="flex-1 rounded-lg border border-border/40 bg-background/60 px-2 py-1 text-xs outline-none focus:border-primary/50"
        />
        <span
          className={cn(
            "shrink-0 text-[10px]",
            overLimit ? "font-semibold text-rose-500" : "text-muted-foreground"
          )}
        >
          {content.length}/{p.charLimit}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Phone preview — the only "card frame" in the view.
   Floats in the sticky aside on desktop; stacks below on mobile.
   ============================================================ */
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
   Pre-publish checklist — inline summary in Schedule section
   ============================================================ */
function PrePublishChecklist({
  accounts,
  caption,
  mediaUrl,
  hasVariants,
}: {
  accounts: AccountData[];
  caption: string;
  mediaUrl: string;
  hasVariants: boolean;
}) {
  const checklist = [
    { label: `Accounts selected (${accounts.length})`, done: accounts.length > 0 },
    { label: "Content written", done: caption.trim().length > 0 },
    { label: "Media added", done: !!mediaUrl },
    { label: "AI variants ready", done: hasVariants },
  ];
  const allDone = checklist.every((c) => c.done);

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <div className="label-caps mb-2 text-muted-foreground">Pre-publish checklist</div>
      <div className="space-y-1.5">
        {checklist.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition",
                c.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              {c.done ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                <AlertCircle className="h-2.5 w-2.5" />
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
          "mt-2 flex items-center gap-1.5 rounded-lg p-2 text-[11px] font-medium",
          allDone
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}
      >
        {allDone ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
        {allDone ? "All set — ready to publish." : "Some items need attention."}
      </div>
    </div>
  );
}

/* ============================================================
   Sticky publish bar — bottom of viewport, always visible
   ============================================================ */
function StickyPublishBar({
  onPublish,
  publishing,
  scheduleEnabled,
  editing,
  disabled,
  accountCount,
  combinedReach,
}: {
  onPublish: () => void;
  publishing: boolean;
  scheduleEnabled: boolean;
  editing: boolean;
  disabled: boolean;
  accountCount: number;
  combinedReach: number;
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="glass-strong glass-sheen flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
        <div className="hidden min-w-0 sm:block">
          <div className="text-xs font-semibold">
            {accountCount > 0
              ? `${accountCount} account${accountCount === 1 ? "" : "s"} · ${fmt(combinedReach)} reach`
              : "Select accounts to publish"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {scheduleEnabled ? "Will be scheduled for later" : "Will publish immediately"}
            {editing ? " · republishing draft" : ""}
          </div>
        </div>
        <button
          onClick={onPublish}
          disabled={publishing || disabled}
          className="liquid-pill glow-ring ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {publishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : scheduleEnabled ? (
            <CalendarClock className="h-4 w-4" />
          ) : editing ? (
            <RotateCw className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {publishing
            ? editing
              ? "Republishing…"
              : "Publishing…"
            : scheduleEnabled
            ? editing
              ? "Update & schedule"
              : "Schedule post"
            : editing
            ? "Republish now"
            : "Publish now"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Upload dialog — drag-and-drop, URL, or library picker
   ============================================================ */
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
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25 MB)");
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
              PNG, JPG, MP4 · max 25MB
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
