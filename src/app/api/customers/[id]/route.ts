import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * /api/customers/[id] — manage a single Customer (tenant) record.
 *
 * SECURITY: A Customer row IS a tenant. Only admins can mutate tenant records.
 * `await requireRole(req, "admin")` accepts both super-admins (role=admin,
 * customerId=null) and tenant admins (role=admin, customerId="abc").
 * The customers list/create route (`/api/customers`) uses the same gate, so
 * consistency is preserved.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "email", "phone", "company", "address", "city", "country", "status", "plan"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  try {
    await db.customer.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;
  const { id } = await params;

  try {
    // Cascade delete ALL related records to avoid FK constraint errors
    await db.invoice.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.quotation.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.serialKey.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.subscription.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.task.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.post.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.activity.deleteMany({ where: { customerId: id } }).catch(() => ({}));
    await db.campaign.deleteMany({ where: { customerId: id } }).catch(() => ({}));

    // Unlink users from this customer (set customerId to null, don't delete the users)
    await db.user.updateMany({ where: { customerId: id }, data: { customerId: null } }).catch(() => ({}));

    // Audit the tenant deletion BEFORE the row is removed. Best-effort — never blocks.
    await audit(req, user!.userId, "customer.deleted", {
      targetType: "customer",
      targetId: id,
    });

    // Delete the customer
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    console.error("[customer delete]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
