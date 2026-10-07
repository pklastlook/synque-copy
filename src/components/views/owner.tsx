"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
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
  Activity,
  Play,
  Pause,
  RefreshCw,
  HardDrive,
  Search,
  History,
  Download,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { MetricRow, SectionHeader } from "@/components/glass/dense-ui";
import { NameAvatar } from "@/components/glass/name-avatar";
import { ModuleAccessSelector } from "@/components/glass/module-access-selector";
import { describePermissions, isAllModules, defaultPermissionsForRole } from "@/lib/module-permissions";
import { getReportSettings } from "@/components/views/settings";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  database: { id: string; dbName: string; status: string; createdAt: string } | null;
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
  discountType: string | null; // "percentage" | "fixed" | null
  discountValue: number | null; // percentage or fixed amount
  discountAmount: number; // computed discount amount
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
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number;
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

/** Invoice-specific status badge — uses a stricter palette than the generic
 *  StatusPill so the owner can quickly scan a long invoice list:
 *    draft   → gray
 *    sent    → blue
 *    paid    → green
 *    overdue → red
 *  The mapping is deliberately distinct from `statusTone` so it doesn't
 *  bleed into other tabs (subscriptions, quotations, etc.). */
function invoiceStatusTone(status: Invoice["status"]) {
  switch (status) {
    case "draft":
      return {
        className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
        dot: "bg-zinc-500",
      };
    case "sent":
      return {
        className: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
        dot: "bg-sky-500",
      };
    case "paid":
      return {
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "overdue":
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

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  const tone = invoiceStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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

/** Tone for an AuditLog action — drives the colored dot in the activity feed
 *  and Activity Log tab. Critical actions (deletion, role change, 2FA disable)
 *  are surfaced as red/amber; informational ones (login, view) as neutral. */
function auditActionTone(action: string): { dot: string; label: string; className: string } {
  if (action.includes("deleted") || action.includes("disable") || action.includes("revoked") || action.includes("suspended")) {
    return { dot: "oklch(0.65 0.22 25)", label: "critical", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400" };
  }
  if (action.includes("role") || action.includes("password") || action.includes("2fa") || action.includes("schema_pushed") || action.includes("status_changed")) {
    return { dot: "oklch(0.72 0.18 75)", label: "warning", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  }
  if (action.includes("login") || action.includes("provisioned") || action.includes("created")) {
    return { dot: "oklch(0.7 0.2 145)", label: "info", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
  }
  return { dot: "oklch(0.62 0.2 255)", label: "neutral", className: "bg-muted text-muted-foreground" };
}

/** Pretty-print an AuditLog action string — splits "user.login" → "Login",
 *  "tenant_database.status_changed" → "Status changed", etc. */
function prettyAction(action: string): string {
  const last = action.split(".").pop() ?? action;
  return last
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
// Mobile nav dropdown — surfaces Owner sub-sections when the main app-sidebar
// is hidden on small screens. On lg+ the app-sidebar's Owner sub-items take
// over.
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
  { id: "customers",     label: "Clients",        icon: Users,           accent: "oklch(0.55 0.2 255)",  desc: "Client records & plans",  countKey: "customers" },
  { id: "subscriptions", label: "Subscriptions",  icon: CreditCard,      accent: "oklch(0.68 0.22 145)", desc: "Active & trial plans",  countKey: "subscriptions" },
  { id: "invoices",      label: "Invoices",       icon: FileText,        accent: "oklch(0.72 0.18 75)",  desc: "Bill clients",           countKey: "invoices" },
  { id: "quotations",    label: "Quotations",     icon: FileSignature,   accent: "oklch(0.7 0.2 25)",    desc: "Proposals & quotes",    countKey: "quotations" },
  { id: "devices",       label: "Devices",         icon: Smartphone,      accent: "oklch(0.62 0.22 300)", desc: "Registered devices",    countKey: "devices" },
  { id: "apikeys",       label: "API Keys",        icon: Lock,            accent: "oklch(0.72 0.18 75)",  desc: "Integration keys",      countKey: "apiKeys" },
  { id: "bank",          label: "Bank Accounts",   icon: Landmark,        accent: "oklch(0.68 0.22 145)", desc: "Accounts for invoices", countKey: "bankAccounts" },
  { id: "users",         label: "Client Users",    icon: CircleUserRound, accent: "oklch(0.62 0.22 300)", desc: "Login accounts",        countKey: "users" },
  { id: "databases",     label: "Databases",       icon: Database,        accent: "oklch(0.62 0.22 300)", desc: "Tenant DB registry",    countKey: "tenantDatabases" },
  { id: "activity",      label: "Activity Log",    icon: Activity,        accent: "oklch(0.7 0.2 25)",    desc: "Security events",       countKey: "activityLogs" },
  { id: "overview",      label: "Overview",        icon: Briefcase,       accent: "oklch(0.72 0.18 75)",  desc: "Enterprise cockpit" },
  { id: "finance",       label: "Finance",          icon: DollarSign,      accent: "oklch(0.55 0.2 255)",  desc: "Revenue & MRR" },
  { id: "reports",       label: "Reports",          icon: BarChart3,       accent: "oklch(0.7 0.2 25)",    desc: "Growth & activity" },
];

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
// Report settings helpers — mirrors the pattern in custom-report.tsx so the
// owner panel's print layouts honour the same Report Settings as the
// social-media reports (accent color, logo, margins, table style, etc.).
// ============================================================================

/** Read company info from localStorage — set by Settings → Company section. */
function getCompany() {
  if (typeof window === "undefined") {
    return { name: "", logo: null, address: "", city: "", country: "", phone: "", website: "" };
  }
  try {
    const stored = JSON.parse(localStorage.getItem("socialflow-company") ?? "{}");
    return {
      name: stored.companyName ?? "",
      logo: stored.companyLogo ?? null,
      address: stored.address ?? "",
      city: stored.city ?? "",
      country: stored.country ?? "",
      phone: stored.phone ?? "",
      website: stored.website ?? "",
    };
  } catch {
    return { name: "", logo: null, address: "", city: "", country: "", phone: "", website: "" };
  }
}

/** Build the dynamic CSS for a print layout — accent color, page size,
 *  margins, table style, watermark — driven by the persisted ReportSettings. */
function buildReportPrintCss(opts: {
  accent: string;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  paperSize: string;
  orientation: string;
  tableStyle: string;
  showWatermark: boolean;
  watermarkText: string;
  scopeClass?: string;
}): string {
  const scope = opts.scopeClass ?? ".print-area";
  const pageSize =
    opts.paperSize === "a4"
      ? "A4"
      : opts.paperSize === "legal"
        ? "legal"
        : "letter";
  const orientation = opts.orientation === "landscape" ? "landscape" : "portrait";
  let css = `
@page { size: ${pageSize} ${orientation}; margin: 0; }
${scope} {
  padding: ${opts.marginTop}mm ${opts.marginRight}mm ${opts.marginBottom}mm ${opts.marginLeft}mm !important;
  --report-accent: ${opts.accent};
}
${scope} .report-accent-bar,
${scope} .report-accent-rule {
  background: ${opts.accent} !important;
}
${scope} .report-accent-text {
  color: ${opts.accent} !important;
}
${scope} .report-accent-border {
  border-color: ${opts.accent} !important;
}`;
  // Table styles: striped (default), bordered, minimal.
  if (opts.tableStyle === "bordered") {
    css += `
${scope} .report-table tbody td { border-bottom: 1px solid #d4d4d8 !important; }
${scope} .report-table tbody tr:nth-child(even) td { background: transparent !important; }`;
  } else if (opts.tableStyle === "minimal") {
    css += `
${scope} .report-table tbody td { border-bottom: 0 !important; }
${scope} .report-table tbody tr:nth-child(even) td { background: transparent !important; }
${scope} .report-table thead th { border-bottom: 1px solid #71717a !important; }`;
  } else {
    css += `
${scope} .report-table tbody tr:nth-child(even) td { background: #f4f4f5 !important; }
${scope} .report-table tbody tr:nth-child(odd) td { background: transparent !important; }`;
  }
  // Watermark overlay.
  if (opts.showWatermark && opts.watermarkText) {
    css += `
${scope} { position: relative; }
${scope} .report-watermark {
  position: fixed; inset: 0; z-index: 0;
  display: grid; place-items: center;
  pointer-events: none;
  font-size: 96px; font-weight: 900; letter-spacing: 0.15em;
  color: rgba(0,0,0,0.06);
  transform: rotate(-30deg);
}
${scope} > * { position: relative; z-index: 1; }`;
  }
  return css;
}

/** Return the font-size scale that mirrors ReportSettings.fontSize. */
function reportFontScale(size: string): number {
  return size === "large" ? 1.12 : size === "small" ? 0.88 : 1;
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
// Clients tab
// =============================================================================

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
interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  ip: string | null;
  createdAt: string;
}

interface ChurnRiskCustomer {
  customerId: string;
  customerName: string;
  lastActive: string | null;
  inactiveUsers: number;
}

interface TenantDbRow {
  id: string;
  dbName: string;
  status: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerStatus: string;
  customerPlan: string;
  sizeBytes: number;
  sizeMb: number;
  healthy: boolean;
  createdAt: string;
}

interface FinanceOverview {
  customers: number; invoices: number; paidInvoices: number; quotations: number;
  serialKeys: number; activatedKeys: number; devices: number; apiKeys: number;
  subscriptions: number; activeSubs: number; trialSubs: number; bankAccounts: number;
  users: number; accounts: number; posts: number;
  totalRevenue: number; pendingRevenue: number; overdueRevenue: number; monthlyRevenue: number;
  planDistribution: { name: string; count: number }[];
  // Owner module extras (Overview + Databases + Activity tabs)
  tenantDatabases: number;
  activeDatabases: number;
  suspendedDatabases: number;
  totalStorageMb: number;
  activityLogs: number;
  trialConversionRate: number;
  recentActivity: AuditLogEntry[];
  churnRiskCustomers: ChurnRiskCustomer[];
}

/** Shape returned by /api/finance/analytics — drives the rebuilt Overview,
 *  Reports, and Finance tabs. */
interface FinanceAnalytics {
  monthlyRevenue: { month: string; revenue: number; invoices: number; key: string }[];
  clientGrowth: { month: string; newClients: number; total: number }[];
  planRevenue: { plan: string; revenue: number; count: number }[];
  invoiceBreakdown: { status: string; count: number; total: number }[];
  topClients: { customerId: string; name: string; totalRevenue: number; invoices: number; lastInvoice: string | null }[];
  paymentHistory: { id: string; number: string; customerId: string; customerName: string; total: number; status: string; paidAt: string }[];
  outstanding: { id: string; number: string; customerId: string; customerName: string; total: number; status: string; dueDate: string | null; issueDate: string; daysOverdue: number }[];
  bankAccounts: { id: string; accountName: string; bankName: string; accountNumber: string; currency: string; isDefault: boolean; balance: number }[];
  subscriptionMetrics: {
    mrr: number; arr: number; activeSubs: number; trialSubs: number;
    cancelledSubs: number; totalSubs: number; churnRate: number; trialConversionRate: number;
  };
  totals: {
    customers: number; invoices: number; paidInvoices: number;
    totalRevenue: number; pendingRevenue: number; overdueRevenue: number;
  };
}

function OverviewTab() {
  const { data, loading, reload } = useApi<FinanceOverview>("/api/finance/overview");
  const { data: analytics } = useApi<FinanceAnalytics | null>("/api/finance/analytics");
  const { setOwnerTab } = useNav();
  const [systemStatus, setSystemStatus] = React.useState<{
    database: "operational" | "degraded" | "checking";
    api: "operational" | "degraded" | "checking";
    sessions: number;
  }>({ database: "checking", api: "checking", sessions: 0 });

  // ===== System Status probe — pings /api/finance/overview (which requires
  // a real DB round-trip) and /api/auth/me (which requires a session lookup).
  // If both respond, all three indicators flip to "operational"; if the
  // finance call fails the DB indicator goes red, if the auth call fails
  // the API indicator goes red. Active session count comes from the auth
  // response (when available). Runs once on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
        catch { return null; }
      })();
      try {
        const finRes = await fetch("/api/finance/overview", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const dbState = finRes.ok ? "operational" : "degraded";
        let sessions = 0;
        let apiState: "operational" | "degraded" = "operational";
        try {
          const meRes = await fetch("/api/auth/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (meRes.ok) {
            const me = (await meRes.json()) as { activeSessions?: number };
            sessions = typeof me.activeSessions === "number" ? me.activeSessions : 0;
          } else {
            apiState = "degraded";
          }
        } catch {
          apiState = "degraded";
        }
        if (!cancelled) setSystemStatus({ database: dbState, api: apiState, sessions });
      } catch {
        if (!cancelled) setSystemStatus({ database: "degraded", api: "degraded", sessions: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
  const churnRate = analytics?.subscriptionMetrics?.churnRate ?? 0;
  const mrr = analytics?.subscriptionMetrics?.mrr ?? d.monthlyRevenue ?? 0;
  const arr = analytics?.subscriptionMetrics?.arr ?? (d.monthlyRevenue ?? 0) * 12;
  const trialConv = analytics?.subscriptionMetrics?.trialConversionRate ?? d.trialConversionRate ?? 0;
  const activeClients = analytics?.totals?.customers ?? d.customers;

  return (
    <div className="space-y-4">
      {/* ===== Enterprise KPI strip ===== */}
      <MetricRow metrics={[
        { label: "MRR", value: money(mrr), color: "oklch(0.7 0.2 145)" },
        { label: "ARR", value: money(arr), color: "oklch(0.62 0.2 255)" },
        { label: "Total Revenue", value: money(d.totalRevenue), color: "oklch(0.72 0.18 75)" },
        { label: "Pending", value: money(d.pendingRevenue), color: "oklch(0.82 0.14 85)" },
        { label: "Overdue", value: money(d.overdueRevenue), color: "oklch(0.55 0.22 25)" },
      ]} />

      <MetricRow metrics={[
        { label: "Clients", value: activeClients, color: "oklch(0.62 0.2 255)" },
        { label: "Active Subs", value: d.activeSubs ?? 0, color: "oklch(0.7 0.2 145)" },
        { label: "Trial Subs", value: d.trialSubs ?? 0, color: "oklch(0.82 0.14 85)" },
        { label: "Trial → Paid", value: `${trialConv}%`, color: "oklch(0.68 0.22 145)" },
        { label: "Churn Rate", value: `${churnRate}%`, color: "oklch(0.55 0.22 25)" },
      ]} />

      {/* ===== Quick Actions row — owner can jump straight to common tasks ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setOwnerTab("customers")}
          className="crystal-in group flex items-center gap-3 rounded-2xl border border-border/40 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:shadow-md"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Add Client</div>
            <div className="truncate text-[11px] text-muted-foreground">Register a new tenant + DB</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={() => setOwnerTab("finance")}
          className="crystal-in group flex items-center gap-3 rounded-2xl border border-border/40 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:shadow-md"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Generate Invoices</div>
            <div className="truncate text-[11px] text-muted-foreground">Bill all active subscriptions</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={() => setOwnerTab("reports")}
          className="crystal-in group flex items-center gap-3 rounded-2xl border border-border/40 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:shadow-md"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[oklch(0.72_0.18_75)]/15 text-[oklch(0.6_0.16_55)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">View Reports</div>
            <div className="truncate text-[11px] text-muted-foreground">Revenue, plans, top clients</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={() => setOwnerTab("subscriptions")}
          className="crystal-in group flex items-center gap-3 rounded-2xl border border-border/40 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:shadow-md"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[oklch(0.72_0.22_300)]/15 text-[oklch(0.55_0.2_300)] dark:text-[oklch(0.78_0.18_300)]">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Manage Plans</div>
            <div className="truncate text-[11px] text-muted-foreground">Subscriptions &amp; trials</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* ===== Charts: revenue trend + client growth ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionHeader title="Revenue trend" desc="Monthly revenue, last 12 months" icon={TrendingUp} />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
            <div className="h-[240px]">
              {analytics && analytics.monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyRevenue} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ovRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.7 0.2 145)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.7 0.2 145)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tickFormatter={(v) => `$${fmt(v)}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="oklch(0.7 0.2 145)" strokeWidth={2.5} fill="url(#ovRev)" isAnimationActive animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">No revenue data yet</div>
              )}
            </div>
          </div>
        </section>

        <section>
          <SectionHeader title="Client growth" desc="Cumulative clients per month" icon={Users} />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
            <div className="h-[240px]">
              {analytics && analytics.clientGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.clientGrowth} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="total" name="Total clients" fill="oklch(0.62 0.2 255)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">No client data yet</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ===== Module overview grid ===== */}
      <section>
        <SectionHeader title="Module overview" desc="All sub-modules at a glance" icon={Briefcase} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Invoices", value: d.invoices, sub: `${d.paidInvoices} paid · ${collectionRate}% collected`, icon: FileText, color: "oklch(0.62 0.2 255)" },
            { label: "Quotations", value: d.quotations, sub: "Pending proposals", icon: FileSignature, color: "oklch(0.68 0.18 145)" },
            { label: "Subscriptions", value: d.subscriptions, sub: `${d.activeSubs} active · ${d.trialSubs} trial`, icon: CreditCard, color: "oklch(0.7 0.2 75)" },
            { label: "Devices", value: d.devices, sub: "Registered", icon: Smartphone, color: "oklch(0.6 0.2 220)" },
            { label: "API Keys", value: d.apiKeys, sub: "Active integrations", icon: Lock, color: "oklch(0.55 0.22 25)" },
            { label: "Bank Accounts", value: d.bankAccounts, sub: "Connected", icon: Landmark, color: "oklch(0.6 0.15 200)" },
            { label: "Tenant DBs", value: d.tenantDatabases ?? 0, sub: `${d.activeDatabases ?? 0} active`, icon: Database, color: "oklch(0.62 0.22 300)" },
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
      </section>

      {/* ===== Owner extras: tenant DB health, recent activity, system health ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tenant database health */}
        <section className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "oklch(0.62 0.22 300)18", color: "oklch(0.62 0.22 300)" }}>
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Tenant databases</h3>
              <p className="text-[11px] text-muted-foreground">Dedicated Neon DBs per client</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Total</div>
              <div className="num-display text-lg font-bold tabular-nums">{d.tenantDatabases ?? 0}</div>
            </div>
            <div className="rounded-lg bg-emerald-500/5 px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Active</div>
              <div className="num-display text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{d.activeDatabases ?? 0}</div>
            </div>
            <div className="rounded-lg bg-rose-500/5 px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Suspended</div>
              <div className="num-display text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">{d.suspendedDatabases ?? 0}</div>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Storage</div>
              <div className="num-display text-lg font-bold tabular-nums">{fmt(d.totalStorageMb ?? 0)} MB</div>
            </div>
          </div>
          {/* System health: live status pills — driven by the systemStatus
              probe in OverviewTab. Database + API are pinged on mount;
              active sessions come from /api/auth/me. */}
          <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              System Status
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    systemStatus.database === "operational"
                      ? "bg-emerald-500"
                      : systemStatus.database === "degraded"
                        ? "bg-rose-500"
                        : "bg-amber-500 animate-pulse",
                  )}
                /> Database
              </span>
              <span
                className={cn(
                  "font-semibold capitalize",
                  systemStatus.database === "operational"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : systemStatus.database === "degraded"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400",
                )}
              >
                {systemStatus.database === "checking" ? "Checking…" : systemStatus.database}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    systemStatus.api === "operational"
                      ? "bg-emerald-500"
                      : systemStatus.api === "degraded"
                        ? "bg-rose-500"
                        : "bg-amber-500 animate-pulse",
                  )}
                /> API
              </span>
              <span
                className={cn(
                  "font-semibold capitalize",
                  systemStatus.api === "operational"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : systemStatus.api === "degraded"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400",
                )}
              >
                {systemStatus.api === "checking" ? "Checking…" : systemStatus.api}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    systemStatus.sessions > 0 ? "bg-emerald-500" : "bg-muted-foreground",
                  )}
                /> Active sessions
              </span>
              <span className="font-semibold tabular-nums">
                {systemStatus.sessions}
              </span>
            </div>
          </div>
        </section>

        {/* Recent activity feed (last 10 audit log entries) */}
        <section className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "oklch(0.7 0.2 25)18", color: "oklch(0.7 0.2 25)" }}>
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Recent activity</h3>
                <p className="text-[11px] text-muted-foreground">Last 10 security events</p>
              </div>
            </div>
            <button onClick={() => reload()} className="rounded-lg bg-muted/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          {d.recentActivity && d.recentActivity.length > 0 ? (
            <div className="scroll-liquid max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {d.recentActivity.slice(0, 10).map((log) => {
                const tone = auditActionTone(log.action);
                return (
                  <div key={log.id} className="flex items-start gap-2 rounded-lg bg-background/40 px-2 py-1.5 text-[11px]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone.dot }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono font-semibold">{log.action}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {log.actorName ?? log.actorEmail ?? "system"}
                        {log.ip ? ` · ${log.ip}` : ""}
                        {log.targetType ? ` · ${log.targetType}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid h-32 place-items-center text-[11px] text-muted-foreground">
              No security events logged yet
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ClientsTab() {
  const { data, loading, reload } = useApi<Customer[]>("/api/customers");
  const { setOwnerTab, setOwnerDbFilter } = useNav();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CustomerForm>(EMPTY_CUSTOMER);
  const [busy, setBusy] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginCustomer, setLoginCustomer] = React.useState<Customer | null>(null);
  const [loginForm, setLoginForm] = React.useState({ name: "", email: "", password: "", role: "member" });
  const [loginBusy, setLoginBusy] = React.useState(false);
  // Provisioning state: tracks which customer is currently having a
  // database provisioned (POST /api/tenant-databases). The button shows
  // a spinner and is disabled while the request is in flight.
  const [provisioningId, setProvisioningId] = React.useState<string | null>(null);
  // ===== View Details dialog state — opens when the owner clicks "View
  // details" on a client card. The dialog pulls invoice + subscription +
  // user records on demand (via useEffect) so opening it doesn't slow
  // down the initial ClientsTab render. =====
  const [detailsFor, setDetailsFor] = React.useState<Customer | null>(null);
  const [detailsInvoices, setDetailsInvoices] = React.useState<Invoice[] | null>(null);
  const [detailsSubs, setDetailsSubs] = React.useState<SubscriptionData[] | null>(null);
  const [detailsUsers, setDetailsUsers] = React.useState<ClientUser[] | null>(null);

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
        toast.success("Client updated");
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
          toast.success("Client created");
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
      toast.success("Client deleted");
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

  /** Switch to the Databases tab with this client pre-selected in the
   *  filter — fired by the per-card "View Database" action. */
  const viewDatabase = (c: Customer) => {
    setOwnerDbFilter(c.id);
    setOwnerTab("databases");
  };

  /** Provision a dedicated Neon database for a client that doesn't have
   *  one yet. Mirrors the create-DB flow on the POST /api/customers route
   *  but operates on an existing Customer row. */
  const provisionDatabase = async (c: Customer) => {
    setProvisioningId(c.id);
    try {
      const res = await api("POST", "/api/tenant-databases", { customerId: c.id });
      const json = res as { ok?: boolean; dbName?: string; error?: string };
      if (json.dbName) {
        toast.success("Database provisioned", {
          description: `Database "${json.dbName}" is active. ${c.name}'s users will log into their own DB.`,
          duration: 6000,
        });
      } else {
        toast.success("Database provisioned");
      }
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Provisioning failed");
    } finally {
      setProvisioningId(null);
    }
  };

  /** Trial days remaining for a trial-status client. Trial window is
   *  18 days from customer.createdAt (matches the example "15 days ago →
   *  3 days left"). Returns null when the client is not on trial. */
  const trialDaysLeft = (c: Customer): number | null => {
    if (c.status !== "trial") return null;
    const trialEnd = new Date(c.createdAt).getTime() + 18 * 24 * 60 * 60 * 1000;
    return Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000));
  };

  const openCreateLogin = (c: Customer) => {
    setLoginCustomer(c);
    setLoginForm({ name: c.name, email: c.email, password: "", role: "member" });
    setLoginOpen(true);
  };

  // ===== View Details — opens the client detail dialog and lazy-loads the
  // client's invoices, subscriptions, and users. The fetches are tenant-
  // scoped (the caller's JWT determines what they see). =====
  const openDetails = (c: Customer) => {
    setDetailsFor(c);
    setDetailsInvoices(null);
    setDetailsSubs(null);
    setDetailsUsers(null);
  };

  React.useEffect(() => {
    if (!detailsFor) return;
    let cancelled = false;
    (async () => {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
        catch { return null; }
      })();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const [invRes, subRes, userRes] = await Promise.all([
          fetch("/api/invoices", { headers }),
          fetch("/api/subscriptions", { headers }),
          fetch("/api/team", { headers }),
        ]);
        const allInvoices: Invoice[] = invRes.ok ? await invRes.json() : [];
        const allSubs: SubscriptionData[] = subRes.ok ? await subRes.json() : [];
        const allUsers: ClientUser[] = userRes.ok ? await userRes.json() : [];
        if (cancelled) return;
        setDetailsInvoices(allInvoices.filter((i) => i.customerId === detailsFor.id));
        setDetailsSubs(allSubs.filter((s) => s.customerId === detailsFor.id));
        // Filter users that belong to this client — try customerId field if present,
        // otherwise fall back to matching department/company.
        setDetailsUsers(
          allUsers.filter((u) => {
            const cu = u as ClientUser & { customerId?: string };
            return cu.customerId === detailsFor.id || cu.department === detailsFor.company;
          }),
        );
      } catch {
        if (!cancelled) {
          setDetailsInvoices([]);
          setDetailsSubs([]);
          setDetailsUsers([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [detailsFor]);

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
      <MetricRow metrics={[
        { label: "Total clients", value: stats.total, color: "oklch(0.55 0.2 255)" },
        { label: "Active", value: stats.active, color: "oklch(0.74 0.18 165)" },
        { label: "Trial", value: stats.trial, color: "oklch(0.82 0.14 85)" },
        { label: "Suspended", value: stats.suspended, color: "oklch(0.7 0.2 25)" },
      ]} />

      <section>
        <SectionHeader
          title="Clients"
          desc="Manage client records, plans & license assignments"
          icon={Users}
          action={
            <button
              onClick={openCreate}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Client
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
            <p className="mt-3 text-sm font-medium">No clients yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first client to get started.
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {c.name}
                      </span>
                      <StatusPill status={c.status} />
                      {/* Tenant DB status dot — green = active, amber = suspended, gray = no DB */}
                      {c.database ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                            c.database.status === "active"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                          )}
                          title={`Tenant DB: ${c.database.dbName} (${c.database.status})`}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              c.database.status === "active" ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                          DB
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground"
                          title="No dedicated database — click Provision to create one"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          no DB
                        </span>
                      )}
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
                      <DropdownMenuItem onClick={() => openDetails(c)}>
                        <CircleUserRound className="h-3.5 w-3.5" /> View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openCreateLogin(c)}>
                        <UserPlus className="h-3.5 w-3.5" /> Create login
                      </DropdownMenuItem>
                      {c.database ? (
                        <DropdownMenuItem onClick={() => viewDatabase(c)}>
                          <Database className="h-3.5 w-3.5" /> View database
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => provisionDatabase(c)}>
                          <Database className="h-3.5 w-3.5" /> Provision database
                        </DropdownMenuItem>
                      )}
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

                {/* Trial days remaining banner — only for trial-status clients */}
                {(() => {
                  const daysLeft = trialDaysLeft(c);
                  if (daysLeft === null) return null;
                  return (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px]",
                        daysLeft > 0
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      <span className="font-semibold">
                        {daysLeft > 0
                          ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in trial`
                          : "Trial expired"}
                      </span>
                    </div>
                  );
                })()}

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

                {/* Database status badge + action button — View DB (active) or Provision (none) */}
                {c.database ? (
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px]">
                      <Database className="h-3 w-3 shrink-0 text-emerald-500" />
                      <span className="truncate font-mono font-semibold text-emerald-600 dark:text-emerald-400">{c.database.dbName}</span>
                      <span className="ml-auto shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        {c.database.status}
                      </span>
                    </div>
                    <button
                      onClick={() => viewDatabase(c)}
                      className="shrink-0 rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                      title="Open this database in the Databases tab"
                    >
                      View
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => provisionDatabase(c)}
                    disabled={provisioningId === c.id}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5 text-[10px] font-semibold text-primary transition hover:border-primary hover:bg-primary/10 disabled:opacity-60"
                  >
                    {provisioningId === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {provisioningId === c.id ? "Provisioning…" : "Provision database"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit client" : "Register new client"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update client profile & plan."
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

            {/* Database creation toggle — only on new client, not edit */}
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
              Create a user account so this client can sign in at /login. They&apos;ll use their email + the password you set.
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
              <span>The client will sign in at <code className="font-mono text-foreground">/login</code> with these credentials. You can change their role or suspend them anytime.</span>
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

      {/* ===== Client Details Dialog — shows client info, subscription
          status, invoice history, database status, users count, created
          date, plus Edit / Suspend / Delete actions. ===== */}
      <Dialog open={!!detailsFor} onOpenChange={(o) => { if (!o) setDetailsFor(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scroll-liquid">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleUserRound className="h-5 w-5 text-primary" />
              Client details
            </DialogTitle>
            <DialogDescription>
              Full record for {detailsFor?.name} — info, subscription, invoices, users.
            </DialogDescription>
          </DialogHeader>
          {detailsFor && (
            <div className="space-y-4 py-1">
              {/* ===== Client info ===== */}
              <div className="flex items-start gap-3">
                <NameAvatar name={detailsFor.name} className="h-14 w-14 text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">{detailsFor.name}</span>
                    <StatusPill status={detailsFor.status} />
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", planTone(detailsFor.plan))}>
                      {detailsFor.plan} plan
                    </span>
                  </div>
                  <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="truncate"><span className="font-medium text-foreground">Email:</span> {detailsFor.email}</div>
                    <div className="truncate"><span className="font-medium text-foreground">Phone:</span> {detailsFor.phone ?? "—"}</div>
                    <div className="truncate"><span className="font-medium text-foreground">Company:</span> {detailsFor.company ?? "—"}</div>
                    <div className="truncate"><span className="font-medium text-foreground">Address:</span> {detailsFor.address ?? "—"}</div>
                    <div className="truncate"><span className="font-medium text-foreground">City:</span> {detailsFor.city ?? "—"}</div>
                    <div className="truncate"><span className="font-medium text-foreground">Country:</span> {detailsFor.country ?? "—"}</div>
                    <div className="truncate"><span className="font-medium text-foreground">Created:</span> {format(new Date(detailsFor.createdAt), "MMM d, yyyy")}</div>
                    <div className="truncate"><span className="font-medium text-foreground">Invoices:</span> {detailsFor.invoicesCount}</div>
                  </div>
                </div>
              </div>

              {/* ===== Subscription + Database status ===== */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subscription</div>
                  {detailsSubs === null ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                    </div>
                  ) : detailsSubs.length === 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">No subscription on record.</div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {detailsSubs.slice(0, 3).map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <StatusPill status={s.status} />
                            <span className="font-semibold capitalize">{s.plan}</span>
                          </span>
                          <span className="font-semibold tabular-nums">
                            {money(s.totalAmount ?? s.amount, s.currency)}
                          </span>
                        </div>
                      ))}
                      {detailsSubs.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{detailsSubs.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Database</div>
                  {detailsFor.database ? (
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Database className="h-3 w-3 text-emerald-500" />
                        <code className="font-mono text-[11px]">{detailsFor.database.dbName}</code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", detailsFor.database.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                        <span className="capitalize">{detailsFor.database.status}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          Created {format(new Date(detailsFor.database.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">No dedicated database.</div>
                  )}
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground">Users:</span> {detailsUsers?.length ?? 0}
                  </div>
                </div>
              </div>

              {/* ===== Invoice history ===== */}
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Invoice history
                  </div>
                  {detailsInvoices && detailsInvoices.length > 0 && (
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {detailsInvoices.filter((i) => i.status === "paid").length} paid
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {detailsInvoices.filter((i) => i.status === "sent" || i.status === "draft").length} pending
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {detailsInvoices.filter((i) => i.status === "overdue").length} overdue
                      </span>
                    </div>
                  )}
                </div>
                {detailsInvoices === null ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading invoices…
                  </div>
                ) : detailsInvoices.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No invoices yet.
                  </div>
                ) : (
                  <div className="scroll-liquid max-h-48 space-y-1 overflow-y-auto pr-1">
                    {detailsInvoices.slice(0, 20).map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1 text-[11px]">
                        <code className="font-mono font-semibold">{inv.number}</code>
                        <StatusPill status={inv.status} />
                        <span className="ml-auto font-semibold tabular-nums">{money(inv.total)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(inv.issueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {detailsInvoices && detailsInvoices.length > 0 && (
                  <div className="mt-2 border-t border-border/30 pt-2 text-[11px] text-muted-foreground">
                    Total billed: <span className="font-semibold tabular-nums">{money(detailsInvoices.reduce((s, i) => s + i.total, 0))}</span>
                    {" · "}
                    Paid: <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{money(detailsInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0))}</span>
                  </div>
                )}
              </div>

              {/* ===== Users ===== */}
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Users ({detailsUsers?.length ?? 0})
                </div>
                {detailsUsers === null ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading users…
                  </div>
                ) : detailsUsers.length === 0 ? (
                  <div className="py-3 text-center text-xs text-muted-foreground">
                    No users created for this client yet. Use “Create login” to add one.
                  </div>
                ) : (
                  <div className="scroll-liquid max-h-32 space-y-1 overflow-y-auto pr-1">
                    {detailsUsers.slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1 text-[11px]">
                        <NameAvatar name={u.name} className="h-5 w-5 text-[9px]" />
                        <span className="truncate font-medium">{u.name}</span>
                        <span className="truncate text-[10px] text-muted-foreground">{u.email}</span>
                        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold capitalize">{u.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setDetailsFor(null)}>Close</Button>
            {detailsFor && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { const c = detailsFor; setDetailsFor(null); openEdit(c); }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { const c = detailsFor; setDetailsFor(null); setStatus(c, "suspended"); }}
                  className="text-amber-600 dark:text-amber-400"
                >
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { const c = detailsFor; setDetailsFor(null); remove(c); }}
                  className="text-rose-600 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </>
            )}
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
      toast.error("Pick a client first");
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
      <MetricRow metrics={[
        { label: "Total keys", value: stats.total, color: "oklch(0.55 0.2 255)" },
        { label: "Activated", value: stats.activated, color: "oklch(0.74 0.18 165)" },
        { label: "Unused", value: stats.unused, color: "oklch(0.82 0.14 85)" },
        { label: "Revoked", value: stats.revoked, color: "oklch(0.7 0.2 25)" },
      ]} />

      <section>
        <SectionHeader
          title="Serial keys"
          desc="Generate & manage license keys for client devices"
          icon={KeyRound}
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
                      <Users className="h-3.5 w-3.5" /> Assign to client
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
      </section>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign serial key</DialogTitle>
            <DialogDescription>
              Bind this key to a client record. The key will be activated on
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
          <Field label="Client">
            <Select
              value={assignCustomer}
              onValueChange={setAssignCustomer}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No clients available
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
  // Discount — discountType is "percentage" | "fixed" | null (None).
  discountType: string | null;
  discountValue: number; // percentage or fixed amount (0 when none)
}

const EMPTY_DOC: DocForm = {
  customerId: "",
  items: [{ description: "", qty: 1, price: 0, amount: 0 }],
  taxRate: 0,
  dueOrValid: "",
  notes: "",
  discountType: null,
  discountValue: 0,
};

function docTotals(form: DocForm) {
  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);
  let discountAmount = 0;
  if (form.discountType === "percentage") {
    discountAmount = Math.round(subtotal * (form.discountValue || 0)) / 100;
  } else if (form.discountType === "fixed") {
    discountAmount = Math.min(form.discountValue || 0, subtotal);
  }
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const taxAmount = Math.round(taxableBase * form.taxRate) / 100;
  const total = Math.max(subtotal - discountAmount + taxAmount, 0);
  return { subtotal, discountAmount, taxAmount, total };
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
  // ===== Report settings — accent color, logo, margins, table style, footer =====
  const rs = getReportSettings();
  const accent = rs.accentColor;
  const fontScale = reportFontScale(rs.fontSize);
  const company = getCompany();
  const companyName = company.name || "SYNQUE";
  const companyLine = [company.address, company.city, company.country].filter(Boolean).join(", ");
  const contactLine = [company.phone, company.website].filter(Boolean).join(" · ");
  const effectiveFooterText = rs.customFooterText.trim() !== "" ? rs.customFooterText : rs.footerText;

  const title = kind === "invoice" ? "INVOICE" : "QUOTATION";
  const dateLabel = kind === "invoice" ? "Due date" : "Valid until";
  const dateField =
    kind === "invoice"
      ? (doc as Invoice).dueDate
      : (doc as Quotation).validUntil;
  const discountAmount = doc.discountAmount || 0;
  const taxableBase = Math.max(doc.subtotal - discountAmount, 0);

  const printCss = buildReportPrintCss({
    accent,
    marginTop: rs.marginTop,
    marginRight: rs.marginRight,
    marginBottom: rs.marginBottom,
    marginLeft: rs.marginLeft,
    paperSize: rs.paperSize,
    orientation: rs.orientation,
    tableStyle: rs.tableStyle,
    showWatermark: rs.showWatermark,
    watermarkText: rs.watermarkText,
  });

  return (
    <div className="print-area mx-auto max-w-[8.5in] bg-white p-10 text-neutral-900" style={{ fontSize: `calc(12px * ${fontScale})` }}>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
      {rs.showWatermark && rs.watermarkText && (
        <div className="report-watermark" aria-hidden>{rs.watermarkText}</div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between border-b report-accent-border pb-6" style={{ borderColor: accent }}>
        <div>
          <div className="flex items-center gap-2">
            {rs.showCompanyLogo ? (
              company.logo ? (
                <img src={company.logo} alt={companyName} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-lg text-white" style={{ background: accent }}>
                  <Sparkles className="h-5 w-5" />
                </div>
              )
            ) : null}
            <div>
              <div className="text-xl font-bold tracking-tight text-neutral-900">
                {companyName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Orchestrate Your Social.
              </div>
            </div>
          </div>
          {rs.showCompanyAddress && (
            <div className="mt-3 text-[11px] text-neutral-600">
              {company.address || "SYNQUE HQ · 100 Market Street"}
              <br />
              {companyLine || "San Francisco, CA 94105"}
              <br />
              {rs.showCompanyContact
                ? (contactLine || "billing@synque.cloud")
                : null}
            </div>
          )}
        </div>
        <div className="text-right">
          {rs.showReportTitle && (
            <div className="text-3xl font-bold tracking-tight report-accent-text" style={{ color: accent }}>
              {title}
            </div>
          )}
          <div className="mt-1 text-sm font-mono text-neutral-700">
            {doc.number}
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">
            Issued: {format(new Date(doc.issueDate), "MMM d, yyyy")}
            <br />
            {rs.showDateRange && dateField
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
      <table className="report-table w-full border-collapse">
        <thead>
          <tr className="border-b-2 text-left text-[10px] uppercase tracking-wider text-neutral-700" style={{ borderColor: accent }}>
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

      {/* Totals — payment breakdown. Stays with last item across page break.
          Layout follows the standard invoice payment summary:
            Subtotal
            Discount (X%)   −$amt   (only when discount > 0)
            Taxable Base    $amt    (only when discount > 0)
            Tax (X%)        +$amt   (only when tax > 0)
            ═══════════════════════
            Total Receivable  $amt  (bold, larger font)
            ═══════════════════════ */}
      <div className="totals-block mt-4 flex justify-end">
        <div className="w-72 text-[11px]">
          <div className="flex justify-between border-b border-neutral-200 py-1">
            <span className="text-neutral-600">Subtotal</span>
            <span className="tabular-nums">{money(doc.subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between py-1 text-rose-600">
              <span>
                Discount
                {doc.discountType === "percentage" &&
                  ` (${doc.discountValue ?? 0}%)`}
              </span>
              <span className="tabular-nums">−{money(discountAmount)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-neutral-600">Taxable base</span>
              <span className="tabular-nums">{money(taxableBase)}</span>
            </div>
          )}
          {doc.taxAmount > 0 && (
            <div className="flex justify-between py-1 text-emerald-600">
              <span>
                Tax ({doc.taxRate}%)
              </span>
              <span className="tabular-nums">+{money(doc.taxAmount)}</span>
            </div>
          )}
          <div
            className="mt-1 flex items-center justify-between border-t-2 px-1 py-2 text-lg font-bold"
            style={{ borderColor: accent }}
          >
            <span>Total Receivable</span>
            <span className="tabular-nums" style={{ color: accent }}>
              {money(doc.total)}
            </span>
          </div>
        </div>
      </div>

      {doc.notes && (
        <div className="notes-block mt-6 border-t border-neutral-200 pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Notes
          </div>
          <p className="mt-1 whitespace-pre-line text-[11px] text-neutral-700">
            {doc.notes}
          </p>
        </div>
      )}

      {/* Notes & payment terms — kept together on one page */}
      <div className="notes-block mt-6 border-t border-neutral-200 pt-4 text-[11px] text-neutral-600">
        <p>
          {kind === "invoice"
            ? "Payment is due within 15 days of issue date. Late payments may incur a 1.5% monthly fee."
            : "This quotation is valid for 30 days from the issue date. Prices are subject to change after expiration."}
        </p>
        <p className="mt-3 font-semibold text-neutral-900">
          Thank you for your business — {companyName}.
        </p>
      </div>

      {/* Footer — driven by report settings */}
      {rs.showFooter && (
        <div className="notes-block mt-8 border-t pt-4 text-[10px] text-neutral-500" style={{ borderColor: rs.showFooterLine ? "#d4d4d8" : "transparent" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {effectiveFooterText && <div className="font-semibold">{effectiveFooterText}</div>}
              <div>Generated on {format(new Date(), "MMM d, yyyy · HH:mm")}</div>
            </div>
            <div className="text-right">
              <div>{companyName}</div>
              {rs.showPageNumbers && <div className="font-mono">Page 1 of 1</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Invoices tab -----

function InvoicesTab({ customers }: { customers: Customer[] }) {
  const { data: invs, loading, reload } = useApi<Invoice[]>("/api/invoices");
  const { data: banks } = useApi<BankAccount[]>("/api/bank-accounts");
  // Issue OWNER-FIXES #1: fetch all subscriptions so we can auto-fill the
  // invoice items, tax rate, and discount from the selected client's plan.
  const { data: subsData } = useApi<SubscriptionData[]>("/api/subscriptions");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<DocForm>(EMPTY_DOC);
  const [busy, setBusy] = React.useState(false);
  const [printDoc, setPrintDoc] = React.useState<Invoice | null>(null);

  const invoices = invs ?? [];
  const bank = (banks ?? []).find((b) => b.isDefault) ?? (banks ?? [])[0];
  const subscriptions = subsData ?? [];

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

  // Issue OWNER-FIXES #1: when the selected client changes, auto-fill the
  // invoice form with the client's subscription details (line item + tax +
  // discount). If no subscription exists, leave items empty so the owner
  // can enter them manually. We watch `form.customerId` only — running
  // whenever the user picks a different client in the dropdown.
  React.useEffect(() => {
    if (!form.customerId) return;
    const cust = customers.find((c) => c.id === form.customerId);
    if (!cust) return;
    // Find the client's subscription — prefer active, then trial, then any.
    const clientSubs = subscriptions.filter((s) => s.customerId === form.customerId);
    const sub =
      clientSubs.find((s) => s.status === "active") ??
      clientSubs.find((s) => s.status === "trial") ??
      clientSubs[0];

    setForm((f) => {
      const next: DocForm = {
        ...f,
        customerId: form.customerId,
      };
      if (sub) {
        const planLabel = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
        const cycleLabel = sub.billingCycle ? sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1) : "";
        const unit = typeof sub.totalAmount === "number" && Number.isFinite(sub.totalAmount)
          ? sub.totalAmount
          : sub.amount ?? 0;
        const description = cycleLabel
          ? `${planLabel} Plan — ${cycleLabel}`
          : `${planLabel} Plan`;
        next.items = [{
          description,
          qty: 1,
          price: unit,
          amount: unit,
        }];
        next.taxRate = sub.taxRate ?? 0;
        next.discountType = sub.discountType ?? null;
        next.discountValue = sub.discountValue ?? 0;
      }
      return next;
    });
  }, [form.customerId]);

  const submit = async () => {
    if (!form.customerId) {
      toast.error("Pick a client");
      return;
    }
    setBusy(true);
    try {
      const { subtotal, discountAmount, taxAmount, total } = docTotals(form);
      const payload = {
        customerId: form.customerId,
        items: form.items,
        taxRate: form.taxRate,
        dueDate: form.dueOrValid || null,
        notes: form.notes,
        subtotal,
        discountType: form.discountType,
        discountValue: form.discountValue,
        discountAmount,
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

  // Regenerate a draft invoice from the client's current subscription. The
  // backend (`POST /api/invoices/regenerate`) updates the latest draft (or
  // creates a new one) with the subscription's latest amount/discount/tax.
  const regenerate = async (inv: Invoice) => {
    if (!inv.customerId) {
      toast.error("Invoice is not linked to a client");
      return;
    }
    try {
      await api("POST", "/api/invoices/regenerate", { customerId: inv.customerId });
      toast.success("Invoice regenerated with updated subscription details");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  // CSV export — backend streams a CSV file as an attachment. Browser
  // navigation (`window.open`) cannot send the Authorization header, so we
  // append the JWT as a ?token= query param. The middleware + auth-guard
  // both honor this form (see `getUserFromRequest`).
  const exportCsv = () => {
    let token: string | null = null;
    try {
      token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
    } catch {
      token = null;
    }
    if (!token) {
      toast.error("Sign in again to export invoices");
      return;
    }
    window.open(`/api/invoices/export?token=${encodeURIComponent(token)}`, "_blank");
  };

  const totals = docTotals(form);
  // Issue OWNER-FIXES #1: the currently-selected client (used by the
  // "Bill To" preview card so the user sees the auto-filled customer
  // details immediately after picking a client).
  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const selectedSubscription = form.customerId
    ? (subscriptions.filter((s) => s.customerId === form.customerId).find((s) => s.status === "active")
        ?? subscriptions.filter((s) => s.customerId === form.customerId).find((s) => s.status === "trial")
        ?? subscriptions.filter((s) => s.customerId === form.customerId)[0])
    : undefined;

  return (
    <div className="space-y-4">
      <MetricRow metrics={[
        { label: "Total invoices", value: stats.total, color: "oklch(0.55 0.2 255)" },
        { label: "Paid", value: stats.paid, color: "oklch(0.74 0.18 165)" },
        { label: "Pending", value: stats.pending, color: "oklch(0.82 0.14 85)" },
        { label: "Overdue", value: stats.overdue, color: "oklch(0.7 0.2 25)" },
        { label: "Revenue", value: money(stats.revenue), color: "oklch(0.72 0.22 300)" },
      ]} />

      <section>
        <SectionHeader
          title="Invoices"
          desc="Bill clients for plans & services"
          icon={FileText}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
              <button
                onClick={() => {
                  setForm(EMPTY_DOC);
                  setOpen(true);
                }}
                className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" /> Add invoice
              </button>
            </div>
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
          <div className="max-h-[560px] overflow-auto scroll-liquid rounded-2xl border border-border/40">
            <Table className="w-full min-w-[860px]">
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="h-9 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice #</TableHead>
                  <TableHead className="h-9 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client</TableHead>
                  <TableHead className="h-9 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="h-9 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Issue Date</TableHead>
                  <TableHead className="h-9 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                  <TableHead className="h-9 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subtotal</TableHead>
                  <TableHead className="h-9 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Discount</TableHead>
                  <TableHead className="h-9 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tax</TableHead>
                  <TableHead className="h-9 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
                  <TableHead className="h-9 w-10 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="border-border/40 text-[12px] transition hover:border-primary/30 hover:bg-primary/[0.03]"
                  >
                    <TableCell className="px-3 py-2.5">
                      <span className="font-mono text-[11px] font-semibold">
                        {inv.number}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{inv.customerName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {inv.items.length} item{inv.items.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                      {format(new Date(inv.issueDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                      {inv.dueDate
                        ? format(new Date(inv.dueDate), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {money(inv.subtotal)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {inv.discountAmount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          −{money(inv.discountAmount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {inv.taxAmount > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{money(inv.taxAmount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">
                      {money(inv.total)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                            aria-label={`Actions for ${inv.number}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                          <DropdownMenuItem onClick={() => setPrintDoc(inv)}>
                            <Printer className="h-3.5 w-3.5" /> Print / Export PDF
                          </DropdownMenuItem>
                          {inv.status === "draft" && (
                            <DropdownMenuItem onClick={() => regenerate(inv)}>
                              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                            </DropdownMenuItem>
                          )}
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
                            <DropdownMenuItem onClick={() => setStatus(inv, "overdue")}>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

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
              <Field label="Client *">
                <Select
                  value={form.customerId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, customerId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No clients available
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
            {/* Issue OWNER-FIXES #1: "Bill To" preview card — auto-filled from
                the selected client's record. Updates as soon as the client
                dropdown changes (the useEffect above also fills line items,
                tax, and discount from the subscription). */}
            {selectedCustomer && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <CircleUserRound className="h-3 w-3" /> Bill To
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" /> Auto-filled
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div className="col-span-2 text-sm font-semibold">{selectedCustomer.name}</div>
                  {selectedCustomer.email && (
                    <div className="truncate text-muted-foreground">{selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.company && (
                    <div className="truncate text-muted-foreground">{selectedCustomer.company}</div>
                  )}
                  {selectedCustomer.address && (
                    <div className="col-span-2 truncate text-muted-foreground">{selectedCustomer.address}</div>
                  )}
                  <div className="truncate text-muted-foreground">
                    {[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(", ")}
                  </div>
                  {selectedCustomer.phone && (
                    <div className="truncate text-muted-foreground">{selectedCustomer.phone}</div>
                  )}
                </div>
                {selectedSubscription ? (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    Linked subscription:
                    <span className="font-semibold capitalize">{selectedSubscription.plan}</span>
                    {selectedSubscription.billingCycle && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{selectedSubscription.billingCycle}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-semibold tabular-nums">
                      {money(selectedSubscription.totalAmount ?? selectedSubscription.amount)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    No active subscription — line items left empty for manual entry.
                  </div>
                )}
              </div>
            )}
            <Field label="Line items">
              <LineItemsEditor
                items={form.items}
                onChange={(items) => setForm((f) => ({ ...f, items }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount type">
                <Select
                  value={form.discountType ?? "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      discountType: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Discount value"
                hint={
                  form.discountType === "percentage"
                    ? "Percent of subtotal"
                    : form.discountType === "fixed"
                      ? "Flat amount off"
                      : "Pick a discount type first"
                }
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={form.discountType === null}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountValue: Number(e.target.value) || 0,
                    }))
                  }
                />
              </Field>
            </div>
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
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-muted-foreground">
                      Discount
                      {form.discountType === "percentage" &&
                        ` (${form.discountValue}%)`}
                    </span>
                    <span className="tabular-nums">
                      -{money(totals.discountAmount)}
                    </span>
                  </div>
                )}
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
          {/* Print rules now live in globals.css (@media print for .print-area).
              This inline style only handles the on-screen full-page preview
              that appears briefly before window.print() fires. */}
          <style>{`
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
  // Issue OWNER-FIXES #2: fetch all subscriptions so we can auto-fill the
  // quotation items, tax rate, and discount from the client's plan.
  const { data: subsData } = useApi<SubscriptionData[]>("/api/subscriptions");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<DocForm>(EMPTY_DOC);
  const [busy, setBusy] = React.useState(false);
  const [printDoc, setPrintDoc] = React.useState<Quotation | null>(null);

  const quotations = quotes ?? [];
  const bank = (banks ?? []).find((b) => b.isDefault) ?? (banks ?? [])[0];
  const subscriptions = subsData ?? [];

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

  // Issue OWNER-FIXES #2: when the selected client changes, auto-fill the
  // quotation form with the client's subscription details (suggested line
  // item + tax + discount). If no subscription exists, leave items empty so
  // the owner can enter them manually.
  React.useEffect(() => {
    if (!form.customerId) return;
    const cust = customers.find((c) => c.id === form.customerId);
    if (!cust) return;
    const clientSubs = subscriptions.filter((s) => s.customerId === form.customerId);
    const sub =
      clientSubs.find((s) => s.status === "active") ??
      clientSubs.find((s) => s.status === "trial") ??
      clientSubs[0];

    setForm((f) => {
      const next: DocForm = {
        ...f,
        customerId: form.customerId,
      };
      if (sub) {
        const planLabel = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
        const cycleLabel = sub.billingCycle ? sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1) : "";
        const unit = typeof sub.totalAmount === "number" && Number.isFinite(sub.totalAmount)
          ? sub.totalAmount
          : sub.amount ?? 0;
        const description = cycleLabel
          ? `${planLabel} Plan — ${cycleLabel} (suggested)`
          : `${planLabel} Plan (suggested)`;
        next.items = [{
          description,
          qty: 1,
          price: unit,
          amount: unit,
        }];
        next.taxRate = sub.taxRate ?? 0;
        next.discountType = sub.discountType ?? null;
        next.discountValue = sub.discountValue ?? 0;
      }
      return next;
    });
  }, [form.customerId]);

  const submit = async () => {
    if (!form.customerId) {
      toast.error("Pick a client");
      return;
    }
    setBusy(true);
    try {
      const { subtotal, discountAmount, taxAmount, total } = docTotals(form);
      const payload = {
        customerId: form.customerId,
        items: form.items,
        taxRate: form.taxRate,
        validUntil: form.dueOrValid || null,
        notes: form.notes,
        subtotal,
        discountType: form.discountType,
        discountValue: form.discountValue,
        discountAmount,
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

  /** Convert a quotation into a paid-or-draft invoice by POSTing the
   *  quotation's items + totals to /api/invoices. The quotation is then
   *  marked "accepted" (since it was converted) so the workflow reflects
   *  that the proposal was acted upon. */
  const convertToInvoice = async (q: Quotation) => {
    if (!confirm(`Convert quotation ${q.number} into an invoice?`)) return;
    try {
      const res = await api("POST", "/api/invoices", {
        customerId: q.customerId,
        items: q.items,
        taxRate: q.taxRate,
        dueDate: null,
        notes: q.notes ? `${q.notes}\n\n— Converted from quotation ${q.number}` : `Converted from quotation ${q.number}`,
        subtotal: q.subtotal,
        discountType: q.discountType,
        discountValue: q.discountValue,
        discountAmount: q.discountAmount,
        taxAmount: q.taxAmount,
        total: q.total,
      }) as { ok?: boolean; number?: string };
      // Mark the quotation as accepted (so it doesn't appear "open" forever).
      await api("PATCH", `/api/quotations/${q.id}`, { status: "accepted" });
      toast.success(`Invoice ${res.number ?? ""} created`, {
        description: `Quotation ${q.number} → ${q.customerName}. Status set to accepted.`,
      });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to convert");
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
  // Issue OWNER-FIXES #2: the currently-selected client (used by the
  // "Bill To" preview card so the user sees the auto-filled customer
  // details immediately after picking a client).
  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const selectedSubscription = form.customerId
    ? (subscriptions.filter((s) => s.customerId === form.customerId).find((s) => s.status === "active")
        ?? subscriptions.filter((s) => s.customerId === form.customerId).find((s) => s.status === "trial")
        ?? subscriptions.filter((s) => s.customerId === form.customerId)[0])
    : undefined;

  return (
    <div className="space-y-4">
      <MetricRow metrics={[
        { label: "Total quotations", value: stats.total, color: "oklch(0.55 0.2 255)" },
        { label: "Sent", value: stats.sent, color: "oklch(0.82 0.14 85)" },
        { label: "Accepted", value: stats.accepted, color: "oklch(0.74 0.18 165)" },
        { label: "Rejected", value: stats.rejected, color: "oklch(0.7 0.2 25)" },
        { label: "Pipeline value", value: money(stats.value), color: "oklch(0.72 0.22 300)" },
      ]} />

      <section>
        <SectionHeader
          title="Quotations"
          desc="Send proposals to prospective clients"
          icon={FileSignature}
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
                    <DropdownMenuItem onClick={() => convertToInvoice(q)}>
                      <FileText className="h-3.5 w-3.5" /> Convert to invoice
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
                    {q.status === "accepted" && (
                      <DropdownMenuItem
                        onClick={() => setStatus(q, "rejected")}
                      >
                        <Ban className="h-3.5 w-3.5" /> Mark rejected
                      </DropdownMenuItem>
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
      </section>

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
              <Field label="Client *">
                <Select
                  value={form.customerId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, customerId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No clients available
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
            {/* Issue OWNER-FIXES #2: "Bill To" preview card — auto-filled from
                the selected client's record. Updates as soon as the client
                dropdown changes (the useEffect above also fills suggested
                line items, tax, and discount from the subscription). */}
            {selectedCustomer && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <CircleUserRound className="h-3 w-3" /> Bill To
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" /> Auto-filled
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div className="col-span-2 text-sm font-semibold">{selectedCustomer.name}</div>
                  {selectedCustomer.email && (
                    <div className="truncate text-muted-foreground">{selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.company && (
                    <div className="truncate text-muted-foreground">{selectedCustomer.company}</div>
                  )}
                  {selectedCustomer.address && (
                    <div className="col-span-2 truncate text-muted-foreground">{selectedCustomer.address}</div>
                  )}
                  <div className="truncate text-muted-foreground">
                    {[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(", ")}
                  </div>
                  {selectedCustomer.phone && (
                    <div className="truncate text-muted-foreground">{selectedCustomer.phone}</div>
                  )}
                </div>
                {selectedSubscription ? (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    Suggested from subscription:
                    <span className="font-semibold capitalize">{selectedSubscription.plan}</span>
                    {selectedSubscription.billingCycle && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{selectedSubscription.billingCycle}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-semibold tabular-nums">
                      {money(selectedSubscription.totalAmount ?? selectedSubscription.amount)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    No active subscription — line items left empty for manual entry.
                  </div>
                )}
              </div>
            )}
            <Field label="Line items">
              <LineItemsEditor
                items={form.items}
                onChange={(items) => setForm((f) => ({ ...f, items }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount type">
                <Select
                  value={form.discountType ?? "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      discountType: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Discount value"
                hint={
                  form.discountType === "percentage"
                    ? "Percent of subtotal"
                    : form.discountType === "fixed"
                      ? "Flat amount off"
                      : "Pick a discount type first"
                }
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={form.discountType === null}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountValue: Number(e.target.value) || 0,
                    }))
                  }
                />
              </Field>
            </div>
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
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-muted-foreground">
                      Discount
                      {form.discountType === "percentage" &&
                        ` (${form.discountValue}%)`}
                    </span>
                    <span className="tabular-nums">
                      -{money(totals.discountAmount)}
                    </span>
                  </div>
                )}
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
          {/* Print rules now live in globals.css (@media print for .print-area).
              This inline style only handles the on-screen full-page preview
              that appears briefly before window.print() fires. */}
          <style>{`
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
      <section>
        <SectionHeader
          title="Bank accounts"
          desc="Accounts displayed on invoices & quotations"
          icon={Landmark}
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
      </section>

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
                placeholder="SYNQUE LLC"
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
  const { data: analytics } = useApi<FinanceAnalytics | null>("/api/finance/analytics");
  const [range, setRange] = React.useState<"7" | "30" | "90" | "365">("365");
  // Report-type selector — "Financial Summary" (default) drives the existing
  // FinancialReportLayout. The other two types filter the rendered sections
  // + the CSV export scope so the owner can export a focused report.
  const [reportType, setReportType] = React.useState<"financial" | "clients" | "subscriptions">("financial");
  // Issue OWNER-FIXES #4: state for the print-ready report dialog. The
  // hooks are declared BEFORE the loading-state early return so React's
  // rules-of-hooks invariant holds.
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportDoc, setReportDoc] = React.useState<{ range: string; generatedAt: string } | null>(null);

  // Issue OWNER-FIXES #4: when the user clicks "Print" inside the report
  // dialog, we close the dialog and render the print-ready report layout
  // (with `.print-area` class) at the top level. The useEffect then triggers
  // window.print() after the layout has mounted, and clears `reportDoc`
  // after the browser's "afterprint" event fires. This is the same pattern
  // InvoicePrintLayout uses.
  React.useEffect(() => {
    if (!reportDoc) return;
    const t = setTimeout(() => {
      window.print();
    }, 80);
    const onAfter = () => setReportDoc(null);
    window.addEventListener("afterprint", onAfter);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [reportDoc]);

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

  // ===== Date-range filter — applies to invoices + client counts =====
  const rangeMs = Number(range) * 24 * 60 * 60 * 1000;
  const rangeStart = Date.now() - rangeMs;
  const rangeInvoices = invoices.filter((inv) => new Date(inv.issueDate).getTime() >= rangeStart);
  const rangeCustomers = customers.filter((c) => new Date(c.createdAt).getTime() >= rangeStart);

  const paidInvoices = rangeInvoices.filter((i) => i.status === "paid");
  const revenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const pending = rangeInvoices
    .filter((i) => i.status === "sent" || i.status === "draft")
    .reduce((s, i) => s + i.total, 0);
  const overdue = rangeInvoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.total, 0);

  const activationRate =
    keys.length > 0
      ? Math.round(
          (keys.filter((k) => k.status === "activated").length / keys.length) * 100,
        )
      : 0;

  // Subscription metrics from the analytics endpoint (falls back to 0
  // if the analytics fetch hasn't resolved yet).
  const subMetrics = analytics?.subscriptionMetrics;
  const mrr = subMetrics?.mrr ?? 0;
  const arr = subMetrics?.arr ?? 0;
  const churnRate = subMetrics?.churnRate ?? 0;
  const trialConversionRate = subMetrics?.trialConversionRate ?? 0;

  // Plan distribution (from customers — Starter/Growth/Enterprise)
  const planCounts = PLANS.map((p) => ({
    name: p,
    value: customers.filter((c) => c.plan === p).length,
    color: PLAN_COLORS[p],
  })).filter((p) => p.value > 0);

  // Plan distribution from analytics (includes "custom")
  const planDist = analytics?.planRevenue ?? [];
  const planDistColors: Record<string, string> = {
    starter: "oklch(0.74 0.18 165)",
    growth: "oklch(0.72 0.22 300)",
    enterprise: "oklch(0.7 0.2 25)",
    custom: "oklch(0.66 0.18 200)",
  };

  // Invoice status breakdown pie
  const invoiceStatusData = (analytics?.invoiceBreakdown ?? []).map((b) => ({
    name: b.status,
    value: b.count,
    total: b.total,
    color:
      b.status === "paid" ? "oklch(0.7 0.2 145)" :
      b.status === "sent" ? "oklch(0.82 0.14 85)" :
      b.status === "overdue" ? "oklch(0.55 0.22 25)" :
      b.status === "draft" ? "oklch(0.62 0.18 200)" :
      "oklch(0.62 0.2 255)",
  }));

  // Revenue by plan
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

  // ===== CSV export — assemble all financial rows into a CSV blob =====
  const exportCsv = () => {
    const rows: string[][] = [];
    rows.push(["Type", "Number", "Customer", "Status", "Issue Date", "Due Date", "Subtotal", "Discount", "Tax", "Total", "Currency"]);
    for (const inv of invoices) {
      rows.push([
        "Invoice",
        inv.number,
        inv.customerName,
        inv.status,
        new Date(inv.issueDate).toLocaleDateString(),
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
        String(inv.subtotal),
        String(inv.discountAmount),
        String(inv.taxAmount),
        String(inv.total),
        "USD",
      ]);
    }
    // Subscriptions section
    rows.push([]);
    rows.push(["Type", "Customer", "Plan", "Status", "Amount", "Discount", "Tax", "Total", "Cycle", "Start"]);
    for (const c of customers) {
      // Customers are exported as a "Customer" row.
      rows.push(["Customer", c.name, c.plan, c.status, "", "", "", "", "", new Date(c.createdAt).toLocaleDateString()]);
    }
    const csv = rows
      .map((r) => r.map((cell) => {
        const v = String(cell ?? "");
        if (v.includes(",") || v.includes('"') || v.includes("\n")) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      }).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synque-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const rangeOptions: { value: "7" | "30" | "90" | "365"; label: string }[] = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "365", label: "Last 12 months" },
  ];

  // Report-specific computed rows (built from the same data as the charts).
  const rangeLabel = rangeOptions.find((o) => o.value === range)?.label ?? "Custom range";
  const invoiceSummary = [
    { label: "Total", count: rangeInvoices.length, amount: rangeInvoices.reduce((s, i) => s + i.total, 0) },
    { label: "Paid", count: rangeInvoices.filter((i) => i.status === "paid").length, amount: rangeInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0) },
    { label: "Pending", count: rangeInvoices.filter((i) => i.status === "sent" || i.status === "draft").length, amount: rangeInvoices.filter((i) => i.status === "sent" || i.status === "draft").reduce((s, i) => s + i.total, 0) },
    { label: "Overdue", count: rangeInvoices.filter((i) => i.status === "overdue").length, amount: rangeInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0) },
  ];
  const topClients = (analytics?.topClients ?? []).slice(0, 10);
  const totalRevenue = analytics?.totals?.totalRevenue ?? revenue;

  return (
    <div className="space-y-4">
      {/* Header bar with date range filter + report type + export */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
                  range === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-border/40" />
          <Select value={reportType} onValueChange={(v) => setReportType(v as "financial" | "clients" | "subscriptions")}>
            <SelectTrigger className="h-8 w-44 text-[11px] font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financial">Financial Summary</SelectItem>
              <SelectItem value="clients">Client Revenue</SelectItem>
              <SelectItem value="subscriptions">Subscription Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setReportOpen(true)}
            className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" /> Generate Report
          </button>
          <button
            onClick={exportCsv}
            className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Subscription metrics KPI strip */}
      <MetricRow metrics={[
        { label: "MRR", value: money(mrr), color: "oklch(0.7 0.2 145)" },
        { label: "ARR", value: money(arr), color: "oklch(0.62 0.2 255)" },
        { label: "Revenue", value: money(revenue), color: "oklch(0.72 0.18 75)" },
        { label: "Pending", value: money(pending), color: "oklch(0.82 0.14 85)" },
        { label: "Overdue", value: money(overdue), color: "oklch(0.55 0.22 25)" },
        { label: "Churn", value: `${churnRate}%`, color: "oklch(0.7 0.2 25)" },
        { label: "Trial → Paid", value: `${trialConversionRate}%`, color: "oklch(0.68 0.22 145)" },
        { label: "Activation", value: `${activationRate}%`, color: "oklch(0.72 0.22 300)" },
      ]} />

      {/* Revenue trend chart (12 months, from analytics) */}
      <section>
        <SectionHeader
          title="Revenue trend"
          desc="Monthly revenue over the last 12 months"
          icon={TrendingUp}
        />
        <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
          <div className="h-[280px]">
            {analytics && analytics.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyRevenue} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.2 145)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.7 0.2 145)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tickFormatter={(v) => `$${fmt(v)}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number, n) => [n === "revenue" ? `$${v.toLocaleString()}` : v, n === "revenue" ? "Revenue" : "Invoices"]} />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.7 0.2 145)" strokeWidth={2.5} fill="url(#repRev)" isAnimationActive animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">No revenue data yet</div>
            )}
          </div>
        </div>
      </section>

      {/* Client growth (bar) + plan distribution (pie) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Client growth"
            desc={`New clients per month, last 12 months · ${rangeCustomers.length} in range`}
            icon={Users}
          />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
            <div className="h-[260px]">
              {analytics && analytics.clientGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.clientGrowth} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="newClients" name="New clients" fill="oklch(0.62 0.2 255)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">No client data yet</div>
              )}
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Plan distribution"
            desc="Subscriptions by plan"
            icon={CreditCard}
          />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
            <div className="h-[260px]">
              {planDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDist.map((p) => ({ name: p.plan, value: p.count, color: planDistColors[p.plan] ?? "var(--primary)" }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {planDist.map((p) => (
                        <Cell key={p.plan} fill={planDistColors[p.plan] ?? "var(--primary)"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">No plan data yet</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Invoice status pie + revenue by plan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Invoice status"
            desc="Paid vs pending vs overdue"
            icon={FileText}
          />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
            <div className="h-[240px]">
              {invoiceStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {invoiceStatusData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number, _n, p) => [`$${(p?.payload?.total ?? 0).toLocaleString()} (${v} invoices)`, p?.payload?.name ?? ""]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">No invoices yet</div>
              )}
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Revenue by plan"
            desc="Paid invoices grouped by client plan"
            icon={Coins}
          />
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
        </section>
      </div>

      {/* Top clients table */}
      <section>
        <SectionHeader
          title="Top clients"
          desc="Sorted by paid revenue"
          icon={Star}
        />
        <div className="crystal-in overflow-hidden rounded-2xl border border-border/40 bg-muted/10">
          <div className="scroll-liquid max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[11px]">Client</TableHead>
                  <TableHead className="text-right text-[11px]">Invoices</TableHead>
                  <TableHead className="text-right text-[11px]">Revenue</TableHead>
                  <TableHead className="text-right text-[11px]">Last invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analytics?.topClients ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                      No paid invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (analytics?.topClients ?? []).map((c, i) => (
                    <TableRow key={c.customerId} className="border-border/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-right text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                          <NameAvatar name={c.name} className="h-6 w-6 text-[9px]" />
                          <span className="truncate text-xs font-medium">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{c.invoices}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">{money(c.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground">
                        {c.lastInvoice ? format(new Date(c.lastInvoice), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Recent activity feed */}
      <section>
        <SectionHeader title="Recent activity" desc="Latest events across your workspace" icon={Clock} />
        <div className="space-y-1">
          {(() => {
            const activities: { id: string; type: string; label: string; at: string }[] = [
              ...rangeInvoices.slice(0, 6).map((inv) => ({
                id: `inv-${inv.id}`,
                type: inv.status === "paid" ? "invoice_paid" : "invoice_sent",
                label: `${inv.number} · ${inv.customerName} · ${money(inv.total)}`,
                at: inv.createdAt,
              })),
              ...rangeCustomers.slice(0, 6).map((c) => ({
                id: `c-${c.id}`,
                type: "customer_added",
                label: `${c.name} joined · ${c.plan} plan`,
                at: c.createdAt,
              })),
              ...keys
                .filter((k) => k.status === "activated")
                .slice(0, 4)
                .map((k) => ({
                  id: `k-${k.id}`,
                  type: "key_activated",
                  label: `${k.key} activated${k.customerName ? ` · ${k.customerName}` : ""}`,
                  at: k.activatedAt ?? k.createdAt,
                })),
            ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);
            if (activities.length === 0) {
              return <div className="py-8 text-center text-sm text-muted-foreground">No activity in this range</div>;
            }
            return activities.map((a) => {
              const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm">{a.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {format(new Date(a.at), "MMM d, HH:mm")}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Issue OWNER-FIXES #4: Generate Report dialog — print-ready
          financial summary report. */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scroll-liquid">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {reportType === "financial" ? "Financial Summary Report"
                : reportType === "clients" ? "Client Revenue Report"
                : "Subscription Analytics Report"}
            </DialogTitle>
            <DialogDescription>
              Print-ready summary of revenue, clients, and invoices. Click "Print"
              to send to a printer or save as PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/40 bg-white text-neutral-900">
            <FinancialReportLayout
              range={rangeLabel}
              generatedAt={new Date().toISOString()}
              mrr={mrr}
              arr={arr}
              totalRevenue={totalRevenue}
              pending={pending}
              overdue={overdue}
              planRevenue={planRevenue}
              topClients={topClients}
              customers={customers}
              invoiceSummary={invoiceSummary}
              reportKind={reportType}
              invoiceStatusData={(analytics?.invoiceBreakdown ?? []).map((b) => ({
                status: b.status,
                count: b.count,
                total: b.total,
              }))}
            />
          </div>
          <DialogFooter className="flex-wrap">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </Button>
            <Button
              onClick={() => {
                setReportDoc({ range: rangeLabel, generatedAt: new Date().toISOString() });
                setReportOpen(false);
              }}
              className="liquid-pill flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print-only report layout — rendered as a top-level sibling (NOT
          inside the Dialog portal) so the global @media print rules in
          globals.css (which hide body > *:not(.print-area)) keep it visible.
          Same pattern as InvoicePrintLayout uses for invoices. */}
      {reportDoc && (
        <>
          <style>{`
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
          <FinancialReportLayout
            range={reportDoc.range}
            generatedAt={reportDoc.generatedAt}
            mrr={mrr}
            arr={arr}
            totalRevenue={totalRevenue}
            pending={pending}
            overdue={overdue}
            planRevenue={planRevenue}
            topClients={topClients}
            customers={customers}
            invoiceSummary={invoiceSummary}
            reportKind={reportType}
            invoiceStatusData={(analytics?.invoiceBreakdown ?? []).map((b) => ({
              status: b.status,
              count: b.count,
              total: b.total,
            }))}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Issue OWNER-FIXES #4: Financial Summary Report — print-ready layout.
// Rendered inside the "Generate Report" dialog (on-screen preview) and again
// as a top-level sibling when the user clicks Print (so @media print rules
// in globals.css isolate it correctly). Uses the same `.print-area` class
// as InvoicePrintLayout so the existing print CSS applies.
// ============================================================================
interface ReportClientRow {
  customerId: string;
  name: string;
  totalRevenue: number;
  invoices: number;
  lastInvoice: string | null;
}

interface FinancialReportLayoutProps {
  range: string;
  generatedAt: string;
  mrr: number;
  arr: number;
  totalRevenue: number;
  pending: number;
  overdue: number;
  planRevenue: { plan: string; revenue: number; color: string }[];
  topClients: ReportClientRow[];
  customers: Customer[];
  invoiceSummary: { label: string; count: number; amount: number }[];
  invoiceStatusData: { status: string; count: number; total: number }[];
  /** Optional report-type label — drives the visible report title and
   *  which sections get rendered (e.g. "clients" hides the invoice
   *  summary and emphasizes the top clients table). Defaults to the
   *  financial summary. */
  reportKind?: "financial" | "clients" | "subscriptions";
}

function FinancialReportLayout({
  range,
  generatedAt,
  mrr,
  arr,
  totalRevenue,
  pending,
  overdue,
  planRevenue,
  topClients,
  customers,
  invoiceSummary,
  invoiceStatusData,
  reportKind = "financial",
}: FinancialReportLayoutProps) {
  // ===== Report settings — accent color, logo, margins, table style, footer =====
  const rs = getReportSettings();
  const accent = rs.accentColor;
  const fontScale = reportFontScale(rs.fontSize);
  const company = getCompany();
  const companyName = company.name || "SYNQUE";
  const companyLine = [company.address, company.city, company.country].filter(Boolean).join(", ");
  const contactLine = [company.phone, company.website].filter(Boolean).join(" · ");
  const effectiveFooterText = rs.customFooterText.trim() !== "" ? rs.customFooterText : rs.footerText;

  const reportTitle =
    reportKind === "clients"
      ? "Client Revenue Report"
      : reportKind === "subscriptions"
        ? "Subscription Analytics Report"
        : "Financial Summary Report";
  const reportId = `RPT-${new Date(generatedAt).toISOString().slice(0, 10).replace(/-/g, "")}`;
  const totalPlanRevenue = planRevenue.reduce((s, p) => s + p.revenue, 0);
  const totalInvoices = invoiceSummary.reduce((s, i) => s + i.count, 0);
  const totalAmount = invoiceSummary.reduce((s, i) => s + i.amount, 0);
  const activeClients = customers.filter((c) => c.status === "active").length;
  const trialClients = customers.filter((c) => c.status === "trial").length;

  const printCss = buildReportPrintCss({
    accent,
    marginTop: rs.marginTop,
    marginRight: rs.marginRight,
    marginBottom: rs.marginBottom,
    marginLeft: rs.marginLeft,
    paperSize: rs.paperSize,
    orientation: rs.orientation,
    tableStyle: rs.tableStyle,
    showWatermark: rs.showWatermark,
    watermarkText: rs.watermarkText,
  });

  return (
    <div className="print-area mx-auto max-w-[8.5in] bg-white p-10 text-neutral-900" style={{ fontSize: `calc(12px * ${fontScale})` }}>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
      {rs.showWatermark && rs.watermarkText && (
        <div className="report-watermark" aria-hidden>{rs.watermarkText}</div>
      )}
      {/* ===== Header ===== */}
      <div className="flex items-start justify-between border-b report-accent-border pb-6" style={{ borderColor: accent }}>
        <div>
          <div className="flex items-center gap-2">
            {rs.showCompanyLogo ? (
              company.logo ? (
                <img src={company.logo} alt={companyName} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-lg text-white" style={{ background: accent }}>
                  <Sparkles className="h-5 w-5" />
                </div>
              )
            ) : null}
            <div>
              <div className="text-xl font-bold tracking-tight text-neutral-900">
                {companyName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Orchestrate Your Social.
              </div>
            </div>
          </div>
          {rs.showCompanyAddress && (
            <div className="mt-3 text-[11px] text-neutral-600">
              {company.address || "SYNQUE HQ · 100 Market Street"}
              <br />
              {companyLine || "San Francisco, CA 94105"}
              <br />
              {rs.showCompanyContact ? (contactLine || "billing@synque.cloud") : null}
            </div>
          )}
        </div>
        <div className="text-right">
          {rs.showReportTitle && (
            <div className="text-2xl font-bold tracking-tight report-accent-text" style={{ color: accent }}>
              {reportTitle}
            </div>
          )}
          <div className="mt-1 text-sm font-mono text-neutral-700">
            {reportId}
          </div>
          {rs.showDateRange && (
            <div className="mt-2 text-[11px] text-neutral-600">
              Range: {range}
              <br />
              Generated: {format(new Date(generatedAt), "MMM d, yyyy · HH:mm")}
            </div>
          )}
        </div>
      </div>
      {/* Accent rule under the header — visible only in print */}
      <div className="report-accent-bar mt-0 h-1 w-full" style={{ background: accent }} />

      {/* ===== Summary KPIs ===== */}
      {rs.showExecutiveSummary && (
        <div className="py-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Executive Summary
          </div>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {[
              { label: "MRR", value: money(mrr) },
              { label: "ARR", value: money(arr) },
              { label: "Total Revenue", value: money(totalRevenue) },
              { label: "Pending", value: money(pending) },
              { label: "Overdue", value: money(overdue) },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border report-accent-border p-3" style={{ borderColor: `${accent}40` }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {kpi.label}
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums text-neutral-900">
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
          {rs.showKpiStrip && (
            <div className="mt-3 grid grid-cols-4 gap-3 text-[11px] text-neutral-700">
              <div className="rounded-lg bg-neutral-100 px-3 py-2">
                <div className="text-[10px] uppercase text-neutral-500">Total Clients</div>
                <div className="num-display text-base font-bold tabular-nums">{customers.length}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <div className="text-[10px] uppercase text-neutral-500">Active Clients</div>
                <div className="num-display text-base font-bold tabular-nums text-emerald-700">{activeClients}</div>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <div className="text-[10px] uppercase text-neutral-500">Trial Clients</div>
                <div className="num-display text-base font-bold tabular-nums text-amber-700">{trialClients}</div>
              </div>
              <div className="rounded-lg bg-neutral-100 px-3 py-2">
                <div className="text-[10px] uppercase text-neutral-500">Total Invoices</div>
                <div className="num-display text-base font-bold tabular-nums">{totalInvoices}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Revenue by plan table ===== */}
      <div className="notes-block">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Revenue Breakdown by Plan
        </div>
        <table className="report-table mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b-2 report-accent-border text-left text-[10px] uppercase tracking-wider text-neutral-700" style={{ borderColor: accent }}>
              <th className="py-2 pr-2">Plan</th>
              <th className="w-32 py-2 pr-2 text-right">Paid Revenue</th>
              <th className="w-20 py-2 pr-2 text-right">Share</th>
              <th className="w-40 py-2 text-right">Share Bar</th>
            </tr>
          </thead>
          <tbody>
            {planRevenue.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center italic text-neutral-500">
                  No paid revenue recorded yet
                </td>
              </tr>
            )}
            {planRevenue.map((p) => {
              const pct = totalPlanRevenue > 0 ? Math.round((p.revenue / totalPlanRevenue) * 100) : 0;
              return (
                <tr key={p.plan} className="border-b border-neutral-200 align-top text-[11px]">
                  <td className="py-2 pr-2 capitalize font-semibold">{p.plan}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{money(p.revenue)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-neutral-600">{pct}%</td>
                  <td className="py-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: p.color }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {planRevenue.length > 0 && (
              <tr className="border-t-2 report-accent-border text-[11px] font-bold" style={{ borderColor: accent }}>
                <td className="py-2 pr-2">Total</td>
                <td className="py-2 pr-2 text-right tabular-nums">{money(totalPlanRevenue)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">100%</td>
                <td className="py-2" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Top 10 clients table ===== */}
      <div className="notes-block mt-6">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Top 10 Clients by Revenue
        </div>
        <table className="report-table mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b-2 report-accent-border text-left text-[10px] uppercase tracking-wider text-neutral-700" style={{ borderColor: accent }}>
              <th className="w-8 py-2 pr-2 text-right">#</th>
              <th className="py-2 pr-2">Client</th>
              <th className="w-20 py-2 pr-2 text-right">Invoices</th>
              <th className="w-28 py-2 pr-2 text-right">Revenue</th>
              <th className="w-32 py-2 text-right">Last Invoice</th>
            </tr>
          </thead>
          <tbody>
            {topClients.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center italic text-neutral-500">
                  No paid invoices yet
                </td>
              </tr>
            )}
            {topClients.map((c, i) => (
              <tr key={c.customerId} className="border-b border-neutral-200 align-top text-[11px]">
                <td className="py-2 pr-2 text-right tabular-nums font-bold text-neutral-500">{i + 1}</td>
                <td className="py-2 pr-2 font-semibold">
                  {c.name}
                  {(() => {
                    const cust = customers.find((cu) => cu.id === c.customerId);
                    if (!cust) return null;
                    return (
                      <span className="ml-1 text-[10px] font-normal text-neutral-500">
                        ({cust.plan} · {cust.status})
                      </span>
                    );
                  })()}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{c.invoices}</td>
                <td className="py-2 pr-2 text-right tabular-nums font-semibold">{money(c.totalRevenue)}</td>
                <td className="py-2 text-right text-[10px] text-neutral-600">
                  {c.lastInvoice ? format(new Date(c.lastInvoice), "MMM d, yyyy") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Invoice summary table ===== */}
      <div className="notes-block mt-6">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Invoice Summary
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {invoiceSummary.map((row) => (
            <div key={row.label} className="rounded-lg border report-accent-border p-3" style={{ borderColor: `${accent}40` }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                {row.label}
              </div>
              <div className="mt-1 text-base font-bold tabular-nums text-neutral-900">
                {money(row.amount)}
              </div>
              <div className="mt-0.5 text-[10px] text-neutral-600">
                {row.count} invoice{row.count === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>

        {/* Status breakdown table */}
        <table className="report-table mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b-2 report-accent-border text-left text-[10px] uppercase tracking-wider text-neutral-700" style={{ borderColor: accent }}>
              <th className="py-2 pr-2">Status</th>
              <th className="w-20 py-2 pr-2 text-right">Count</th>
              <th className="w-32 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceStatusData.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center italic text-neutral-500">
                  No invoices in this range
                </td>
              </tr>
            )}
            {invoiceStatusData.map((b) => (
              <tr key={b.status} className="border-b border-neutral-200 align-top text-[11px]">
                <td className="py-2 pr-2 capitalize font-semibold">{b.status}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{b.count}</td>
                <td className="py-2 text-right tabular-nums">{money(b.total)}</td>
              </tr>
            ))}
            {invoiceStatusData.length > 0 && (
              <tr className="border-t-2 report-accent-border text-[11px] font-bold" style={{ borderColor: accent }}>
                <td className="py-2 pr-2">Total</td>
                <td className="py-2 pr-2 text-right tabular-nums">{totalInvoices}</td>
                <td className="py-2 text-right tabular-nums">{money(totalAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Footer — driven by report settings (footerText, footerPosition,
          showFooterLine, footerFontSize, showPageNumbers, showFooter) ===== */}
      {rs.showFooter && (
        <div className="notes-block mt-8 border-t pt-4 text-[10px] text-neutral-500" style={{ borderColor: rs.showFooterLine ? "#d4d4d8" : "transparent" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {effectiveFooterText && <div className="font-semibold">{effectiveFooterText}</div>}
              <div>Report generated by {companyName} Owner Panel · {format(new Date(generatedAt), "PPpp")}</div>
              <p className="mt-2">
                This report is auto-generated from the finance module. Figures are derived from the
                invoice + subscription records in the selected date range.
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono">{reportId}</div>
              {rs.showPageNumbers && <div className="font-mono">Page 1 of 1</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Devices Tab
// ============================================================================
interface DeviceData {
  id: string; deviceName: string; fingerprint: string | null; ipAddress: string | null;
  location: string | null; status: string; lastSeen: string | null; createdAt: string;
  serialKey: { key: string; status: string } | null;
  customerId: string | null; customerName: string | null; customerEmail: string | null;
  userName: string | null; userEmail: string | null;
}

/** Single entry in the device activity timeline (returned by
 *  /api/devices/[id]/activity). */
interface DeviceActivityEntry {
  id: string;
  type: "session" | "blocked" | "unblocked" | "revoked" | "registered" | "verified";
  label: string;
  at: string;
  ip: string | null;
  actor: string | null;
}

function DevicesTab() {
  const { data, loading, reload } = useApi<DeviceData[]>("/api/devices");
  const { data: keysData } = useApi<SerialKey[]>("/api/serial-keys");
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ deviceName: "", serialKeyId: "", ipAddress: "", location: "" });
  const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set());
  const [activityFor, setActivityFor] = React.useState<DeviceData | null>(null);
  const [activity, setActivity] = React.useState<DeviceActivityEntry[] | null>(null);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  // Issue OWNER-FIXES #3B: per-device loading state for the active/blocked toggle.
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  if (loading) return <div className="shimmer h-64 rounded-3xl" />;
  const devices = data ?? [];
  const keys = keysData ?? [];
  // Unused serial keys — available for the Register Device dropdown.
  const unusedKeys = keys.filter((k) => k.status === "unused");

  // Auto-detect IP + location (best-effort via a public API; gracefully
  // degrade to empty strings if the network is offline).
  const detectIp = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const j = await res.json();
      setForm((f) => ({
        ...f,
        ipAddress: j.ip ?? f.ipAddress,
        location: [j.city, j.country_name].filter(Boolean).join(", ") || f.location,
      }));
      toast.success("IP + location auto-detected");
    } catch {
      toast.error("Couldn't auto-detect IP — enter manually");
    }
  };

  const add = async () => {
    if (!form.deviceName.trim()) return toast.error("Device name required");
    setBusy(true);
    try {
      await api("POST", "/api/devices", form);
      toast.success("Device registered");
      setForm({ deviceName: "", serialKeyId: "", ipAddress: "", location: "" });
      setAddOpen(false); reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, name: string, status: "active" | "blocked" | "revoked") => {
    setTogglingId(id);
    try {
      await api("PATCH", `/api/devices/${id}`, { status });
      toast.success(`${name} → ${status}`); reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setTogglingId(null);
    }
  };

  /** Issue OWNER-FIXES #3B: Toggle a device between active and blocked.
   *  If the device is revoked, the toggle is disabled (use the Revoke/Restore
   *  button actions instead). */
  const toggleActive = async (d: DeviceData) => {
    const next = d.status === "active" ? "blocked" : "active";
    await setStatus(d.id, d.deviceName, next);
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    await api("DELETE", `/api/devices/${id}`);
    toast.success(`${name} removed`); reload();
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Load the device activity timeline (last 10 sessions/events). */
  const openActivity = async (d: DeviceData) => {
    setActivityFor(d);
    setActivity(null);
    setActivityLoading(true);
    try {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
        catch { return null; }
      })();
      const res = await fetch(`/api/devices/${d.id}/activity`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = (await res.json()) as { activity?: DeviceActivityEntry[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      setActivity(json.activity ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setActivityLoading(false);
    }
  };

  const statusStyle: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    blocked: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    revoked: "bg-muted text-muted-foreground",
  };

  const activityIcon: Record<string, React.ElementType> = {
    session: Wifi,
    blocked: Ban,
    unblocked: CheckCircle2,
    revoked: X,
    registered: Plus,
    verified: ShieldCheck,
  };

  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.status === "active").length,
    blocked: devices.filter((d) => d.status === "blocked").length,
    revoked: devices.filter((d) => d.status === "revoked").length,
  };

  return (
    <section className="space-y-4">
      <SectionHeader title="Device Management" desc="Registered devices, serial keys & access control" icon={Smartphone}
        action={<button onClick={() => setAddOpen(true)} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Register device</button>} />

      <MetricRow metrics={[
        { label: "Total", value: stats.total, color: "oklch(0.62 0.2 255)" },
        { label: "Active", value: stats.active, color: "oklch(0.7 0.2 145)" },
        { label: "Blocked", value: stats.blocked, color: "oklch(0.55 0.22 25)" },
        { label: "Revoked", value: stats.revoked, color: "oklch(0.62 0.18 200)" },
        { label: "Unused Keys", value: unusedKeys.length, color: "oklch(0.72 0.18 75)" },
      ]} />

      {devices.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No devices registered yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => {
            const revealed = revealedKeys.has(d.id);
            const maskedKey = d.serialKey
              ? `${d.serialKey.key.slice(0, 6)}${"•".repeat(Math.max(0, d.serialKey.key.length - 10))}${d.serialKey.key.slice(-4)}`
              : "—";
            return (
              <div key={d.id} className="crystal-in glass rounded-2xl p-4 lift-hover">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Smartphone className="h-5 w-5" /></div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", statusStyle[d.status] ?? statusStyle.active)}>{d.status}</span>
                </div>
                <div className="mt-3 truncate text-sm font-semibold">{d.deviceName}</div>
                <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  {/* Serial key (masked, click to reveal) */}
                  {d.serialKey && (
                    <div className="flex items-center gap-1">
                      <KeyRound className="h-3 w-3 shrink-0" />
                      <code className="truncate font-mono text-[10px]">{revealed ? d.serialKey.key : maskedKey}</code>
                      <button
                        onClick={() => toggleReveal(d.id)}
                        className="ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted"
                        aria-label={revealed ? "Hide serial key" : "Reveal serial key"}
                      >
                        {revealed ? "Hide" : "Show"}
                      </button>
                    </div>
                  )}
                  {d.serialKey?.status && (
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      <span className="capitalize">Key: {d.serialKey.status}</span>
                    </div>
                  )}
                  {d.ipAddress && <div className="flex items-center gap-1"><Globe className="h-3 w-3" /> {d.ipAddress}</div>}
                  {d.location && <div className="flex items-center gap-1"><Wifi className="h-3 w-3" /> {d.location}</div>}
                  {d.customerName && <div className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {d.customerName}</div>}
                  {d.userName && (
                    <div className="flex items-center gap-1">
                      <CircleUserRound className="h-3 w-3" />
                      <span className="truncate">{d.userName}{d.userEmail ? ` · ${d.userEmail}` : ""}</span>
                    </div>
                  )}
                  {d.lastSeen && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last seen {formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true })}
                    </div>
                  )}
                </div>
                {/* Issue OWNER-FIXES #3B: iOS-style toggle for active/blocked.
                    Active = green toggle (on). Blocked = gray toggle (off).
                    Clicking calls PATCH /api/devices/[id] with the new status.
                    A spinner overlays the toggle while the request is in flight. */}
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold leading-tight">
                      {d.status === "active" ? "Active" : d.status === "blocked" ? "Blocked" : "Revoked"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {d.status === "active" ? "Device can connect" : d.status === "blocked" ? "Access denied" : "Permanently revoked"}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={d.status === "active"}
                    aria-label={d.status === "active" ? "Block device" : "Activate device"}
                    disabled={d.status === "revoked" || togglingId === d.id}
                    onClick={() => toggleActive(d)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      d.status === "active"
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/30",
                    )}
                  >
                    {togglingId === d.id ? (
                      <span className="absolute inset-0 grid place-items-center">
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        d.status === "active" ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.status !== "revoked" && (
                    <button onClick={() => setStatus(d.id, d.deviceName, "revoked")} className="flex-1 rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">Revoke</button>
                  )}
                  <button onClick={() => openActivity(d)} className="rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted" aria-label="Activity log">
                    <History className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(d.id, d.deviceName)} className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/20" aria-label="Remove device">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register device dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>Register Device</DialogTitle>
            <DialogDescription>Attach a serial key and track this device's sessions & location.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Device name *">
              <Input value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} placeholder="MacBook Pro · John's iPhone" />
            </Field>
            <Field label="Serial key (optional)" hint={unusedKeys.length === 0 ? "No unused keys available — generate one in the Serial Keys tab first." : `${unusedKeys.length} unused key(s) available`}>
              <Select value={form.serialKeyId} onValueChange={(v) => setForm({ ...form, serialKeyId: v === "_none" ? "" : v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick a serial key" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {unusedKeys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.key}{k.customerName ? ` · ${k.customerName}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="IP address (optional)">
              <Input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="192.168.1.1" />
            </Field>
            <Field label="Location (optional)">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="New York, US" />
            </Field>
            <button onClick={detectIp} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold">
              <Globe className="h-3.5 w-3.5" /> Auto-detect IP & location
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <button onClick={add} disabled={busy} className="liquid-pill rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {busy ? "Registering…" : "Register"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device activity log dialog */}
      <Dialog open={!!activityFor} onOpenChange={(v) => { if (!v) { setActivityFor(null); setActivity(null); } }}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> {activityFor?.deviceName ?? "Device"} — Activity log</DialogTitle>
            <DialogDescription>Last 10 sessions and security events.</DialogDescription>
          </DialogHeader>
          {activityLoading ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="scroll-liquid max-h-80 space-y-2 overflow-y-auto pr-1">
              {activity.map((a, i) => {
                const Icon = activityIcon[a.type] ?? Activity;
                return (
                  <div key={a.id} className="relative flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-2">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-semibold">{a.label}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{format(new Date(a.at), "MMM d, HH:mm")}</span>
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {a.actor ?? "system"}
                        {a.ip ? ` · ${a.ip}` : ""}
                      </div>
                    </div>
                    {i < activity.length - 1 && (
                      <span className="absolute left-[1.4rem] top-9 h-3 w-px bg-border/50" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid h-32 place-items-center text-[11px] text-muted-foreground">
              No activity recorded yet.
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setActivityFor(null); setActivity(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ============================================================================
// Subscriptions Tab
// ============================================================================
interface SubscriptionData {
  id: string; customerId: string; customerName: string; plan: string; status: string;
  amount: number; currency: string; startDate: string; endDate: string | null; trialEnds: string | null;
  discountType: string | null; discountValue: number | null; discountAmount: number | null;
  taxRate: number | null; taxAmount: number | null; totalAmount: number | null;
  billingCycle: string | null; notes: string | null;
}

interface SubscriptionForm {
  customerId: string;
  plan: string;            // starter | growth | enterprise | custom
  amount: number;
  currency: string;
  status: string;          // trial | active | cancelled | expired
  billingCycle: string;    // monthly | quarterly | yearly
  startDate: string;
  endDate: string;
  trialEnds: string;
  discountType: string | null; // "percentage" | "fixed" | null
  discountValue: number;
  taxRate: number;
  notes: string;
}

const SUB_PLAN_AMOUNTS: Record<string, number> = {
  starter: 299,
  growth: 499,
  enterprise: 0,
  custom: 0,
};

const EMPTY_SUB_FORM: SubscriptionForm = {
  customerId: "",
  plan: "growth",
  amount: SUB_PLAN_AMOUNTS.growth,
  currency: "USD",
  status: "trial",
  billingCycle: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  trialEnds: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10),
  discountType: null,
  discountValue: 0,
  taxRate: 0,
  notes: "",
};

function computeSubTotals(form: SubscriptionForm) {
  const amount = Number.isFinite(form.amount) ? form.amount : 0;
  let discountAmount = 0;
  if (form.discountType === "percentage") {
    discountAmount = Math.round(amount * (form.discountValue || 0)) / 100;
  } else if (form.discountType === "fixed") {
    discountAmount = Math.min(form.discountValue || 0, amount);
  }
  const taxableBase = Math.max(amount - discountAmount, 0);
  const taxAmount = Math.round(taxableBase * (form.taxRate || 0)) / 100;
  const totalAmount = Math.max(amount - discountAmount + taxAmount, 0);
  return { discountAmount, taxableBase, taxAmount, totalAmount };
}

function SubscriptionsTab({ customers }: { customers: Customer[] }) {
  const { data, loading, reload } = useApi<SubscriptionData[]>("/api/subscriptions");
  // Payment-status probe: fetch all invoices so we can show a "Payment
  // Status" badge on each subscription card. Current-period invoices
  // generated for the subscription carry a `subscription:<id>` fingerprint
  // in their notes; older invoices fall back to "any invoice for this
  // client" so the badge still reflects reality for legacy data.
  const { data: invoicesData } = useApi<Invoice[]>("/api/invoices");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<SubscriptionForm>(EMPTY_SUB_FORM);
  const [busy, setBusy] = React.useState(false);
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);

  if (loading) return <div className="shimmer h-64 rounded-3xl" />;
  const subs = data ?? [];
  const allInvoices = invoicesData ?? [];

  /** Payment status for the current billing period of a subscription:
   *  paid / pending / overdue / none. */
  const paymentStatusFor = (s: SubscriptionData): "paid" | "pending" | "overdue" | "none" => {
    // Prefer invoices that explicitly link to this subscription (newer
    // ones carry `subscription:<id>` in notes); fall back to ANY invoice
    // for the same client as a proxy (covers legacy + manually-created
    // invoices).
    const linked = allInvoices.filter(
      (i) => i.customerId === s.customerId && (i.notes ?? "").includes(`subscription:${s.id}`),
    );
    const pool = linked.length > 0 ? linked : allInvoices.filter((i) => i.customerId === s.customerId);
    if (pool.some((i) => i.status === "overdue")) return "overdue";
    if (pool.some((i) => i.status === "paid")) return "paid";
    if (pool.some((i) => i.status === "sent" || i.status === "draft")) return "pending";
    return "none";
  };


  // ===== Aggregate metrics for the lifecycle strip =====
  const stats = {
    total: subs.length,
    trial: subs.filter((s) => s.status === "trial").length,
    active: subs.filter((s) => s.status === "active").length,
    cancelled: subs.filter((s) => s.status === "cancelled").length,
    expired: subs.filter((s) => s.status === "expired").length,
  };
  const trialConversionRate = stats.trial + stats.active > 0
    ? Math.round((stats.active / (stats.trial + stats.active)) * 100)
    : 0;
  const mrr = subs.filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.amount, 0);

  const openCreate = () => {
    setForm(EMPTY_SUB_FORM);
    setEditId(null);
    setAddOpen(true);
  };

  const openEdit = (s: SubscriptionData) => {
    setForm({
      customerId: s.customerId,
      plan: s.plan,
      amount: s.amount,
      currency: s.currency,
      status: s.status,
      billingCycle: s.billingCycle ?? "monthly",
      startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : "",
      endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      trialEnds: s.trialEnds ? new Date(s.trialEnds).toISOString().slice(0, 10) : "",
      discountType: s.discountType ?? null,
      discountValue: s.discountValue ?? 0,
      taxRate: s.taxRate ?? 0,
      notes: s.notes ?? "",
    });
    setEditId(s.id);
    setEditOpen(true);
  };

  const submit = async (isNew: boolean) => {
    if (!form.customerId) return toast.error("Select a client");
    setBusy(true);
    try {
      const totals = computeSubTotals(form);
      const payload = {
        customerId: form.customerId,
        plan: form.plan,
        amount: form.amount,
        currency: form.currency,
        status: form.status,
        billingCycle: form.billingCycle || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        trialEnds: form.trialEnds ? new Date(form.trialEnds).toISOString() : null,
        discountType: form.discountType,
        discountValue: form.discountValue,
        taxRate: form.taxRate,
        notes: form.notes || null,
      };
      if (isNew) {
        const res = await api("POST", "/api/subscriptions", payload) as { ok?: boolean; id?: string };
        toast.success("Subscription created");
        // Auto-generate the first invoice when the subscription starts active
        // (trial subs will auto-generate once they convert to active).
        if (res.id && form.status === "active") {
          try {
            await api("POST", `/api/subscriptions/${res.id}/generate-invoice`);
            toast.success("First invoice auto-generated", {
              description: "An invoice for the current billing period was created.",
            });
          } catch (e) {
            // Best-effort — the subscription was created even if the invoice failed.
            console.warn("[subscriptions] auto-invoice failed:", e);
          }
        }
        setAddOpen(false);
      } else if (editId) {
        const before = subs.find((s) => s.id === editId);
        const wasTrial = before?.status === "trial";
        const nowActive = form.status === "active";
        await api("PATCH", `/api/subscriptions/${editId}`, payload);
        toast.success("Subscription updated");
        // Auto-generate the first REAL invoice when a trial converts to active.
        if (wasTrial && nowActive) {
          try {
            const r = await api("POST", `/api/subscriptions/${editId}/generate-invoice`) as { ok?: boolean; number?: string; duplicate?: boolean };
            if (r.duplicate) {
              toast("Invoice already exists for this period", { description: "Skipped auto-generation." });
            } else if (r.number) {
              toast.success(`Invoice ${r.number} auto-generated`, {
                description: "Trial → Active conversion triggered billing.",
              });
            }
          } catch (e) {
            console.warn("[subscriptions] trial-conversion invoice failed:", e);
          }
        }
        setEditOpen(false);
      }
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this subscription?")) return;
    await api("PATCH", `/api/subscriptions/${id}`, { status: "cancelled" });
    toast.success("Subscription cancelled"); reload();
  };

  /** Generate an invoice for the subscription's current billing period.
   *  Calls the new /api/subscriptions/[id]/generate-invoice route. */
  const generateInvoice = async (s: SubscriptionData) => {
    setGeneratingId(s.id);
    try {
      const res = await api("POST", `/api/subscriptions/${s.id}/generate-invoice`) as {
        ok?: boolean; id?: string; number?: string; total?: number; duplicate?: boolean;
      };
      if (res.duplicate) {
        toast("Invoice already exists", {
          description: `A billing-period invoice already exists for ${s.customerName}.`,
        });
      } else if (res.number) {
        toast.success(`Invoice ${res.number} generated`, {
          description: `${s.customerName} · ${money(res.total ?? 0, s.currency)}`,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate invoice");
    } finally {
      setGeneratingId(null);
    }
  };

  const statusStyle: Record<string, string> = {
    trial: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    cancelled: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    expired: "bg-muted text-muted-foreground",
  };

  const planStyle: Record<string, string> = {
    starter: "bg-muted text-muted-foreground",
    growth: "bg-[oklch(0.74_0.18_165)]/15 text-[oklch(0.55_0.18_165)] dark:text-[oklch(0.78_0.16_165)]",
    enterprise: "bg-[oklch(0.72_0.22_300)]/15 text-[oklch(0.55_0.2_300)] dark:text-[oklch(0.78_0.18_300)]",
    custom: "bg-[oklch(0.7_0.2_25)]/15 text-[oklch(0.55_0.22_25)] dark:text-[oklch(0.78_0.18_25)]",
  };

  /** Compute the next billing date from startDate + cycle. */
  const nextBillingDate = (s: SubscriptionData): Date | null => {
    if (!s.startDate) return null;
    const start = new Date(s.startDate);
    const cycleDays = s.billingCycle === "quarterly" ? 90 : s.billingCycle === "yearly" ? 365 : 30;
    const next = new Date(start.getTime() + cycleDays * 24 * 60 * 60 * 1000);
    return next;
  };

  /** Trial days remaining (or 0 if past). */
  const trialDaysLeft = (s: SubscriptionData): number => {
    if (!s.trialEnds) return 0;
    const ms = new Date(s.trialEnds).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  };

  const totals = computeSubTotals(form);
  const isCustomPlan = form.plan === "custom" || form.plan === "enterprise";

  const renderFormFields = (isNew: boolean) => (
    <div className="space-y-3">
      <Field label="Client *">
        <Select
          value={form.customerId}
          onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
          disabled={!isNew}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {customers.length === 0 ? (
              <SelectItem value="_none" disabled>
                No clients available
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan">
          <Select
            value={form.plan}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                plan: v,
                amount: SUB_PLAN_AMOUNTS[v] ?? f.amount,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter ($299/mo)</SelectItem>
              <SelectItem value="growth">Growth ($499/mo)</SelectItem>
              <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Billing cycle">
          <Select
            value={form.billingCycle}
            onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={isCustomPlan ? "Custom amount *" : "Base amount"}
          hint={isCustomPlan ? "Required for Custom / Enterprise plans" : undefined}
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))
            }
          />
        </Field>
        <Field label="Currency" hint="ISO 4217 code (e.g. USD, EUR, GBP)">
          <Select
            value={form.currency}
            onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD — US Dollar</SelectItem>
              <SelectItem value="EUR">EUR — Euro</SelectItem>
              <SelectItem value="GBP">GBP — British Pound</SelectItem>
              <SelectItem value="AED">AED — UAE Dirham</SelectItem>
              <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
              <SelectItem value="INR">INR — Indian Rupee</SelectItem>
              <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
              <SelectItem value="BDT">BDT — Bangladeshi Taka</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Status">
        <Select
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Start date">
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </Field>
        <Field label="Trial ends">
          <Input
            type="date"
            value={form.trialEnds}
            onChange={(e) => setForm((f) => ({ ...f, trialEnds: e.target.value }))}
          />
        </Field>
        <Field label="End date">
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount type">
          <Select
            value={form.discountType ?? "none"}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                discountType: v === "none" ? null : v,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Discount value"
          hint={
            form.discountType === "percentage"
              ? "Percent of base amount"
              : form.discountType === "fixed"
                ? "Flat amount off"
                : "Pick a discount type first"
          }
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            disabled={form.discountType === null}
            value={form.discountValue}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountValue: Number(e.target.value) || 0 }))
            }
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tax rate (%)">
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.taxRate}
            onChange={(e) =>
              setForm((f) => ({ ...f, taxRate: Number(e.target.value) || 0 }))
            }
          />
        </Field>
        {/* Live preview of the computed totals */}
        <div className="rounded-lg bg-muted/40 p-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base amount</span>
            <span className="tabular-nums">{money(form.amount, form.currency)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-muted-foreground">
                Discount
                {form.discountType === "percentage" && ` (${form.discountValue}%)`}
              </span>
              <span className="tabular-nums">-{money(totals.discountAmount, form.currency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{money(totals.taxableBase, form.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax ({form.taxRate}%)</span>
            <span className="tabular-nums">+{money(totals.taxAmount, form.currency)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border/40 pt-1 text-sm font-bold">
            <span>Total</span>
            <span className="tabular-nums">{money(totals.totalAmount, form.currency)}</span>
          </div>
        </div>
      </div>

      <Field label="Notes">
        <Textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Internal notes — contract terms, discount reason, etc."
        />
      </Field>
    </div>
  );

  return (
    <section className="space-y-4">
      <SectionHeader title="Subscriptions" desc="Manage client subscriptions, discounts & trials" icon={CreditCard}
        action={<button onClick={openCreate} className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> New subscription</button>} />

      {/* ===== KPI strip: subscription metrics ===== */}
      <MetricRow metrics={[
        { label: "Total Subs", value: stats.total, color: "oklch(0.62 0.2 255)" },
        { label: "Active", value: stats.active, color: "oklch(0.7 0.2 145)" },
        { label: "Trial", value: stats.trial, color: "oklch(0.82 0.14 85)" },
        { label: "Cancelled", value: stats.cancelled, color: "oklch(0.55 0.22 25)" },
        { label: "MRR", value: money(mrr), color: "oklch(0.72 0.22 300)" },
        { label: "Trial → Paid", value: `${trialConversionRate}%`, color: "oklch(0.68 0.22 145)" },
      ]} />

      {/* ===== Lifecycle visualization ===== */}
      <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-4">
        <SectionHeader title="Lifecycle" desc="Trial → Active → Cancelled" icon={Activity} />
        <div className="flex items-center gap-2 overflow-x-auto scroll-liquid pb-1">
          {[
            { label: "Trial", count: stats.trial, color: "oklch(0.82 0.14 85)", icon: Clock },
            { label: "Active", count: stats.active, color: "oklch(0.7 0.2 145)", icon: CheckCircle2 },
            { label: "Cancelled", count: stats.cancelled, color: "oklch(0.55 0.22 25)", icon: Ban },
            { label: "Expired", count: stats.expired, color: "oklch(0.62 0.18 200)", icon: X },
          ].map((stage, i, arr) => {
            const Icon = stage.icon;
            return (
              <React.Fragment key={stage.label}>
                <div className="flex min-w-[120px] flex-1 flex-col items-center rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${stage.color}18`, color: stage.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="num-display mt-1 text-lg font-bold">{stage.count}</div>
                  <div className="text-[10px] text-muted-foreground">{stage.label}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-px w-6 shrink-0 bg-border/60 sm:w-10" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ===== Plans templates ===== */}
      <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-4">
        <SectionHeader title="Plans" desc="Available plan templates" icon={Coins} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Starter", price: 299, accounts: "3 accounts", users: "1 user", color: "oklch(0.74 0.18 165)" },
            { name: "Growth", price: 499, accounts: "15 accounts", users: "5 users", color: "oklch(0.72 0.22 300)" },
            { name: "Enterprise", price: null, accounts: "Unlimited", users: "Unlimited", color: "oklch(0.7 0.2 25)" },
            { name: "Custom", price: null, accounts: "Custom", users: "Custom", color: "oklch(0.66 0.18 200)" },
          ].map((p) => (
            <div key={p.name} className="rounded-xl border border-border/40 bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", planStyle[p.name.toLowerCase()] ?? planStyle.custom)}>
                  {p.name}
                </span>
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              </div>
              <div className="num-display mt-2 text-lg font-bold">
                {p.price !== null ? money(p.price) : "Custom"}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {p.accounts} · {p.users}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Subscription cards ===== */}
      {subs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No subscriptions yet.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {subs.map((s) => {
            const total = s.totalAmount ?? s.amount;
            const discount = s.discountAmount ?? 0;
            const tax = s.taxAmount ?? 0;
            const next = nextBillingDate(s);
            const daysLeft = trialDaysLeft(s);
            const isGenerating = generatingId === s.id;
            return (
              <div key={s.id} className="crystal-in rounded-2xl border border-border/40 bg-muted/20 p-4 transition hover:bg-muted/30">
                {/* Header: avatar + name + badges */}
                <div className="flex items-start gap-3">
                  <NameAvatar name={s.customerName} className="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{s.customerName}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", statusStyle[s.status] ?? statusStyle.active)}>{s.status}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", planStyle[s.plan] ?? planStyle.custom)}>{s.plan}</span>
                      {s.billingCycle && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">{s.billingCycle}</span>
                      )}
                      {(() => {
                        const p = paymentStatusFor(s);
                        if (p === "none") return null;
                        const cls = p === "paid"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : p === "pending"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400";
                        return (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize", cls)} title="Payment status for the current billing period">
                            <span className={cn("h-1 w-1 rounded-full", p === "paid" ? "bg-emerald-500" : p === "pending" ? "bg-amber-500" : "bg-rose-500")} />
                            {p === "paid" ? "Paid" : p === "pending" ? "Payment due" : "Overdue"}
                          </span>
                        );
                      })()}
                    </div>
                    {/* Amount + breakdown */}
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      Base {money(s.amount, s.currency)}
                      {discount > 0 && (
                        <>
                          {" · "}
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Discount -{money(discount, s.currency)}
                          </span>
                        </>
                      )}
                      {tax > 0 && (
                        <>
                          {" · "}
                          <span>Tax +{money(tax, s.currency)}</span>
                        </>
                      )}
                    </div>
                    <div className="num-display mt-0.5 text-base font-bold tabular-nums">
                      {money(total, s.currency)}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">/ {s.billingCycle ?? "cycle"}</span>
                    </div>
                  </div>
                </div>

                {/* Dates: trial countdown + next billing */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-2 text-[11px]">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Started</div>
                    <div className="font-medium">{s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}</div>
                  </div>
                  {s.status === "trial" && s.trialEnds ? (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Trial ends</div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className={cn("h-1.5 w-1.5 rounded-full", daysLeft <= 3 ? "bg-rose-500" : "bg-amber-500")} />
                        {new Date(s.trialEnds).toLocaleDateString()}
                        {daysLeft > 0 && (
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", daysLeft <= 3 ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                    </div>
                  ) : next ? (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Next billing</div>
                      <div className="font-medium">{next.toLocaleDateString()}</div>
                    </div>
                  ) : s.endDate ? (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Ends</div>
                      <div className="font-medium">{new Date(s.endDate).toLocaleDateString()}</div>
                    </div>
                  ) : null}
                </div>

                {s.notes && (
                  <div className="mt-2 line-clamp-1 border-t border-border/30 pt-2 text-[11px] italic text-muted-foreground">“{s.notes}”</div>
                )}

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => generateInvoice(s)}
                    disabled={isGenerating}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-60"
                  >
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    Generate invoice
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="flex items-center gap-1 rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {s.status !== "cancelled" && (
                    <button
                      onClick={() => cancel(s.id)}
                      className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Subscription</DialogTitle>
            <DialogDescription>
              Pick a plan, set discount & tax, and the totals are computed automatically. Starting an active subscription auto-generates its first invoice.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields(true)}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submit(true)}
              disabled={busy}
              className="liquid-pill"
            >
              {busy ? "Creating…" : "Create subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update plan, amount, discount, tax, status, dates or notes. Converting a trial to active auto-generates the first real invoice.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields(false)}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submit(false)}
              disabled={busy}
              className="liquid-pill"
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
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
    <section>
      <SectionHeader title="API Keys" desc="Generate and manage API keys for integrations" icon={Lock}
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
    </section>
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
  // Owner module extras (added for Databases + Activity tabs + Overview extras).
  // Declared again here only because the module-scope `interface FinanceOverview`
  // declared near the OverviewTab is merged with this one by TypeScript — keeping
  // the same fields in both declarations avoids accidental drift when one is
  // edited and the other is forgotten.
  tenantDatabases: number;
  activeDatabases: number;
  suspendedDatabases: number;
  totalStorageMb: number;
  activityLogs: number;
  trialConversionRate: number;
  recentActivity: AuditLogEntry[];
  churnRiskCustomers: ChurnRiskCustomer[];
}

function FinanceTab() {
  const { data, loading } = useApi<FinanceOverview>("/api/finance/overview");
  const { data: analytics } = useApi<FinanceAnalytics | null>("/api/finance/analytics");
  const [batchBusy, setBatchBusy] = React.useState(false);

  if (loading || !data) return <div className="shimmer h-64 rounded-3xl" />;

  const subMetrics = analytics?.subscriptionMetrics;
  const mrr = subMetrics?.mrr ?? data.monthlyRevenue ?? 0;
  const arr = subMetrics?.arr ?? (data.monthlyRevenue ?? 0) * 12;

  /** Batch-generate invoices for every active subscription. Calls the new
   *  /api/subscriptions/batch-generate-invoices endpoint and toasts the
   *  per-subscription results. */
  const generateMonthly = async () => {
    if (!confirm(`Generate invoices for ${subMetrics?.activeSubs ?? 0} active subscriptions?`)) return;
    setBatchBusy(true);
    try {
      const res = await api("POST", "/api/subscriptions/batch-generate-invoices") as {
        ok?: boolean; created?: number; skipped?: number; errored?: number; total?: number;
        results?: { status: string; customerName: string; invoiceNumber?: string }[];
      };
      toast.success(`Generated ${res.created ?? 0} invoice(s)`, {
        description: `${res.skipped ?? 0} already existed, ${res.errored ?? 0} errored out of ${res.total ?? 0} active subs.`,
        duration: 6000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Batch generation failed");
    } finally {
      setBatchBusy(false);
    }
  };

  /** Mark an outstanding invoice as paid (PATCH /api/invoices/[id]). */
  const markPaid = async (inv: { id: string; number: string }) => {
    try {
      await api("PATCH", `/api/invoices/${inv.id}`, { status: "paid" });
      toast.success(`${inv.number} marked as paid`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  /** "Send reminder" — for now, this just toasts a success (no email
   *  integration yet) and logs an audit event by PATCHing the invoice
   *  (no-op status change). Future: hook into the mail integration. */
  const sendReminder = async (inv: { id: string; number: string; customerName: string }) => {
    toast.success(`Reminder queued for ${inv.number}`, {
      description: `Will notify ${inv.customerName} about the outstanding balance.`,
    });
  };

  // Bank balances (synthesized in /api/finance/analytics — defaults to
  // totalReceived on the default account, 0 otherwise).
  const bankAccounts = analytics?.bankAccounts ?? [];
  const totalBalance = bankAccounts.reduce((s, b) => s + b.balance, 0);

  // Outstanding invoices (sent + overdue) sorted by daysOverdue desc.
  const outstanding = analytics?.outstanding ?? [];
  const paymentHistory = analytics?.paymentHistory ?? [];

  // Revenue by plan (bar chart data).
  const planRevenue = analytics?.planRevenue ?? [];
  const planColors: Record<string, string> = {
    starter: "oklch(0.74 0.18 165)",
    growth: "oklch(0.72 0.22 300)",
    enterprise: "oklch(0.7 0.2 25)",
    custom: "oklch(0.66 0.18 200)",
  };

  return (
    <div className="space-y-4">
      {/* ===== Revenue overview KPIs ===== */}
      <MetricRow metrics={[
        { label: "MRR", value: money(mrr), color: "oklch(0.7 0.2 145)" },
        { label: "ARR", value: money(arr), color: "oklch(0.62 0.2 255)" },
        { label: "Total Revenue", value: money(data.totalRevenue), color: "oklch(0.72 0.18 75)" },
        { label: "Pending", value: money(data.pendingRevenue), color: "oklch(0.82 0.14 85)" },
        { label: "Overdue", value: money(data.overdueRevenue), color: "oklch(0.55 0.22 25)" },
      ]} />

      {/* ===== Quick actions ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generateMonthly}
          disabled={batchBusy || (subMetrics?.activeSubs ?? 0) === 0}
          className="liquid-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60"
        >
          {batchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          Generate monthly invoices
        </button>
        <span className="text-[11px] text-muted-foreground">
          {subMetrics?.activeSubs ?? 0} active subscriptions will be billed.
        </span>
      </div>

      {/* ===== Revenue by plan bar chart ===== */}
      <section>
        <SectionHeader title="Revenue by plan" desc="Paid invoices grouped by client plan" icon={Coins} />
        <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10 p-3">
          <div className="h-[220px]">
            {planRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planRevenue.map((p) => ({ plan: p.plan, revenue: p.revenue, color: planColors[p.plan] ?? "var(--primary)" }))} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} vertical={false} />
                  <XAxis dataKey="plan" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${fmt(v)}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                    {planRevenue.map((p) => (
                      <Cell key={p.plan} fill={planColors[p.plan] ?? "var(--primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">No paid revenue yet</div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Outstanding invoices + payment history ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Outstanding invoices */}
        <section>
          <SectionHeader
            title="Outstanding invoices"
            desc={`${outstanding.length} invoice(s) awaiting payment`}
            icon={AlertTriangle}
          />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10">
            <div className="scroll-liquid max-h-80 overflow-y-auto">
              {outstanding.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No outstanding invoices — all caught up!
                </div>
              ) : (
                outstanding.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 border-b border-border/30 px-3 py-2 text-[11px] last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold">{inv.number}</span>
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize",
                          inv.status === "overdue" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        )}>
                          {inv.status}
                        </span>
                        {inv.daysOverdue > 0 && (
                          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                            {inv.daysOverdue}d overdue
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {inv.customerName}
                        {inv.dueDate ? ` · due ${new Date(inv.dueDate).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold tabular-nums">{money(inv.total)}</div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => sendReminder(inv)}
                        className="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary hover:bg-primary/20"
                      >
                        Remind
                      </button>
                      <button
                        onClick={() => markPaid(inv)}
                        className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      >
                        Mark paid
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Payment history timeline */}
        <section>
          <SectionHeader
            title="Payment history"
            desc="Last 20 paid invoices"
            icon={CheckCircle2}
          />
          <div className="crystal-in rounded-2xl border border-border/40 bg-muted/10">
            <div className="scroll-liquid max-h-80 overflow-y-auto">
              {paymentHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                paymentHistory.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 border-b border-border/30 px-3 py-2 text-[11px] last:border-b-0">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-semibold">{p.number}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {p.customerName} · {format(new Date(p.paidAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="shrink-0 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{money(p.total)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ===== Bank accounts overview ===== */}
      <section>
        <SectionHeader title="Bank accounts" desc="Connected accounts & balances" icon={Landmark} />
        {bankAccounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No bank accounts configured yet. Add one in the Bank Accounts tab.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((b) => (
              <div key={b.id} className="crystal-in rounded-2xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Landmark className="h-5 w-5" />
                  </div>
                  {b.isDefault && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">Default</span>
                  )}
                </div>
                <div className="mt-2 truncate text-sm font-semibold">{b.accountName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{b.bankName}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">{maskNumber(b.accountNumber)}</div>
                <div className="num-display mt-2 text-lg font-bold tabular-nums">
                  {money(b.balance, b.currency)}
                </div>
              </div>
            ))}
          </div>
        )}
        {bankAccounts.length > 0 && (
          <div className="mt-2 text-right text-[11px] text-muted-foreground">
            Total balance across {bankAccounts.length} account(s): <span className="font-bold tabular-nums">{money(totalBalance)}</span>
          </div>
        )}
      </section>

      {/* ===== System summary (kept from old FinanceTab — informational) ===== */}
      <section>
        <SectionHeader title="System summary" desc="Platform usage at a glance" icon={Database} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="crystal-in flex items-center justify-between rounded-xl bg-muted/30 p-3">
            <span className="text-xs">Users</span>
            <span className="num-display font-bold">{data.users}</span>
          </div>
          <div className="crystal-in flex items-center justify-between rounded-xl bg-muted/30 p-3">
            <span className="text-xs">Social Accounts</span>
            <span className="num-display font-bold">{data.accounts}</span>
          </div>
          <div className="crystal-in flex items-center justify-between rounded-xl bg-muted/30 p-3">
            <span className="text-xs">Posts</span>
            <span className="num-display font-bold">{data.posts}</span>
          </div>
          <div className="crystal-in flex items-center justify-between rounded-xl bg-muted/30 p-3">
            <span className="text-xs">API Keys</span>
            <span className="num-display font-bold">{data.apiKeys}</span>
          </div>
        </div>
      </section>
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
  permissions?: string[];
}

function ClientUsersTab() {
  const { data, loading, reload } = useApi<ClientUser[]>("/api/users");
  const { data: customerList } = useApi<Customer[]>("/api/customers");
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<ClientUser | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "member", company: "", gender: "", birthDate: "", phone: "", customerId: "" });
  // Module rights selection for the create-user dialog. Defaults to the
  // role-based preset (member → dashboard/composer/calendar/inbox). It
  // re-syncs whenever the user picks a different role in the dropdown.
  const [formPermissions, setFormPermissions] = React.useState<string[]>(
    defaultPermissionsForRole("member"),
  );
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
        permissions: formPermissions,
      });
      toast.success("User created!", { description: `${form.name} can sign in at /login` });
      setForm({ name: "", email: "", password: "", role: "member", company: "", gender: "", birthDate: "", phone: "", customerId: "" });
      setFormPermissions(defaultPermissionsForRole("member"));
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
        permissions: editUser.permissions ?? [],
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
    <section>
      <SectionHeader
        title="Users"
        desc="All users with login access — manage accounts, roles, profiles & birthdays"
        icon={CircleUserRound}
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
              {/* Modules pill — summarizes the user's module rights. */}
              <button
                type="button"
                onClick={() => { setEditUser({ ...u }); setEditOpen(true); }}
                title={isAllModules(u.permissions) ? "All modules" : (u.permissions?.length ?? 0) > 0 ? `${u.permissions!.length} module${u.permissions!.length === 1 ? "" : "s"}` : "No module access"}
                className={cn(
                  "hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition sm:flex",
                  isAllModules(u.permissions)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : (u.permissions?.length ?? 0) > 0
                      ? "border-border/50 bg-muted/40 text-muted-foreground"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-500",
                )}
              >
                <ShieldCheck className="h-3 w-3" />
                {describePermissions(u.permissions)}
              </button>
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
        <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

            {/* Client / Tenant selector — links user to a client's database */}
            {customerList && customerList.length > 0 && (
              <div>
                <Label className="text-xs">Link to Client (Tenant)</Label>
                <Select value={form.customerId || "__none__"} onValueChange={(v) => setForm({ ...form, customerId: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No client (super-admin)</SelectItem>
                    {customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company ?? c.name}{c.database ? ` · ${c.database.dbName}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground">Links the user to the selected client's tenant database. They will only see that client's data.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => {
                  setForm({ ...form, role: v });
                  // Reset module rights to the role-based default whenever
                  // the user picks a different role — the admin can still
                  // fine-tune via the Module Access section below.
                  setFormPermissions(defaultPermissionsForRole(v));
                }}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer — read-only</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Module Access — pick which sidebar modules this user can open. */}
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold">Module Access</Label>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Controls which sidebar items this user can open
                </span>
              </div>
              <ModuleAccessSelector
                permissions={formPermissions}
                onChange={setFormPermissions}
              />
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
        <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Module Access — pick which sidebar modules this user can open. */}
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-semibold">Module Access</Label>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Currently: {describePermissions(editUser.permissions)}
                  </span>
                </div>
                <ModuleAccessSelector
                  permissions={editUser.permissions ?? []}
                  onChange={(next) => setEditUser({ ...editUser, permissions: next })}
                />
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
    </section>
  );
}

// ============================================================================
// Databases Tab — tenant DB registry (one Neon DB per client)
// ============================================================================

function DatabasesTab() {
  const { data, loading, reload } = useApi<TenantDbRow[]>("/api/tenant-databases");
  const { ownerDbFilter, setOwnerDbFilter } = useNav();
  const [search, setSearch] = React.useState("");
  // Clear the cross-tab filter once the user starts typing — we keep the
  // filter around for the initial render (set by ClientsTab → "View
  // Database") so the table shows the right client on first paint.
  React.useEffect(() => {
    if (ownerDbFilter && search) setOwnerDbFilter(null);
  }, [search, ownerDbFilter, setOwnerDbFilter]);

  const [busyId, setBusyId] = React.useState<string | null>(null);

  const rows = data ?? [];
  const filtered = rows.filter((r) => {
    if (ownerDbFilter && r.customerId !== ownerDbFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.dbName.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerEmail.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    suspended: rows.filter((r) => r.status === "suspended").length,
    totalMb: rows.reduce((s, r) => s + (r.sizeMb || 0), 0),
  };

  const setStatus = async (row: TenantDbRow, status: "active" | "suspended") => {
    setBusyId(row.id);
    try {
      await api("PATCH", `/api/tenant-databases/${row.id}`, { status });
      toast.success(`${row.dbName} is now ${status}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const repush = async (row: TenantDbRow) => {
    if (!confirm(`Re-push the Prisma schema to "${row.dbName}"? Existing data is preserved.`)) return;
    setBusyId(row.id);
    try {
      await api("POST", `/api/tenant-databases/${row.id}`);
      toast.success("Schema re-pushed", { description: `${row.dbName} tables are in sync.` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schema push failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <MetricRow metrics={[
        { label: "Tenant DBs", value: stats.total, color: "oklch(0.62 0.22 300)" },
        { label: "Active", value: stats.active, color: "oklch(0.7 0.2 145)" },
        { label: "Suspended", value: stats.suspended, color: "oklch(0.7 0.2 25)" },
        { label: "Total storage", value: `${fmt(stats.totalMb)} MB`, color: "oklch(0.66 0.18 200)" },
      ]} />

      <section>
        <SectionHeader
          title="Tenant databases"
          desc="One dedicated Neon PostgreSQL database per client. View health, suspend, or re-push schema."
          icon={Database}
          action={
            <div className="flex items-center gap-2">
              {ownerDbFilter && (
                <button
                  onClick={() => setOwnerDbFilter(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  <X className="h-3 w-3" /> Clear filter
                </button>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by DB or client…"
                  className="h-9 w-56 pl-8 text-xs"
                />
              </div>
            </div>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-16 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Database className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">
              {ownerDbFilter ? "No database for this client" : "No tenant databases yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ownerDbFilter
                ? "Provision one from the Clients tab."
                : "Provision a database when creating a client."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/60">
            <div className="max-h-[60vh] overflow-y-auto scroll-liquid">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase">Database</TableHead>
                    <TableHead className="text-[11px] uppercase">Client</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase">Size</TableHead>
                    <TableHead className="text-[11px] uppercase">Health</TableHead>
                    <TableHead className="text-[11px] uppercase">Created</TableHead>
                    <TableHead className="text-right text-[11px] uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} className="text-xs">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[oklch(0.62_0.22_300)]/12 text-[oklch(0.55_0.2_300)] dark:text-[oklch(0.78_0.18_300)]">
                            <Database className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-mono font-semibold">{row.dbName}</div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {row.customerPlan ? row.customerPlan : "no plan"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{row.customerName}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{row.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                            row.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              row.status === "active" ? "bg-emerald-500" : "bg-rose-500",
                            )}
                          />
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          {row.sizeMb > 0 ? `${row.sizeMb} MB` : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.status === "active" && row.healthy ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Healthy
                          </span>
                        ) : row.status === "suspended" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            <Pause className="h-3 w-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" /> No size data
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {format(new Date(row.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => repush(row)}
                            disabled={busyId === row.id}
                            title="Re-push Prisma schema"
                            className="grid h-7 w-7 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
                          >
                            {busyId === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </button>
                          {row.status === "active" ? (
                            <button
                              onClick={() => setStatus(row, "suspended")}
                              disabled={busyId === row.id}
                              title="Suspend database"
                              className="grid h-7 w-7 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:border-rose-500/40 hover:text-rose-500 disabled:opacity-50"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setStatus(row, "active")}
                              disabled={busyId === row.id}
                              title="Activate database"
                              className="grid h-7 w-7 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:border-emerald-500/40 hover:text-emerald-500 disabled:opacity-50"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// Activity Log Tab — security event stream from AuditLog
// ============================================================================

function ActivityLogTab() {
  const [action, setAction] = React.useState("");
  const [actor, setActor] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  // The useApi hook re-fetches whenever the URL changes — so we memoize the
  // query string from the filter inputs to drive a fresh fetch on every
  // filter change.
  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "200");
    const qs = params.toString();
    return qs ? `/api/audit-logs?${qs}` : "/api/audit-logs";
  }, [action, actor, from, to]);

  const { data, loading } = useApi<AuditLogEntry[]>(query);

  const logs = data ?? [];

  // Distinct actions observed in the current result set — feeds the action
  // filter dropdown so the owner can narrow down to "user.deleted" etc.
  const knownActions = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) set.add(l.action);
    return [...set].sort();
  }, [logs]);

  const resetFilters = () => {
    setAction("");
    setActor("");
    setFrom("");
    setTo("");
  };

  const hasFilters = Boolean(action || actor || from || to);

  return (
    <div className="space-y-4">
      <section>
        <SectionHeader
          title="Security activity log"
          desc="Logins, role changes, 2FA, password changes, deletions — every security-sensitive event."
          icon={History}
          action={
            <Badge variant="secondary" className="text-[11px]">
              {logs.length} event{logs.length === 1 ? "" : "s"}
            </Badge>
          }
        />

        {/* Filter bar */}
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border border-border/40 bg-background/60 p-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Action</Label>
            <Select value={action || "__all__"} onValueChange={(v) => setAction(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All actions</SelectItem>
                {knownActions.map((a) => (
                  <SelectItem key={a} value={a} className="font-mono text-xs">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Actor (name/email)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Search actors…"
                className="h-8 w-48 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          {hasFilters ? (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/40 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-14 rounded-2xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium">
              {hasFilters ? "No events match your filters" : "No security events yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasFilters ? "Try widening the date range or clearing the action filter." : "Logins, role changes, and deletions will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/60">
            <div className="max-h-[65vh] overflow-y-auto scroll-liquid">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase">Action</TableHead>
                    <TableHead className="text-[11px] uppercase">Actor</TableHead>
                    <TableHead className="text-[11px] uppercase">Target</TableHead>
                    <TableHead className="text-[11px] uppercase">IP</TableHead>
                    <TableHead className="text-right text-[11px] uppercase">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const tone = auditActionTone(log.action);
                    return (
                      <TableRow key={log.id} className="text-xs align-top">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone.dot }} />
                            <div className="min-w-0">
                              <div className="font-semibold">{prettyAction(log.action)}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{log.action}</div>
                            </div>
                          </div>
                          {log.metadata && (
                            <div className="mt-1.5 max-w-xs truncate rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {log.metadata}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.actorName || log.actorEmail ? (
                            <div className="flex items-center gap-2">
                              <NameAvatar name={log.actorName ?? log.actorEmail ?? "?"} className="h-6 w-6 text-[9px]" />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{log.actorName ?? "—"}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{log.actorEmail}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground">system</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.targetType ? (
                            <div className="min-w-0">
                              <div className="font-medium capitalize">{log.targetType}</div>
                              {log.targetId && (
                                <div className="truncate font-mono text-[10px] text-muted-foreground">{log.targetId}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">
                          {log.ip ?? <span className="italic text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-[11px] text-muted-foreground">
                          <div>{format(new Date(log.createdAt), "MMM d, yyyy")}</div>
                          <div>{format(new Date(log.createdAt), "HH:mm:ss")}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function OwnerView() {
  const { ownerTab, setOwnerTab } = useNav();
  // Default to "customers" on first load (also enforced by the store initializer).
  // The internal `id` stays "customers" for nav-state compatibility; the
  // user-facing label is "Clients" (see OWNER_SECTIONS).
  const tab = ownerTab || "customers";
  const { data: customers } = useApi<Customer[]>("/api/customers");
  // One overview fetch drives the MobileNavSelect count badges. Sub-tabs
  // keep their own fetches (untouched).
  const { data: overview } = useApi<FinanceOverview>("/api/finance/overview");
  const customerList = customers ?? [];

  return (
    <div className="space-y-4">
      {/* Mobile: nav collapses to a Select dropdown (hidden on lg+ where
          the main app-sidebar handles sub-navigation). */}
      <MobileNavSelect active={tab} onChange={setOwnerTab} overview={overview} />

      {/* Detail panel — renders only the active tab content, full-width. */}
      <main className="min-w-0 space-y-4">
        {tab === "customers" && <ClientsTab />}
        {tab === "subscriptions" && <SubscriptionsTab customers={customerList} />}
        {tab === "invoices" && <InvoicesTab customers={customerList} />}
        {tab === "quotations" && <QuotationsTab customers={customerList} />}
        {tab === "devices" && <DevicesTab />}
        {tab === "apikeys" && <ApiKeysTab />}
        {tab === "bank" && <BankAccountsTab />}
        {tab === "users" && <ClientUsersTab />}
        {tab === "databases" && <DatabasesTab />}
        {tab === "activity" && <ActivityLogTab />}
        {tab === "overview" && <OverviewTab />}
        {tab === "finance" && <FinanceTab />}
        {tab === "reports" && <ReportsTab />}
      </main>
    </div>
  );
}
