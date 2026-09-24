"use client";

import * as React from "react";
import {
  CheckCircle2, Clock, Plus, Trash2, Send, Loader2, Filter,
  AlertCircle, ListTodo, Eye, MessageSquare, BarChart3, Megaphone,
  Wand2, Image as ImageIcon, ChevronDown, Calendar, Flag, User,
  TrendingUp, Check, X, RotateCcw, LayoutGrid, Rows3, ArrowUpDown, type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============ Types ============
interface TaskUser {
  id: string; name: string; color: string | null; avatar: string | null; title?: string | null; role?: string;
}
interface Task {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  platforms: string[];
  tags: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  assigneeAvatar: string | null;
  creatorId: string;
  creatorName: string;
  creatorColor: string | null;
  status: string;
  priority: string;
  type: string;
  relatedPostId: string | null;
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
}
interface TeamMember {
  id: string; name: string; email: string; avatar: string | null;
  color: string | null; role: string; title: string | null;
}

// ============ Constants ============
type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
const STATUSES: { id: TaskStatus; label: string; color: string; bg: string; icon: LucideIcon }[] = [
  { id: "todo", label: "To Do", color: "oklch(0.6 0.02 250)", bg: "oklch(0.6 0.02 250)", icon: ListTodo },
  { id: "in_progress", label: "In Progress", color: "oklch(0.7 0.15 75)", bg: "oklch(0.7 0.15 75)", icon: Clock },
  { id: "review", label: "In Review", color: "oklch(0.7 0.2 255)", bg: "oklch(0.7 0.2 255)", icon: Eye },
  { id: "done", label: "Done", color: "oklch(0.7 0.2 145)", bg: "oklch(0.7 0.2 145)", icon: CheckCircle2 },
  { id: "blocked", label: "Blocked", color: "oklch(0.55 0.22 25)", bg: "oklch(0.55 0.22 25)", icon: AlertCircle },
];

const PRIORITIES: { id: string; label: string; color: string }[] = [
  { id: "low", label: "Low", color: "oklch(0.6 0.02 250)" },
  { id: "normal", label: "Normal", color: "oklch(0.62 0.2 255)" },
  { id: "high", label: "High", color: "oklch(0.7 0.2 75)" },
  { id: "urgent", label: "Urgent", color: "oklch(0.55 0.22 25)" },
];

const TYPES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "content", label: "Content", icon: Wand2 },
  { id: "review", label: "Review", icon: Eye },
  { id: "engagement", label: "Engagement", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "campaign", label: "Campaign", icon: Megaphone },
];

const TYPE_ICON: Record<string, LucideIcon> = Object.fromEntries(TYPES.map((t) => [t.id, t.icon]));

// ============ Main view ============
export function TasksView() {
  const { user } = useAuth();
  const { openComposerWithPost } = useNav();
  const [filter, setFilter] = React.useState<"all" | "mine" | "created">("all");
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");

  // Build the API URL based on the filter
  const apiUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (filter === "mine") params.set("mine", "1");
    if (filter === "created" && user) params.set("creatorId", user.id);
    return `/api/tasks?${params.toString()}`;
  }, [filter, user]);

  const { data: tasks, loading, reload } = useApi<Task[]>(apiUrl);
  const { data: members } = useApi<TeamMember[]>("/api/team");

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  const allTasks = tasks ?? [];
  const teamMembers = members ?? [];

  // Group tasks by status
  const byStatus = React.useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [], blocked: [] };
    for (const t of allTasks) {
      if (groups[t.status as TaskStatus]) groups[t.status as TaskStatus].push(t);
    }
    return groups;
  }, [allTasks]);

  // KPI stats
  const stats = React.useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const remaining = total - done;
    const myTasks = allTasks.filter((t) => t.assigneeId === user?.id).length;
    const myDone = allTasks.filter((t) => t.assigneeId === user?.id && t.status === "done").length;
    return { total, done, remaining, myTasks, myDone, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [allTasks, user]);

  async function updateTaskStatus(id: string, status: TaskStatus) {
    const token = getToken();
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "done" ? "Task completed 🎉" : `Moved to ${STATUSES.find((s) => s.id === status)?.label}`);
        reload({ silent: true });
      }
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    const token = getToken();
    await fetch(`/api/tasks/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    toast.success("Task deleted");
    reload({ silent: true });
  }

  function sendToComposer(task: Task) {
    openComposerWithPost({
      id: task.id,
      title: task.title,
      caption: task.content || task.description || "",
      mediaUrl: task.mediaUrl,
      mediaType: (task.mediaType as "image" | "video") || "image",
      tone: "professional",
      status: "draft",
      scheduledAt: null,
      authorId: user?.id ?? "",
      authorName: user?.name ?? "",
      variants: [],
      createdAt: task.createdAt,
    });
    toast.success("Sent to composer", { description: "Edit and publish from the composer" });
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-[400px] rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-4">
      <HelpText module="tasks">
        <strong className="text-foreground">Tasks</strong> — assign work to yourself or your team. Write content, attach media,
        pick platforms, then send a task straight to the composer with one click.
      </HelpText>

      {/* Header */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <ListTodo className="h-3.5 w-3.5" /> Workflow · Task management
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.total}</span> total ·{" "}
              <span className="font-semibold text-emerald-500">{stats.done} done</span> ·{" "}
              <span className="font-semibold text-amber-500">{stats.remaining} remaining</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
              {([
                { id: "all", label: "All" },
                { id: "mine", label: "My tasks" },
                { id: "created", label: "Created" },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    filter === f.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Rows3 className="h-3.5 w-3.5" /> List
              </button>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> New task
            </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total tasks" value={stats.total} icon={<ListTodo className="h-5 w-5" />} accent="oklch(0.62 0.2 255)" />
        <KpiCard label="Completed" value={stats.done} icon={<CheckCircle2 className="h-5 w-5" />} accent="oklch(0.7 0.2 145)" hint={`${stats.completionRate}% done`} />
        <KpiCard label="Remaining" value={stats.remaining} icon={<Clock className="h-5 w-5" />} accent="oklch(0.7 0.15 75)" hint="Across all statuses" />
        <KpiCard label="Assigned to me" value={stats.myTasks} icon={<User className="h-5 w-5" />} accent="oklch(0.66 0.22 305)" hint={`${stats.myDone} done by me`} />
      </div>

      {/* Kanban board OR List view */}
      {viewMode === "kanban" ? (
      <div className="grid gap-3 lg:grid-cols-5">
        {STATUSES.map((col) => {
          const colTasks = byStatus[col.id];
          const Icon = col.icon;
          return (
            <div key={col.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: `${col.bg}18`, color: col.color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: col.color }}>{col.label}</span>
                </div>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="scroll-liquid flex max-h-[calc(100vh-340px)] flex-col gap-2 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/30 p-4 text-center text-[10px] text-muted-foreground/60">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMove={(s) => updateTaskStatus(task.id, s)}
                      onEdit={() => setEditingTask(task)}
                      onDelete={() => deleteTask(task.id)}
                      onSendComposer={() => sendToComposer(task)}
                      canEdit={user?.id === task.creatorId || user?.id === task.assigneeId}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <TaskListView
          tasks={allTasks}
          onEdit={(t) => setEditingTask(t)}
          onDelete={(id) => deleteTask(id)}
          onMove={(id, s) => updateTaskStatus(id, s)}
          onSendComposer={(t) => sendToComposer(t)}
          canEdit={(t) => user?.id === t.creatorId || user?.id === t.assigneeId}
        />
      )}

      {/* Create dialog */}
      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={teamMembers}
        currentUserId={user?.id ?? ""}
        onSaved={() => { setCreateOpen(false); reload({ silent: true }); }}
      />

      {/* Edit dialog */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(o) => { if (!o) setEditingTask(null); }}
        task={editingTask}
        members={teamMembers}
        currentUserId={user?.id ?? ""}
        onSaved={() => { setEditingTask(null); reload({ silent: true }); }}
      />
    </div>
  );
}

// ============ Task card ============
function TaskCard({
  task, onMove, onEdit, onDelete, onSendComposer, canEdit,
}: {
  task: Task;
  onMove: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendComposer: () => void;
  canEdit: boolean;
}) {
  const priority = PRIORITIES.find((p) => p.id === task.priority) ?? PRIORITIES[1];
  const TypeIcon = TYPE_ICON[task.type] ?? Wand2;
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "done";

  return (
    <div
      className={cn(
        "crystal-in group relative overflow-hidden rounded-2xl border bg-muted/10 p-3 transition hover:bg-muted/20",
        task.status === "done" ? "border-emerald-500/20 opacity-80" : "border-border/40"
      )}
    >
      {/* Priority accent stripe */}
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: priority.color }} />

      <div className="pl-1.5">
        {/* Header: type + priority */}
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="grid h-5 w-5 place-items-center rounded bg-muted text-muted-foreground">
            <TypeIcon className="h-3 w-3" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: priority.color }}>
            {priority.label}
          </span>
          {isOverdue && <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-rose-500"><AlertCircle className="h-2.5 w-2.5" /> Overdue</span>}
        </div>

        {/* Title */}
        <div className={cn("text-xs font-bold leading-snug", task.status === "done" && "line-through opacity-60")}>
          {task.title}
        </div>

        {/* Description / content preview */}
        {task.content && (
          <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{task.content}</p>
        )}
        {!task.content && task.description && (
          <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{task.description}</p>
        )}

        {/* Media preview */}
        {task.mediaUrl && (
          <div className="mt-1.5 overflow-hidden rounded-lg">
            <img src={task.mediaUrl} alt="" className="h-16 w-full object-cover" />
          </div>
        )}

        {/* Platforms */}
        {task.platforms.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            {task.platforms.slice(0, 5).map((pl, i) => <PlatformBadge key={i} platform={pl as PlatformId} size={12} />)}
          </div>
        )}

        {/* Tags */}
        {task.tags && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {task.tags.split(",").slice(0, 3).map((tag, i) => (
              <span key={i} className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">#{tag.trim()}</span>
            ))}
          </div>
        )}

        {/* Assignee + due date */}
        <div className="mt-2 flex items-center gap-1.5">
          {task.assigneeName ? (
            <NameAvatar name={task.assigneeName} color={(task.assigneeColor as any) ?? "blue"} className="h-5 w-5 text-[9px]" />
          ) : (
            <div className="grid h-5 w-5 place-items-center rounded-full bg-muted text-muted-foreground"><User className="h-2.5 w-2.5" /></div>
          )}
          <span className="truncate text-[10px] text-muted-foreground">{task.assigneeName ?? "Unassigned"}</span>
          {task.dueAt && (
            <span className={cn("ml-auto flex items-center gap-0.5 text-[9px]", isOverdue ? "font-bold text-rose-500" : "text-muted-foreground")}>
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-1">
          {/* Move dropdown */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-0.5 rounded-md border border-border/40 px-1.5 py-1 text-[9px] font-semibold text-muted-foreground transition hover:bg-muted/40">
                <RotateCcw className="h-2.5 w-2.5" /> Move <ChevronDown className="h-2.5 w-2.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => onMove(s.id)}
                    disabled={s.id === task.status}
                    className="text-xs"
                  >
                    <s.icon className="h-3 w-3" style={{ color: s.color }} />
                    {s.label}
                    {s.id === task.status && <Check className="ml-auto h-3 w-3" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Send to composer */}
          <button
            onClick={onSendComposer}
            title="Send to composer"
            className="flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-1 text-[9px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <Wand2 className="h-2.5 w-2.5" /> Compose
          </button>

          {canEdit && (
            <>
              <button
                onClick={onEdit}
                title="Edit"
                className="ml-auto grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-muted/40"
              >
                <Eye className="h-3 w-3" />
              </button>
              <button
                onClick={onDelete}
                title="Delete"
                className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Task list view (table with full details) ============
function TaskListView({
  tasks, onEdit, onDelete, onMove, onSendComposer, canEdit,
}: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, s: TaskStatus) => void;
  onSendComposer: (t: Task) => void;
  canEdit: (t: Task) => boolean;
}) {
  const [sortKey, setSortKey] = React.useState<string>("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const sorted = [...tasks].sort((a, b) => {
    let av: string | number = (a as any)[sortKey] ?? "";
    let bv: string | number = (b as any)[sortKey] ?? "";
    if (sortKey === "dueAt" || sortKey === "createdAt") {
      av = av ? new Date(av as string).getTime() : 0;
      bv = bv ? new Date(bv as string).getTime() : 0;
    }
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return sortDir === "desc" ? (bv > av ? 1 : bv < av ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
  });

  function toggle(k: string) {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  const statusMeta = (s: string) => STATUSES.find((st) => st.id === s) ?? STATUSES[0];
  const priorityMeta = (p: string) => PRIORITIES.find((pr) => pr.id === p) ?? PRIORITIES[1];

  return (
    <div className="crystal-in overflow-x-auto rounded-2xl border border-border/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
              <button onClick={() => toggle("title")} className="flex items-center gap-1 hover:text-foreground">Task <ArrowUpDown className="h-2.5 w-2.5 opacity-30" /></button>
            </th>
            <th className="px-2 py-2.5 text-left font-semibold">
              <button onClick={() => toggle("status")} className="flex items-center gap-1 hover:text-foreground">Status <ArrowUpDown className="h-2.5 w-2.5 opacity-30" /></button>
            </th>
            <th className="px-2 py-2.5 text-left font-semibold">
              <button onClick={() => toggle("priority")} className="flex items-center gap-1 hover:text-foreground">Priority <ArrowUpDown className="h-2.5 w-2.5 opacity-30" /></button>
            </th>
            <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">Assignee</th>
            <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">
              <button onClick={() => toggle("dueAt")} className="flex items-center gap-1 hover:text-foreground">Due <ArrowUpDown className="h-2.5 w-2.5 opacity-30" /></button>
            </th>
            <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">Platforms</th>
            <th className="px-2 py-2.5 text-right font-semibold text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No tasks yet</td></tr>
          ) : sorted.map((task) => {
            const sm = statusMeta(task.status);
            const pm = priorityMeta(task.priority);
            const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "done";
            return (
              <tr key={task.id} className="border-b border-border/20 transition hover:bg-muted/20">
                {/* Title + content preview */}
                <td className="px-3 py-2">
                  <div className={cn("font-medium", task.status === "done" && "line-through opacity-60")}>{task.title}</div>
                  {task.content && <div className="mt-0.5 truncate text-[10px] text-muted-foreground max-w-[200px]">{task.content}</div>}
                  {task.mediaUrl && <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-primary"><ImageIcon className="h-2.5 w-2.5" /> has media</div>}
                </td>
                {/* Status */}
                <td className="px-2 py-2">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: `${sm.color}15`, color: sm.color }}>{sm.label}</span>
                </td>
                {/* Priority */}
                <td className="px-2 py-2">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: `${pm.color}15`, color: pm.color }}>{pm.label}</span>
                </td>
                {/* Assignee */}
                <td className="px-2 py-2">
                  {task.assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <NameAvatar name={task.assigneeName} color={(task.assigneeColor as any) ?? "blue"} className="h-5 w-5 text-[9px]" />
                      <span className="text-[10px]">{task.assigneeName}</span>
                    </div>
                  ) : <span className="text-muted-foreground/50">—</span>}
                </td>
                {/* Due date */}
                <td className="px-2 py-2">
                  {task.dueAt ? (
                    <span className={cn("text-[10px]", isOverdue ? "font-bold text-rose-500" : "text-muted-foreground")}>
                      <Calendar className="mr-0.5 inline h-2.5 w-2.5" />
                      {new Date(task.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  ) : <span className="text-muted-foreground/50">—</span>}
                </td>
                {/* Platforms */}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    {task.platforms.slice(0, 3).map((pl, i) => <PlatformBadge key={i} platform={pl as PlatformId} size={12} />)}
                    {task.platforms.length > 3 && <span className="text-[9px] text-muted-foreground">+{task.platforms.length - 3}</span>}
                    {task.platforms.length === 0 && <span className="text-muted-foreground/50">—</span>}
                  </div>
                </td>
                {/* Actions */}
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onSendComposer(task)} title="Send to composer" className="rounded-md bg-primary/10 px-1.5 py-1 text-[9px] font-bold text-primary transition hover:bg-primary/20">
                      <Wand2 className="h-3 w-3" />
                    </button>
                    {canEdit(task) && (
                      <>
                        <button onClick={() => onEdit(task)} title="Edit" className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-muted/40">
                          <Eye className="h-3 w-3" />
                        </button>
                        <button onClick={() => onDelete(task.id)} title="Delete" className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ Task create/edit dialog ============
function TaskDialog({
  open, onOpenChange, task, members, currentUserId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task | null;
  members: TeamMember[];
  currentUserId: string;
  onSaved: () => void;
}) {
  const isEdit = !!task;
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [content, setContent] = React.useState("");
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [mediaType, setMediaType] = React.useState("image");
  const [platforms, setPlatforms] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus>("todo");
  const [priority, setPriority] = React.useState("normal");
  const [type, setType] = React.useState("content");
  const [dueAt, setDueAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Load task into form when editing
  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setContent(task.content ?? "");
      setMediaUrl(task.mediaUrl ?? "");
      setMediaType(task.mediaType ?? "image");
      setPlatforms(task.platforms);
      setTags(task.tags ?? "");
      setAssigneeId(task.assigneeId ?? "");
      setStatus(task.status as TaskStatus);
      setPriority(task.priority);
      setType(task.type);
      setDueAt(task.dueAt ? task.dueAt.slice(0, 10) : "");
    } else if (open) {
      // Reset for new task — default assignee to self
      setTitle(""); setDescription(""); setContent(""); setMediaUrl(""); setMediaType("image");
      setPlatforms([]); setTags(""); setAssigneeId(currentUserId); setStatus("todo");
      setPriority("normal"); setType("content"); setDueAt("");
    }
  }, [task, open, currentUserId]);

  function getToken() {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  async function save() {
    if (!title.trim()) { toast.error("Enter a title"); return; }
    setSaving(true);
    try {
      const token = getToken();
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim() || null,
        mediaUrl: mediaUrl.trim() || null,
        mediaType: mediaUrl.trim() ? mediaType : null,
        platforms: platforms.length > 0 ? platforms : null,
        tags: tags.trim() || null,
        assigneeId: assigneeId || null,
        status,
        priority,
        type,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      };

      const res = await fetch(isEdit ? `/api/tasks/${task!.id}` : "/api/tasks", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(isEdit ? "Task updated" : "Task created");
        onSaved();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(pl: string) {
    setPlatforms((prev) => prev.includes(pl) ? prev.filter((p) => p !== pl) : [...prev, pl]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            {isEdit ? "Edit task" : "New task"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the task details, content, and media." : "Create a task — write the content, attach media, pick platforms, then send it to the composer when ready."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input id="task-title" placeholder="e.g. Write Instagram caption for product launch" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description / instructions</Label>
            <Textarea id="task-desc" placeholder="What needs to be done? Any brief or guidelines for the task." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Content (the actual post text) */}
          <div className="space-y-1.5">
            <Label htmlFor="task-content" className="flex items-center gap-1.5">
              <Wand2 className="h-3 w-3 text-primary" /> Post content
              <span className="text-[10px] font-normal text-muted-foreground">(sent to composer)</span>
            </Label>
            <Textarea
              id="task-content"
              placeholder="Write the actual caption / post text here. This is what will be sent to the composer."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="text-right text-[10px] text-muted-foreground">{content.length} chars</div>
          </div>

          {/* Media URL */}
          <div className="space-y-1.5">
            <Label htmlFor="task-media">Media URL</Label>
            <div className="flex gap-2">
              <Input id="task-media" placeholder="https://... or paste a data URL" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mediaUrl && (
              <div className="overflow-hidden rounded-lg border border-border/40">
                {mediaType === "image" ? (
                  <img src={mediaUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="grid h-20 place-items-center bg-muted text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
                )}
              </div>
            )}
          </div>

          {/* Platforms */}
          <div className="space-y-1.5">
            <Label>Publish to platforms</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(PLATFORMS).map((pl) => {
                const p = PLATFORMS[pl as PlatformId];
                const selected = platforms.includes(pl);
                return (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => togglePlatform(pl)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                      selected ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <PlatformBadge platform={pl as PlatformId} size={14} />
                    {p?.name ?? pl}
                    {selected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="task-tags">Tags / hashtags</Label>
            <Input id="task-tags" placeholder="launch, product, sale (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          {/* Assignee + Due date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={assigneeId || "__unassigned__"} onValueChange={(v) => setAssigneeId(v === "__unassigned__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} · {m.title ?? m.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>

          {/* Status + Priority + Type */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/40">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
