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
  Save,
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
  CircleUserRound,
  Briefcase,
  UserPlus,
  Smartphone,
  CreditCard,
  Lock,
  Loader2,
  Globe,
  Wifi,
  DollarSign,
  AlertTriangle,
  Database,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import {
  NavCard,
  MetricRow,
  Sparkline,
  SectionHeader,
  Pill,
} from "@/components/glass/dense-ui";
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
  database: { dbName: string; dbUrl: string; status: string; createdAt: string } | null;
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
  // Read the auth token from localStorage so the Bearer header is sent
  const token = (() => {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  })();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
// Drill-down navigation — left sidebar of NavCard items + bottom metrics strip.
// Replaces the old SegmentedTabs strip with a settings-app / file-browser style
// layout: nav on the left (sticky, ~280px), focused detail panel on the right.
// ============================================================================

interface OwnerSection {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  desc: string;
  countKey?: Exclude<keyof FinanceOverview, "planDistribution">;
}

const OWNER_SECTIONS: OwnerSection[] = [
  { id: "customers",     label: "Customers",     icon: Users,           accent: "oklch(0.55 0.2 255)",  desc: "CRM records & plans",   countKey: "customers" },
  { id: "subscriptions", label: "Subscriptions",  icon: CreditCard,      accent: "oklch(0.68 0.22 145)", desc: "Active & trial plans",  countKey: "subscriptions" },
  { id: "invoices",      label: "Invoices",       icon: FileText,        accent: "oklch(0.72 0.18 75)",  desc: "Bill customers",        countKey: "invoices" },
  { id: "quotations",    label: "Quotations",     icon: FileSignature,   accent: "oklch(0.7 0.2 25)",    desc: "Proposals & quotes",    countKey: "quotations" },
  { id: "keys",          label: "Serial Keys",    icon: KeyRound,        accent: "oklch(0.66 0.18 200)", desc: "License keys",          countKey: "serialKeys" },
  { id: "devices",       label: "Devices",         icon: Smartphone,      accent: "oklch(0.62 0.22 300)", desc: "Registered devices",    countKey: "devices" },
  { id: "apikeys",       label: "API Keys",        icon: Lock,            accent: "oklch(0.72 0.18 75)",  desc: "Integration keys",      countKey: "apiKeys" },
  { id: "bank",          label: "Bank Accounts",   icon: Landmark,        accent: "oklch(0.68 0.22 145)", desc: "Accounts for invoices", countKey: "bankAccounts" },
  { id: "users",         label: "Client Users",    icon: CircleUserRound, accent: "oklch(0.62 0.22 300)", desc: "Login accounts",        countKey: "users" },
  { id: "overview",      label: "Overview",        icon: Briefcase,       accent: "oklch(0.72 0.18 75)",  desc: "Enterprise cockpit" },
  { id: "finance",       label: "Finance",          icon: DollarSign,      accent: "oklch(0.55 0.2 255)",  desc: "Revenue & MRR" },
  { id: "reports",       label: "Reports",          icon: BarChart3,       accent: "oklch(0.7 0.2 25)",    desc: "Growth & activity" },
];

// Deterministic pseudo-random revenue trend series (stable across renders).
// Uses a small normalizer so Math.sin produces a recognizable shape instead
// of pure noise when the seed (totalRevenue) is a large number. The shape is
// stable for a given revenue value, so the sidebar sparkline doesn't flicker.
function revenueTrendSeries(totalRevenue: number, points = 14): number[] {
  const seed = totalRevenue || 1;
  const base = Math.max(1, seed / points);
  const norm = (seed % 997) / 997; // 997 is prime — gives good spread
  return Array.from({ length: points }, (_, i) => {
    const r = Math.sin((norm + i * 0.08) * Math.PI * 2) * 0.4 + 0.75;
    return Math.max(1, Math.round(base * r));
  });
}

function OwnerNavSidebar({
  active,
  onChange,
  overview,
}: {
  active: string;
  onChange: (id: string) => void;
  overview: FinanceOverview | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title="Owner Panel"
        icon={Briefcase}
        desc="Billing & licensing"
      />
      <nav
        className="scroll-liquid space-y-1.5 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {OWNER_SECTIONS.map((s) => {
          const count =
            s.countKey && overview ? overview[s.countKey] : undefined;
          return (
            <NavCard
              key={s.id}
              icon={s.icon}
              title={s.label}
              desc={s.desc}
              accent={s.accent}
              count={count}
              active={active === s.id}
              onClick={() => onChange(s.id)}
            />
          );
        })}
      </nav>

      {overview && (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Revenue trend
            </span>
            <Pill color="green">
              <TrendingUp className="h-2.5 w-2.5" />
              {fmt(overview.totalRevenue)}
            </Pill>
          </div>
          <Sparkline
            data={revenueTrendSeries(overview.totalRevenue)}
            width={232}
            height={32}
            color="oklch(0.7 0.2 145)"
          />
          <MetricRow
            metrics={[
              { label: "MRR", value: fmt(overview.monthlyRevenue), color: "oklch(0.55 0.2 255)" },
              { label: "Active subs", value: overview.activeSubs, color: "oklch(0.68 0.22 145)" },
              { label: "Pending", value: fmt(overview.pendingRevenue), color: "oklch(0.72 0.18 75)" },
            ]}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

function MobileNavSelect({
  active,
  onChange,
  overview,
}: {
  active: string;
  onChange: (id: string) => void;
  overview: FinanceOverview | null;
}) {
  return (
    <div className="sm:hidden">
      <Select value={active} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pick a section" />
        </SelectTrigger>
        <SelectContent>
          {OWNER_SECTIONS.map((s) => {
            const count =
              s.countKey && overview ? overview[s.countKey] : undefined;
            return (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
                {count !== undefined ? ` · ${count}` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
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
      <div className="overflow-x-auto scroll-liquid -mx-1 px-1 pb-1">
        <div className="min-w-[460px] space-y-2">
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
        </div>
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
  createDatabase: boolean;
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
  createDatabase: true, // default ON — owner usually wants a DB for each client
};

// ============ Overview Tab — enterprise cockpit ============
interface FinanceOverview {
  customers: number; invoices: number; paidInvoices: number; quotations: number;
  serialKeys: number; activatedKeys: number; devices: number; apiKeys: number;
  subscriptions: number; activeSubs: number; trialSubs: number; bankAccounts: number;
  users: number; accounts: number; posts: number;
  totalRevenue: number; pendingRevenue: number; overdueRevenue: number; monthlyRevenue: number;
  planDistribution: { name: string; count: number }[];
}

function OverviewTab() {
  const { data, loading } = useApi<FinanceOverview>("/api/finance/overview");

  if (loading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}
        <div className="shimmer col-span-full h-64 rounded-3xl" />
      </div>
    );
  }

  const d = data;
  const collectionRate = d.invoices > 0 ? Math.round((d.paidInvoices / d.invoices) * 100) : 0;
  const licenseUtilization = d.serialKeys > 0 ? Math.round((d.activatedKeys / d.serialKeys) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Revenue KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={`$${fmt(d.totalRevenue)}`} icon={<DollarSign className="h-5 w-5" />} accent="oklch(0.7 0.2 145)" hint="From paid invoices" />
        <KpiCard label="Monthly Recurring" value={`$${fmt(d.monthlyRevenue)}`} icon={<TrendingUp className="h-5 w-5" />} accent="oklch(0.62 0.2 255)" hint="From active subscriptions" />
        <KpiCard label="Pending" value={`$${fmt(d.pendingRevenue)}`} icon={<Clock className="h-5 w-5" />} accent="oklch(0.7 0.15 75)" hint="Sent invoices" />
        <KpiCard label="Overdue" value={`$${fmt(d.overdueRevenue)}`} icon={<AlertTriangle className="h-5 w-5" />} accent="oklch(0.55 0.22 25)" hint="Needs follow-up" />
      </div>

      {/* Customers + Subscriptions KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Customers" value={d.customers} icon={<Users className="h-5 w-5" />} accent="oklch(0.62 0.2 255)" hint={`${d.activeSubs} active subs`} />
        <KpiCard label="Client Users" value={d.users} icon={<CircleUserRound className="h-5 w-5" />} accent="oklch(0.66 0.22 305)" hint="With login access" />
        <KpiCard label="Serial Keys" value={d.serialKeys} icon={<KeyRound className="h-5 w-5" />} accent="oklch(0.72 0.18 75)" hint={`${licenseUtilization}% activated`} />
        <KpiCard label="Devices" value={d.devices} icon={<Smartphone className="h-5 w-5" />} accent="oklch(0.6 0.2 220)" hint="Registered devices" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue breakdown */}
        <GlassCard className="crystal-in p-5">
          <SectionTitle title="Revenue breakdown" desc="Paid vs pending vs overdue" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Collected", value: d.totalRevenue, fill: "oklch(0.7 0.2 145)" },
                { name: "Pending", value: d.pendingRevenue, fill: "oklch(0.7 0.15 75)" },
                { name: "Overdue", value: d.overdueRevenue, fill: "oklch(0.55 0.22 25)" },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${fmt(v)}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Plan distribution */}
        <GlassCard className="crystal-in p-5">
          <SectionTitle title="Subscription plans" desc="Distribution by plan" />
          <div className="h-[240px]">
            {d.planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.planDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name}: ${count}`} labelLine={false} isAnimationActive animationDuration={700}>
                    <Cell fill="oklch(0.62 0.2 255)" />
                    <Cell fill="oklch(0.7 0.2 145)" />
                    <Cell fill="oklch(0.7 0.2 75)" />
                    <Cell fill="oklch(0.66 0.22 305)" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No subscriptions yet</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Module health grid */}
      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Module overview" desc="All sub-modules at a glance" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Invoices", value: d.invoices, sub: `${d.paidInvoices} paid · ${collectionRate}% collected`, icon: FileText, color: "oklch(0.62 0.2 255)" },
            { label: "Quotations", value: d.quotations, sub: "Pending proposals", icon: FileSignature, color: "oklch(0.68 0.18 145)" },
            { label: "Subscriptions", value: d.subscriptions, sub: `${d.activeSubs} active · ${d.trialSubs} trial`, icon: CreditCard, color: "oklch(0.7 0.2 75)" },
            { label: "Serial Keys", value: d.serialKeys, sub: `${d.activatedKeys} activated · ${licenseUtilization}%`, icon: KeyRound, color: "oklch(0.72 0.18 75)" },
            { label: "Devices", value: d.devices, sub: "Registered", icon: Smartphone, color: "oklch(0.6 0.2 220)" },
            { label: "API Keys", value: d.apiKeys, sub: "Active integrations", icon: Lock, color: "oklch(0.55 0.22 25)" },
            { label: "Bank Accounts", value: d.bankAccounts, sub: "Connected", icon: Landmark, color: "oklch(0.6 0.15 200)" },
            { label: "Social Accounts", value: d.accounts, sub: `${d.posts} posts published`, icon: Globe, color: "oklch(0.62 0.22 300)" },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-4 transition hover:bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${m.color}18`, color: m.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{m.label}</span>
                </div>
                <div className="num-display mt-2 text-2xl font-bold">{m.value}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{m.sub}</div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

function CustomersTab() {
  const { data, loading, reload } = useApi<Customer[]>("/api/customers");
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CustomerForm>(EMPTY_CUSTOMER);
  const [busy, setBusy] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginCustomer, setLoginCustomer] = React.useState<Customer | null>(null);
  const [loginForm, setLoginForm] = React.useState({ name: "", email: "", password: "", role: "member" });
  const [loginBusy, setLoginBusy] = React.useState(false);

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
      createDatabase: false, // don't create DB when editing
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
        const res = await api("POST", "/api/customers", form);
        const json = res as { ok?: boolean; databaseCreated?: boolean; dbName?: string; dbError?: string };
        if (json.databaseCreated) {
          toast.success("Client registered + database created!", {
            description: `Database "${json.dbName}" is active. Users created for this client will log into their own database.`,
            duration: 6000,
          });
        } else if (json.dbError) {
          toast.success("Client created (database failed)", {
            description: json.dbError,
            duration: 6000,
          });
        } else {
          toast.success("Customer created");
        }
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

  const openCreateLogin = (c: Customer) => {
    setLoginCustomer(c);
    setLoginForm({ name: c.name, email: c.email, password: "", role: "member" });
    setLoginOpen(true);
  };

  const createLogin = async () => {
    if (!loginForm.name.trim() || !loginForm.email.includes("@")) {
      toast.error("Enter a valid name and email");
      return;
    }
    if (loginForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoginBusy(true);
    try {
      // Create user account via signup API
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: loginForm.name.trim(),
          email: loginForm.email.trim(),
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        // Set role if not member
        if (loginForm.role !== "member") {
          await fetch("/api/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.user.id,
              role: loginForm.role,
              title: loginForm.role === "admin" ? "Administrator" : "Manager",
              department: loginCustomer?.company ?? null,
            }),
          }).catch(() => {});
        } else {
          // Set department/title for member
          await fetch("/api/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.user.id,
              title: "Team Member",
              department: loginCustomer?.company ?? null,
            }),
          }).catch(() => {});
        }
        toast.success("Login created!", {
          description: `${loginForm.name} can now sign in at /login with their email and password.`,
        });
        setLoginOpen(false);
      } else {
        toast.error(data.error || "Failed to create login — email may already exist");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoginBusy(false);
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
                      <DropdownMenuItem onClick={() => openCreateLogin(c)}>
                        <UserPlus className="h-3.5 w-3.5" /> Create login
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

                {/* Database status badge */}
                {c.database ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px]">
                    <Database className="h-3 w-3 text-emerald-500" />
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{c.database.dbName}</span>
                    <span className="ml-auto rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {c.database.status}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/40 px-2 py-1 text-[10px] text-muted-foreground/60">
                    <Database className="h-3 w-3" />
                    No dedicated database
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit customer" : "Register new client"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update customer profile & plan."
                : "Create a new client record. A dedicated database can be provisioned automatically."}
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

            {/* Database creation toggle — only on new customer, not edit */}
            {!editId && (
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, createDatabase: !f.createDatabase }))}
                  className={cn(
                    "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition",
                    form.createDatabase ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn(
                    "h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.createDatabase ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    Create dedicated database
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Creates a separate Neon database for this client. Users created for this client will log into their own isolated database.
                    {form.company && (
                      <span className="mt-1 block font-mono text-[10px] text-primary">
                        DB name: {form.company.toLowerCase().replace(/[^a-z0-9]/g, "_")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="liquid-pill">
              {busy ? "Saving…" : editId ? "Save changes" : "Register client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[var(--gold)]" /> Create login for {loginCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Create a user account so this customer can sign in at /login. They&apos;ll use their email + the password you set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Full name</Label>
              <Input value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} placeholder="John Smith" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Email (login)</Label>
              <Input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="john@company.com" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Min 6 characters" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={loginForm.role} onValueChange={(v) => setLoginForm({ ...loginForm, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/5 p-3 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
              <span>The customer will sign in at <code className="font-mono text-foreground">/login</code> with these credentials. You can change their role or suspend them anytime.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoginOpen(false)}>Cancel</Button>
            <button onClick={createLogin} disabled={loginBusy} className="liquid-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loginBusy ? "Creating…" : "Create login"}
            </button>
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

  // Revenue by plan — paid invoices grouped by customer.plan
  const planRevenue = PLANS.map((p) => ({
    plan: p,
    revenue: paidInvoices
      .filter((inv) =>
        customers.find((c) => c.id === inv.customerId && c.plan === p),
      )
      .reduce((s, i) => s + i.total, 0),
    color: PLAN_COLORS[p],
  }));
  const maxPlanRevenue = Math.max(...planRevenue.map((p) => p.revenue), 1);

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
          <SectionTitle
            title="Plan distribution"
            desc={`${customers.length} customers`}
          />
          <div className="space-y-0.5">
            {planCounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No customers yet
              </div>
            ) : (
              planCounts.map((p) => {
                const pct = Math.round(
                  (p.value / (customers.length || 1)) * 100,
                );
                return (
                  <div
                    key={p.name}
                    className="flex items-center gap-2.5 py-1.5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="w-16 shrink-0 text-[11px] font-medium capitalize">
                      {p.name}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: p.color }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                      {p.value}
                    </span>
                    <span className="w-9 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })
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
          <SectionTitle title="Revenue by plan" desc="Paid invoices" />
          <div className="space-y-0.5">
            {planRevenue.map((p) => {
              const pct = Math.round((p.revenue / maxPlanRevenue) * 100);
              return (
                <div key={p.plan} className="flex items-center gap-2.5 py-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <span className="w-20 shrink-0 text-[11px] font-medium capitalize">
                    {p.plan}
                  </span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: p.color }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                    {money(p.revenue)}
                  </span>
                </div>
              );
            })}
            {planRevenue.every((p) => p.revenue === 0) && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No paid revenue yet
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ============================================================================
// Devices Tab
// ============================================================================
interface DeviceData {
  id: string; deviceName: string; fingerprint: string | null; ipAddress: string | null;
  location: string | null; status: string; lastSeen: string | null; createdAt: string;
  serialKey: { key: string; status: string } | null; customerName: string | null;
}

function DevicesTab() {
  const { data, loading, reload } = useApi<DeviceData[]>("/api/devices");
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ deviceName: "", serialKeyId: "", ipAddress: "", location: "" });

  if (loading) return <div className="shimmer h-64 rounded-3xl" />;
  const devices = data ?? [];

  const add = async () => {
    if (!form.deviceName.trim()) return toast.error("Device name required");
    await api("POST", "/api/devices", form);
    toast.success("Device registered");
    setForm({ deviceName: "", serialKeyId: "", ipAddress: "", location: "" });
    setAddOpen(false); reload();
  };

  const block = async (id: string, name: string) => {
    await api("PATCH", `/api/devices/${id}`, { status: "blocked" });
    toast.success(`${name} blocked`); reload();
  };
  const unblock = async (id: string, name: string) => {
    await api("PATCH", `/api/devices/${id}`, { status: "active" });
    toast.success(`${name} unblocked`); reload();
  };
  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    await api("DELETE", `/api/devices/${id}`);
    toast.success(`${name} removed`); reload();
  };

  const statusStyle: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-500",
    blocked: "bg-rose-500/15 text-rose-500",
    revoked: "bg-muted text-muted-foreground",
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle title="Device Management" desc="Registered devices and their activation status"
        action={<button onClick={() => setAddOpen(true)} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Register device</button>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <div key={d.id} className="crystal-in glass rounded-2xl p-4 lift-hover">
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Smartphone className="h-5 w-5" /></div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", statusStyle[d.status] ?? statusStyle.active)}>{d.status}</span>
            </div>
            <div className="mt-3 truncate text-sm font-semibold">{d.deviceName}</div>
            <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
              {d.ipAddress && <div className="flex items-center gap-1"><Globe className="h-3 w-3" /> {d.ipAddress}</div>}
              {d.location && <div className="flex items-center gap-1"><Wifi className="h-3 w-3" /> {d.location}</div>}
              {d.serialKey && <div className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> <code className="text-[10px]">{d.serialKey.key}</code></div>}
              {d.customerName && <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {d.customerName}</div>}
              {d.lastSeen && <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(d.lastSeen).toLocaleDateString()}</div>}
            </div>
            <div className="mt-3 flex gap-2">
              {d.status === "active" ? (
                <button onClick={() => block(d.id, d.deviceName)} className="flex-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20">Block</button>
              ) : (
                <button onClick={() => unblock(d.id, d.deviceName)} className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20">Unblock</button>
              )}
              <button onClick={() => remove(d.id, d.deviceName)} className="rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {devices.length === 0 && <div className="col-span-full py-8 text-center text-sm text-muted-foreground">No devices registered yet.</div>}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>Register Device</DialogTitle><DialogDescription>Add a device to track.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Device name</Label><Input value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} placeholder="MacBook Pro" className="mt-1.5" /></div>
            <div><Label className="text-xs">IP address (optional)</Label><Input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="192.168.1.1" className="mt-1.5" /></div>
            <div><Label className="text-xs">Location (optional)</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="New York, US" className="mt-1.5" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><button onClick={add} className="liquid-pill rounded-xl px-4 py-2 text-sm font-semibold">Register</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

// ============================================================================
// Subscriptions Tab
// ============================================================================
interface SubscriptionData {
  id: string; customerId: string; customerName: string; plan: string; status: string;
  amount: number; currency: string; startDate: string; endDate: string | null; trialEnds: string | null;
}

function SubscriptionsTab({ customers }: { customers: Customer[] }) {
  const { data, loading, reload } = useApi<SubscriptionData[]>("/api/subscriptions");
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ customerId: "", plan: "growth", amount: 89 });

  if (loading) return <div className="shimmer h-64 rounded-3xl" />;
  const subs = data ?? [];

  const add = async () => {
    if (!form.customerId) return toast.error("Select a customer");
    await api("POST", "/api/subscriptions", form);
    toast.success("Subscription created"); setAddOpen(false); reload();
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this subscription?")) return;
    await api("PATCH", `/api/subscriptions/${id}`, { status: "cancelled" });
    toast.success("Subscription cancelled"); reload();
  };

  const statusStyle: Record<string, string> = {
    trial: "bg-amber-500/15 text-amber-500", active: "bg-emerald-500/15 text-emerald-500",
    cancelled: "bg-rose-500/15 text-rose-500", expired: "bg-muted text-muted-foreground",
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle title="Subscriptions" desc="Manage customer subscriptions and trials"
        action={<button onClick={() => setAddOpen(true)} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> New subscription</button>} />
      {subs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No subscriptions yet.</div>
      ) : (
        <div className="scroll-liquid max-h-[560px] space-y-2 overflow-y-auto">
          {subs.map((s) => (
            <div key={s.id} className="crystal-in flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{s.customerName}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", statusStyle[s.status])}>{s.status}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{s.plan} · ${s.amount}/{s.currency} · Started {new Date(s.startDate).toLocaleDateString()}</div>
                {s.trialEnds && s.status === "trial" && (
                  <div className="text-[11px] text-amber-500">Trial ends: {new Date(s.trialEnds).toLocaleDateString()}</div>
                )}
              </div>
              {s.status !== "cancelled" && <button onClick={() => cancel(s.id)} className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20">Cancel</button>}
            </div>
          ))}
        </div>
      )}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>New Subscription</DialogTitle><DialogDescription>Create a subscription for a customer.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Customer</Label><Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Plan</Label><Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v, amount: v === "starter" ? 29 : v === "enterprise" ? 0 : 89 })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="starter">Starter ($29/mo)</SelectItem><SelectItem value="growth">Growth ($89/mo)</SelectItem><SelectItem value="enterprise">Enterprise (Custom)</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><button onClick={add} className="liquid-pill rounded-xl px-4 py-2 text-sm font-semibold">Create</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

// ============================================================================
// API Keys Tab
// ============================================================================
interface ApiKeyData {
  id: string; name: string; key: string; permissions: string[]; status: string;
  lastUsed: string | null; createdAt: string;
}

function ApiKeysTab() {
  const { data, loading, reload } = useApi<ApiKeyData[]>("/api/api-keys");
  const [genOpen, setGenOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [newKey, setNewKey] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  if (loading) return <div className="shimmer h-64 rounded-3xl" />;
  const keys = data ?? [];

  const generate = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    setGenerating(true);
    try {
      const res = await fetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), permissions: ["*"] }) });
      const data = await res.json();
      if (data.key) { setNewKey(data.key); setName(""); reload(); }
      else toast.error("Failed to generate key");
    } catch { toast.error("Network error"); }
    finally { setGenerating(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await api("PATCH", `/api/api-keys/${id}`, { status: "revoked" });
    toast.success("API key revoked"); reload();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this API key?")) return;
    await api("DELETE", `/api/api-keys/${id}`);
    toast.success("API key deleted"); reload();
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle title="API Keys" desc="Generate and manage API keys for integrations"
        action={<button onClick={() => setGenOpen(true)} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Generate key</button>} />
      {keys.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No API keys generated yet.</div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="crystal-in flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Lock className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{k.name}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", k.status === "active" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500")}>{k.status}</span>
                </div>
                <code className="text-[11px] text-muted-foreground">{k.key.slice(0, 8)}...{k.key.slice(-4)}</code>
                {k.lastUsed && <div className="text-[10px] text-muted-foreground">Last used: {new Date(k.lastUsed).toLocaleString()}</div>}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(k.key); toast.success("Key copied"); }} className="rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
              {k.status === "active" && <button onClick={() => revoke(k.id)} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/20">Revoke</button>}
              <button onClick={() => del(k.id)} className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={genOpen} onOpenChange={(v) => { setGenOpen(v); if (!v) setNewKey(null); }}>
        <DialogContent className="glass-strong max-w-md">
          {newKey ? (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Key generated!</DialogTitle><DialogDescription>Copy this key now — it won&apos;t be shown in full again.</DialogDescription></DialogHeader>
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <code className="break-all text-xs font-mono">{newKey}</code>
              </div>
              <DialogFooter><button onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied!"); }} className="liquid-pill rounded-xl px-4 py-2 text-sm font-semibold">Copy key</button></DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>Generate API Key</DialogTitle><DialogDescription>Create a new API key for external integrations.</DialogDescription></DialogHeader>
              <div><Label className="text-xs">Key name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production API" className="mt-1.5" /></div>
              <DialogFooter><Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button><button onClick={generate} disabled={generating} className="liquid-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate</button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

// ============================================================================
// Finance Tab
// ============================================================================
interface FinanceOverview {
  customers: number; invoices: number; paidInvoices: number; quotations: number;
  serialKeys: number; activatedKeys: number; devices: number; apiKeys: number;
  subscriptions: number; activeSubs: number; trialSubs: number; bankAccounts: number;
  users: number; accounts: number; posts: number;
  totalRevenue: number; pendingRevenue: number; overdueRevenue: number; monthlyRevenue: number;
  planDistribution: { name: string; count: number }[];
}

function FinanceTab() {
  const { data, loading } = useApi<FinanceOverview>("/api/finance/overview");
  if (loading || !data) return <div className="shimmer h-64 rounded-3xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={fmt(data.totalRevenue)} icon={<DollarSign className="h-5 w-5" />} accent="oklch(0.68 0.22 145)" delay={50} />
        <KpiCard label="Monthly Recurring" value={fmt(data.monthlyRevenue)} icon={<TrendingUp className="h-5 w-5" />} accent="oklch(0.55 0.2 255)" delay={120} />
        <KpiCard label="Pending" value={fmt(data.pendingRevenue)} icon={<Clock className="h-5 w-5" />} accent="oklch(0.72 0.18 75)" delay={190} />
        <KpiCard label="Overdue" value={fmt(data.overdueRevenue)} icon={<AlertTriangle className="h-5 w-5" />} accent="oklch(0.7 0.2 25)" delay={260} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Customers" value={data.customers} icon={<Users className="h-5 w-5" />} accent="oklch(0.62 0.22 300)" delay={50} />
        <KpiCard label="Active Subs" value={data.activeSubs} icon={<CreditCard className="h-5 w-5" />} accent="oklch(0.68 0.22 145)" delay={120} />
        <KpiCard label="Trial Subs" value={data.trialSubs} icon={<Clock className="h-5 w-5" />} accent="oklch(0.72 0.18 75)" delay={190} />
        <KpiCard label="Devices" value={data.devices} icon={<Smartphone className="h-5 w-5" />} accent="oklch(0.66 0.18 200)" delay={260} />
      </div>

      <GlassCard className="crystal-in p-5">
        <SectionTitle title="Plan distribution" desc="Active subscriptions by plan" />
        {data.planDistribution.length > 0 ? (
          <div className="space-y-0.5">
            {(() => {
              const maxCount = Math.max(
                ...data.planDistribution.map((p) => p.count),
                1,
              );
              return data.planDistribution.map((p) => {
                const pct = Math.round((p.count / maxCount) * 100);
                const color = PLAN_COLORS[p.name] ?? "var(--primary)";
                return (
                  <div key={p.name} className="flex items-center gap-2.5 py-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="w-20 shrink-0 text-[11px] font-medium capitalize">
                      {p.name}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                      {p.count}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No subscriptions yet.
          </div>
        )}
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="crystal-in p-5">
          <SectionTitle title="Invoice Summary" />
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3"><span className="text-sm">Total Invoices</span><span className="num-display font-bold">{data.invoices}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 p-3"><span className="text-sm text-emerald-500">Paid</span><span className="num-display font-bold text-emerald-500">{data.paidInvoices}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3"><span className="text-sm">Quotations</span><span className="num-display font-bold">{data.quotations}</span></div>
          </div>
        </GlassCard>
        <GlassCard className="crystal-in p-5">
          <SectionTitle title="System Summary" />
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3"><span className="text-sm">Users</span><span className="num-display font-bold">{data.users}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3"><span className="text-sm">Social Accounts</span><span className="num-display font-bold">{data.accounts}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3"><span className="text-sm">Posts</span><span className="num-display font-bold">{data.posts}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3"><span className="text-sm">API Keys</span><span className="num-display font-bold">{data.apiKeys}</span></div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ============================================================================
// Users Tab — shows all users with full details + create/edit/delete
// ============================================================================
interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  department: string | null;
  status: string;
  avatar: string | null;
  gender: string | null;
  birthDate: string | null;
  phone: string | null;
  lastActive: string | null;
  createdAt: string;
}

function ClientUsersTab() {
  const { data, loading, reload } = useApi<ClientUser[]>("/api/users");
  const { data: customerList } = useApi<Customer[]>("/api/customers");
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<ClientUser | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "member", company: "", gender: "", birthDate: "", phone: "", customerId: "" });
  const [busy, setBusy] = React.useState(false);

  if (loading) return <div className="shimmer h-64 rounded-3xl" />;
  const users = data ?? [];

  const createLogin = async () => {
    if (!form.name.trim() || !form.email.includes("@")) {
      toast.error("Enter a valid name and email");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      // Use the team API (which supports name/email/password/role/gender/etc + auth)
      await api("POST", "/api/team", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        title: form.role === "admin" ? "Administrator" : form.role === "manager" ? "Manager" : "Team Member",
        department: form.company || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
        phone: form.phone || undefined,
        customerId: form.customerId || undefined,
      });
      toast.success("User created!", { description: `${form.name} can sign in at /login` });
      setForm({ name: "", email: "", password: "", role: "member", company: "", gender: "", birthDate: "", phone: "", customerId: "" });
      setLoginOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user — email may already exist");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setBusy(true);
    try {
      await api("PATCH", "/api/users", {
        id: editUser.id,
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        title: editUser.title,
        department: editUser.department,
        gender: editUser.gender,
        birthDate: editUser.birthDate,
        phone: editUser.phone,
      });
      toast.success("User updated");
      setEditOpen(false);
      setEditUser(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? They will lose access immediately.`)) return;
    try {
      await api("DELETE", "/api/users", { id });
      toast.success(`${name} removed`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove user");
    }
  };

  const suspendUser = async (id: string, name: string) => {
    try {
      await api("PATCH", "/api/users", { id, status: "suspended" });
      toast.success(`${name} suspended`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const reactivateUser = async (id: string, name: string) => {
    try {
      await api("PATCH", "/api/users", { id, status: "active" });
      toast.success(`${name} reactivated`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const roleBadge: Record<string, string> = {
    admin: "bg-[var(--gold)]/15 text-[var(--gold)]",
    manager: "bg-primary/15 text-primary",
    editor: "bg-emerald-500/15 text-emerald-500",
    member: "bg-muted text-muted-foreground",
    viewer: "bg-muted text-muted-foreground",
  };

  const statusBadge: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-500",
    suspended: "bg-rose-500/15 text-rose-500",
    invited: "bg-amber-500/15 text-amber-500",
  };

  return (
    <GlassCard className="crystal-in p-5">
      <SectionTitle
        title="Users"
        desc="All users with login access — manage accounts, roles, profiles & birthdays"
        action={
          <button onClick={() => setLoginOpen(true)} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold">
            <UserPlus className="h-3.5 w-3.5" /> Add user
          </button>
        }
      />

      {users.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <CircleUserRound className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium">No users yet</p>
          <p className="text-xs text-muted-foreground">Create a user to give them login access.</p>
        </div>
      ) : (
        <div className="scroll-liquid max-h-[560px] space-y-2 overflow-y-auto">
          {users.map((u) => {
            const isBirthdayToday = u.birthDate && new Date(u.birthDate).getMonth() === new Date().getMonth() && new Date(u.birthDate).getDate() === new Date().getDate();
            return (
            <div key={u.id} className="crystal-in flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4 transition hover:bg-muted/30">
              {/* Avatar — shows uploaded photo or gender-based avatar */}
              {u.avatar ? (
                <img src={u.avatar} alt={u.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white", u.gender === "female" ? "bg-pink-500" : u.gender === "male" ? "bg-blue-500" : "bg-primary")}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{u.name}</span>
                  {isBirthdayToday && <span title="Birthday today!" className="text-base">🎂</span>}
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", roleBadge[u.role] ?? roleBadge.member)}>{u.role}</span>
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", statusBadge[u.status] ?? statusBadge.active)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", u.status === "active" ? "bg-emerald-500" : u.status === "suspended" ? "bg-rose-500" : "bg-amber-500")} />
                    {u.status}
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {u.email}{u.phone ? ` · ${u.phone}` : ""}{u.department ? ` · ${u.department}` : ""}{u.title ? ` · ${u.title}` : ""}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                  {u.gender && <span className="capitalize">{u.gender}</span>}
                  {u.birthDate && <span>{new Date(u.birthDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                  {u.lastActive && <span>Active: {new Date(u.lastActive).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Actions">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditUser({ ...u }); setEditOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  {u.status === "active" ? (
                    <DropdownMenuItem onClick={() => suspendUser(u.id, u.name)}>
                      <Ban className="h-3.5 w-3.5" /> Suspend
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => reactivateUser(u.id, u.name)}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => removeUser(u.id, u.name)} className="text-rose-500 focus:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            );
          })}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[var(--gold)]" /> Add User
            </DialogTitle>
            <DialogDescription>
              Create a user account with login access. They sign in at /login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Full name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" className="mt-1.5" /></div>
            <div><Label className="text-xs">Email (login) *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" className="mt-1.5" /></div>
            <div><Label className="text-xs">Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="mt-1.5" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={form.gender || "__none__"} onValueChange={(v) => setForm({ ...form, gender: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Birth date</Label><Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div><Label className="text-xs">Department / Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." className="mt-1.5" /></div>

            {/* Customer / Tenant selector — links user to a customer's database */}
            {customerList && customerList.length > 0 && (
              <div>
                <Label className="text-xs">Link to Customer (Tenant)</Label>
                <Select value={form.customerId || "__none__"} onValueChange={(v) => setForm({ ...form, customerId: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No customer (super-admin)</SelectItem>
                    {customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company ?? c.name}{c.database ? ` · ${c.database.dbName}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground">Links the user to the selected customer's tenant database. They will only see that customer's data.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/5 p-3 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
              <span>User can sign in at <code className="font-mono text-foreground">/login</code> with these credentials. Gender determines the avatar color. Birth date triggers birthday notifications.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoginOpen(false)}>Cancel</Button>
            <button onClick={createLogin} disabled={busy} className="liquid-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {busy ? "Creating…" : "Create user"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditUser(null); } }}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit User
            </DialogTitle>
            <DialogDescription>Update user details, role, and profile information.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div><Label className="text-xs">Full name</Label><Input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} className="mt-1.5" /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} className="mt-1.5" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={editUser.phone ?? ""} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Gender</Label>
                  <Select value={editUser.gender || "__none__"} onValueChange={(v) => setEditUser({ ...editUser, gender: v === "__none__" ? null : v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Birth date</Label><Input type="date" value={editUser.birthDate ? editUser.birthDate.slice(0, 10) : ""} onChange={(e) => setEditUser({ ...editUser, birthDate: e.target.value })} className="mt-1.5" /></div>
              </div>
              <div><Label className="text-xs">Title</Label><Input value={editUser.title ?? ""} onChange={(e) => setEditUser({ ...editUser, title: e.target.value })} className="mt-1.5" /></div>
              <div><Label className="text-xs">Department</Label><Input value={editUser.department ?? ""} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })} className="mt-1.5" /></div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={editUser.role} onValueChange={(v) => setEditUser({ ...editUser, role: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditOpen(false); setEditUser(null); }}>Cancel</Button>
            <button onClick={saveEdit} disabled={busy} className="liquid-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {busy ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

export function OwnerView() {
  const { ownerTab, setOwnerTab } = useNav();
  // Default to "customers" on first load (also enforced by the store initializer).
  const tab = ownerTab || "customers";
  const { data: customers } = useApi<Customer[]>("/api/customers");
  // One overview fetch in the shell drives the NavCard count badges + the
  // sidebar metrics strip. Sub-tabs keep their own fetches (untouched).
  const { data: overview } = useApi<FinanceOverview>("/api/finance/overview");
  const customerList = customers ?? [];

  return (
    <div className="space-y-4">
      {/* Mobile: nav collapses to a Select dropdown */}
      <MobileNavSelect active={tab} onChange={setOwnerTab} overview={overview} />

      {/* Desktop: 2-col drill-down (sticky 280px nav sidebar + focused detail) */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <OwnerNavSidebar active={tab} onChange={setOwnerTab} overview={overview} />
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {tab === "customers" && <CustomersTab />}
          {tab === "subscriptions" && <SubscriptionsTab customers={customerList} />}
          {tab === "invoices" && <InvoicesTab customers={customerList} />}
          {tab === "quotations" && <QuotationsTab customers={customerList} />}
          {tab === "keys" && <SerialKeysTab customers={customerList} />}
          {tab === "devices" && <DevicesTab />}
          {tab === "apikeys" && <ApiKeysTab />}
          {tab === "bank" && <BankAccountsTab />}
          {tab === "users" && <ClientUsersTab />}
          {tab === "overview" && <OverviewTab />}
          {tab === "finance" && <FinanceTab />}
          {tab === "reports" && <ReportsTab />}
        </main>
      </div>
    </div>
  );
}
