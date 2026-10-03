import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

/** Log a security-sensitive action to the AuditLog table.
 *  Best-effort: never throws (audit failure must not break the request). */
export async function audit(
  req: NextRequest | null,
  actorId: string | null,
  action: string,
  options?: {
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const ip = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req?.headers.get("x-real-ip")
      || null;

    await db.auditLog.create({
      data: {
        actorId,
        action,
        targetType: options?.targetType ?? null,
        targetId: options?.targetId ?? null,
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
        ip,
      },
    });
  } catch (e) {
    // Best-effort: log but don't throw
    console.error("[audit] failed to log:", action, e instanceof Error ? e.message : e);
  }
}
