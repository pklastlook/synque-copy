import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  // Users see only members of their own tenant. Super-admins see all.
  const users = await db.user.findMany({ where: tenantWhere(scope), orderBy: { createdAt: "asc" } });
  const accounts = await db.account.findMany({ where: tenantWhere(scope) });
  const posts = await db.post.findMany({ where: tenantWhere(scope) });
  const variants = await db.postVariant.findMany({
    where: { accountId: { in: accounts.map((a) => a.id) } },
  });

  return NextResponse.json(
    users.map((u) => {
      const uAccounts = accounts.filter((a) => a.ownerId === u.id);
      const uPosts = posts.filter((p) => p.authorId === u.id);
      const uVariantIds = variants
        .filter((v) => uAccounts.some((a) => a.id === v.accountId))
        .map((v) => v.id);
      const engagement = variants
        .filter((v) => uAccounts.some((a) => a.id === v.accountId))
        .reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
      const followers = uAccounts.reduce((s, a) => s + a.followers, 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        title: u.title,
        department: u.department ?? null,
        status: u.status ?? "active",
        color: u.color,
        accountsCount: uAccounts.length,
        postsCount: uPosts.length,
        variantCount: uVariantIds.length,
        engagement,
        followers,
      };
    })
  );
}

/** POST /api/team — invite/create a new team member.
 *
 * Security (P1-2-b):
 * - Requires `manager` role.
 * - `role` is restricted: only admins can create admins. Managers can create
 *   editors/members/viewers but NOT admins or other managers (prevents a
 *   manager from creating an admin puppet account).
 * - `customerId` is bound to the caller's tenant. Only a super-admin (no
 *   customerId) can optionally pass a different customerId to provision a
 *   user in another tenant — and even then, only when explicitly allowed.
 * - Mass-assignment hardened: only allowlisted fields from the body are used.
 */
export async function POST(req: NextRequest) {
  const { user: authUser, error } = requireRole(req, "manager");
  if (error) return error;

  const body = await req.json();
  const { name, email, role, title, department, password, gender, birthDate, phone } = body as {
    name: string;
    email: string;
    role?: string;
    title?: string;
    department?: string;
    password?: string;
    gender?: string;
    birthDate?: string;
    phone?: string;
  };

  if (!name || !email) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }

  // Role guard: only admins can create admin users. Managers are capped at
  // creating editors/members/viewers — they cannot create admin or manager
  // accounts (which would be privilege escalation).
  const requestedRole = role ?? "member";
  const ALLOWED_ROLES = ["admin", "manager", "editor", "member", "viewer"];
  if (!ALLOWED_ROLES.includes(requestedRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if ((requestedRole === "admin" || requestedRole === "manager") && authUser!.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can create admin or manager accounts" },
      { status: 403 }
    );
  }

  // Check for existing email
  const existing = await db.user.findUnique({ where: { email } }).catch((e) => console.error("[api]", e));
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Hash password (generate random if not provided — invited user sets it later)
  const hashedPassword = password
    ? await bcrypt.hash(password, 12)
    : await bcrypt.hash(Math.random().toString(36).slice(2), 12);

  // Bind customerId to the caller's tenant. Super-admins (no customerId) can
  // optionally pass a customerId to create a user in a different tenant.
  const scope = getTenantScope(authUser!);
  const finalCustomerId = scope.customerId
    ? scope.customerId // Non-super-admin: always own tenant, ignore body.customerId
    : (body as { customerId?: string }).customerId ?? null; // Super-admin: optional override

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: requestedRole,
      title: title ?? null,
      department: department ?? null,
      status: "active",
      customerId: finalCustomerId,
      gender: gender ?? null,
      birthDate: birthDate ? new Date(birthDate) : null,
      phone: phone ?? null,
    },
  });

  return NextResponse.json({ id: user.id, ok: true });
}
