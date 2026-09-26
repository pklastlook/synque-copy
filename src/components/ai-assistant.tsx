"use client";

import * as React from "react";
import {
  Sparkles, Send, X, Loader2, TrendingUp, Users, Calendar, FileText,
  Eraser, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { SectionHeader, Pill, ListRow } from "@/components/glass/dense-ui";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
  action?: { tool: string; params: Record<string, unknown>; result?: unknown; error?: string };
}

interface DayGroup {
  key: string;
  label: string;
  messages: ChatMsg[];
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "How many posts did we publish this week?" },
  { icon: Users, text: "Show me our team members and their roles" },
  { icon: Calendar, text: "What's scheduled for the next 7 days?" },
  { icon: FileText, text: "Create a task: Review Instagram comments" },
];

// Returns "Today", "Yesterday", or "Mon, Mar 5"
function formatDayLabel(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfThat) / 86400000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function AIAssistantPanel() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive / loading state changes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // Auto-focus input when panel opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");
    setShowQuickPrompts(false);

    const newMessages: ChatMsg[] = [
      ...messages,
      { role: "user", content: userText, ts: Date.now() },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
          : null;

      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userText,
          history: newMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (json.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.reply,
            ts: Date.now(),
            action: json.action,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I couldn't process that. Please try again.",
            ts: Date.now(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error — please try again.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setShowQuickPrompts(true);
  }

  // Group messages by day for date separators
  const grouped: DayGroup[] = React.useMemo(() => {
    const map = new Map<string, DayGroup>();
    for (const m of messages) {
      const d = new Date(m.ts);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) {
        map.set(key, { key, label: formatDayLabel(d), messages: [] });
      }
      map.get(key)!.messages.push(m);
    }
    return Array.from(map.values());
  }, [messages]);

  const hasMessages = messages.length > 0;

  // Status Pill shown in the header action slot — green Online / amber Thinking.
  // Replaces the static "Ask anything" subtitle semantic; the desc field is
  // reused to mirror the same state in text form (for screen-reader parity).
  const statusPill = loading ? (
    <Pill color="amber" className="uppercase tracking-wide">Thinking</Pill>
  ) : (
    <Pill color="green" className="uppercase tracking-wide">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Online
    </Pill>
  );

  return (
    <>
      {/* ============================================================
          Floating Action Button — 52px, SOLID Apple blue (#0071E3).
          Sparkles icon. Subtle shadow + slight hover scale (no glow).
          ============================================================ */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "apple-fab-gradient apple-font animate-fab-in",
            "fixed bottom-6 right-6 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full",
            "transition-transform duration-200",
            "max-lg:bottom-24",
          )}
          aria-label="Open Assistant"
        >
          <Sparkles className="h-[22px] w-[22px] text-white" strokeWidth={2.2} />
        </button>
      )}

      {/* ============================================================
          Chat Panel — dense-ui redesign.
          Solid white background (NOT frosted), 360×540 (compact),
          rounded-xl (12px), tight shadow. Uses SectionHeader + Pill +
          ListRow from dense-ui. Keep asymmetric bubble style (no tails).
          ============================================================ */}
      {open && (
        <div
          className={cn(
            "apple-font fixed z-50 flex flex-col overflow-hidden",
            // Desktop: floating 360×540 panel, rounded-xl (was 380×560)
            "bottom-6 right-6 h-[540px] max-h-[calc(100dvh-3rem)] w-[360px] max-w-[calc(100vw-2rem)]",
            // Mobile: full-width sheet, flat top edge (iOS standard)
            "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[calc(100dvh-4rem)] max-lg:w-full max-lg:max-w-none",
            "rounded-xl",
            // Solid white background — NOT frosted glass
            "border border-black/[0.06] dark:border-white/[0.08]",
            "bg-white dark:bg-[#2C2C2E]",
            // Apple elevated shadow: 0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)
            "shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)]",
            "animate-ios-fade-scale",
          )}
          role="dialog"
          aria-label="Assistant"
        >
          {/* =====================================================
              Header — dense-ui SectionHeader.
              icon=Sparkles (plain 16px, NOT the 32px solid blue circle —
              saves 16px vertical vs. the old custom header for density).
              mb-0 override (SectionHeader default mb-3 doesn't apply to
              a header pinned above a border-b). Title size overridden
              from text-sm → text-[15px] to match Apple panel prominence.
              desc mirrors status (Ask anything / Thinking…).
              action = status Pill + clear + close buttons.
              ===================================================== */}
          <SectionHeader
            title="Assistant"
            desc={loading ? "Thinking…" : "Ask anything"}
            icon={Sparkles}
            className={cn(
              "apple-font mb-0 gap-2 px-4 py-2.5",
              "border-b border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#2C2C2E]",
              // Title override: SectionHeader default text-sm → 15px-semibold (panel header).
              "[&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:tracking-tight",
              "[&_h2]:text-[#1D1D1F] dark:[&_h2]:text-[#F5F5F7]",
              // Subtitle override: 12px muted (was 11px).
              "[&_p]:text-[12px] [&_p]:text-[#86868B] dark:[&_p]:text-[#98989D]",
              // Icon override: blue (was muted-foreground) for brand color.
              "[&_svg]:text-[#0071E3] dark:[&_svg]:text-[#0A84FF]",
            )}
            action={
              <div className="flex items-center gap-1">
                {statusPill}
                {hasMessages && (
                  <button
                    onClick={clearChat}
                    className="grid h-7 w-7 place-items-center rounded-full text-[#86868B] transition hover:bg-black/[0.05] hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:bg-white/[0.06] dark:hover:text-[#F5F5F7]"
                    aria-label="Clear conversation"
                    title="Clear"
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-full text-[#86868B] transition hover:bg-black/[0.05] hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:bg-white/[0.06] dark:hover:text-[#F5F5F7]"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </div>
            }
          />

          {/* =====================================================
              Messages area — solid white canvas.
              Asymmetric corner bubbles (NOT tails). 14px text. 80% max width.
              ===================================================== */}
          <div
            ref={scrollRef}
            className="scroll-liquid flex-1 space-y-1 overflow-y-auto bg-white px-3 py-3 dark:bg-[#2C2C2E]"
          >
            {/* Empty state — greeting + dense-ui ListRow quick prompts */}
            {!hasMessages && !loading && (
              <div className="flex flex-col items-center gap-4 px-2 py-4">
                {/* 48px brand circle (was 56px — denser) */}
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0071E3] shadow-[0_4px_12px_-2px_rgba(0,113,227,0.30)] dark:bg-[#0A84FF]">
                  <Sparkles className="h-6 w-6 text-white" strokeWidth={2.2} />
                </div>
                <div className="text-center">
                  <div className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Hi{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  </div>
                  <div className="mx-auto mt-1 max-w-[280px] text-[12px] leading-relaxed text-[#86868B] dark:text-[#98989D]">
                    Ask me about posts, accounts, team, analytics — or have
                    me create tasks and check your schedule.
                  </div>
                </div>

                {/* Quick prompts — dense-ui ListRow (replaces apple-pill chips).
                    Wrapped in a single bordered container so the rows read as
                    one grouped list, with hairline dividers between rows. */}
                <div className="flex w-full flex-col">
                  <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#86868B] dark:text-[#98989D]">
                    Try these
                  </div>
                  <div className="overflow-hidden rounded-lg border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#2C2C2E]">
                    {QUICK_PROMPTS.map((p, i) => {
                      const Icon = p.icon;
                      return (
                        <ListRow
                          key={p.text}
                          onClick={() => send(p.text)}
                          className={cn(
                            "apple-font gap-2.5 px-3 py-2.5 text-left",
                            // Use Apple-tinted hover (matches original chips)
                            "hover:bg-[#E8E8ED] dark:hover:bg-white/[0.10]",
                            // Hairline divider between rows; strip on last row
                            // to avoid double-border with the outer container.
                            i < QUICK_PROMPTS.length - 1
                              ? "border-b border-black/[0.06] dark:border-white/[0.06]"
                              : "border-b-0",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={2.2} />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">{p.text}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#86868B] dark:text-[#98989D]" />
                        </ListRow>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Render grouped messages with date separators */}
            {grouped.map((group) => (
              <div key={group.key} className="space-y-1">
                {/* Date separator — centered chip */}
                <div className="flex justify-center py-1.5">
                  <span
                    className="animate-pill-in rounded-lg bg-[#F5F5F7] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#86868B] dark:bg-white/[0.08] dark:text-[#98989D]"
                  >
                    {group.label}
                  </span>
                </div>

                {group.messages.map((m, i) => {
                  const isUser = m.role === "user";
                  const isLastInGroup =
                    i === group.messages.length - 1 ||
                    group.messages[i + 1].role !== m.role;

                  return (
                    <div
                      key={`${group.key}-${i}`}
                      className={cn(
                        "animate-message-in flex items-end gap-2",
                        isUser ? "justify-end" : "justify-start",
                      )}
                    >
                      {/* AI avatar (only on left + last in group) — solid blue circle, 28px */}
                      {!isUser && isLastInGroup && (
                        <div className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0071E3] dark:bg-[#0A84FF]">
                          <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                        </div>
                      )}
                      {!isUser && !isLastInGroup && (
                        <div className="mb-0.5 h-7 w-7 shrink-0" aria-hidden />
                      )}

                      {/* Bubble — rounded-xl with asymmetric corner (NOT tail) */}
                      <div
                        className={cn(
                          "max-w-[80%] px-3 py-1.5",
                          "rounded-xl text-[14px] leading-relaxed",
                          isUser
                            ? cn(
                                "bg-[#0071E3] text-white dark:bg-[#0A84FF]",
                                isLastInGroup ? "rounded-br-sm" : "rounded-br-xl",
                              )
                            : cn(
                                "bg-[#F5F5F7] text-[#1D1D1F] dark:bg-white/[0.06] dark:text-[#F5F5F7]",
                                isLastInGroup ? "rounded-bl-sm" : "rounded-bl-xl",
                              ),
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>

                        {/* Action chip (tool name) — subtle inline label */}
                        {m.action && (
                          <div
                            className={cn(
                              "mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium",
                              isUser
                                ? "bg-white/15 text-white/80"
                                : "bg-black/[0.05] text-[#86868B] dark:bg-white/[0.08] dark:text-[#98989D]",
                            )}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span className="font-mono">{m.action.tool}</span>
                            {m.action.error && (
                              <span className="ml-1 text-[#FF3B30] dark:text-[#FF453A]">· error</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicator — 3 dots in a gray bubble (no avatar) */}
            {loading && (
              <div className="animate-message-in flex items-end gap-2">
                <div className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0071E3] dark:bg-[#0A84FF]">
                  <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                </div>
                <div className="rounded-xl rounded-bl-sm bg-[#F5F5F7] px-4 py-3 dark:bg-white/[0.06]">
                  <div className="flex items-center gap-1">
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-[#86868B] dark:bg-[#98989D]"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-[#86868B] dark:bg-[#98989D]"
                      style={{ animationDelay: "180ms" }}
                    />
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-[#86868B] dark:bg-[#98989D]"
                      style={{ animationDelay: "360ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================
              Quick prompts collapsible row (after first message).
              These stay as horizontal apple-pill chips (NOT ListRow) —
              they're a horizontally-scrollable suggestion strip, which
              ListRow's vertical full-width layout doesn't fit.
              ===================================================== */}
          {hasMessages && showQuickPrompts && (
            <div className="flex gap-2 overflow-x-auto border-t border-black/[0.06] bg-white px-3 py-2 no-scrollbar dark:border-white/[0.08] dark:bg-[#2C2C2E]">
              {QUICK_PROMPTS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.text}
                    onClick={() => send(p.text)}
                    className="apple-pill flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[12px]"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={2.2} />
                    <span className="whitespace-nowrap text-[#1D1D1F] dark:text-[#F5F5F7]">{p.text}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowQuickPrompts(false)}
                className="apple-pill flex shrink-0 items-center px-2.5 py-1.5"
                aria-label="Hide prompts"
              >
                <X className="h-3.5 w-3.5 text-[#86868B] dark:text-[#98989D]" />
              </button>
            </div>
          )}

          {/* =====================================================
              Input area — solid white, 1px top border.
              Input: bg-[#F5F5F7] rounded-lg. Send: 36px rounded-lg.
              ===================================================== */}
          <div className="border-t border-black/[0.06] bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#2C2C2E]">
            <div className="flex items-end gap-2">
              <div
                className={cn(
                  "flex flex-1 items-end rounded-lg",
                  "border border-black/[0.06] bg-[#F5F5F7] px-3 py-1 dark:border-white/[0.08] dark:bg-white/[0.06]",
                  "transition-colors focus-within:border-[#0071E3]/50 dark:focus-within:border-[#0A84FF]/50",
                )}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask anything…"
                  rows={1}
                  className="scroll-liquid max-h-24 min-h-[32px] flex-1 resize-none bg-transparent py-1 text-[14px] leading-relaxed text-[#1D1D1F] outline-none placeholder:text-[#86868B] dark:text-[#F5F5F7] dark:placeholder:text-[#98989D]"
                />
              </div>

              {/* Send button — 36px, rounded-lg, solid Apple blue */}
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="apple-send-btn grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                )}
              </button>
            </div>
            <p className="mt-1 px-2 text-[10px] text-[#86868B] dark:text-[#98989D]">
              {loading
                ? "Thinking…"
                : "Enter to send · Shift+Enter for newline"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
