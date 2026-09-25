"use client";

import * as React from "react";
import {
  Sparkles, Send, X, Loader2, TrendingUp, Users, Calendar, FileText,
  Eraser,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

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
          Chat Panel — professional Apple Spotlight / Siri panel.
          Solid white background, 380×560, rounded-xl (12px), tight shadow.
          NOT iMessage, NOT frosted glass.
          ============================================================ */}
      {open && (
        <div
          className={cn(
            "apple-font fixed z-50 flex flex-col overflow-hidden",
            // Desktop: floating 380×560 panel, rounded-xl
            "bottom-6 right-6 h-[560px] max-h-[calc(100dvh-3rem)] w-[380px] max-w-[calc(100vw-2rem)]",
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
              Header — solid white, 1px bottom border.
              32px solid-blue icon circle + "Assistant" title.
              ===================================================== */}
          <header
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              "border-b border-black/[0.06] dark:border-white/[0.08]",
              "bg-white dark:bg-[#2C2C2E]",
            )}
          >
            {/* Icon — 32px solid Apple blue circle with white Sparkles */}
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0071E3] dark:bg-[#0A84FF] shadow-[0_2px_6px_-1px_rgba(0,113,227,0.30)]">
              <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                Assistant
              </div>
              <div className="truncate text-[12px] text-[#86868B] dark:text-[#98989D]">
                Ask anything
              </div>
            </div>

            <div className="flex items-center gap-1">
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
          </header>

          {/* =====================================================
              Messages area — solid white canvas.
              Asymmetric corner bubbles (NOT tails). 14px text. 80% max width.
              ===================================================== */}
          <div
            ref={scrollRef}
            className="scroll-liquid flex-1 space-y-1 overflow-y-auto bg-white px-3 py-4 dark:bg-[#2C2C2E]"
          >
            {/* Empty state — greeting + quick prompts */}
            {!hasMessages && !loading && (
              <div className="flex flex-col items-center gap-5 px-2 py-6">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0071E3] shadow-[0_4px_12px_-2px_rgba(0,113,227,0.30)] dark:bg-[#0A84FF]">
                  <Sparkles className="h-7 w-7 text-white" strokeWidth={2.2} />
                </div>
                <div className="text-center">
                  <div className="text-[16px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Hi{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  </div>
                  <div className="mx-auto mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-[#86868B] dark:text-[#98989D]">
                    Ask me about posts, accounts, team, analytics — or have
                    me create tasks and check your schedule.
                  </div>
                </div>

                {/* Quick prompts — rounded-lg chips (NOT pills) */}
                <div className="flex w-full flex-col gap-2">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#86868B] dark:text-[#98989D]">
                    Try these
                  </div>
                  {QUICK_PROMPTS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.text}
                        onClick={() => send(p.text)}
                        className={cn(
                          "apple-pill flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px]",
                          "hover:bg-[#E8E8ED] dark:hover:bg-white/[0.10]",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={2.2} />
                        <span className="min-w-0 flex-1 truncate text-[#1D1D1F] dark:text-[#F5F5F7]">{p.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Render grouped messages with date separators */}
            {grouped.map((group) => (
              <div key={group.key} className="space-y-1">
                {/* Date separator — centered chip */}
                <div className="flex justify-center py-2">
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
                          "max-w-[80%] px-3.5 py-2",
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
                              "mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium",
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
              Quick prompts collapsible row (after first message)
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
          <div className="border-t border-black/[0.06] bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-[#2C2C2E]">
            <div className="flex items-end gap-2">
              <div
                className={cn(
                  "flex flex-1 items-end rounded-lg",
                  "border border-black/[0.06] bg-[#F5F5F7] px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.06]",
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
                  className="scroll-liquid max-h-24 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed text-[#1D1D1F] outline-none placeholder:text-[#86868B] dark:text-[#F5F5F7] dark:placeholder:text-[#98989D]"
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
            <p className="mt-1.5 px-2 text-[11px] text-[#86868B] dark:text-[#98989D]">
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
