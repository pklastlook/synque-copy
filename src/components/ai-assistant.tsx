"use client";

import * as React from "react";
import {
  Bot, Send, X, Sparkles, Loader2, TrendingUp, Users, Calendar, FileText,
  Eraser, ChevronDown,
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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
      const t = setTimeout(() => inputRef.current?.focus(), 320);
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
          Floating Action Button — 56px, blue→teal gradient, glow + pulse
          ============================================================ */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "apple-fab-gradient fab-glow animate-fab-in apple-font",
            "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full",
            "transition-transform duration-300 hover:scale-105 active:scale-95",
            "max-lg:bottom-24",
          )}
          aria-label="Open SocialFlow AI"
        >
          <Bot className="h-6 w-6 text-white" strokeWidth={2.2} />
          {/* Online / unread dot */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
            <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </span>
        </button>
      )}

      {/* ============================================================
          Chat Panel — iOS Messenger-style frosted glass
          ============================================================ */}
      {open && (
        <div
          className={cn(
            "apple-font fixed z-50 flex flex-col overflow-hidden",
            // Desktop: floating rounded panel
            "bottom-6 right-6 h-[640px] max-h-[calc(100dvh-3rem)] w-[400px] max-w-[calc(100vw-2rem)]",
            // Mobile: full-screen sheet style (rounded top, near full height)
            "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[calc(100dvh-4rem)] max-lg:w-full max-lg:rounded-t-3xl",
            "rounded-3xl",
            // Frosted glass surface — heavy on mobile, lighter on desktop
            "apple-glass-heavy max-lg:apple-glass",
            "border border-border/30 shadow-2xl",
            "animate-ios-fade-scale",
          )}
          role="dialog"
          aria-label="SocialFlow AI chat"
        >
          {/* =====================================================
              Header — frosted glass, avatar + name + online status
              ===================================================== */}
          <header
            className={cn(
              "apple-glass flex items-center gap-3 px-4 py-3",
              "border-b border-black/5 dark:border-white/10",
            )}
          >
            {/* Avatar — circular, blue→teal gradient, with online dot */}
            <div className="relative shrink-0">
              <div className="apple-avatar-gradient grid h-10 w-10 place-items-center rounded-full">
                <Bot className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <span
                className="online-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background"
                style={{ background: "var(--apple-green)" }}
                aria-label="Online"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                  SocialFlow AI
                </span>
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--apple-green)" }}
                />
                <span>Online · typically replies instantly</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {hasMessages && (
                <button
                  onClick={clearChat}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                  aria-label="Clear conversation"
                  title="Clear"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-muted-foreground transition hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </header>

          {/* =====================================================
              Messages area — clean canvas, fade-in animations
              ===================================================== */}
          <div
            ref={scrollRef}
            className="scroll-liquid flex-1 space-y-1 overflow-y-auto px-3 py-4"
            style={{ background: "var(--apple-canvas)" }}
          >
            {/* Empty state — greeting + quick prompts */}
            {!hasMessages && !loading && (
              <div className="flex flex-col items-center gap-5 px-2 py-6">
                <div className="apple-avatar-gradient grid h-16 w-16 place-items-center rounded-full">
                  <Bot className="h-8 w-8 text-white" strokeWidth={2.2} />
                </div>
                <div className="text-center">
                  <div className="text-[17px] font-semibold tracking-tight text-foreground">
                    Hi{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
                  </div>
                  <div className="mx-auto mt-1 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
                    I&apos;m your SocialFlow AI. Ask me about posts, accounts,
                    team, analytics — or have me create tasks and check your
                    schedule.
                  </div>
                </div>

                {/* Quick prompts — rounded pills */}
                <div className="flex w-full flex-col gap-2">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Try these
                  </div>
                  {QUICK_PROMPTS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.text}
                        onClick={() => send(p.text)}
                        className="apple-pill flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-left text-[13px]"
                      >
                        <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--apple-blue)" }} strokeWidth={2.2} />
                        <span className="min-w-0 flex-1 truncate">{p.text}</span>
                        <ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-40" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Render grouped messages with date separators */}
            {grouped.map((group) => (
              <div key={group.key} className="space-y-1">
                {/* Date separator — sticky centered pill */}
                <div className="sticky top-0 z-10 flex justify-center py-2">
                  <span
                    className="animate-pill-in rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm"
                    style={{
                      background: "var(--apple-elevated)",
                      border: "1px solid var(--apple-gray-5)",
                    }}
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
                      {/* AI avatar (only on left + last in group) */}
                      {!isUser && isLastInGroup && (
                        <div className="apple-avatar-gradient mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full">
                          <Bot className="h-4 w-4 text-white" strokeWidth={2.2} />
                        </div>
                      )}
                      {!isUser && !isLastInGroup && (
                        <div className="mb-0.5 h-7 w-7 shrink-0" aria-hidden />
                      )}

                      {/* Bubble */}
                      <div
                        className={cn(
                          "max-w-[75%] px-4 py-2.5",
                          "rounded-3xl text-[15px] leading-relaxed",
                          isUser
                            ? cn(
                                "apple-bubble-out bubble-tail-right",
                                // Round bottom-right less when last in group (tail anchor)
                                isLastInGroup ? "rounded-br-md" : "rounded-br-3xl",
                              )
                            : cn(
                                "apple-bubble-in bubble-tail-left",
                                isLastInGroup ? "rounded-bl-md" : "rounded-bl-3xl",
                              ),
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>

                        {/* Action chip (tool name) */}
                        {m.action && (
                          <div
                            className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium"
                            style={{
                              background: "rgba(255,255,255,0.18)",
                              color: isUser ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.55)",
                            }}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span className="font-mono">{m.action.tool}</span>
                            {m.action.error && (
                              <span className="ml-1 text-rose-300">· error</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicator — 3 bouncing dots in a gray bubble */}
            {loading && (
              <div className="animate-message-in flex items-end gap-2">
                <div className="apple-avatar-gradient mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full">
                  <Bot className="h-4 w-4 text-white" strokeWidth={2.2} />
                </div>
                <div className="apple-bubble-in bubble-tail-left rounded-3xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span
                      className="typing-dot h-2 w-2 rounded-full"
                      style={{ background: "var(--apple-gray)", animationDelay: "0ms" }}
                    />
                    <span
                      className="typing-dot h-2 w-2 rounded-full"
                      style={{ background: "var(--apple-gray)", animationDelay: "180ms" }}
                    />
                    <span
                      className="typing-dot h-2 w-2 rounded-full"
                      style={{ background: "var(--apple-gray)", animationDelay: "360ms" }}
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
            <div
              className="flex gap-2 overflow-x-auto px-3 py-2 no-scrollbar"
              style={{ background: "var(--apple-canvas)" }}
            >
              {QUICK_PROMPTS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.text}
                    onClick={() => send(p.text)}
                    className="apple-pill flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]"
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: "var(--apple-blue)" }} strokeWidth={2.2} />
                    <span className="whitespace-nowrap">{p.text}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowQuickPrompts(false)}
                className="apple-pill flex shrink-0 items-center rounded-full px-2.5 py-1.5"
                aria-label="Hide prompts"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* =====================================================
              Input area — frosted glass, rounded-full input + send
              ===================================================== */}
          <div
            className={cn(
              "apple-glass focus-ring-anim border-t border-black/5 px-3 py-3 dark:border-white/10",
            )}
          >
            <div className="flex items-end gap-2">
              <div
                className={cn(
                  "flex flex-1 items-end rounded-full",
                  "border border-black/8 bg-black/5 px-3 py-1.5 dark:border-white/10 dark:bg-white/8",
                  "transition-colors focus-within:border-blue-500/50",
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
                  placeholder="Message…"
                  rows={1}
                  className="scroll-liquid max-h-24 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Send button — circular, Apple blue */}
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="apple-send-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                )}
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[11px] text-muted-foreground">
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
