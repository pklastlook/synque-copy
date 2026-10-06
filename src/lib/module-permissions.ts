/**
 * Module Rights / Permissions
 * =================================================================
 * Central registry of all sidebar modules that can be granted or
 * revoked per-user. Used by:
 *   - The "Module Access" selector in the user create/edit dialogs
 *     (Owner Panel → Users, Team view → Add member).
 *   - The /api/team + /api/users POST/PATCH endpoints that store
 *     the selected module IDs in `User.permissions` (JSON array).
 *   - The sidebar (src/components/app-sidebar.tsx) which hides nav
 *     items the current user has no permission to see.
 *
 * Storage format in the DB (`User.permissions`, JSON string):
 *   - `["*"]`               → wildcard, all modules (admins).
 *   - `["dashboard", ...]`   → explicit module IDs.
 *   - legacy `["dashboard:read", ...]` → partial-match fallback
 *     for the demo viewer's old permission strings.
 *
 * Empty array / null is treated as "no restriction" (backward compat
 * for users created before the module rights feature shipped).
 */

export type ModuleId =
  | "dashboard"
  | "composer"
  | "calendar"
  | "inbox"
  | "accounts"
  | "team"
  | "settings"
  | "campaigns"
  | "media"
  | "listening"
  | "hashtags"
  | "competitors"
  | "reports"
  | "linkbio"
  | "mail"
  | "whatsapp"
  | "chat"
  | "tasks"
  | "admin"
  | "owner"
  | "team-performance"
  | "organization"
  | "utm"
  | "approvals"
  | "influencers"
  | "account-safety"
  | "vpn"
  | "guide";

/** A logical grouping of modules for the rights selector UI. */
export interface ModuleGroup {
  id: string;
  label: string;
  /** Accent oklch color used by the glass checkbox pills. */
  accent: string;
  modules: { id: ModuleId; label: string }[];
}

/** All selectable modules grouped by category (matches task spec). */
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: "overview",
    label: "Overview",
    accent: "oklch(0.55 0.2 255)",
    modules: [
      { id: "dashboard", label: "Dashboard" },
      { id: "team-performance", label: "Analytics" },
      { id: "guide", label: "Guide" },
    ],
  },
  {
    id: "content",
    label: "Content",
    accent: "oklch(0.7 0.2 25)",
    modules: [
      { id: "composer", label: "Composer" },
      { id: "calendar", label: "Calendar" },
      { id: "campaigns", label: "Campaigns" },
      { id: "approvals", label: "Approvals" },
      { id: "media", label: "Media Library" },
      { id: "hashtags", label: "Hashtags" },
      { id: "utm", label: "UTM Builder" },
      { id: "linkbio", label: "Link in Bio" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    accent: "oklch(0.66 0.18 200)",
    modules: [
      { id: "inbox", label: "Inbox" },
      { id: "whatsapp", label: "WhatsApp" },
      { id: "chat", label: "Team Chat" },
      { id: "mail", label: "Mail Server" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    accent: "oklch(0.62 0.22 300)",
    modules: [
      { id: "listening", label: "Listening" },
      { id: "competitors", label: "Competitors" },
      { id: "influencers", label: "Influencers" },
      { id: "reports", label: "Reports" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    accent: "oklch(0.68 0.2 145)",
    modules: [
      { id: "accounts", label: "Accounts" },
      { id: "account-safety", label: "Account Safety" },
      { id: "vpn", label: "VPN" },
      { id: "team", label: "Team" },
      { id: "organization", label: "Organization" },
      { id: "settings", label: "Settings" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    accent: "oklch(0.62 0 22 258)",
    modules: [
      { id: "admin", label: "Admin Panel" },
      { id: "owner", label: "Owner Panel" },
    ],
  },
];

/** Flat list of every selectable module (for "select all" math). */
export const ALL_MODULE_IDS: ModuleId[] = MODULE_GROUPS.flatMap((g) =>
  g.modules.map((m) => m.id),
);

/** Modules excluded when "select all" is applied to non-admin roles. */
const ADMIN_ONLY_MODULES: ModuleId[] = ["admin", "owner"];

/** Default module set per role (used when the request omits `permissions`). */
export function defaultPermissionsForRole(role: string): string[] {
  switch (role) {
    case "admin":
      // Admins always get everything — stored as the wildcard.
      return ["*"];
    case "manager": {
      // All modules except admin-only ones (admin / owner).
      return ALL_MODULE_IDS.filter((m) => !ADMIN_ONLY_MODULES.includes(m));
    }
    case "editor": {
      // Content + communication modules.
      const groups = ["content", "communication"];
      return MODULE_GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) =>
        g.modules.map((m) => m.id),
      );
    }
    case "member":
      return ["dashboard", "composer", "calendar", "inbox"];
    case "viewer":
      return ["dashboard"];
    default:
      return ["dashboard"];
  }
}

/**
 * Frontend access check — does the current user have access to a given
 * module? Used by the sidebar to hide unauthorized nav items.
 *
 * Rules:
 * 1. No permissions array (null/undefined/empty) → all access. This
 *    preserves backward compatibility for users created before the
 *    module rights feature shipped.
 * 2. `["*"]` → wildcard, all access.
 * 3. Module ID directly in the array → access granted.
 * 4. Legacy `module:action` format (e.g. "dashboard:read") → access
 *    granted if the prefix matches the requested module.
 */
export function hasModuleAccess(
  permissions: string[] | null | undefined,
  moduleId: string,
): boolean {
  if (!permissions || permissions.length === 0) return true;
  if (permissions.includes("*")) return true;
  if (permissions.includes(moduleId)) return true;
  // Legacy "module:action" fallback — treats "dashboard:read" as a
  // permission to see the dashboard module.
  return permissions.some(
    (p) => typeof p === "string" && p.startsWith(`${moduleId}:`),
  );
}

/**
 * Normalize the raw `User.permissions` JSON string into a string array.
 * Returns `[]` on parse failure or null input.
 */
export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

/** True when the permission list is the wildcard (all modules). */
export function isAllModules(permissions: string[] | null | undefined): boolean {
  return !!permissions && permissions.includes("*");
}

/** Human-readable count for the "Modules" column. */
export function describePermissions(
  permissions: string[] | null | undefined,
): string {
  if (!permissions || permissions.length === 0) return "All modules";
  if (permissions.includes("*")) return "All modules";
  const n = permissions.filter((p) => !p.includes(":")).length;
  const legacy = permissions.filter((p) => p.includes(":")).length;
  const total = n + legacy;
  if (total === 0) return "All modules";
  return `${total} module${total === 1 ? "" : "s"}`;
}
