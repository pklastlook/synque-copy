"use client";

import * as React from "react";
import {
  CheckCircle2, Clock, Plus, Trash2, Loader2,
  AlertCircle, ListTodo, Eye, MessageSquare, BarChart3, Megaphone,
  Wand2, Image as ImageIcon, ChevronDown, Calendar, User,
  Check, RotateCcw, LayoutGrid, Rows3, ArrowUpDown, Search, type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import {
  SectionHeader, Pill, ListRow, MetricRow,
} from "@/components/glass/dense-ui";
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
type PillColor = "neutral" | "green" | "amber" | "rose" | "blue" | "violet";

const STATUSES: { id: TaskStatus; label: string; color: string; pill: PillColor; icon: LucideIcon }[] = [
  { id: "todo",        label: "To Do",       color: "oklch(0.6 0.02 250)",  pill: "neutral", icon: ListTodo },
  { id: "in_progress", label: "In Progress", color: "oklch(0.7 0.15 75)",   pill: "amber",   icon: Clock },
  { id: "review",      label: "In Review",   color: "oklch(0.7 0.2 255)",   pill: "blue",    icon: Eye },
  { id: "done",        label: "Done",        color: "oklch(0.7 0.2 145)",   pill: "green",   icon: CheckCircle2 },
  { id: "blocked",     label: "Blocked",     color: "oklch(0.55 0.22 25)",  pill: "rose",    icon: AlertCircle },
];

const PRIORITIES: { id: string; label: string; color: string; pill: PillColor }[] = [
  { id: "low",     label: "Low",     color: "oklch(0.6 0.02 250)", pill: "neutral" },
  { id: "normal",  label: "Normal",  color: "oklch(0.62 0.2 255)", pill: "blue" },
  { id: "high",    label: "High",    color: "oklch(0.7 0.2 75)",   pill: "amber" },
  { id: "urgent",  label: "Urgent",  color: "oklch(0.55 0.22 25)", pill: "rose" },
];

const TYPES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "content",    label: "Content",    icon: Wand2 },
  { id: "review",     label: "Review",      icon: Eye },
  { id: "engagement", label: "Engagement",  icon: MessageSquare },
  { id: "analytics",  label: "Analytics",   icon: BarChart3 },
  { id: "campaign",   label: "Campaign",    icon: Megaphone },
];

const TYPE_ICON: Record<string, LucideIcon> = Object.fromEntries(TYPES.map((t) => [t.id, t.icon]));

const STATUS_META  = (s: string)  => STATUSES.find((x) => x.id === s)   ?? STATUSES[0];
const PRIORITY_META = (p: string) => PRIORITIES.find((x) => x.id === p) ?? PRIORITIES[1];

/** True when the task is past its due date and not yet done. */
function isOverdueTask(t: Task): boolean {
  return !!t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "done";
}

// ============ Main view ============
export function TasksView() {
  const { user } = useAuth();
  const { openComposerWithPost } = useNav();

  // Top-bar filter pills. `mine` is sent to the API; `overdue` and `high`
  // are client-side filters over the already-loaded tasks. `all` = no filter.
  const [filter, setFilter] = React.useState<"all" | "mine" | "overdue" | "high">("all");
  const [search, setSearch] = React.useState("");
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");

  // Build the API URL — only `mine` maps to a server-side filter; the rest
  // fetch all tasks and apply client-side filters.
  const apiUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (filter === "mine") params.set("mine", "1");
    const qs = params.toString();
    return qs ? `/api/tasks?${qs}` : `/api/tasks`;
  }, [filter]);

  const { data: tasks, loading, reload } = useApi<Task[]>(apiUrl);
  const { data: members } = useApi<TeamMember[]>("/api/team");

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  const allTasks = tasks ?? [];
  const teamMembers = members ?? [];

  // Apply client-side filters: search query + (overdue | high) pill filter.
  const filteredTasks = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTasks.filter((t) => {
      // Search across title / content / description / assignee / tags
      if (q) {
        const hay = [
          t.title, t.content ?? "", t.description ?? "",
          t.assigneeName ?? "", t.creatorName, t.tags ?? "",
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "overdue" && !isOverdueTask(t)) return false;
      if (filter === "high" && t.priority !== "high" && t.priority !== "urgent") return false;
      return true;
    });
  }, [allTasks, search, filter]);

  // Group the (already filtered) tasks by status for the Kanban board.
  const byStatus = React.useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [], blocked: [] };
    for (const t of filteredTasks) {
      if (groups[t.status as TaskStatus]) groups[t.status as TaskStatus].push(t);
    }
    return groups;
  }, [filteredTasks]);

  // KPI stats — always computed over the unfiltered server-returned tasks so
  // the filter counts in the top bar remain stable.
  const stats = React.useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const remaining = total - done;
    const myTasks = allTasks.filter((t) => t.assigneeId === user?.id).length;
    const myDone = allTasks.filter((t) => t.assigneeId === user?.id && t.status === "done").length;
    const overdue = allTasks.filter(isOverdueTask).length;
    const high = allTasks.filter((t) => t.priority === "high" || t.priority === "urgent").length;
    return {
      total, done, remaining, myTasks, myDone, overdue, high,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
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

      {/* Section header: title + desc, with view toggle, search, new-task action */}
      <SectionHeader
        title="Tasks"
        desc={`${stats.total} total · ${stats.done} done · ${stats.remaining} remaining · ${stats.overdue} overdue`}
        icon={ListTodo}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Compact search box */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 pl-8 text-xs"
              />
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
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
            {/* New task */}
            <button
              onClick={() => setCreateOpen(true)}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        }
      />

      {/* Filter pills row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "all",     label: "All",           count: stats.total },
          { id: "mine",     label: "My tasks",     count: stats.myTasks },
          { id: "overdue",  label: "Overdue",       count: stats.overdue, accent: "rose" as const },
          { id: "high",     label: "High priority", count: stats.high,    accent: "amber" as const },
        ] as const).map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  "accent" in f && f.accent === "rose" && !active && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                  "accent" in f && f.accent === "amber" && !active && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}
              >
                {f.count}
              </span>
            </button>
          );
        })}
        {search.trim() && (
          <span className="ml-1 text-[11px] text-muted-foreground">
            {filteredTasks.length} match{filteredTasks.length === 1 ? "" : "es"}
          </span>
        )}
      </div>

      {/* Compact KPI strip */}
      <MetricRow
        metrics={[
          { label: "Total tasks",   value: stats.total },
          { label: "Completed",     value: stats.done,     delta: stats.completionRate },
          { label: "Remaining",     value: stats.remaining },
          { label: "Overdue",       value: stats.overdue },
          { label: "High priority", value: stats.high },
          { label: "Assigned to me",value: stats.myTasks },
        ]}
      />

      {/* Kanban board OR List view */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          byStatus={byStatus}
          onMove={(id, s) => updateTaskStatus(id, s)}
          onEdit={(t) => setEditingTask(t)}
          onDelete={(id) => deleteTask(id)}
          onSendComposer={(t) => sendToComposer(t)}
          canEdit={(t) => user?.id === t.creatorId || user?.id === t.assigneeId}
        />
      ) : (
        <TaskListView
          tasks={filteredTasks}
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

// ============ Kanban board — 5 status columns ============
function KanbanBoard({
  byStatus, onMove, onEdit, onDelete, onSendComposer, canEdit,
}: {
  byStatus: Record<TaskStatus, Task[]>;
  onMove: (id: string, status: TaskStatus) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onSendComposer: (t: Task) => void;
  canEdit: (t: Task) => boolean;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {STATUSES.map((col) => {
        const colTasks = byStatus[col.id] ?? [];
        const Icon = col.icon;
        return (
          <div key={col.id} className="flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-6 w-6 place-items-center rounded-lg"
                  style={{ background: `${col.color}18`, color: col.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: col.color }}
                >
                  {col.label}
                </span>
              </div>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {colTasks.length}
              </span>
            </div>

            {/* Scrollable card list */}
            <div className="scroll-liquid flex max-h-[calc(100vh-360px)] flex-col gap-2 overflow-y-auto pr-1">
              {colTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/30 p-4 text-center text-[10px] text-muted-foreground/60">
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onMove={(s) => onMove(task.id, s)}
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task.id)}
                    onSendComposer={() => onSendComposer(task)}
                    canEdit={canEdit(task)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ Kanban card — compact, shows every key detail ============
function KanbanCard({
  task, onMove, onEdit, onDelete, onSendComposer, canEdit,
}: {
  task: Task;
  onMove: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendComposer: () => void;
  canEdit: boolean;
}) {
  const priority = PRIORITY_META(task.priority);
  const status   = STATUS_META(task.status);
  const TypeIcon = TYPE_ICON[task.type] ?? Wand2;
  const overdue = isOverdueTask(task);

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
        {/* Header row: type icon + priority pill + status badge + overdue flag */}
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <div className="grid h-5 w-5 place-items-center rounded bg-muted text-muted-foreground">
            <TypeIcon className="h-3 w-3" />
          </div>
          <Pill color={priority.pill}>{priority.label}</Pill>
          <Pill color={status.pill}>{status.label}</Pill>
          {overdue && (
            <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-rose-500">
              <AlertCircle className="h-2.5 w-2.5" /> Overdue
            </span>
          )}
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
            {task.platforms.slice(0, 5).map((pl, i) => (
              <PlatformBadge key={i} platform={pl as PlatformId} size={12} />
            ))}
          </div>
        )}

        {/* Tags */}
        {task.tags && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {task.tags.split(",").slice(0, 3).map((tag, i) => (
              <span key={i} className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
                #{tag.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Assignee + due date */}
        <div className="mt-2 flex items-center gap-1.5">
          {task.assigneeName ? (
            <NameAvatar
              name={task.assigneeName}
              color={(task.assigneeColor as any) ?? "blue"}
              className="h-5 w-5 text-[9px]"
            />
          ) : (
            <div className="grid h-5 w-5 place-items-center rounded-full bg-muted text-muted-foreground">
              <User className="h-2.5 w-2.5" />
            </div>
          )}
          <span className="truncate text-[10px] text-muted-foreground">
            {task.assigneeName ?? "Unassigned"}
          </span>
          {task.dueAt && (
            <span
              className={cn(
                "ml-auto flex items-center gap-0.5 text-[9px]",
                overdue ? "font-bold text-rose-500" : "text-muted-foreground"
              )}
            >
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-1">
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

// ============ Sortable column header for the list view ============
function SortHeader({
  sortKey, sortDir, onToggle, k, label, className,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  onToggle: (k: string) => void;
  k?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground", className)}>
      {k ? (
        <button onClick={() => onToggle(k)} className="flex items-center gap-1 hover:text-foreground">
          {label}
          <ArrowUpDown className={cn("h-2.5 w-2.5", sortKey === k ? "opacity-100 text-primary" : "opacity-30")} />
        </button>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

// ============ Task list view — dense ListRow items with sortable header ============
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

  return (
    <GlassCard className="crystal-in overflow-hidden p-0">
      {/* Sticky header */}
      <div className="grid grid-cols-[1fr_90px_90px_140px_80px_120px_120px] items-center gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle} k="title"    label="Task" />
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle} k="status"   label="Status" />
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle} k="priority" label="Priority" />
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle}              label="Assignee" />
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle} k="dueAt"    label="Due" />
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle}              label="Platforms" />
        <SortHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggle}              label="Actions" className="justify-end" />
      </div>

      {/* Body */}
      {sorted.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">No tasks match the current filters.</div>
      ) : (
        sorted.map((task) => {
          const sm = STATUS_META(task.status);
          const pm = PRIORITY_META(task.priority);
          const overdue = isOverdueTask(task);
          return (
            <ListRow key={task.id} className="grid grid-cols-[1fr_90px_90px_140px_80px_120px_120px] items-center gap-2 py-2.5">
              {/* Title + content preview */}
              <div className="min-w-0">
                <div className={cn("truncate text-xs font-bold", task.status === "done" && "line-through opacity-60")}>
                  {task.title}
                </div>
                {task.content && (
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{task.content}</div>
                )}
                {task.mediaUrl && (
                  <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-primary">
                    <ImageIcon className="h-2.5 w-2.5" /> has media
                  </div>
                )}
              </div>

              {/* Status pill */}
              <Pill color={sm.pill}>{sm.label}</Pill>

              {/* Priority pill */}
              <Pill color={pm.pill}>{pm.label}</Pill>

              {/* Assignee */}
              <div className="flex min-w-0 items-center gap-1.5">
                {task.assigneeName ? (
                  <>
                    <NameAvatar
                      name={task.assigneeName}
                      color={(task.assigneeColor as any) ?? "blue"}
                      className="h-5 w-5 text-[9px]"
                    />
                    <span className="truncate text-[10px]">{task.assigneeName}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">Unassigned</span>
                )}
              </div>

              {/* Due date */}
              <div>
                {task.dueAt ? (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px]",
                      overdue ? "font-bold text-rose-500" : "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(task.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Platforms */}
              <div className="flex items-center gap-1">
                {task.platforms.slice(0, 3).map((pl, i) => (
                  <PlatformBadge key={i} platform={pl as PlatformId} size={12} />
                ))}
                {task.platforms.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{task.platforms.length - 3}</span>
                )}
                {task.platforms.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onSendComposer(task)}
                  title="Send to composer"
                  className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary transition hover:bg-primary/20"
                >
                  <Wand2 className="h-3 w-3" />
                </button>
                {canEdit(task) && (
                  <>
                    {/* Quick move dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        title="Move"
                        className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-muted/40"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => onMove(task.id, s.id)}
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
                    <button
                      onClick={() => onEdit(task)}
                      title="Edit"
                      className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-muted/40"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDelete(task.id)}
                      title="Delete"
                      className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </ListRow>
          );
        })
      )}
    </GlassCard>
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
