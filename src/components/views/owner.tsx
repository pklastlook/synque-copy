"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  KeyRound,
  FileText,
  FileSignature,
  Landmark,
  BarChart3,
  Plus,
  MoreVertical,
  Trash2,
  Pencil,
  Copy,
  Ban,
  CheckCircle2,
  Send,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Building2,
  Coins,
  TrendingUp,
  Printer,
  Star,
  X,
  Wallet,
  CircleUserRound,
  CalendarDays,
  Briefcase,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types — match the JSON shape returned by each API route.
// ============================================================================

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: "active" | "trial" | "suspended";
  plan: "starter" | "growth" | "enterprise";
  serialKey: {
    id: string;
    key: string;
    status: "unused" | "activated" | "revoked";
    activatedAt: string | null;
  } | null;
  invoicesCount: number;
  quotationsCount: number;
  createdAt: string;
}

interface SerialKey {
  id: string;
  key: string;
  status: "unused" | "activated" | "revoked";
  deviceName: string | null;
  customerId: string | null;
  customerName: string | null;
  activatedAt: string | null;
  createdAt: string;
}

interface LineItem {
  description: string;
  qty: number;
  price: number;
  amount: number;
}

interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  items: LineItem[];
  createdAt: string;
}

interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  issueDate: string;
  validUntil: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  items: LineItem[];
  createdAt: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string | null;
  swift: string | null;
  currency: string;
  isDefault: boolean;
  createdAt: string;
}

// ============================================================================
// Shared helpers
// ============================================================================

const PLANS = ["starter", "growth", "enterprise"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "PKR"] as const;

function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `$${(n || 0).toFixed(2)}`;
  }
}

function statusTone(status: string): {
  className: string;
  dot: string;
} {
  switch (status) {
    case "active":
    case "activated":
    case "paid":
    case "accepted":
      return {
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "trial":
    case "unused":
    case "sent":
    case "draft":
      return {
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
      };
    case "suspended":
    case "revoked":
    case "overdue":
    case "rejected":
      return {
        className: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        dot: "bg-rose-500",
      };
    default:
      return {
        className: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
      };
  }
}

function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        tone.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {status}
    </span>
  );
}

function planTone(plan: string) {
  switch (plan) {
    case "enterprise":
      return "bg-[oklch(0.72_0.22_300)]/15 text-[oklch(0.55_0.2_300)] dark:text-[oklch(0.78_0.18_300)]";
    case "growth":
      return "bg-[oklch(0.74_0.18_165)]/15 text-[oklch(0.55_0.18_165)] dark:text-[oklch(0.78_0.16_165)]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function maskNumber(num: string) {
  if (!num) return "—";
  const last = num.slice(-4);
  return `•••• •••• ${last}`;
}

async function api(
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  } & Record<string, unknown>;
  if (!res.ok || json.ok === false) {
    throw new Error(json.error ?? "Request failed");
  }
  return json;
}

// ============================================================================
// Segmented control (custom pill-style tabs to match dashboard aesthetic)
// ============================================================================

interface TabDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

function SegmentedTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: TabDef[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-border/40 bg-background/60 p-1 backdrop-blur-md scroll-liquid no-scrollbar">
      {tabs.map((t) => {
        const active = t.id === value;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-selected={active}
            role="tab"
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:text-sm",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Shared form dialog primitives
// ============================================================================

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ============================================================================
// Line items editor (used by both invoices and quotations)
// ============================================================================

function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const update = (i: number, patch: Partial<LineItem>) => {
    const next = items.map((it, idx) =>
      idx === i
        ? {
            ...it,
            ...patch,
            amount:
              patch.qty !== undefined || patch.price !== undefined
                ? (patch.qty ?? it.qty) * (patch.price ?? it.price)
                : it.amount,
          }
        : it,
    );
    onChange(next);
  };
  const addRow = () =>
    onChange([
      ...items,
      { description: "", qty: 1, price: 0, amount: 0 },
    ]);
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_64px_96px_96px_32px] gap-2 text-[11px] font-medium text-muted-foreground">
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <div className="max-h-52 space-y-2 overflow-y-auto scroll-liquid pr-1">
        {items.map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_64px_96px_96px_32px] items-center gap-2"
          >
            <Input
              value={it.description}
              placeholder="Service / product"
              onChange={(e) => update(i, { description: e.target.value })}
              className="h-9"
            />
            <Input
              type="number"
              min={0}
              value={it.qty}
              onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })}
              className="h-9 text-right"
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={it.price}
              onChange={(e) => update(i, { price: Number(e.target.value) || 0 })}
              className="h-9 text-right"
            />
            <div className="text-right text-sm font-medium tabular-nums">
              {money(it.amount)}
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
              aria-label="Remove line"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No line items yet — add the first one below.
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Add line item
      </button>
      <div className="flex justify-end pt-1 text-sm font-semibold tabular-nums">
        Subtotal: <span className="ml-2">{money(subtotal)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Customers tab
// ============================================================================

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  plan: (typeof PLANS)[number];
}

const EMPTY_CUSTOMER: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  city: "",
  country: "",
  plan: "starter",
};

function CustomersTab() {
  const { data, loading, reload } = useApi<Customer[]>("/api/customers");
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CustomerForm>(EMPTY_CUSTOMER);
  const [busy, setBusy] = React.useState(false);

  const customers = data ?? [];
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    trial: customers.filter((c) => c.status === "trial").length,
    suspended: customers.filter((c) => c.status === "suspended").length,
  };

  const openCreate = () => {
    setForm(EMPTY_CUSTOMER);
    setEditId(null);
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone ?? "",
      company: c.company ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      country: c.country ?? "",
      plan: c.plan,
    });
    setEditId(c.id);
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        await api("PATCH", `/api/customers/${editId}`, form);
        toast.success("Customer updated");
      } else {
        await api("POST", "/api/customers", form);
        toast.success("Customer created");
      }
      setOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete ${c.name}? This also removes their invoices & keys.`))
      return;
    try {
      await api("DELETE", `/api/customers/${c.id}`);
      toast.success("Customer deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const setStatus = async (c: Customer, status: Customer["status"]) => {
    try {
      await api("PATCH", `/api/customers/${c.id}`, { status });
      toast.success(`${c.name} is now ${status}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total customers"
          value={stats.total}
          icon={<Users className="h-5 w-5" />}
          accent="oklch(0.55 0.2 255)"
          delay={50}
        />
        <KpiCard
          label="Active"
          value={stats.active}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          delay={120}
        />
        <KpiCard
          label="Trial"
          value={stats.trial}
          icon={<Clock className="h-5 w-5" />}
          accent="oklch(0.82 0.14 85)"
          delay={190}
        />
        <KpiCard
          label="Suspended"
          value={stats.suspended}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          delay={260}
        />
      </div>

      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Customers"
          desc="Manage CRM records, plans & license assignments"
          action={
            <button
              onClick={openCreate}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add customer
            </button>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-2xl" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No customers yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first customer to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {customers.map((c) => (
              <div
                key={c.id}
                className="group relative flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/60 p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <NameAvatar name={c.name} className="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {c.name}
                      </span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.email}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatus(c, "active")}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Mark active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus(c, "trial")}>
                        <Clock className="h-3.5 w-3.5" /> Mark trial
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatus(c, "suspended")}
                      >
                        <Ban className="h-3.5 w-3.5" /> Suspend
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => remove(c)}
                        className="text-rose-500 focus:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-[10px] uppercase text-muted-foreground">
                      Company
                    </div>
                    <div className="truncate font-medium">
                      {c.company ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-[10px] uppercase text-muted-foreground">
                      Plan
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                        planTone(c.plan),
                      )}
                    >
                      {c.plan}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center text-[11px]">
                  <div>
                    <div className="font-bold tabular-nums">
                      {c.serialKey ? (
                        <KeyRound className="mx-auto h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Serial key
                    </div>
                  </div>
                  <div>
                    <div className="font-bold tabular-nums">
                      {c.invoicesCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Invoices
                    </div>
                  </div>
                  <div>
                    <div className="font-bold tabular-nums">
                      {c.quotationsCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Quotes
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit customer" : "Add customer"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update customer profile & plan."
                : "Create a new CRM record."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *">
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Jane Cooper"
                />
              </Field>
              <Field label="Email *">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="jane@acme.co"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+1 555 0100"
                />
              </Field>
              <Field label="Company">
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                  placeholder="Acme Inc."
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </Field>
              <Field label="Country">
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                />
              </Field>
              <Field label="Plan">
                <Select
                  value={form.plan}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      plan: v as CustomerForm["plan"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="liquid-pill">
              {busy ? "Saving…" : editId ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Serial keys tab
// ============================================================================

function SerialKeysTab({ customers }: { customers: Customer[] }) {
  const { data, loading, reload } = useApi<SerialKey[]>("/api/serial-keys");
  const [busy, setBusy] = React.useState(false);
  const [assignFor, setAssignFor] = React.useState<SerialKey | null>(null);
  const [assignCustomer, setAssignCustomer] = React.useState<string>("");

  const keys = data ?? [];
  const stats = {
    total: keys.length,
    activated: keys.filter((k) => k.status === "activated").length,
    unused: keys.filter((k) => k.status === "unused").length,
    revoked: keys.filter((k) => k.status === "revoked").length,
  };

  const generate = async () => {
    setBusy(true);
    try {
      await api("POST", "/api/serial-keys", {});
      toast.success("New serial key generated");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (k: SerialKey) => {
    if (!confirm(`Revoke key ${k.key}? This will deactivate the device.`))
      return;
    try {
      await api("PATCH", `/api/serial-keys/${k.id}`, { status: "revoked" });
      toast.success("Key revoked");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (k: SerialKey) => {
    if (!confirm(`Delete key ${k.key}?`)) return;
    try {
      await api("DELETE", `/api/serial-keys/${k.id}`);
      toast.success("Key deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const assign = async () => {
    if (!assignFor || !assignCustomer) {
      toast.error("Pick a customer first");
      return;
    }
    try {
      await api("PATCH", `/api/serial-keys/${assignFor.id}`, {
        customerId: assignCustomer,
      });
      toast.success("Key assigned");
      setAssignFor(null);
      setAssignCustomer("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const copy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("Key copied to clipboard");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total keys"
          value={stats.total}
          icon={<KeyRound className="h-5 w-5" />}
          accent="oklch(0.55 0.2 255)"
          delay={50}
        />
        <KpiCard
          label="Activated"
          value={stats.activated}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          delay={120}
        />
        <KpiCard
          label="Unused"
          value={stats.unused}
          icon={<Clock className="h-5 w-5" />}
          accent="oklch(0.82 0.14 85)"
          delay={190}
        />
        <KpiCard
          label="Revoked"
          value={stats.revoked}
          icon={<Ban className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          delay={260}
        />
      </div>

      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Serial keys"
          desc="Generate & manage license keys for customer devices"
          action={
            <button
              onClick={generate}
              disabled={busy}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" /> Generate key
            </button>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-14 rounded-2xl" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <KeyRound className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No serial keys yet</p>
            <p className="text-xs text-muted-foreground">
              Generate your first license key.
            </p>
          </div>
        ) : (
          <div className="max-h-[560px] space-y-2 overflow-y-auto scroll-liquid pr-1">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-background/50 p-3 transition hover:border-primary/30"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs tracking-wider">
                        {k.key}
                      </code>
                      <button
                        onClick={() => copy(k.key)}
                        className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Copy key"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <StatusPill status={k.status} />
                      <span>·</span>
                      <span>
                        {k.customerName
                          ? k.customerName
                          : "Unassigned"}
                      </span>
                      {k.deviceName && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {k.deviceName}
                          </span>
                        </>
                      )}
                      {k.activatedAt && (
                        <>
                          <span>·</span>
                          <span>
                            activated {format(new Date(k.activatedAt), "MMM d, yyyy")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setAssignFor(k);
                        setAssignCustomer(k.customerId ?? "");
                      }}
                    >
                      <Users className="h-3.5 w-3.5" /> Assign to customer
                    </DropdownMenuItem>
                    {k.status !== "revoked" && (
                      <DropdownMenuItem onClick={() => revoke(k)}>
                        <Ban className="h-3.5 w-3.5" /> Revoke
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => remove(k)}
                      className="text-rose-500 focus:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign serial key</DialogTitle>
            <DialogDescription>
              Bind this key to a customer record. The key will be activated on
              first device sign-in.
            </DialogDescription>
          </DialogHeader>
          {assignFor && (
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <code className="font-mono text-xs tracking-wider">
                {assignFor.key}
              </code>
            </div>
          )}
          <Field label="Customer">
            <Select
              value={assignCustomer}
              onValueChange={setAssignCustomer}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No customers available
                  </SelectItem>
                ) : (
                  customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignFor(null)}>
              Cancel
            </Button>
            <Button onClick={assign} className="liquid-pill">
              Assign key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Invoice / Quotation — shared document tab
// ============================================================================

interface DocForm {
  customerId: string;
  items: LineItem[];
  taxRate: number;
  dueOrValid: string; // dueDate for invoice, validUntil for quotation
  notes: string;
}

const EMPTY_DOC: DocForm = {
  customerId: "",
  items: [{ description: "", qty: 1, price: 0, amount: 0 }],
  taxRate: 0,
  dueOrValid: "",
  notes: "",
};

function docTotals(form: DocForm) {
  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);
  const taxAmount = Math.round(subtotal * form.taxRate) / 100;
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

// ----- InvoicePrintLayout (used for both invoices and quotations) -----

function InvoicePrintLayout({
  doc,
  customer,
  bank,
  kind,
}: {
  doc: Invoice | Quotation;
  customer: Customer | undefined;
  bank: BankAccount | undefined;
  kind: "invoice" | "quotation";
}) {
  const title = kind === "invoice" ? "INVOICE" : "QUOTATION";
  const dateLabel = kind === "invoice" ? "Due date" : "Valid until";
  const dateField =
    kind === "invoice"
      ? (doc as Invoice).dueDate
      : (doc as Quotation).validUntil;

  return (
    <div className="print-area mx-auto max-w-[8.5in] bg-white p-10 text-[12px] leading-relaxed text-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-300 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-neutral-900 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-neutral-900">
                SocialFlow
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Social, Simplified.
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-neutral-600">
            SocialFlow HQ · 100 Market Street
            <br />
            San Francisco, CA 94105
            <br />
            billing@socialflow.app
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight text-neutral-900">
            {title}
          </div>
          <div className="mt-1 text-sm font-mono text-neutral-700">
            {doc.number}
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">
            Issued: {format(new Date(doc.issueDate), "MMM d, yyyy")}
            <br />
            {dateField
              ? `${dateLabel}: ${format(new Date(dateField), "MMM d, yyyy")}`
              : `${dateLabel}: —`}
            <br />
            Status: <span className="font-semibold uppercase">{doc.status}</span>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-6 py-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Bill To
          </div>
          <div className="mt-1 text-base font-semibold text-neutral-900">
            {customer?.name ?? doc.customerName}
          </div>
          {customer?.company && <div>{customer.company}</div>}
          {customer?.email && <div>{customer.email}</div>}
          {customer?.phone && <div>{customer.phone}</div>}
          {customer?.address && <div>{customer.address}</div>}
          {(customer?.city || customer?.country) && (
            <div>
              {[customer?.city, customer?.country].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Payment details
          </div>
          {bank ? (
            <div className="mt-1 text-[11px] text-neutral-700">
              <div className="font-semibold text-neutral-900">
                {bank.bankName}
              </div>
              <div>{bank.accountName}</div>
              <div>Account: {bank.accountNumber}</div>
              {bank.iban && <div>IBAN: {bank.iban}</div>}
              {bank.swift && <div>SWIFT: {bank.swift}</div>}
              <div className="mt-1 inline-flex rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                {bank.currency}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-[11px] italic text-neutral-500">
              No bank account configured.
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left text-[10px] uppercase tracking-wider text-neutral-700">
            <th className="py-2 pr-2">Description</th>
            <th className="w-12 py-2 pr-2 text-right">Qty</th>
            <th className="w-24 py-2 pr-2 text-right">Unit price</th>
            <th className="w-24 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center italic text-neutral-500">
                No line items
              </td>
            </tr>
          )}
          {doc.items.map((it, i) => (
            <tr
              key={i}
              className="border-b border-neutral-200 align-top text-[11px]"
            >
              <td className="py-2 pr-2">{it.description || "—"}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{it.qty}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {money(it.price)}
              </td>
              <td className="py-2 text-right font-medium tabular-nums">
                {money(it.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 text-[11px]">
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Subtotal</span>
            <span className="tabular-nums">{money(doc.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">
              Tax ({doc.taxRate}%)
            </span>
            <span className="tabular-nums">{money(doc.taxAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{money(doc.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes & terms */}
      {doc.notes && (
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Notes
          </div>
          <p className="mt-1 whitespace-pre-line text-[11px] text-neutral-700">
            {doc.notes}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-neutral-200 pt-4 text-[11px] text-neutral-600">
        <p>
          {kind === "invoice"
            ? "Payment is due within 15 days of issue date. Late payments may incur a 1.5% monthly fee."
            : "This quotation is valid for 30 days from the issue date. Prices are subject to change after expiration."}
        </p>
        <p className="mt-3 font-semibold text-neutral-900">
          Thank you for your business — SocialFlow.
        </p>
      </div>
    </div>
  );
}

// ----- Invoices tab -----

function InvoicesTab({ customers }: { customers: Customer[] }) {
  const { data: invs, loading, reload } = useApi<Invoice[]>("/api/invoices");
  const { data: banks } = useApi<BankAccount[]>("/api/bank-accounts");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<DocForm>(EMPTY_DOC);
  const [busy, setBusy] = React.useState(false);
  const [printDoc, setPrintDoc] = React.useState<Invoice | null>(null);

  const invoices = invs ?? [];
  const bank = (banks ?? []).find((b) => b.isDefault) ?? (banks ?? [])[0];

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "sent" || i.status === "draft")
      .length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    revenue: invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.total, 0),
  };

  React.useEffect(() => {
    if (!printDoc) return;
    const t = setTimeout(() => {
      window.print();
    }, 80);
    const onAfter = () => setPrintDoc(null);
    window.addEventListener("afterprint", onAfter);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [printDoc]);

  const submit = async () => {
    if (!form.customerId) {
      toast.error("Pick a customer");
      return;
    }
    setBusy(true);
    try {
      const { subtotal, taxAmount, total } = docTotals(form);
      const payload = {
        customerId: form.customerId,
        items: form.items,
        taxRate: form.taxRate,
        dueDate: form.dueOrValid || null,
        notes: form.notes,
        subtotal,
        taxAmount,
        total,
      };
      await api("POST", "/api/invoices", payload);
      toast.success("Invoice created");
      setOpen(false);
      setForm(EMPTY_DOC);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (inv: Invoice, status: Invoice["status"]) => {
    try {
      await api("PATCH", `/api/invoices/${inv.id}`, { status });
      toast.success(`Invoice ${inv.number} → ${status}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (inv: Invoice) => {
    if (!confirm(`Delete invoice ${inv.number}?`)) return;
    try {
      await api("DELETE", `/api/invoices/${inv.id}`);
      toast.success("Invoice deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const totals = docTotals(form);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          label="Total invoices"
          value={stats.total}
          icon={<FileText className="h-5 w-5" />}
          accent="oklch(0.55 0.2 255)"
          delay={50}
        />
        <KpiCard
          label="Paid"
          value={stats.paid}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          delay={120}
        />
        <KpiCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
          accent="oklch(0.82 0.14 85)"
          delay={190}
        />
        <KpiCard
          label="Overdue"
          value={stats.overdue}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          delay={260}
        />
        <KpiCard
          label="Revenue"
          value={money(stats.revenue)}
          icon={<Coins className="h-5 w-5" />}
          accent="oklch(0.72 0.22 300)"
          delay={330}
        />
      </div>

      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Invoices"
          desc="Bill customers for plans & services"
          action={
            <button
              onClick={() => {
                setForm(EMPTY_DOC);
                setOpen(true);
              }}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> New invoice
            </button>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-12 rounded-xl" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No invoices yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first invoice to start billing.
            </p>
          </div>
        ) : (
          <div className="max-h-[560px] space-y-2 overflow-y-auto scroll-liquid pr-1">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-background/50 p-3 transition hover:border-primary/30"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">
                      {inv.number}
                    </span>
                    <StatusPill status={inv.status} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{inv.customerName}</span>
                    <span>·</span>
                    <span>
                      issued {format(new Date(inv.issueDate), "MMM d, yyyy")}
                    </span>
                    {inv.dueDate && (
                      <>
                        <span>·</span>
                        <span>
                          due {format(new Date(inv.dueDate), "MMM d, yyyy")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {money(inv.total)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {inv.items.length} item{inv.items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPrintDoc(inv)}>
                      <Printer className="h-3.5 w-3.5" /> Export PDF
                    </DropdownMenuItem>
                    {inv.status === "draft" && (
                      <DropdownMenuItem onClick={() => setStatus(inv, "sent")}>
                        <Send className="h-3.5 w-3.5" /> Mark sent
                      </DropdownMenuItem>
                    )}
                    {(inv.status === "sent" || inv.status === "overdue") && (
                      <DropdownMenuItem onClick={() => setStatus(inv, "paid")}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                      </DropdownMenuItem>
                    )}
                    {inv.status !== "overdue" && (
                      <DropdownMenuItem
                        onClick={() => setStatus(inv, "overdue")}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Mark overdue
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => remove(inv)}
                      className="text-rose-500 focus:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
            <DialogDescription>
              Add line items, set tax & due date, then save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer *">
                <Select
                  value={form.customerId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, customerId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No customers available
                      </SelectItem>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={form.dueOrValid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueOrValid: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Line items">
              <LineItemsEditor
                items={form.items}
                onChange={(items) => setForm((f) => ({ ...f, items }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      taxRate: Number(e.target.value) || 0,
                    }))
                  }
                />
              </Field>
              <div className="rounded-lg bg-muted/40 p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({form.taxRate}%)
                  </span>
                  <span className="tabular-nums">
                    {money(totals.taxAmount)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border/40 pt-1 text-sm font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{money(totals.total)}</span>
                </div>
              </div>
            </div>
            <Field label="Notes">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Payment terms, references, etc."
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="liquid-pill">
              {busy ? "Creating…" : "Create invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printDoc && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .print-area, .print-area * { visibility: visible !important; }
              .print-area {
                position: absolute !important;
                left: 0; top: 0; width: 100%;
                background: white !important;
              }
            }
            @media screen {
              .print-area {
                position: fixed;
                inset: 0;
                z-index: 9999;
                overflow: auto;
                background: white;
              }
            }
          `}</style>
          <InvoicePrintLayout
            doc={printDoc}
            customer={customers.find((c) => c.id === printDoc.customerId)}
            bank={bank}
            kind="invoice"
          />
        </>
      )}
    </div>
  );
}

// ----- Quotations tab -----

function QuotationsTab({ customers }: { customers: Customer[] }) {
  const { data: quotes, loading, reload } = useApi<Quotation[]>(
    "/api/quotations",
  );
  const { data: banks } = useApi<BankAccount[]>("/api/bank-accounts");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<DocForm>(EMPTY_DOC);
  const [busy, setBusy] = React.useState(false);
  const [printDoc, setPrintDoc] = React.useState<Quotation | null>(null);

  const quotations = quotes ?? [];
  const bank = (banks ?? []).find((b) => b.isDefault) ?? (banks ?? [])[0];

  const stats = {
    total: quotations.length,
    sent: quotations.filter((q) => q.status === "sent").length,
    accepted: quotations.filter((q) => q.status === "accepted").length,
    rejected: quotations.filter((q) => q.status === "rejected").length,
    value: quotations
      .filter((q) => q.status === "accepted")
      .reduce((s, q) => s + q.total, 0),
  };

  React.useEffect(() => {
    if (!printDoc) return;
    const t = setTimeout(() => {
      window.print();
    }, 80);
    const onAfter = () => setPrintDoc(null);
    window.addEventListener("afterprint", onAfter);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [printDoc]);

  const submit = async () => {
    if (!form.customerId) {
      toast.error("Pick a customer");
      return;
    }
    setBusy(true);
    try {
      const { subtotal, taxAmount, total } = docTotals(form);
      const payload = {
        customerId: form.customerId,
        items: form.items,
        taxRate: form.taxRate,
        validUntil: form.dueOrValid || null,
        notes: form.notes,
        subtotal,
        taxAmount,
        total,
      };
      await api("POST", "/api/quotations", payload);
      toast.success("Quotation created");
      setOpen(false);
      setForm(EMPTY_DOC);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (q: Quotation, status: Quotation["status"]) => {
    try {
      await api("PATCH", `/api/quotations/${q.id}`, { status });
      toast.success(`Quotation ${q.number} → ${status}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (q: Quotation) => {
    if (!confirm(`Delete quotation ${q.number}?`)) return;
    try {
      await api("DELETE", `/api/quotations/${q.id}`);
      toast.success("Quotation deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const totals = docTotals(form);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          label="Total quotations"
          value={stats.total}
          icon={<FileSignature className="h-5 w-5" />}
          accent="oklch(0.55 0.2 255)"
          delay={50}
        />
        <KpiCard
          label="Sent"
          value={stats.sent}
          icon={<Send className="h-5 w-5" />}
          accent="oklch(0.82 0.14 85)"
          delay={120}
        />
        <KpiCard
          label="Accepted"
          value={stats.accepted}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          delay={190}
        />
        <KpiCard
          label="Rejected"
          value={stats.rejected}
          icon={<Ban className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          delay={260}
        />
        <KpiCard
          label="Pipeline value"
          value={money(stats.value)}
          icon={<Coins className="h-5 w-5" />}
          accent="oklch(0.72 0.22 300)"
          delay={330}
        />
      </div>

      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Quotations"
          desc="Send proposals to prospective customers"
          action={
            <button
              onClick={() => {
                setForm(EMPTY_DOC);
                setOpen(true);
              }}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> New quotation
            </button>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-12 rounded-xl" />
            ))}
          </div>
        ) : quotations.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FileSignature className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No quotations yet</p>
            <p className="text-xs text-muted-foreground">
              Draft your first proposal.
            </p>
          </div>
        ) : (
          <div className="max-h-[560px] space-y-2 overflow-y-auto scroll-liquid pr-1">
            {quotations.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-background/50 p-3 transition hover:border-primary/30"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileSignature className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">
                      {q.number}
                    </span>
                    <StatusPill status={q.status} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{q.customerName}</span>
                    <span>·</span>
                    <span>
                      issued {format(new Date(q.issueDate), "MMM d, yyyy")}
                    </span>
                    {q.validUntil && (
                      <>
                        <span>·</span>
                        <span>
                          valid until{" "}
                          {format(new Date(q.validUntil), "MMM d, yyyy")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {money(q.total)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {q.items.length} item{q.items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPrintDoc(q)}>
                      <Printer className="h-3.5 w-3.5" /> Export PDF
                    </DropdownMenuItem>
                    {q.status === "draft" && (
                      <DropdownMenuItem onClick={() => setStatus(q, "sent")}>
                        <Send className="h-3.5 w-3.5" /> Mark sent
                      </DropdownMenuItem>
                    )}
                    {q.status === "sent" && (
                      <>
                        <DropdownMenuItem
                          onClick={() => setStatus(q, "accepted")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark
                          accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatus(q, "rejected")}
                        >
                          <Ban className="h-3.5 w-3.5" /> Mark rejected
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => remove(q)}
                      className="text-rose-500 focus:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New quotation</DialogTitle>
            <DialogDescription>
              Build a proposal with line items, tax & validity window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer *">
                <Select
                  value={form.customerId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, customerId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No customers available
                      </SelectItem>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valid until">
                <Input
                  type="date"
                  value={form.dueOrValid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueOrValid: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Line items">
              <LineItemsEditor
                items={form.items}
                onChange={(items) => setForm((f) => ({ ...f, items }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      taxRate: Number(e.target.value) || 0,
                    }))
                  }
                />
              </Field>
              <div className="rounded-lg bg-muted/40 p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({form.taxRate}%)
                  </span>
                  <span className="tabular-nums">
                    {money(totals.taxAmount)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border/40 pt-1 text-sm font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{money(totals.total)}</span>
                </div>
              </div>
            </div>
            <Field label="Notes">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Scope, assumptions, validity terms…"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="liquid-pill">
              {busy ? "Creating…" : "Create quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printDoc && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .print-area, .print-area * { visibility: visible !important; }
              .print-area {
                position: absolute !important;
                left: 0; top: 0; width: 100%;
                background: white !important;
              }
            }
            @media screen {
              .print-area {
                position: fixed;
                inset: 0;
                z-index: 9999;
                overflow: auto;
                background: white;
              }
            }
          `}</style>
          <InvoicePrintLayout
            doc={printDoc}
            customer={customers.find((c) => c.id === printDoc.customerId)}
            bank={bank}
            kind="quotation"
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Bank accounts tab
// ============================================================================

interface BankForm {
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  currency: string;
  isDefault: boolean;
}

const EMPTY_BANK: BankForm = {
  accountName: "",
  bankName: "",
  accountNumber: "",
  iban: "",
  swift: "",
  currency: "USD",
  isDefault: false,
};

function BankAccountsTab() {
  const { data, loading, reload } = useApi<BankAccount[]>("/api/bank-accounts");
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<BankForm>(EMPTY_BANK);
  const [busy, setBusy] = React.useState(false);

  const accounts = data ?? [];

  const openCreate = () => {
    setForm(EMPTY_BANK);
    setEditId(null);
    setOpen(true);
  };
  const openEdit = (a: BankAccount) => {
    setForm({
      accountName: a.accountName,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      iban: a.iban ?? "",
      swift: a.swift ?? "",
      currency: a.currency,
      isDefault: a.isDefault,
    });
    setEditId(a.id);
    setOpen(true);
  };

  const submit = async () => {
    if (!form.accountName || !form.bankName || !form.accountNumber) {
      toast.error("Account name, bank & number are required");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        await api("PATCH", `/api/bank-accounts/${editId}`, form);
        toast.success("Bank account updated");
      } else {
        await api("POST", "/api/bank-accounts", form);
        toast.success("Bank account added");
      }
      setOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: BankAccount) => {
    if (!confirm(`Delete ${a.bankName} account?`)) return;
    try {
      await api("DELETE", `/api/bank-accounts/${a.id}`);
      toast.success("Bank account deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const setDefault = async (a: BankAccount) => {
    try {
      await api("PATCH", `/api/bank-accounts/${a.id}`, { isDefault: true });
      toast.success(`${a.bankName} set as default`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="crystal-in p-5">
        <SectionTitle
          title="Bank accounts"
          desc="Accounts displayed on invoices & quotations"
          action={
            <button
              onClick={openCreate}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add account
            </button>
          }
        />

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-40 rounded-2xl" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Landmark className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No bank accounts yet</p>
            <p className="text-xs text-muted-foreground">
              Add an account so invoices can show payment details.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 to-background/60 p-4 transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {a.bankName}
                        </span>
                        {a.isDefault && (
                          <Badge className="bg-[oklch(0.82_0.14_85)]/15 text-[oklch(0.6_0.16_55)] hover:bg-[oklch(0.82_0.14_85)]/20">
                            <Star className="h-2.5 w-2.5" /> Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.accountName}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      {!a.isDefault && (
                        <DropdownMenuItem onClick={() => setDefault(a)}>
                          <Star className="h-3.5 w-3.5" /> Set as default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => remove(a)}
                        className="text-rose-500 focus:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="relative space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <code className="font-mono">
                      {maskNumber(a.accountNumber)}
                    </code>
                  </div>
                  {a.iban && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">IBAN</span>
                      <code className="font-mono">{maskNumber(a.iban)}</code>
                    </div>
                  )}
                  {a.swift && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SWIFT</span>
                      <code className="font-mono">{a.swift}</code>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Currency</span>
                    <Badge variant="outline" className="font-semibold uppercase">
                      {a.currency}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit bank account" : "Add bank account"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update account details."
                : "Will appear on invoices & quotations."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Account name *">
              <Input
                value={form.accountName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountName: e.target.value }))
                }
                placeholder="SocialFlow LLC"
              />
            </Field>
            <Field label="Bank name *">
              <Input
                value={form.bankName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankName: e.target.value }))
                }
                placeholder="Wise / HSBC / Stripe"
              />
            </Field>
            <Field label="Account number *">
              <Input
                value={form.accountNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountNumber: e.target.value }))
                }
                placeholder="0123456789"
              />
            </Field>
            <Field label="Currency">
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, currency: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-semibold">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="IBAN">
              <Input
                value={form.iban}
                onChange={(e) =>
                  setForm((f) => ({ ...f, iban: e.target.value }))
                }
                placeholder="GB29 NWBK 6016 1331 9268 19"
              />
            </Field>
            <Field label="SWIFT / BIC">
              <Input
                value={form.swift}
                onChange={(e) =>
                  setForm((f) => ({ ...f, swift: e.target.value }))
                }
                placeholder="NWBKGB2L"
              />
            </Field>
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <input
                id="isDefault"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isDefault: e.target.checked }))
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <Label htmlFor="isDefault" className="text-xs font-medium">
                Set as default account (shown on invoices)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="liquid-pill">
              {busy ? "Saving…" : editId ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Reports / overview tab
// ============================================================================

const PLAN_COLORS: Record<string, string> = {
  starter: "oklch(0.74 0.18 165)",
  growth: "oklch(0.72 0.22 300)",
  enterprise: "oklch(0.7 0.2 25)",
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  invoice_paid: CheckCircle2,
  invoice_sent: Send,
  customer_added: UserPlus,
  key_activated: KeyRound,
  quotation_accepted: CheckCircle2,
};
function ReportsTab() {
  const { data: customers } = useApi<Customer[]>("/api/customers");
  const { data: keys } = useApi<SerialKey[]>("/api/serial-keys");
  const { data: invoices } = useApi<Invoice[]>("/api/invoices");

  if (!customers || !keys || !invoices) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-32 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-28 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="shimmer h-72 rounded-3xl" />
          <div className="shimmer h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const revenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const pending = invoices
    .filter((i) => i.status === "sent" || i.status === "draft")
    .reduce((s, i) => s + i.total, 0);

  const activationRate =
    keys.length > 0
      ? Math.round(
          (keys.filter((k) => k.status === "activated").length / keys.length) *
            100,
        )
      : 0;

  // Plan distribution
  const planCounts = PLANS.map((p) => ({
    name: p,
    value: customers.filter((c) => c.plan === p).length,
    color: PLAN_COLORS[p],
  })).filter((p) => p.value > 0);

  // Customer growth series (cumulative count by createdAt day, last 14 days)
  const today = new Date();
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const growthSeries = days.map((d, i) => {
    const cumulative = customers.filter(
      (c) => new Date(c.createdAt) <= new Date(d.getTime() + 86400000 - 1),
    ).length;
    return {
      date: format(d, "MMM d"),
      customers: cumulative,
      invoices: invoices.filter(
        (inv) => new Date(inv.issueDate) <= new Date(d.getTime() + 86400000 - 1),
      ).length,
    };
  });

  // Recent activity feed
  const activities: {
    id: string;
    type: string;
    label: string;
    at: string;
  }[] = [
    ...invoices.slice(0, 5).map((inv) => ({
      id: `inv-${inv.id}`,
      type:
        inv.status === "paid"
          ? "invoice_paid"
          : inv.status === "sent"
            ? "invoice_sent"
            : "invoice_sent",
      label: `${inv.number} · ${inv.customerName} · ${money(inv.total)}`,
      at: inv.createdAt,
    })),
    ...customers.slice(0, 5).map((c) => ({
      id: `c-${c.id}`,
      type: "customer_added",
      label: `${c.name} joined · ${c.plan} plan`,
      at: c.createdAt,
    })),
    ...keys
      .filter((k) => k.status === "activated")
      .slice(0, 3)
      .map((k) => ({
        id: `k-${k.id}`,
        type: "key_activated",
        label: `${k.key} activated${k.customerName ? ` · ${k.customerName}` : ""}`,
        at: k.activatedAt ?? k.createdAt,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={money(revenue)}
          icon={<Coins className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          delay={50}
          hint="from paid invoices"
        />
        <KpiCard
          label="Pending"
          value={money(pending)}
          icon={<Clock className="h-5 w-5" />}
          accent="oklch(0.82 0.14 85)"
          delay={120}
          hint="drafts + sent"
        />
        <KpiCard
          label="Activation rate"
          value={`${activationRate}%`}
          icon={<KeyRound className="h-5 w-5" />}
          accent="oklch(0.72 0.22 300)"
          delay={190}
          hint={`${keys.filter((k) => k.status === "activated").length}/${keys.length} keys`}
        />
        <KpiCard
          label="Avg deal size"
          value={
            invoices.length > 0
              ? money(invoices.reduce((s, i) => s + i.total, 0) / invoices.length)
              : money(0)
          }
          icon={<TrendingUp className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          delay={260}
          hint="per invoice"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2">
          <SectionTitle
            title="Customer growth"
            desc="Cumulative customers & invoices, last 14 days"
          />
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growthSeries}
                margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gCust" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="oklch(0.72 0.22 300)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.72 0.22 300)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number, n) => [
                    fmt(v),
                    n === "customers" ? "Customers" : "Invoices",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="customers"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#gCust)"
                  isAnimationActive
                  animationBegin={200}
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="invoices"
                  stroke="oklch(0.72 0.22 300)"
                  strokeWidth={2.5}
                  fill="url(#gInv)"
                  isAnimationActive
                  animationBegin={450}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5">
          <SectionTitle title="Plan distribution" desc="Across customers" />
          <div className="relative mx-auto h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planCounts}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {planCounts.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number, n) => [`${v} customers`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{customers.length}</span>
              <span className="text-[10px] text-muted-foreground">customers</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {planCounts.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2 text-[11px]"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="capitalize text-muted-foreground">{p.name}</span>
                <span className="ml-auto font-medium">{p.value}</span>
              </div>
            ))}
            {planCounts.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No customers yet
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2">
          <SectionTitle title="Recent activity" desc="Latest events across your workspace" />
          <div className="space-y-1">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No activity yet
              </div>
            ) : (
              activities.map((a) => {
                const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 truncate text-sm">
                      {a.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(a.at), "MMM d, HH:mm")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5">
          <SectionTitle title="Revenue by plan" desc="Paid invoices per plan" />
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={PLANS.map((p) => ({
                  plan: p,
                  revenue: paidInvoices
                    .filter((inv) =>
                      customers.find(
                        (c) => c.id === inv.customerId && c.plan === p,
                      ),
                    )
                    .reduce((s, i) => s + i.total, 0),
                  color: PLAN_COLORS[p],
                }))}
                margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="plan"
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [money(v), "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1000}>
                  {PLANS.map((p) => (
                    <Cell key={p} fill={PLAN_COLORS[p]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ============================================================================
// Main OwnerView
// ============================================================================

const TABS: TabDef[] = [
  { id: "customers", label: "Customers", icon: Users },
  { id: "keys", label: "Serial Keys", icon: KeyRound },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "quotations", label: "Quotations", icon: FileSignature },
  { id: "bank", label: "Bank Accounts", icon: Landmark },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export function OwnerView() {
  const [tab, setTab] = React.useState("customers");
  const { data: customers } = useApi<Customer[]>("/api/customers");
  const customerList = customers ?? [];

  return (
    <div className="space-y-5">
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-40 w-40 rounded-full bg-[oklch(0.72_0.22_300)]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Briefcase className="h-3.5 w-3.5" />
              Owner Panel
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Billing & <span className="retaina-text">licensing</span> cockpit
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage customers, licenses, invoices, quotations & bank accounts —
              all in one place.
            </p>
          </div>
          <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
            <div className="flex items-center gap-1.5">
              <CircleUserRound className="h-3.5 w-3.5" />
              {customerList.length} customers
            </div>
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              {customerList.filter((c) => c.serialKey).length} licensed
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(), "MMM d, yyyy")}
            </div>
          </div>
        </div>
      </GlassCard>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "customers" && <CustomersTab />}
      {tab === "keys" && <SerialKeysTab customers={customerList} />}
      {tab === "invoices" && <InvoicesTab customers={customerList} />}
      {tab === "quotations" && <QuotationsTab customers={customerList} />}
      {tab === "bank" && <BankAccountsTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}
