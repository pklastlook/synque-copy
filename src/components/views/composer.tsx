"use client";

import * as React from "react";
import {
  Wand2,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  CalendarClock,
  Send,
  RefreshCw,
  Check,
  Hash,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge, VerifiedTick } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AccountData {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  followers: number;
  verified: boolean;
  ownerName: string;
}

const TONES = ["Professional", "Friendly", "Energetic", "Inspirational", "Witty", "Educational", "Luxurious"];

const MEDIA_OPTIONS = [
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/90d070238cd1.jpg",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3d5f9bc2b845.png",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/26cfb8da4289.jpg",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d5a2b9f5b9fa.jpg",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/59081f9405e0.jpg",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0dad1278a197.jpg",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/499f6186a75b.jpg",
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/82df782b5ca8.jpg",
];

export function ComposerView() {
  const { composerSeed, clearComposerSeed } = useNav();
  const { data: accounts } = useApi<AccountData[]>("/api/accounts");

  const [caption, setCaption] = React.useState(
    composerSeed ?? "Introducing our new collection — designed for creators who move fast. Built to last, made to inspire."
  );
  const [tone, setTone] = React.useState("Friendly");
  const [media, setMedia] = React.useState(MEDIA_OPTIONS[0]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [variants, setVariants] = React.useState<Record<string, { content: string; hashtags: string }>>({});
  const [generating, setGenerating] = React.useState(false);
  const [schedule, setSchedule] = React.useState<string>("");
  const [publishing, setPublishing] = React.useState(false);

  React.useEffect(() => {
    if (composerSeed) {
      setCaption(composerSeed);
      clearComposerSeed();
    }
  }, [composerSeed, clearComposerSeed]);

  React.useEffect(() => {
    if (accounts && accounts.length && selected.size === 0) {
      // preselect 4 diverse accounts
      const presets = ["ac-ig-1", "ac-x-1", "ac-li-1", "ac-tt-1"].filter((id) =>
        accounts.some((a) => a.id === id)
      );
      setSelected(new Set(presets));
    }
  }, [accounts, selected.size]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(accounts?.map((a) => a.id)));
  const clearAll = () => setSelected(new Set());

  const selectedAccounts = accounts?.filter((a) => selected.has(a.id)) ?? [];

  async function generate() {
    if (!caption.trim()) return toast.error("Write a caption first");
    if (selectedAccounts.length === 0) return toast.error("Select at least one account");
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          tone,
          targets: selectedAccounts.map((a) => ({ accountId: a.id, platform: a.platform, handle: a.handle })),
          mediaHint: "attached image",
        }),
      });
      const json = await res.json();
      if (json.variants) {
        setVariants(json.variants);
        toast.success(`Generated ${Object.keys(json.variants).length} platform-native captions`);
      } else if (json.fallback) {
        setVariants(json.fallback.variants);
        toast.warning("AI was busy — used smart fallback templates");
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
    if (selectedAccounts.length === 0) return toast.error("Select accounts");
    setPublishing(true);
    try {
      const v: Record<string, { content: string; hashtags?: string }> = {};
      for (const a of selectedAccounts) {
        const ex = variants[a.id];
        v[a.id] = ex ?? { content: caption, hashtags: "" };
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: caption.slice(0, 50).trim() || "Untitled",
          caption,
          mediaUrl: media,
          tone,
          scheduledAt: schedule ? new Date(schedule).toISOString() : null,
          accountIds: selectedAccounts.map((a) => a.id),
          variants: v,
          authorId: "u-admin",
        }),
      });
      if (res.ok) {
        toast.success(schedule ? "Post scheduled successfully" : "Post published to all accounts");
        setVariants({});
        setCaption("");
      } else toast.error("Failed to publish");
    } catch {
      toast.error("Network error");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      {/* Editor */}
      <div className="space-y-4">
        <GlassCard strong className="p-5">
          <SectionTitle title="Create a post" desc="Write once. We adapt it natively for every platform with AI." />
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What do you want to share today?"
              className="scroll-liquid min-h-[120px] w-full resize-y rounded-2xl border border-border/50 bg-muted/30 p-4 text-[15px] outline-none transition focus:border-primary/50 focus:bg-background/50"
            />
            <button
              onClick={generate}
              disabled={generating || !caption.trim() || selectedAccounts.length === 0}
              className="liquid-pill glow-ring absolute bottom-3 right-3 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate AI variants"}
            </button>
          </div>

          {/* Tone */}
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Tone of voice</div>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    tone === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Media picker */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Media</div>
              <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ImageIcon className="h-3 w-3" /> Upload
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {MEDIA_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMedia(m)}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-xl ring-2 transition",
                    media === m ? "ring-primary" : "ring-transparent hover:ring-border"
                  )}
                >
                  { }
                  <img src={m} alt="" className="h-full w-full object-cover" />
                  {media === m && (
                    <span className="absolute inset-0 grid place-items-center bg-primary/20">
                      <Check className="h-4 w-4 text-white drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Schedule
            </div>
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="rounded-xl border border-border/50 bg-muted/30 px-3 py-1.5 text-xs outline-none focus:border-primary/50"
            />
            {schedule && (
              <button onClick={() => setSchedule("")} className="text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            )}
          </div>
        </GlassCard>

        {/* Account variants */}
        <GlassCard className="p-5">
          <SectionTitle
            title="Platform variants"
            desc="AI-tailored captions for each selected account — edit freely"
            action={
              variants && Object.keys(variants).length > 0 ? (
                <button
                  onClick={generate}
                  disabled={generating}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} /> Regenerate
                </button>
              ) : undefined
            }
          />
          {selectedAccounts.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Select accounts on the right, then hit <span className="font-medium text-foreground">Generate AI variants</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAccounts.map((a) => (
                <VariantEditor
                  key={a.id}
                  account={a}
                  value={variants[a.id]}
                  onChange={(v) => setVariants((prev) => ({ ...prev, [a.id]: v }))}
                />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Publish bar */}
        <GlassCard strong className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Send className="h-3.5 w-3.5" />
            </span>
            {schedule ? (
              <>Will schedule to <b className="text-foreground">{selectedAccounts.length}</b> accounts</>
            ) : (
              <>Will publish now to <b className="text-foreground">{selectedAccounts.length}</b> accounts</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-border/50 bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted">
              Save draft
            </button>
            <button
              onClick={publish}
              disabled={publishing || selectedAccounts.length === 0}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {schedule ? "Schedule post" : "Publish now"}
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Account picker */}
      <div className="space-y-4">
        <GlassCard className="p-5">
          <SectionTitle
            title="Destination accounts"
            desc={`${selected.size} selected`}
            action={
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="font-medium text-primary hover:underline">All</button>
                <button onClick={clearAll} className="text-muted-foreground hover:text-foreground">Clear</button>
              </div>
            }
          />
          <div className="scroll-liquid max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
            {accounts?.map((a) => {
              const on = selected.has(a.id);
              const p = PLATFORMS[a.platform];
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition",
                    on ? "border-primary/40 bg-primary/10" : "border-border/40 hover:bg-muted/50"
                  )}
                >
                  <PlatformBadge platform={a.platform} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-semibold">{a.displayName}</span>
                      {a.verified && <VerifiedTick className="text-primary" />}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {a.handle} · {fmt(a.followers)} followers
                    </div>
                  </div>
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full border transition",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="sr-only">{p.name}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Preview" desc="How it looks on each platform" />
          <div className="space-y-2">
            {selectedAccounts.slice(0, 3).map((a) => (
              <PreviewCard key={a.id} account={a} content={variants[a.id]?.content ?? caption} media={media} />
            ))}
            {selectedAccounts.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">Select accounts to preview</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function VariantEditor({
  account,
  value,
  onChange,
}: {
  account: AccountData;
  value?: { content: string; hashtags: string };
  onChange: (v: { content: string; hashtags: string }) => void;
}) {
  const p = PLATFORMS[account.platform];
  const content = value?.content ?? "";
  const hashtags = value?.hashtags ?? "";
  const overLimit = content.length > p.charLimit;
  return (
    <div className="rounded-2xl border border-border/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <PlatformBadge platform={account.platform} size={28} />
        <span className="text-sm font-semibold">{account.displayName}</span>
        <span className="text-[11px] text-muted-foreground">{account.handle}</span>
        {value ? (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        ) : null}
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange({ content: e.target.value, hashtags })}
        placeholder={`Write a ${p.name}-native caption…`}
        className="min-h-[80px] w-full resize-y rounded-xl border border-border/40 bg-muted/30 p-3 text-sm outline-none focus:border-primary/50"
      />
      <div className="mt-2 flex items-center gap-2">
        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={hashtags}
          onChange={(e) => onChange({ content, hashtags: e.target.value })}
          placeholder="hashtags, comma, separated"
          className="flex-1 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5 text-xs outline-none focus:border-primary/50"
        />
        <span className={cn("text-[10px]", overLimit ? "text-rose-500 font-semibold" : "text-muted-foreground")}>
          {content.length}/{p.charLimit}
        </span>
      </div>
    </div>
  );
}

function PreviewCard({
  account,
  content,
  media,
}: {
  account: AccountData;
  content: string;
  media: string;
}) {
  const p = PLATFORMS[account.platform];
  void p;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/40">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 p-2.5">
        <PlatformBadge platform={account.platform} size={24} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs font-semibold">
            {account.displayName}
            {account.verified && <VerifiedTick className="text-primary" />}
          </div>
          <div className="text-[10px] text-muted-foreground">{account.handle}</div>
        </div>
      </div>
      { }
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {media && <img src={media} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-3 text-xs leading-relaxed text-foreground/80">{content || "Your caption will appear here…"}</p>
      </div>
    </div>
  );
}
