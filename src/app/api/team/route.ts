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

/** POST /api/team — invite/create a new team member */
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

  // Check for existing email
  const existing = await db.user.findUnique({ where: { email } }).catch(() => null);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Hash password (generate random if not provided — invited user sets it later)
  const hashedPassword = password
    ? await bcrypt.hash(password, 12)
    : await bcrypt.hash(Math.random().toString(36).slice(2), 12);

  // Inherit the creator's customerId (tenant) — so new users belong to the same client.
  // Super-admins can optionally pass a customerId to create a user in a different tenant.
  const scope = getTenantScope(authUser!);
  const finalCustomerId = (body as { customerId?: string }).customerId ?? scope.customerId;

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role ?? "member",
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
