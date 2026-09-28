"use client";

import * as React from "react";
import {
  Plus, Pencil, Trash2, Loader2, Star, TrendingUp,
  DollarSign, Users, Sparkles, ExternalLink, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SectionHeader, ListRow, Pill, MetricRow, type Metric,
} from "@/components/glass/dense-ui";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { useApi, fmt } from "@/lib/hooks";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ============================================================================
// Types
// ============================================================================
interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  engagementRate: number;
  cost: number;
  estimatedReach: number;
  estimatedEngagement: number;
  status: "active" | "paused" | "completed" | "draft";
  campaignId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | Influencer["status"];

const STATUS_META: Record<Influencer["status"], { label: string; color: "green" | "amber" | "rose" | "neutral" | "blue" }> = {
  active: { label: "Active", color: "green" },
  paused: { label: "Paused", color: "amber" },
  completed: { label: "Completed", color: "blue" },
  draft: { label: "Draft", color: "neutral" },
};

const PLATFORM_OPTIONS = Object.keys(PLATFORMS) as PlatformId[];

function platformProfileUrl(platform: string, handle: string): string | null {
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "instagram": return `https://instagram.com/${h}`;
    case "facebook": return `https://facebook.com/${h}`;
    case "x": return `https://x.com/${h}`;
    case "linkedin": return `https://linkedin.com/in/${h}`;
    case "tiktok": return `https://tiktok.com/@${h}`;
    case "youtube": return `https://youtube.com/@${h}`;
    case "threads": return `https://threads.net/@${h}`;
    default: return null;
  }
}

/** ROI = estimatedEngagement / cost (engagements per dollar). Returns null if cost is 0. */
function calcRoi(i: Influencer): number | null {
  if (!i.cost || i.cost <= 0) return null;
  return i.estimatedEngagement / i.cost;
}

/** Cost per engagement (CPEn). */
function costPerEngagement(i: Influencer): number | null {
  if (!i.estimatedEngagement || i.estimatedEngagement <= 0) return null;
  return i.cost / i.estimatedEngagement;
}

// ============================================================================
// Main view
// ============================================================================
export function InfluencersView() {
  const { data: influencers, loading, reload } = useApi<Influencer[]>("/api/influencers");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [editing, setEditing] = React.useState<Influencer | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
    } catch { return null; }
  }

  async function removeInfluencer(id: string, name: string) {
    if (!confirm(`Remove ${name} from your influencer list?`)) return;
    const token = getToken();
    const res = await fetch(`/api/influencers/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      toast.success("Influencer removed");
      reload();
    } else {
      toast.error("Failed to remove");
    }
  }

  async function quickStatusChange(i: Influencer, newStatus: Influencer["status"]) {
    const token = getToken();
    const res = await fetch(`/api/influencers/${i.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`${i.name} marked as ${STATUS_META[newStatus].label}`);
      reload();
    } else {
      toast.error("Failed to update status");
    }
  }

  const all = influencers ?? [];
  const filtered = statusFilter === "all" ? all : all.filter((i) => i.status === statusFilter);

  // KPIs
  const metrics: Metric[] = React.useMemo(() => {
    const total = all.length;
    const active = all.filter((i) => i.status === "active").length;
    const totalReach = all.reduce((s, i) => s + i.estimatedReach, 0);
    const totalEng = all.reduce((s, i) => s + i.estimatedEngagement, 0);
    const totalCost = all.reduce((s, i) => s + i.cost, 0);
    const totalFollowers = all.reduce((s, i) => s + i.followers, 0);
    const avgER = total > 0
      ? (all.reduce((s, i) => s + i.engagementRate, 0) / total).toFixed(2)
      : "0.00";
    const overallRoi = totalCost > 0 ? (totalEng / totalCost).toFixed(2) : "—";
    const cpEn = totalEng > 0 ? (totalCost / totalEng).toFixed(4) : "—";
    return [
      { label: "Influencers", value: total, color: "oklch(0.62 0.22 300)" },
      { label: "Active", value: active, color: "oklch(0.7 0.2 145)" },
      { label: "Total Reach", value: fmt(totalReach), color: "oklch(0.62 0.2 255)" },
      { label: "Followers", value: fmt(totalFollowers), color: "oklch(0.66 0.22 305)" },
      { label: "Engagement", value: fmt(totalEng), color: "oklch(0.7 0.2 25)" },
      { label: "Avg ER %", value: `${avgER}%`, color: "oklch(0.72 0.2 75)" },
      { label: "Total Cost", value: `$${fmt(totalCost)}`, color: "oklch(0.65 0.22 15)" },
      { label: "ROI (eng/$)", value: overallRoi, color: "oklch(0.7 0.18 165)" },
      { label: "Cost/Eng", value: `$${cpEn}`, color: "oklch(0.55 0.2 255)" },
    ];
  }, [all]);

  return (
    <div className="space-y-4">
      <HelpText module="influencers">
        <strong className="text-foreground">Influencer Tracker</strong> — manage creator partnerships,
        track per-influencer engagement, cost, and ROI. Compete with Hootsuite / Sprout / Grin
        without buying another tool.
      </HelpText>

      <SectionHeader
        title="Influencer Tracker"
        icon={Briefcase}
        desc="Partnerships · engagement · cost · ROI per creator"
        action={
          <Button
            onClick={() => { setEditing(null); setCreateOpen(true); }}
            className="liquid-pill h-8 gap-1.5 px-3 text-[11px] font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Influencer
          </Button>
        }
      />

      <MetricRow metrics={metrics} />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "active", "paused", "completed", "draft"] as const).map((s) => {
          const count = s === "all" ? all.length : all.filter((i) => i.status === s).length;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
                  : "border-border/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : STATUS_META[s].label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : all.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border/40 bg-muted/10 py-12 text-center">
          <Star className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-xs text-muted-foreground">No influencers tracked yet.</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-3 h-8 gap-1.5 text-[11px]">
            <Plus className="h-3.5 w-3.5" />
            Add your first creator
          </Button>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="h-9 text-[10px] uppercase tracking-wide">Influencer</TableHead>
                <TableHead className="h-9 text-[10px] uppercase tracking-wide">Status</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">Followers</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">ER %</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">Reach</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">Engagement</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">Cost</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">ROI</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide">CPEn</TableHead>
                <TableHead className="h-9 text-right text-[10px] uppercase tracking-wide"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const roi = calcRoi(i);
                const cpe = costPerEngagement(i);
                const profile = platformProfileUrl(i.platform, i.handle);
                return (
                  <TableRow key={i.id} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={i.platform as PlatformId} size={22} />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold">{i.name}</div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>@{i.handle}</span>
                            {profile && (
                              <a
                                href={profile}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground/60 transition hover:text-primary"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={i.status}
                        onValueChange={(v) => quickStatusChange(i, v as Influencer["status"])}
                      >
                        <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent px-1 text-[10px] font-semibold shadow-none focus:ring-0">
                          <Pill color={STATUS_META[i.status].color}>
                            {STATUS_META[i.status].label}
                          </Pill>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_META).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-semibold tabular-nums">{fmt(i.followers)}</TableCell>
                    <TableCell className="text-right text-[11px] tabular-nums">
                      <span className={cn(
                        "font-semibold",
                        i.engagementRate >= 3 ? "text-emerald-600 dark:text-emerald-400"
                          : i.engagementRate >= 1 ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      )}>
                        {i.engagementRate.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground">{fmt(i.estimatedReach)}</TableCell>
                    <TableCell className="text-right text-[11px] tabular-nums">{fmt(i.estimatedEngagement)}</TableCell>
                    <TableCell className="text-right text-[11px] tabular-nums">${i.cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[11px] tabular-nums">
                      {roi === null ? (
                        <span className="text-muted-foreground/60">—</span>
                      ) : (
                        <span className={cn(
                          "font-bold",
                          roi >= 1 ? "text-emerald-600 dark:text-emerald-400"
                            : roi >= 0.3 ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                        )}>
                          {roi.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground">
                      {cpe === null ? "—" : `$${cpe}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(i); setCreateOpen(true); }}
                          className="grid h-6 w-6 place-items-center rounded-md bg-muted text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeInfluencer(i.id, i.name)}
                          className="grid h-6 w-6 place-items-center rounded-md bg-muted text-muted-foreground transition hover:bg-rose-500/15 hover:text-rose-600"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Quick-add: Top influencers by ROI */}
      {!loading && all.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Top performers by ROI"
            icon={TrendingUp}
            desc="Engagement-per-dollar — your highest-ROI creators"
          />
          <div className="glass overflow-hidden rounded-xl">
            {[...all]
              .filter((i) => calcRoi(i) !== null)
              .sort((a, b) => (calcRoi(b) ?? 0) - (calcRoi(a) ?? 0))
              .slice(0, 5)
              .map((i, idx) => {
                const roi = calcRoi(i)!;
                return (
                  <ListRow key={i.id} className="!py-2.5">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: idx < 3 ? "oklch(0.7 0.2 45)" : "var(--muted-foreground)" }}
                    >
                      {idx + 1}
                    </span>
                    <PlatformBadge platform={i.platform as PlatformId} size={20} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{i.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">@{i.handle} · {fmt(i.followers)} followers</div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] tabular-nums">
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {roi.toFixed(2)}
                        </div>
                        <div className="text-muted-foreground">eng/$</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{i.engagementRate.toFixed(2)}%</div>
                        <div className="text-muted-foreground">ER</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${i.cost.toLocaleString()}</div>
                        <div className="text-muted-foreground">cost</div>
                      </div>
                    </div>
                  </ListRow>
                );
              })}
            {all.filter((i) => calcRoi(i) !== null).length === 0 && (
              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                No ROI data yet — set a cost &gt; 0 and estimated engagement on your creators.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      <InfluencerDialog
        open={createOpen}
        onOpenChange={(o) => { setCreateOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        onSaved={() => { reload(); setCreateOpen(false); setEditing(null); }}
      />
    </div>
  );
}

// ============================================================================
// Create / Edit dialog
// ============================================================================
function InfluencerDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Influencer | null;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [platform, setPlatform] = React.useState<PlatformId>("instagram");
  const [followers, setFollowers] = React.useState("");
  const [engagementRate, setEngagementRate] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [estimatedReach, setEstimatedReach] = React.useState("");
  const [estimatedEngagement, setEstimatedEngagement] = React.useState("");
  const [status, setStatus] = React.useState<Influencer["status"]>("active");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Sync form when editing target changes
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setHandle(editing.handle);
      setPlatform(editing.platform as PlatformId);
      setFollowers(String(editing.followers));
      setEngagementRate(String(editing.engagementRate));
      setCost(String(editing.cost));
      setEstimatedReach(String(editing.estimatedReach));
      setEstimatedEngagement(String(editing.estimatedEngagement));
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
    } else {
      setName(""); setHandle(""); setPlatform("instagram");
      setFollowers(""); setEngagementRate(""); setCost("");
      setEstimatedReach(""); setEstimatedEngagement("");
      setStatus("active"); setNotes("");
    }
  }, [open, editing]);

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
    } catch { return null; }
  }

  async function submit() {
    if (!name || !handle || !platform) {
      toast.error("Name, handle, and platform are required");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const payload = {
        name, handle, platform,
        followers: followers ? Number(followers) : 0,
        engagementRate: engagementRate ? Number(engagementRate) : 0,
        cost: cost ? Number(cost) : 0,
        estimatedReach: estimatedReach ? Number(estimatedReach) : 0,
        estimatedEngagement: estimatedEngagement ? Number(estimatedEngagement) : 0,
        status, notes: notes || null,
      };
      const res = await fetch(
        isEdit ? `/api/influencers/${editing!.id}` : "/api/influencers",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? `Failed to ${isEdit ? "update" : "create"} influencer`);
        return;
      }
      toast.success(isEdit ? "Influencer updated" : "Influencer added");
      onSaved();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isEdit ? <Pencil className="h-4 w-4 text-primary" /> : <Star className="h-4 w-4 text-primary" />}
            {isEdit ? "Edit Influencer" : "Add Influencer"}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Track followers, engagement, cost, and estimated reach & engagement. ROI is computed
            automatically as engagement / cost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Creator" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Handle *</Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@janecreates" className="text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Platform *</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {PLATFORMS[p].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Influencer["status"])}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">
                <Users className="mr-1 inline h-3 w-3" /> Followers
              </Label>
              <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="0" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">
                <Sparkles className="mr-1 inline h-3 w-3" /> Engagement rate %
              </Label>
              <Input type="number" step="0.01" value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)} placeholder="3.5" className="text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">
                <DollarSign className="mr-1 inline h-3 w-3" /> Cost
              </Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Est. Reach</Label>
              <Input type="number" value={estimatedReach} onChange={(e) => setEstimatedReach(e.target.value)} placeholder="0" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Est. Eng.</Label>
              <Input type="number" value={estimatedEngagement} onChange={(e) => setEstimatedEngagement(e.target.value)} placeholder="0" className="text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contract terms, content brief, contact info…" className="min-h-[60px] text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-[11px]">Cancel</Button>
          <Button onClick={submit} disabled={saving || !name || !handle} className="h-8 gap-1.5 text-[11px]">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {isEdit ? "Save Changes" : "Add Influencer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
