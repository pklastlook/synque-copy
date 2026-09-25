"use client";

import * as React from "react";
import { Bot, Send, X, Sparkles, Loader2, TrendingUp, Users, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  action?: { tool: string; params: Record<string, unknown>; result?: unknown; error?: string };
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "How many posts did we publish this week?" },
  { icon: Users, text: "Show me our team members and their roles" },
  { icon: Calendar, text: "What's scheduled for the next 7 days?" },
  { icon: FileText, text: "Create a task: Review Instagram comments" },
];

export function AIAssistantPanel() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages: ChatMsg[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token = typeof window !== "undefined"
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
          { role: "assistant", content: json.reply, action: json.action },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I couldn't process that. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="liquid-pill glow-ring fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[calc(100vh-3rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold">SocialFlow AI</div>
                <div className="text-[10px] text-muted-foreground">
                  Ask anything · Execute commands
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="scroll-liquid flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !loading && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                  👋 Hi{user?.name ? ` ${user.name.split(" ")[0]}` : ""}! I'm your AI assistant.
                  I can answer questions about your posts, accounts, team, analytics, and more.
                  I can also create tasks and check your schedule.
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Try these:
                  </div>
                  {QUICK_PROMPTS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.text}
                        onClick={() => send(p.text)}
                        className="flex w-full items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-left text-[11px] text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {p.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] space-y-2 rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.action && (
                    <div className="rounded-lg bg-background/60 px-2 py-1 text-[10px] text-muted-foreground">
                      <span className="font-mono">{m.action.tool}</span>
                      {m.action.error && <span className="text-rose-500"> · error</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-muted/40 px-3 py-2.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border/40 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask anything or give a command…"
                rows={1}
                className="scroll-liquid max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-[13px] outline-none transition focus:border-primary/50"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="liquid-pill grid h-10 w-10 shrink-0 place-items-center rounded-xl disabled:opacity-50"
                aria-label="Send"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </div>
      )}
    </>
  );
}
