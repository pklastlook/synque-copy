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
  ChevronDown,
  ChevronRight,
  Smile,
  Copy,
  TrendingUp,
  Zap,
  Clock,
  ShieldCheck,
  Megaphone,
  Gift,
  Camera,
  Rocket,
  Star,
  Target,
  Smartphone,
  Monitor,
  Tablet,
  Sun,
  Moon,
  Save,
  Undo2,
  Crown,
  Laugh,
  GraduationCap,
  Briefcase,
  GripVertical,
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
  // New modernized fields
  location: string;
  sendForApproval: boolean;
  approvalNote: string;
  pinned: boolean;
  // Per-account content + media (user can write different content for each platform)
  accountContent: Record<string, string>;
  accountMedia: Record<string, string>;
}

type SectionId = "accounts" | "media" | "content" | "schedule";

type DeviceMode = "phone" | "desktop" | "tablet";
type PreviewTheme = "light" | "dark";

/* ============================================================
   Constants — Tones with icons, emoji sets, templates,
   best times per platform, hashtag suggestions
   ============================================================ */
const TONES: { id: string; icon: LucideIcon; hint: string }[] = [
  { id: "Professional", icon: Briefcase, hint: "Polished, authoritative" },
  { id: "Friendly", icon: Smile, hint: "Warm, approachable" },
  { id: "Energetic", icon: Zap, hint: "Punchy, high-tempo" },
  { id: "Inspirational", icon: Sparkles, hint: "Uplifting, motivational" },
  { id: "Witty", icon: Laugh, hint: "Clever, playful" },
  { id: "Educational", icon: GraduationCap, hint: "Informative, clear" },
  { id: "Luxurious", icon: Crown, hint: "Premium, exclusive" },
];

const MEDIA_TYPE_OPTIONS: {
  id: MediaType;
  label: string;
  icon: LucideIcon;
  hint: string;
}[] = [
  { id: "image", label: "Image", icon: ImageIcon, hint: "Single photo" },
  { id: "video", label: "Video", icon: Video, hint: "MP4 / MOV" },
  { id: "carousel", label: "Carousel", icon: Layers, hint: "Multi-slide" },
];

const CAPTION_TEMPLATES: { id: string; title: string; icon: LucideIcon; text: string }[] = [
  {
    id: "launch",
    title: "Product Launch",
    icon: Rocket,
    text: "Introducing [product] — designed for [audience] who [need]. Built to last, made to inspire. Available now. 🚀",
  },
  {
    id: "promo",
    title: "Promo / Sale",
    icon: Gift,
    text: "🎉 Limited-time offer! Get [discount]% off [product] this week only. Use code [CODE] at checkout. Don't miss out.",
  },
  {
    id: "story",
    title: "Behind the Scenes",
    icon: Camera,
    text: "Here's how we made [thing] — from the first sketch to the final cut. Swipe to see the journey. 👀",
  },
  {
    id: "announce",
    title: "Big Announcement",
    icon: Megaphone,
    text: "We're thrilled to share [news]! This marks a new chapter for us, and we couldn't have done it without you.",
  },
];

const EMOJI_SETS: { category: string; emojis: string[] }[] = [
  {
    category: "Popular",
    emojis: ["🚀", "✨", "🔥", "💡", "🎉", "💜", "💯", "👀", "🙌", "⚡", "🌟", "💫", "💎", "🎯", "📈", "✅"],
  },
  {
    category: "Smileys",
    emojis: ["😀", "😍", "🥳", "😎", "🤩", "😅", "😂", "🤔", "😇", "🤗", "😉", "😋", "😌", "🙂", "🙃", "😜"],
  },
  {
    category: "Symbols",
    emojis: ["✨", "💫", "⭐", "🌟", "💎", "🔮", "🎯", "🏆", "👑", "💝", "🌈", "☀️", "🌙", "🔥", "⚡", "💥"],
  },
];

const HASHTAG_SUGGESTIONS = [
  "marketing", "socialmedia", "content", "creator", "trending",
  "growth", "brand", "community", "digitalmarketing", "smallbusiness",
  "entrepreneur", "instagood", "love", "motivation", "inspiration",
];

const BEST_TIMES: Record<PlatformId, { time: string; reach: "High" | "Medium" | "Peak" }[]> = {
  x: [
    { time: "9:00 AM", reach: "High" },
    { time: "12:00 PM", reach: "Peak" },
    { time: "7:00 PM", reach: "High" },
  ],
  instagram: [
    { time: "11:00 AM", reach: "High" },
    { time: "1:00 PM", reach: "Peak" },
    { time: "8:00 PM", reach: "High" },
  ],
  facebook: [
    { time: "9:00 AM", reach: "High" },
    { time: "1:00 PM", reach: "Peak" },
    { time: "3:00 PM", reach: "High" },
  ],
  linkedin: [
    { time: "8:00 AM", reach: "High" },
    { time: "10:00 AM", reach: "Peak" },
    { time: "12:00 PM", reach: "High" },
  ],
  tiktok: [
    { time: "6:00 AM", reach: "High" },
    { time: "10:00 AM", reach: "Peak" },
    { time: "10:00 PM", reach: "High" },
  ],
  youtube: [
    { time: "12:00 PM", reach: "High" },
    { time: "3:00 PM", reach: "Peak" },
    { time: "7:00 PM", reach: "High" },
  ],
  threads: [
    { time: "9:00 AM", reach: "High" },
    { time: "1:00 PM", reach: "Peak" },
    { time: "6:00 PM", reach: "High" },
  ],
};

const PLATFORM_TIPS: Record<PlatformId, string> = {
  x: "First 2 lines matter most · 1–2 hashtags max · Post at 9AM or 7PM",
  instagram: "5–10 hashtags optimal · Carousels get 3× engagement · Use line breaks",
  facebook: "Questions get 2× comments · Video outperforms images · Avoid clickbait",
  linkedin: "Tue–Thu best · Lead with insight · Avoid external links in body",
  tiktok: "Hook in 3 seconds · Trending sounds boost reach · Vertical only",
  youtube: "Thumbnail > title · First 30s retention critical · Use end screens",
  threads: "Conversational tone · Reply to engage · Short and punchy wins",
};

const QUICK_DATE_PRESETS: { label: string; offset: number; hour: number; icon: LucideIcon }[] = [
  { label: "Today 6PM", offset: 0, hour: 18, icon: Clock },
  { label: "Tomorrow 9AM", offset: 1, hour: 9, icon: Sun },
  { label: "This weekend", offset: 6 - new Date().getDay(), hour: 11, icon: Star },
  { label: "Next Monday 8AM", offset: 8 - new Date().getDay(), hour: 8, icon: Briefcase },
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
  location: "",
  sendForApproval: false,
  approvalNote: "",
  pinned: false,
  accountContent: {},
  accountMedia: {},
};

/* ============================================================
   Helper: count words / estimate reading time
   ============================================================ */
function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
function readingTime(text: string): string {
  const words = wordCount(text);
  const seconds = Math.max(1, Math.round((words / 200) * 60));
  if (seconds < 60) return `${seconds}s read`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${minutes}m ${remSec}s read`;
}
function countHashtags(text: string): number {
  return (text.match(/#\w+/g) || []).length;
}

/* ============================================================
   ComposerView — modernized, enhanced, interactive.
   Features:
   - Top progress header (animated completion ring)
   - Collapsible sections with chevron rotation
   - Quick actions toolbar (Save draft, Templates, Reset)
   - Enhanced Accounts: filter pills + platform grouping
   - Enhanced Brief: stats bar + emoji picker + hashtag
     suggestions + AI improve + template chips
   - Enhanced Variants: engagement prediction + copy +
     diff % + per-variant regenerate
   - Enhanced Media: better drop zone with hover preview
   - Enhanced Schedule: best time chips + quick presets +
     send-for-approval toggle + mini calendar
   - Sticky preview with device toggle (phone/desktop/
     tablet) + theme toggle
   - Sticky publish bar with completion ring + keyboard
     shortcut hint
   ============================================================ */
export function ComposerView() {
  const { composerSeed, clearComposerSeed, composerEditPost, clearComposerEditPost } = useNav();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const { data: accounts } = useApi<AccountData[]>("/api/accounts");
  const { data: mediaData } = useApi<MediaLibraryResponse>("/api/media");
  const { data: draftsData, reload: reloadDrafts } = useApi<Post[]>("/api/posts?status=draft");
  const { data: failedData } = useApi<Post[]>("/api/posts?status=failed");
  const draftsList = React.useMemo(() => {
    const drafts = draftsData ?? [];
    const failed = failedData ?? [];
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
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [improving, setImproving] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadForAccountId, setUploadForAccountId] = React.useState<string | null>(null);
  const [urlInput, setUrlInput] = React.useState("");
  const [cropAspect, setCropAspect] = React.useState("1:1");
  const [previewAccountId, setPreviewAccountId] = React.useState<string>("");
  const [aiAssistantOpen, setAiAssistantOpen] = React.useState(false);
  // New modern state
  const [collapsed, setCollapsed] = React.useState<Set<SectionId>>(new Set());
  const [accountFilter, setAccountFilter] = React.useState<"all" | "verified" | "top">("all");
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [emojiCategory, setEmojiCategory] = React.useState("Popular");
  const [hashtagSuggestOpen, setHashtagSuggestOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [previewDevice, setPreviewDevice] = React.useState<DeviceMode>("phone");
  const [previewTheme, setPreviewTheme] = React.useState<PreviewTheme>("light");
  const [copiedVariant, setCopiedVariant] = React.useState<string | null>(null);
  // Drag-and-drop section reordering — persisted to localStorage per workspace
  const [sectionOrder, setSectionOrder] = React.useState<SectionId[]>(() => {
    if (typeof window === "undefined") return ["accounts", "media", "content", "schedule"];
    try {
      const saved = localStorage.getItem("socialflow-composer-section-order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed as SectionId[];
      }
    } catch { /* ignore */ }
    return ["accounts", "media", "content", "schedule"];
  });
  const [draggingId, setDraggingId] = React.useState<SectionId | null>(null);
  const [dragOverId, setDragOverId] = React.useState<SectionId | null>(null);

  function saveSectionOrder(order: SectionId[]) {
    setSectionOrder(order);
    try {
      localStorage.setItem("socialflow-composer-section-order", JSON.stringify(order));
    } catch { /* ignore */ }
  }

  function handleDragStart(id: SectionId) {
    return (e: React.DragEvent) => {
      setDraggingId(id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    };
  }

  function handleDragOver(id: SectionId) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggingId && draggingId !== id) {
        setDragOverId(id);
      }
    };
  }

  function handleDrop(id: SectionId) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggingId || draggingId === id) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const newOrder = [...sectionOrder];
      const fromIdx = newOrder.indexOf(draggingId);
      const toIdx = newOrder.indexOf(id);
      if (fromIdx === -1 || toIdx === -1) return;
      // Remove from old position, insert at new position
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggingId);
      saveSectionOrder(newOrder);
      setDraggingId(null);
      setDragOverId(null);
      toast.success(`Reordered sections`);
    };
  }

  const initRef = React.useRef(false);
  const editHydrateRef = React.useRef<string | null>(null);
  const captionTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  /* ----------------------------------------------------------
     Effects
     ---------------------------------------------------------- */
  React.useEffect(() => {
    if (initRef.current || !accounts || accounts.length === 0) return;
    initRef.current = true;
    const presets = accounts.slice(0, 4).map((a) => a.id);
    if (presets.length) {
      setState((s) => ({ ...s, selectedAccountIds: presets }));
    }
  }, [accounts]);

  React.useEffect(() => {
    if (composerSeed) {
      setState((s) => ({ ...s, caption: composerSeed }));
      clearComposerSeed();
    }
  }, [composerSeed, clearComposerSeed]);

  React.useEffect(() => {
    if (!composerEditPost) return;
    if (editHydrateRef.current === composerEditPost.id) return;
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

    const hadNoVariants = selectedAccountIds.length === 0;
    if (hadNoVariants && accounts && accounts.length > 0) {
      selectedAccountIds = accounts.slice(0, 4).map((a) => a.id);
    }

    setState({
      ...DEFAULT_STATE,
      selectedAccountIds,
      caption: p.caption ?? "",
      tone: p.tone ?? "Friendly",
      mediaUrl: p.mediaUrl ?? "",
      mediaType: (p.mediaType === "video" ? "video" : p.mediaType === "carousel" ? "carousel" : "image"),
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
     Keyboard shortcut — Cmd/Ctrl+Enter to publish
     ---------------------------------------------------------- */
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canPublish && !publishing) publish();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, selectedAccounts, publishing, editingPostId]);

  /* ----------------------------------------------------------
     Actions
     ---------------------------------------------------------- */
  function discardEdit() {
    editHydrateRef.current = null;
    setEditingPostId(null);
    clearComposerEditPost();
    setState(DEFAULT_STATE);
    setPreviewAccountId("");
    setAiAssistantOpen(false);
    initRef.current = false;
  }

  function loadDraft(post: Post) {
    useNav.getState().openComposerWithPost(post);
  }

  function toggleCollapse(id: SectionId) {
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const update = React.useCallback((patch: Partial<ComposerState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const accountsList = accounts ?? [];

  // Apply account filter (verified / top by followers)
  const filteredAccounts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = accountsList.filter((a) => {
      if (!q) return true;
      return (
        a.displayName.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        PLATFORMS[a.platform].name.toLowerCase().includes(q)
      );
    });
    if (accountFilter === "verified") list = list.filter((a) => a.verified);
    if (accountFilter === "top") list = [...list].sort((a, b) => b.followers - a.followers).slice(0, 5);
    return list;
  }, [accountsList, search, accountFilter]);

  // Group accounts by platform for the enhanced Accounts section
  const accountsByPlatform = React.useMemo(() => {
    const groups: Record<string, AccountData[]> = {};
    for (const a of filteredAccounts) {
      if (!groups[a.platform]) groups[a.platform] = [];
      groups[a.platform].push(a);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredAccounts]);

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
  const selectPlatform = (platform: PlatformId) => {
    const ids = accountsList.filter((a) => a.platform === platform).map((a) => a.id);
    setState((s) => {
      const next = new Set(s.selectedAccountIds);
      ids.forEach((id) => next.add(id));
      return { ...s, selectedAccountIds: Array.from(next) };
    });
  };

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

  // AI Improve — inline rewrite of the current caption
  async function aiImprove() {
    if (!state.caption.trim()) {
      toast.error("Write something to improve first");
      return;
    }
    setImproving(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Rewrite this caption to be more engaging, in a ${state.tone} tone. Keep it concise and add 2-3 relevant hashtags at the end (comma-separated). Return ONLY the rewritten caption text, nothing else.\n\nOriginal: ${state.caption}`,
            },
          ],
          tone: state.tone,
          platforms: selectedAccounts.map((a) => PLATFORMS[a.platform].name),
          currentCaption: state.caption,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.suggestions && Array.isArray(json.suggestions) && json.suggestions.length > 0) {
        update({ caption: json.suggestions[0] });
        toast.success("Caption improved");
      } else if (json.reply) {
        // Strip any leading label like "Here's..."
        const cleaned = json.reply.replace(/^(here'?s|sure|okay|ok)[^:]*:\s*/i, "").trim();
        update({ caption: cleaned });
        toast.success("Caption improved");
      } else {
        toast.error("AI couldn't improve the caption");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setImproving(false);
    }
  }

  async function saveDraftOnly() {
    if (!user) {
      toast.error("Your session is loading — please try again in a moment");
      return;
    }
    if (!state.caption.trim()) {
      toast.error("Write a caption first");
      return;
    }
    setSavingDraft(true);
    try {
      const v: Record<string, { content: string; hashtags?: string }> = {};
      for (const a of selectedAccounts) {
        const ex = state.variants[a.id];
        v[a.id] = ex ?? { content: state.caption, hashtags: "" };
      }
      const payload = {
        title: state.caption.slice(0, 50).trim() || "Untitled",
        caption: state.caption,
        mediaUrl: state.mediaUrl || null,
        tone: state.tone,
        scheduledAt: null,
        accountIds: selectedAccounts.map((a) => a.id),
        variants: v,
        authorId: currentUserId,
        status: "draft",
      };
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Failed to save draft");
        return;
      }
      toast.success("Draft saved", {
        description: "Find it later in the Drafts panel above.",
      });
      reloadDrafts();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingDraft(false);
    }
  }

  function resetAll() {
    editHydrateRef.current = null;
    setEditingPostId(null);
    clearComposerEditPost();
    setState(DEFAULT_STATE);
    setPreviewAccountId("");
    setAiAssistantOpen(false);
    setCollapsed(new Set());
    setEmojiPickerOpen(false);
    setHashtagSuggestOpen(false);
    setTemplatesOpen(false);
    toast.info("Composer reset");
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
    // If send-for-approval is on, just save as draft with a note (no real publishing)
    if (state.sendForApproval) {
      setPublishing(true);
      try {
        const v: Record<string, { content: string; hashtags?: string }> = {};
        for (const a of selectedAccounts) {
          const ex = state.variants[a.id];
          const perAccountContent = state.accountContent[a.id] ?? ex?.content ?? state.caption;
          v[a.id] = { content: perAccountContent, hashtags: ex?.hashtags ?? "" };
        }
        const firstContent = selectedAccounts.length > 0
          ? (state.accountContent[selectedAccounts[0].id] ?? state.caption)
          : state.caption;
        const payload = {
          title: firstContent.slice(0, 50).trim() || "Untitled",
          caption: firstContent,
          mediaUrl: state.mediaUrl || null,
          tone: state.tone,
          scheduledAt: null,
          accountIds: selectedAccounts.map((a) => a.id),
          variants: v,
          authorId: currentUserId,
          status: "draft",
        };
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          toast.error("Failed to submit for approval");
          return;
        }
        toast.success("Sent for approval", {
          description: state.approvalNote
            ? `Note: "${state.approvalNote.slice(0, 80)}"`
            : "A reviewer will be notified. The post is saved as a draft until approved.",
        });
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
      return;
    }

    setPublishing(true);
    try {
      const v: Record<string, { content: string; hashtags?: string }> = {};
      for (const a of selectedAccounts) {
        const ex = state.variants[a.id];
        const perAccountContent = state.accountContent[a.id] ?? ex?.content ?? state.caption;
        v[a.id] = { content: perAccountContent, hashtags: ex?.hashtags ?? "" };
      }
      const scheduledAt =
        state.scheduleEnabled && state.scheduledAt
          ? new Date(state.scheduledAt).toISOString()
          : null;

      const newStatus = scheduledAt ? "scheduled" : "published";
      const firstContent = selectedAccounts.length > 0
        ? (state.accountContent[selectedAccounts[0].id] ?? state.caption)
        : state.caption;
      const postPayload = {
        title: firstContent.slice(0, 50).trim() || "Untitled",
        caption: firstContent,
        mediaUrl: state.mediaUrl || null,
        tone: state.tone,
        scheduledAt,
        accountIds: selectedAccounts.map((a) => a.id),
        variants: v,
        authorId: currentUserId,
      };

      let savedPostId: string | null = editingPostId;

      if (editingPostId) {
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

      const results: { account: string; platform: string; success: boolean; message: string; url?: string }[] = [];

      for (const a of selectedAccounts) {
        const variant = v[a.id];
        const content = variant.hashtags
          ? `${variant.content}\n\n${variant.hashtags.split(",").map(t => `#${t.trim()}`).join(" ")}`
          : variant.content;
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

      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (savedPostId && succeeded.length === 0 && failed.length > 0) {
        await fetch(`/api/posts/${savedPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "failed" }),
        }).catch(() => null);
      }

      if (succeeded.length > 0 && failed.length === 0) {
        toast.success(editingPostId ? "Republished!" : "Published!", {
          description: `Posted to ${succeeded.length} account${succeeded.length > 1 ? "s" : ""}.`,
        });
        succeeded.forEach((r) => {
          if (r.url) {
            toast.success(r.account, {
              description: `View post: ${r.url}`,
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
        const firstError = failed[0];
        const is402 = firstError?.message.includes("Free tier") || firstError?.message.includes("doesn't allow posting");
        if (is402) {
          const contentToCopy = selectedAccounts.map(a => {
            const variant = v[a.id];
            return variant.hashtags
              ? `${variant.content}\n\n${variant.hashtags.split(",").map(t => `#${t.trim()}`).join(" ")}`
              : variant.content;
          }).join("\n\n---\n\n");
          try {
            await navigator.clipboard.writeText(contentToCopy);
            toast.warning("Post saved — copy to clipboard ready", {
              description: "Free tier doesn't allow API posting. Content copied! Click 'Open' to paste manually.",
              duration: 10000,
              action: {
                label: "Open",
                onClick: () => window.open("https://x.com/compose/post", "_blank"),
              },
            });
          } catch {
            toast.warning("Post saved — manual posting required", {
              description: "Free tier doesn't allow API posting. Upgrade or post manually.",
              duration: 10000,
              action: {
                label: "Open",
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

  // Insert emoji at cursor position
  function insertEmoji(emoji: string) {
    const ta = captionTextareaRef.current;
    if (!ta) {
      update({ caption: state.caption + emoji });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = state.caption.slice(0, start) + emoji + state.caption.slice(end);
    update({ caption: newText });
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
    });
  }

  function insertHashtag(tag: string) {
    const ta = captionTextareaRef.current;
    const tagStr = `#${tag}`;
    if (!ta) {
      update({ caption: `${state.caption} ${tagStr}`.trim() });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const insert = (start > 0 && state.caption[start - 1] !== " ") ? ` ${tagStr}` : tagStr;
    const newText = state.caption.slice(0, start) + insert + state.caption.slice(end);
    update({ caption: newText });
    setHashtagSuggestOpen(false);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    });
  }

  function applyTemplate(text: string) {
    update({ caption: text });
    setTemplatesOpen(false);
    toast.success("Template applied", { description: "Edit the [bracketed] placeholders." });
  }

  async function copyVariant(accountId: string) {
    const variant = state.variants[accountId];
    if (!variant) return;
    const text = variant.hashtags
      ? `${variant.content}\n\n${variant.hashtags.split(",").map(t => `#${t.trim()}`).join(" ")}`
      : variant.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVariant(accountId);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedVariant(null), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  // Compute completion %
  const completion = React.useMemo(() => {
    let done = 0;
    if (selectedAccounts.length > 0) done += 20;
    if (state.caption.trim().length > 0) done += 25;
    if (Object.keys(state.variants).length > 0) done += 20;
    if (state.mediaUrl) done += 15;
    if (state.scheduleEnabled ? !!state.scheduledAt : true) done += 10;
    if (selectedAccounts.length > 0 && state.caption.trim().length > 0) done += 10;
    return Math.min(100, done);
  }, [selectedAccounts.length, state.caption, state.variants, state.mediaUrl, state.scheduledAt, state.scheduleEnabled]);

  /* ----------------------------------------------------------
     Derived view state
   ---------------------------------------------------------- */
  const hasVariants = Object.keys(state.variants).length > 0;
  const combinedReach = selectedAccounts.reduce((s, a) => s + a.followers, 0);
  const words = wordCount(state.caption);
  const hashtags = countHashtags(state.caption);
  const previewAccount = selectedAccounts.find((a) => a.id === previewAccountId) ?? selectedAccounts[0];
  const previewVariant = previewAccount ? state.variants[previewAccount.id] : undefined;
  const previewContent = previewAccount
    ? (state.accountContent[previewAccount.id] ?? previewVariant?.content ?? state.caption)
    : state.caption;
  const previewHashtags = previewVariant?.hashtags ?? "";
  const previewMediaUrl = previewAccount
    ? (state.accountMedia[previewAccount.id] ?? state.mediaUrl)
    : state.mediaUrl;
  // Can publish if at least one account has content
  const hasAnyContent = selectedAccounts.some((a) => {
    const content = state.accountContent[a.id] ?? state.variants[a.id]?.content ?? state.caption;
    return content.trim().length > 0;
  });
  const canPublish = selectedAccounts.length > 0 && hasAnyContent;
  const publishDisabledLabel = !canPublish
    ? selectedAccounts.length === 0
      ? "Select at least one account"
      : "Write content for at least one account"
    : null;

  return (
    <div className="space-y-4 pb-4">
      {/* === Top progress + actions toolbar === */}
      <ProgressToolbar
        completion={completion}
        editing={!!editingPostId}
        scheduleEnabled={state.scheduleEnabled}
        sendForApproval={state.sendForApproval}
        onReset={resetAll}
        onSaveDraft={saveDraftOnly}
        savingDraft={savingDraft}
        onTemplates={() => setTemplatesOpen(true)}
      />

      {/* Editing / republish banner */}
      {editingPostId && (
        <EditingBanner
          postId={editingPostId}
          title={state.caption.slice(0, 50).trim() || "Untitled"}
          onDiscard={discardEdit}
        />
      )}

      {/* Drafts / failed posts picker */}
      {!editingPostId && (
        <DraftsPanel drafts={draftsList} onLoad={loadDraft} />
      )}

      {/* === Two-column layout: main flow + sticky preview ===
           On desktop: main content is full-width, preview sits above publish bar.
           Removed the narrow 2-column grid — content now matches topbar width. */}
      <div className="space-y-4">
        {/* MAIN FLOW — full width, aligned with topbar */}
        <main className="min-w-0 space-y-4">
          {/* === Accounts (horizontal scrollable row) === */}
          <div style={{ order: sectionOrder.indexOf("accounts") }} className="min-h-0">
          <CollapsibleSection
            id="accounts"
            index={sectionOrder.indexOf("accounts") + 1}
            title="Accounts"
            desc="Pick destination accounts"
            icon={CheckCircle2}
            collapsed={collapsed}
            onToggle={toggleCollapse}
            
            
            
            
            
            
            badge={
              <Pill color={selectedAccounts.length > 0 ? "green" : "neutral"}>
                {selectedAccounts.length} selected
              </Pill>
            }
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
          >
            {/* Top row: filter pills + search side by side */}
            <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
              {/* Filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", "verified", "top"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAccountFilter(f)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                      accountFilter === f
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {f === "all" && <Check className="h-3 w-3" />}
                    {f === "verified" && <ShieldCheck className="h-3 w-3" />}
                    {f === "top" && <TrendingUp className="h-3 w-3" />}
                    {f === "all" ? "All" : f === "verified" ? "Verified" : "Top 5"}
                  </button>
                ))}
              </div>

              {/* Search — inline, no separate row */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, handle, or platform…"
                  className="w-full rounded-xl border border-border/50 bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
                />
              </div>
            </div>

            {/* Horizontal scrollable account row — compact cards */}
            <div className="scroll-liquid -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {filteredAccounts.length === 0 ? (
                <div className="grid w-full place-items-center py-12 text-center text-sm text-muted-foreground">
                  No accounts match your search.
                </div>
              ) : (
                filteredAccounts.map((a) => {
                  const on = state.selectedAccountIds.includes(a.id);
                  const p = PLATFORMS[a.platform];
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAccount(a.id)}
                      title={`${a.displayName} · ${a.handle} · ${fmt(a.followers)} followers`}
                      className={cn(
                        "group relative flex w-[180px] shrink-0 flex-col gap-2 rounded-2xl border p-3 text-left transition",
                        on
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/40 bg-muted/50 hover:border-border hover:bg-muted/40"
                      )}
                    >
                      {/* Top row: platform badge + check circle */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <PlatformBadge platform={a.platform} size={28} />
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: on ? p.color : "var(--muted-foreground)" }}
                          >
                            {p.short}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border group-hover:border-primary/40"
                          )}
                        >
                          {on && <Check className="h-3 w-3" />}
                        </span>
                      </div>

                      {/* Middle: name + handle */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs font-bold leading-tight">
                            {a.displayName}
                          </span>
                          {a.verified && <VerifiedTick className="h-3 w-3 shrink-0 text-primary" />}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {a.handle}
                        </div>
                      </div>

                      {/* Bottom: follower count with accent color */}
                      <div className="flex items-center justify-between border-t border-border/30 pt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          <b className="text-foreground">{fmt(a.followers)}</b> followers
                        </span>
                        {/* Platform color stripe */}
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick platform-select chips — horizontal too */}
            {accountsByPlatform.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">Quick add:</span>
                {accountsByPlatform.map(([platform, list]) => (
                  <button
                    key={platform}
                    onClick={() => selectPlatform(platform as PlatformId)}
                    className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    title={`Select all ${PLATFORMS[platform as PlatformId].name} accounts`}
                  >
                    <PlatformBadge platform={platform as PlatformId} size={14} />
                    <span>{PLATFORMS[platform as PlatformId].short}</span>
                    <span className="text-[9px] opacity-70">{list.length}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Inline summary — selected count + combined reach + platform breakdown */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Pill color={selectedAccounts.length > 0 ? "green" : "neutral"}>
                {selectedAccounts.length} selected
              </Pill>
              {selectedAccounts.length > 0 && (
                <>
                  <span>
                    · combined reach{" "}
                    <b className="text-foreground">{fmt(combinedReach)}</b> followers
                  </span>
                  {Object.entries(
                    selectedAccounts.reduce<Record<string, number>>((acc, a) => {
                      acc[a.platform] = (acc[a.platform] || 0) + 1;
                      return acc;
                    }, {})
                  ).slice(0, 5).map(([platform, count]) => (
                    <span key={platform} className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px]">
                      <PlatformBadge platform={platform as PlatformId} size={12} />
                      {count}
                    </span>
                  ))}
                </>
              )}
            </div>
          </CollapsibleSection>
          </div>

          {/* === Media (per-account — different file for each platform) === */}
          <div style={{ order: sectionOrder.indexOf("media") }} className="min-h-0">
          <CollapsibleSection
            id="media"
            index={sectionOrder.indexOf("media") + 1}
            title="Media"
            desc="Select a different media file for each platform"
            icon={ImageIcon}
            collapsed={collapsed}
            onToggle={toggleCollapse}
            
            
            
            
            
            
            badge={
              selectedAccounts.length > 0 && selectedAccounts.some((a) => state.accountMedia[a.id] || state.mediaUrl) ? (
                <Pill color="green"><Check className="h-2.5 w-2.5" /> Added</Pill>
              ) : undefined
            }
            action={
              <button
                onClick={() => setUploadOpen(true)}
                disabled={selectedAccounts.length === 0}
                className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" /> Upload
              </button>
            }
          >
            {selectedAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/50 p-4 text-center text-xs text-muted-foreground">
                Select accounts above to add media per platform.
              </div>
            ) : (
              <>
                {/* Global media (applies to all accounts that don't have their own) */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <ImageIcon className="h-3 w-3" />
                    Default media (all platforms)
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className={cn(
                      "group relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border/60 bg-muted/50 p-2 transition hover:border-primary/50 hover:bg-muted/40",
                      state.mediaUrl ? "min-h-[140px]" : "min-h-[100px]"
                    )}
                  >
                    {state.mediaUrl ? (
                      <>
                        <img
                          src={state.mediaUrl}
                          alt="Default media"
                          className="max-h-[140px] w-full rounded-lg object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-transparent to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                          <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-lg backdrop-blur">
                            <RefreshCw className="h-2.5 w-2.5" /> Replace
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="grid place-items-center py-3 text-center">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                          <Upload className="h-3.5 w-3.5" />
                        </div>
                        <div className="mt-1 text-xs font-medium">Upload default media</div>
                        <div className="text-[10px] text-muted-foreground">Used for all platforms without their own media</div>
                      </div>
                    )}
                  </button>
                  {state.mediaUrl && (
                    <button
                      onClick={() => update({ mediaUrl: "" })}
                      className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition hover:text-rose-500"
                    >
                      <X className="h-2.5 w-2.5" /> Clear default
                    </button>
                  )}
                </div>

                {/* Per-account media grid */}
                <div>
                  <div className="mb-2 text-[11px] font-medium text-muted-foreground">
                    Per-platform media · upload a different file for each account
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedAccounts.map((a) => {
                      const p = PLATFORMS[a.platform];
                      const mediaUrl = state.accountMedia[a.id] ?? "";
                      return (
                        <div
                          key={a.id}
                          className={cn(
                            "rounded-xl border p-2.5 transition",
                            mediaUrl
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/40 bg-muted/50"
                          )}
                        >
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <PlatformBadge platform={a.platform} size={18} />
                            <span className="truncate text-[11px] font-semibold">{a.displayName}</span>
                            <span className="ml-auto text-[9px] font-bold uppercase" style={{ color: p.color }}>
                              {p.short}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadForAccountId(a.id);
                              setUploadOpen(true);
                            }}
                            className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/50 bg-background/60 p-1 transition hover:border-primary/40 hover:bg-primary/5"
                            style={{ minHeight: mediaUrl ? "80px" : "60px" }}
                          >
                            {mediaUrl ? (
                              <>
                                <img
                                  src={mediaUrl}
                                  alt={`Media for ${a.displayName}`}
                                  className="max-h-[80px] w-full rounded object-cover"
                                />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                  <span className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-lg">
                                    <RefreshCw className="h-2.5 w-2.5" /> Change
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="grid place-items-center py-2 text-center">
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                                  Upload for {p.short}
                                </div>
                              </div>
                            )}
                          </button>
                          {mediaUrl && (
                            <button
                              onClick={() =>
                                setState((s) => ({
                                  ...s,
                                  accountMedia: { ...s.accountMedia, [a.id]: "" },
                                }))
                              }
                              className="mt-1 flex items-center gap-1 text-[9px] font-medium text-muted-foreground transition hover:text-rose-500"
                            >
                              <X className="h-2.5 w-2.5" /> Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alt text */}
                <div>
                  <Label className="mb-1 text-[11px] text-muted-foreground">
                    Alt text (accessibility — applies to all media)
                  </Label>
                  <input
                    value={state.altText}
                    onChange={(e) => update({ altText: e.target.value })}
                    placeholder="Describe the image"
                    className="w-full rounded-xl border border-border/50 bg-muted/50 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
                  />
                </div>

                {/* Media library (quick pick — applies to default media) */}
                {mediaAssets.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                      Media library · click to set as default
                    </div>
                    <div className="scroll-liquid -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                      {mediaAssets.slice(0, 12).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => update({ mediaUrl: m.url })}
                          className={cn(
                            "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                            state.mediaUrl === m.url ? "ring-primary" : "ring-transparent hover:ring-border"
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

                <UploadDialog
                  open={uploadOpen}
                  onOpenChange={setUploadOpen}
                  onPick={(m) => {
                    if (uploadForAccountId) {
                      setState((s) => ({
                        ...s,
                        accountMedia: { ...s.accountMedia, [uploadForAccountId]: m },
                      }));
                      setUploadForAccountId(null);
                    } else {
                      update({ mediaUrl: m });
                    }
                    setUploadOpen(false);
                  }}
                  urlInput={urlInput}
                  onUrlInput={setUrlInput}
                  onUrlSubmit={submitUrl}
                  current={uploadForAccountId ? (state.accountMedia[uploadForAccountId] ?? "") : state.mediaUrl}
                  mediaAssets={mediaAssets}
                  userId={user?.id}
                />
              </>
            )}
          </CollapsibleSection>
          </div>

          {/* === Content (per-account text boxes) === */}
          <div style={{ order: sectionOrder.indexOf("content") }} className="min-h-0">
          <CollapsibleSection
            id="content"
            index={sectionOrder.indexOf("content") + 1}
            title="Content"
            desc="Write or paste different text for each platform"
            icon={Pencil}
            collapsed={collapsed}
            onToggle={toggleCollapse}
            
            
            
            
            
            
            badge={
              hasAnyContent ? (
                <Pill color="green"><Check className="h-2.5 w-2.5" /> Ready</Pill>
              ) : undefined
            }
            action={
              <div className="flex items-center gap-1.5">
                {/* Copy brief to all accounts */}
                <button
                  onClick={() => {
                    if (!state.caption.trim()) {
                      toast.error("Write a brief first, then copy to all");
                      return;
                    }
                    const newContent: Record<string, string> = {};
                    for (const a of selectedAccounts) {
                      newContent[a.id] = state.caption;
                    }
                    setState((s) => ({ ...s, accountContent: newContent }));
                    toast.success(`Copied brief to ${selectedAccounts.length} accounts`);
                  }}
                  disabled={selectedAccounts.length === 0 || !state.caption.trim()}
                  className="flex items-center gap-1 rounded-xl border border-border/50 bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                  title="Copy the brief above to all content boxes"
                >
                  <Copy className="h-3 w-3" /> Copy to all
                </button>
                {/* Clear all content */}
                <button
                  onClick={() => {
                    setState((s) => ({ ...s, accountContent: {} }));
                    toast.info("Cleared all content boxes");
                  }}
                  disabled={selectedAccounts.length === 0 || !hasAnyContent}
                  className="flex items-center gap-1 rounded-xl border border-border/50 bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                  title="Clear all content boxes"
                >
                  <Undo2 className="h-3 w-3" /> Clear all
                </button>
              </div>
            }
          >
            {/* Shared brief / base caption */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                <Pencil className="h-3 w-3" />
                Brief · base text (optional)
              </div>
              <div className="relative">
                <textarea
                  ref={captionTextareaRef}
                  value={state.caption}
                  onChange={(e) => update({ caption: e.target.value })}
                  placeholder="Write a base brief here, then click 'Copy to all' to populate each platform's content box below. Customize each one as needed."
                  className="scroll-liquid min-h-[80px] w-full resize-y rounded-xl border border-border/50 bg-background/60 p-3 pr-10 text-sm outline-none transition focus:border-primary/50"
                />
                {/* Emoji + hashtag buttons */}
                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setEmojiPickerOpen((v) => !v);
                      setHashtagSuggestOpen(false);
                    }}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg transition",
                      emojiPickerOpen ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title="Insert emoji"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setHashtagSuggestOpen((v) => !v);
                      setEmojiPickerOpen(false);
                    }}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg transition",
                      hashtagSuggestOpen ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title="Suggest hashtags"
                  >
                    <Hash className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Emoji picker */}
                {emojiPickerOpen && (
                  <div className="absolute right-2 top-10 z-20 w-64 rounded-2xl border border-border/60 bg-background p-2 shadow-xl">
                    <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
                      {EMOJI_SETS.map((set) => (
                        <button
                          key={set.category}
                          onClick={() => setEmojiCategory(set.category)}
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition",
                            emojiCategory === set.category
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {set.category}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJI_SETS.find((s) => s.category === emojiCategory)?.emojis.map((e, i) => (
                        <button
                          key={i}
                          onClick={() => insertEmoji(e)}
                          className="grid h-7 w-7 place-items-center rounded-md text-lg transition hover:bg-muted"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtag suggestions */}
                {hashtagSuggestOpen && (
                  <div className="absolute right-2 top-10 z-20 w-56 rounded-2xl border border-border/60 bg-background p-2 shadow-xl">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Suggested hashtags · click to insert
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {HASHTAG_SUGGESTIONS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => insertHashtag(tag)}
                          className="rounded-full bg-muted/60 px-2 py-1 text-[10px] font-medium text-primary transition hover:bg-primary/15"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Templates + tone */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {CAPTION_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.text)}
                    className="flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    title={t.text}
                  >
                    <t.icon className="h-2.5 w-2.5" />
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Per-account content boxes */}
            {selectedAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/50 p-4 text-center text-xs text-muted-foreground">
                Select accounts above to write content for each platform.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">
                  Per-platform content · write or paste different text for each account
                </div>
                {/* Horizontal scrollable content boxes — same pattern as accounts */}
                <div className="scroll-liquid -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                  {selectedAccounts.map((a) => {
                    const p = PLATFORMS[a.platform];
                    const content = state.accountContent[a.id] ?? state.variants[a.id]?.content ?? "";
                    const mediaUrl = state.accountMedia[a.id] ?? state.mediaUrl;
                    const overLimit = content.length > p.charLimit;
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "flex w-[280px] shrink-0 flex-col rounded-2xl border p-3 transition",
                          content.trim()
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/40 bg-muted/50"
                        )}
                      >
                        {/* Account header */}
                        <div className="mb-2 flex items-center gap-2">
                          <PlatformBadge platform={a.platform} size={22} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-xs font-semibold">
                              <span className="truncate">{a.displayName}</span>
                              {a.verified && <VerifiedTick className="h-3 w-3 text-primary" />}
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {a.handle} · {p.charLimit} chars
                            </div>
                          </div>
                          {/* Platform color dot */}
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                            aria-hidden
                          />
                        </div>

                        {/* Media thumbnail (if any) */}
                        {mediaUrl && (
                          <div className="mb-2 h-16 w-full overflow-hidden rounded-lg border border-border/40">
                            <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}

                        {/* Content textarea */}
                        <textarea
                          value={content}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              accountContent: { ...s.accountContent, [a.id]: e.target.value },
                            }))
                          }
                          placeholder={`Write or paste ${p.name} content here…`}
                          className="scroll-liquid min-h-[100px] w-full flex-1 resize-y rounded-lg border border-border/40 bg-background/60 p-2.5 text-sm outline-none transition focus:border-primary/50"
                        />

                        {/* Footer: char count + copy + reset */}
                        <div className="mt-2 flex items-center gap-1.5 border-t border-border/30 pt-1.5">
                          <span
                            className={cn(
                              "shrink-0 text-[10px] font-semibold tabular-nums",
                              overLimit ? "text-rose-500" : "text-muted-foreground"
                            )}
                          >
                            {content.length}/{p.charLimit}
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(content);
                                toast.success(`Copied ${p.name} content`);
                              } catch {
                                toast.error("Couldn't copy");
                              }
                            }}
                            disabled={!content.trim()}
                            className="flex items-center gap-1 rounded-lg bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => {
                              setState((s) => ({
                                ...s,
                                accountContent: { ...s.accountContent, [a.id]: state.caption },
                              }));
                              toast.success(`Reset to brief`);
                            }}
                            disabled={!content.trim()}
                            className="flex items-center gap-1 rounded-lg bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                          >
                            <Undo2 className="h-2.5 w-2.5" />
                          </button>
                          {/* Platform tip icon */}
                          <span
                            className="ml-auto text-[9px] text-muted-foreground"
                            title={PLATFORM_TIPS[a.platform]}
                          >
                            <Lightbulb className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CollapsibleSection>
          </div>

          {/* === Schedule (enhanced with best-time + presets + approval) === */}
          <div style={{ order: sectionOrder.indexOf("schedule") }} className="min-h-0">
          <CollapsibleSection
            id="schedule"
            index={sectionOrder.indexOf("schedule") + 1}
            title="Schedule"
            desc="Publish now or pick a future time"
            icon={CalendarClock}
            collapsed={collapsed}
            onToggle={toggleCollapse}
            
            
            
            
            
            
            badge={
              state.scheduleEnabled ? (
                <Pill color="amber"><Clock className="h-2.5 w-2.5" /> Scheduled</Pill>
              ) : state.sendForApproval ? (
                <Pill color="violet"><ShieldCheck className="h-2.5 w-2.5" /> For approval</Pill>
              ) : (
                <Pill color="green"><Send className="h-2.5 w-2.5" /> Now</Pill>
              )
            }
          >
            {/* Publish mode — three toggle buttons (now / schedule / approval) */}
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                onClick={() => update({ scheduleEnabled: false, sendForApproval: false })}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  !state.scheduleEnabled && !state.sendForApproval
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/40 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <Send className="h-4 w-4 text-primary" />
                  <Check className={cn("h-3.5 w-3.5", !state.scheduleEnabled && !state.sendForApproval ? "text-primary" : "opacity-0")} />
                </div>
                <div className="mt-2 text-xs font-bold">Publish now</div>
                <div className="text-[10px] text-muted-foreground">Send immediately</div>
              </button>
              <button
                onClick={() => update({ scheduleEnabled: true, sendForApproval: false })}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  state.scheduleEnabled
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/40 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <Check className={cn("h-3.5 w-3.5", state.scheduleEnabled ? "text-primary" : "opacity-0")} />
                </div>
                <div className="mt-2 text-xs font-bold">Schedule</div>
                <div className="text-[10px] text-muted-foreground">Pick a future date &amp; time</div>
              </button>
              <button
                onClick={() => update({ sendForApproval: true, scheduleEnabled: false })}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  state.sendForApproval
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/40 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <Check className={cn("h-3.5 w-3.5", state.sendForApproval ? "text-primary" : "opacity-0")} />
                </div>
                <div className="mt-2 text-xs font-bold">Send for approval</div>
                <div className="text-[10px] text-muted-foreground">Save as draft for review</div>
              </button>
            </div>

            {/* Schedule: Quick date presets */}
            {state.scheduleEnabled && (
              <div className="space-y-2.5">
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Quick presets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_DATE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + (p.offset <= 0 && p.label.includes("Today") ? 0 : p.offset));
                          d.setHours(p.hour, 0, 0, 0);
                          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16);
                          update({ scheduledAt: local });
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      >
                        <p.icon className="h-3 w-3" />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* DateTime picker */}
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                  <input
                    type="datetime-local"
                    value={state.scheduledAt}
                    onChange={(e) => update({ scheduledAt: e.target.value })}
                    className="flex-1 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
                  />
                </div>
              </div>
            )}

            {/* Approval note */}
            {state.sendForApproval && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Send for approval
                </div>
                <div className="text-[11px] text-muted-foreground">
                  The post will be saved as a draft and a reviewer will be notified.
                  No content will be published until approved.
                </div>
                <input
                  value={state.approvalNote}
                  onChange={(e) => update({ approvalNote: e.target.value })}
                  placeholder="Optional note to reviewer (e.g. needs legal review)"
                  className="w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
                />
              </div>
            )}

            {/* Best time to post — per selected platform */}
            {!state.scheduleEnabled && !state.sendForApproval && selectedAccounts.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-muted/50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Best times to post
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedAccounts.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
                      <PlatformBadge platform={a.platform} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold">
                          {PLATFORMS[a.platform].name}
                        </div>
                        <div className="flex gap-1">
                          {BEST_TIMES[a.platform].map((t) => (
                            <span
                              key={t.time}
                              className={cn(
                                "rounded px-1 py-0.5 text-[9px] font-semibold",
                                t.reach === "Peak"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted/60 text-muted-foreground"
                              )}
                            >
                              {t.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    // Use the first selected platform's peak time
                    if (selectedAccounts.length === 0) return;
                    const peakTime = BEST_TIMES[selectedAccounts[0].platform].find(t => t.reach === "Peak");
                    if (!peakTime) return;
                    const [h, m] = peakTime.time.split(/[:\s]/);
                    const hour = peakTime.time.includes("PM") && h !== "12" ? parseInt(h) + 12 : parseInt(h);
                    const d = new Date();
                    d.setHours(hour, parseInt(m) || 0, 0, 0);
                    if (d < new Date()) d.setDate(d.getDate() + 1);
                    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16);
                    update({ scheduleEnabled: true, scheduledAt: local });
                    toast.success("Suggested peak time applied");
                  }}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                >
                  <Zap className="h-3 w-3" />
                  Use suggested peak time
                </button>
              </div>
            )}

            {/* Pre-publish checklist */}
            <PrePublishChecklist
              accounts={selectedAccounts}
              caption={state.caption}
              mediaUrl={previewMediaUrl || state.mediaUrl}
              hasVariants={hasVariants}
            />
          </CollapsibleSection>
          </div>
        </main>

        {/* === PREVIEW — above the publish bar, all accounts shown at once === */}
        {selectedAccounts.length > 0 && (
          <aside className="block">
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-3">
              <SectionHeader
                title="Live preview"
                desc="All platforms — updates as you type"
                icon={Eye}
                action={
                  <div className="flex items-center gap-1">
                    {/* Device toggle */}
                    <div className="flex gap-0.5 rounded-lg bg-muted/40 p-0.5">
                      {([
                        { id: "phone" as DeviceMode, icon: Smartphone, label: "Phone" },
                        { id: "tablet" as DeviceMode, icon: Tablet, label: "Tablet" },
                        { id: "desktop" as DeviceMode, icon: Monitor, label: "Desktop" },
                      ]).map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setPreviewDevice(d.id)}
                          title={d.label}
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-md transition",
                            previewDevice === d.id
                              ? "bg-background text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <d.icon className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                    {/* Theme toggle */}
                    <button
                      onClick={() => setPreviewTheme(t => t === "light" ? "dark" : "light")}
                      className="grid h-6 w-6 place-items-center rounded-md bg-muted/40 text-muted-foreground transition hover:text-foreground"
                      title="Toggle preview theme"
                    >
                      {previewTheme === "light" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </button>
                  </div>
                }
              />

              {/* All previews shown horizontally — no clicking needed */}
              <div className="scroll-liquid flex gap-3 overflow-x-auto pb-2">
                {selectedAccounts.map((a) => {
                  const p = PLATFORMS[a.platform];
                  const v = state.variants[a.id];
                  const content = state.accountContent[a.id] ?? v?.content ?? state.caption;
                  const hashtags = v?.hashtags ?? "";
                  const mediaUrl = state.accountMedia[a.id] ?? state.mediaUrl;
                  return (
                    <div key={a.id} className="shrink-0 space-y-1.5">
                      {/* Platform label */}
                      <div className="flex items-center justify-center gap-1.5">
                        <PlatformBadge platform={a.platform} size={16} />
                        <span className="text-[10px] font-bold" style={{ color: p.color }}>
                          {p.short}
                        </span>
                      </div>
                      {/* Phone preview */}
                      <PhonePreview
                        account={a}
                        content={content}
                        mediaUrl={mediaUrl}
                        hashtags={hashtags}
                        device={previewDevice}
                        theme={previewTheme}
                      />
                      {/* Char count */}
                      <div className="text-center text-[9px] tabular-nums text-muted-foreground">
                        {content.length}/{p.charLimit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* === Sticky publish bar — with completion ring + shortcut hint === */}
      <StickyPublishBar
        onPublish={publish}
        publishing={publishing}
        scheduleEnabled={state.scheduleEnabled}
        sendForApproval={state.sendForApproval}
        editing={!!editingPostId}
        disabled={!canPublish}
        disabledReason={publishDisabledLabel}
        accountCount={selectedAccounts.length}
        combinedReach={combinedReach}
        completion={completion}
      />

      {/* Templates dropdown dialog */}
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onApply={applyTemplate}
      />
    </div>
  );
}

/* ============================================================
   ProgressToolbar — top progress header with completion ring
   ============================================================ */
function ProgressToolbar({
  completion,
  editing,
  scheduleEnabled,
  sendForApproval,
  onReset,
  onSaveDraft,
  savingDraft,
  onTemplates,
}: {
  completion: number;
  editing: boolean;
  scheduleEnabled: boolean;
  sendForApproval: boolean;
  onReset: () => void;
  onSaveDraft: () => void;
  savingDraft: boolean;
  onTemplates: () => void;
}) {
  const mode = sendForApproval ? "Approval" : scheduleEnabled ? "Scheduled" : editing ? "Republish" : "Compose";
  const modeColor = sendForApproval
    ? "text-violet-500"
    : scheduleEnabled
    ? "text-amber-500"
    : editing
    ? "text-blue-500"
    : "text-primary";

  return (
    <div className="glass-strong glass-sheen sticky top-0 z-20 flex items-center gap-3 rounded-2xl px-4 py-2.5 sm:px-6 lg:px-8">
      {/* Completion ring — vertically centered */}
      <div className="relative grid h-9 w-9 shrink-0 self-center sm:h-10 sm:w-10">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90 sm:h-10 sm:w-10">
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="3"
            opacity="0.5"
          />
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute text-[9px] font-bold tabular-nums">
          {completion}%
        </span>
      </div>

      {/* Title + subtitle */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold leading-none">Composer</span>
          <span className={cn("rounded-full bg-muted/60 px-2 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider", modeColor)}>
            {mode}
          </span>
        </div>
        <div className="text-[10px] leading-none text-muted-foreground">
          {completion === 100
            ? "Ready to publish"
            : `${100 - completion}% left to complete`}
        </div>
      </div>

      {/* Quick actions — vertically centered */}
      <div className="flex items-center gap-1.5 self-center">
        <button
          onClick={onTemplates}
          className="hidden items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
          title="Caption templates"
        >
          <Star className="h-3.5 w-3.5" />
          Templates
        </button>
        <button
          onClick={onSaveDraft}
          disabled={savingDraft}
          className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Save as draft (no publish)"
        >
          {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Save draft</span>
        </button>
        <button
          onClick={onReset}
          className="grid h-8 w-8 place-items-center rounded-xl border border-border/50 bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Reset composer"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   CollapsibleSection — wrapper that animates expand/collapse
   ============================================================ */
function CollapsibleSection({
  id,
  index,
  title,
  desc,
  icon: Icon,
  collapsed,
  onToggle,
  badge,
  action,
  children,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget = false,
  isDragging = false,
}: {
  id: SectionId;
  index: number;
  title: string;
  desc: string;
  icon: LucideIcon;
  collapsed: Set<SectionId>;
  onToggle: (id: SectionId) => void;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragTarget?: boolean;
  isDragging?: boolean;
}) {
  const isCollapsed = collapsed.has(id);
  return (
    <section
      className={cn(
        "space-y-3 transition-all",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isDragTarget && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-xl"
      )}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragOver={draggable ? onDragOver : undefined}
      onDrop={draggable ? onDrop : undefined}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(id);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        {/* Drag handle — visible when draggable */}
        {draggable && (
          <div
            className="grid h-7 w-4 shrink-0 place-items-center text-muted-foreground/40 hover:text-primary"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {index}
            </span>
            <span className="text-sm font-bold">{title}</span>
            {badge}
          </div>
          <div className="text-[11px] text-muted-foreground">{desc}</div>
        </div>
        {action && (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            {action}
          </div>
        )}
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          isCollapsed ? "" : "rotate-180"
        )} />
      </div>
      <div className={cn(
        "transition-all duration-300",
        isCollapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[5000px] opacity-100"
      )}>
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-3 pl-4">
          {children}
        </div>
      </div>
    </section>
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
              className="group relative w-56 shrink-0 rounded-xl border border-border/40 bg-muted/50 p-2.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
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
   ============================================================ */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
    <div className="flex h-[420px] flex-col rounded-2xl border border-border/50 bg-muted/50">
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
   Enhanced Variant editor — with engagement prediction,
   copy button, diff indicator, reset button.
   ============================================================ */
function EnhancedVariantEditor({
  account,
  variant,
  onChange,
  onRegenerate,
  generating,
  fallbackContent,
  onCopy,
  copied,
  onReset,
}: {
  account: AccountData;
  variant: Variant | undefined;
  onChange: (v: Variant) => void;
  onRegenerate: () => void;
  generating: boolean;
  fallbackContent: string;
  onCopy: () => void;
  copied: boolean;
  onReset: () => void;
}) {
  const p = PLATFORMS[account.platform];
  const content = variant?.content ?? fallbackContent;
  const hashtags = variant?.hashtags ?? "";
  const overLimit = content.length > p.charLimit;

  // Engagement prediction — simple heuristic
  const tagCount = hashtags ? hashtags.split(",").filter(Boolean).length : 0;
  const lengthScore = Math.min(1, content.length / Math.max(50, p.charLimit * 0.4));
  const hashtagScore = Math.min(1, tagCount / 5);
  const emojiCount = (content.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  const emojiScore = Math.min(1, emojiCount / 3);
  const engagementScore = Math.round((lengthScore * 0.4 + hashtagScore * 0.35 + emojiScore * 0.25) * 100);
  const engagementLabel = engagementScore >= 70 ? "High" : engagementScore >= 40 ? "Medium" : "Low";
  const engagementColor = engagementScore >= 70 ? "emerald" : engagementScore >= 40 ? "amber" : "rose";

  // Diff % vs original brief
  const diffPct = variant && variant.content !== fallbackContent
    ? Math.round(
        Math.abs(variant.content.length - fallbackContent.length) /
          Math.max(1, fallbackContent.length) *
          100
      )
    : 0;

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
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

        {/* Engagement prediction badge */}
        {variant && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              engagementColor === "emerald" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              engagementColor === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              engagementColor === "rose" && "bg-rose-500/15 text-rose-500"
            )}
            title="Engagement prediction (heuristic)"
          >
            <Target className="h-2.5 w-2.5" />
            {engagementLabel} · {engagementScore}%
          </span>
        )}

        {/* Action buttons */}
        <button
          onClick={onCopy}
          disabled={!variant}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-primary disabled:opacity-30"
          title="Copy variant"
          aria-label="Copy variant"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
        {variant && diffPct > 0 && (
          <button
            onClick={onReset}
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-primary"
            title="Reset to original brief"
            aria-label="Reset to original brief"
          >
            <Undo2 className="h-3 w-3" />
          </button>
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

      {/* Diff indicator */}
      {variant && diffPct > 0 && (
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <TrendingUp className="h-2.5 w-2.5 text-primary" />
          <span>{diffPct}% different from original brief</span>
          <span className="ml-auto flex items-center gap-1">
            <Hash className="h-2.5 w-2.5" /> {tagCount} tags
            {emojiCount > 0 && (
              <span className="flex items-center gap-1">
                · <Smile className="h-2.5 w-2.5" /> {emojiCount} emoji
              </span>
            )}
          </span>
        </div>
      )}

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
   Phone preview — device-aware (phone/tablet/desktop) + theme-aware
   ============================================================ */
function PhonePreview({
  account,
  content,
  mediaUrl,
  hashtags,
  device,
  theme,
}: {
  account: AccountData;
  content: string;
  mediaUrl: string;
  hashtags: string;
  device: DeviceMode;
  theme: PreviewTheme;
}) {
  const tags = hashtags
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);

  const widthClass =
    device === "phone" ? "max-w-[280px]" :
    device === "tablet" ? "max-w-[380px]" :
    "max-w-[480px]";

  const isDark = theme === "dark";
  const frameBg = isDark ? "bg-zinc-900" : "bg-background";
  const textPrimary = isDark ? "text-zinc-100" : "text-foreground";
  const textMuted = isDark ? "text-zinc-400" : "text-muted-foreground";
  const borderClr = isDark ? "border-zinc-800" : "border-border/60";

  return (
    <div className={cn("mx-auto w-full overflow-hidden rounded-3xl border shadow-lg", widthClass, frameBg, borderClr)}>
      {/* Header */}
      <div className={cn("flex items-center gap-2 p-3", isDark && "bg-zinc-900")}>
        <PlatformBadge platform={account.platform} size={32} />
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-center gap-1 text-xs font-semibold", textPrimary)}>
            <span className="truncate">{account.displayName}</span>
            {account.verified && <VerifiedTick className="text-primary" />}
          </div>
          <div className={cn("text-[10px]", textMuted)}>{account.handle}</div>
        </div>
        <MoreHorizontal className={cn("h-4 w-4", textMuted)} />
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Body */}
      <div className={cn("p-3", isDark && "bg-zinc-900")}>
        <div className={cn("mb-2 flex items-center gap-3", textMuted)}>
          <Heart className="h-4 w-4" />
          <MessageCircle className="h-4 w-4" />
          <Send className="h-4 w-4" />
          <Bookmark className="ml-auto h-4 w-4" />
        </div>
        <div className={cn("text-[10px] font-semibold", textPrimary)}>
          {fmt(account.followers)} followers
        </div>
        <p className={cn("mt-1 line-clamp-4 text-xs leading-relaxed", isDark ? "text-zinc-200" : "text-foreground/90")}>
          {content || "Your caption will appear here…"}
        </p>
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-1 text-[11px] font-medium text-primary">
            {tags.slice(0, 6).map((t, i) => (
              <span key={t + i}>#{t}</span>
            ))}
          </div>
        )}
        <div className={cn("mt-2 text-[9px] uppercase tracking-wide", textMuted)}>
          {PLATFORMS[account.platform].name} · {device} preview
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Pre-publish checklist — enhanced
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
  const doneCount = checklist.filter((c) => c.done).length;
  const allDone = doneCount === checklist.length;
  const pct = Math.round((doneCount / checklist.length) * 100);

  return (
    <div className="rounded-xl border border-border/40 bg-muted/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="label-caps text-muted-foreground">Pre-publish checklist</div>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          allDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
        )}>
          {doneCount}/{checklist.length} · {pct}%
        </span>
      </div>
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
   Sticky publish bar — with completion ring + shortcut hint
   ============================================================ */
function StickyPublishBar({
  onPublish,
  publishing,
  scheduleEnabled,
  sendForApproval,
  editing,
  disabled,
  disabledReason,
  accountCount,
  combinedReach,
  completion,
}: {
  onPublish: () => void;
  publishing: boolean;
  scheduleEnabled: boolean;
  sendForApproval: boolean;
  editing: boolean;
  disabled: boolean;
  disabledReason: string | null;
  accountCount: number;
  combinedReach: number;
  completion: number;
}) {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");

  return (
    <div className="sticky bottom-0 z-30 py-2">
      <div className="glass-strong glass-sheen flex items-center gap-3 rounded-2xl px-4 py-2.5 sm:px-5">
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="flex items-center gap-2">
            {/* Mini completion ring */}
            <div className="relative grid h-7 w-7 shrink-0 place-items-center">
              <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3.5" opacity="0.5" />
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
                  className="transition-all duration-500"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">
                {accountCount > 0
                  ? `${accountCount} account${accountCount === 1 ? "" : "s"} · ${fmt(combinedReach)} reach`
                  : "Select accounts to publish"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {disabledReason
                  ? disabledReason
                  : sendForApproval
                  ? "Will be sent for approval"
                  : scheduleEnabled
                  ? "Will be scheduled for later"
                  : "Will publish immediately"}
                {editing ? " · republishing draft" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Compact publish button — NOT full width */}
        <div className="flex shrink-0 items-center gap-2">
          {!disabled && !publishing && (
            <kbd className="hidden items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-1 text-[10px] font-mono text-muted-foreground md:flex">
              {isMac ? "⌘" : "Ctrl"} + ↵
            </kbd>
          )}
          <button
            onClick={onPublish}
            disabled={publishing || disabled}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sendForApproval ? (
              <ShieldCheck className="h-4 w-4" />
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
                : sendForApproval
                ? "Submitting…"
                : "Publishing…"
              : sendForApproval
              ? "Send for approval"
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
    </div>
  );
}

/* ============================================================
   Templates dialog — pick a pre-built caption template
   ============================================================ */
function TemplatesDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (text: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Caption templates</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {CAPTION_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onApply(t.text)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border/40 bg-muted/50 p-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex w-full items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold">{t.title}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <div className="line-clamp-3 text-[11px] text-muted-foreground">
                {t.text}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <DialogClose asChild>
            <button className="rounded-xl border border-border/50 bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted">
              Close
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
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
      <DialogContent className="glass-strong max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Choose media</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border/40" />
            or paste URL
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <div>
            <Label className="mb-2 text-xs text-muted-foreground">Image URL</Label>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => onUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 rounded-xl border border-border/50 bg-muted/50 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-background/60"
              />
              <button
                onClick={onUrlSubmit}
                className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <Link2 className="h-3.5 w-3.5" /> Use URL
              </button>
            </div>
          </div>

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
