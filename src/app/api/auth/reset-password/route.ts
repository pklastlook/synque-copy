import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a valid reset token.
 *
 * Body: { token, newPassword }
 */
export async function POST(req: NextRequest) {
  const { token, newPassword } = (await req.json()) as { token?: string; newPassword?: string };

  if (!token?.trim() || !newPassword?.trim()) {
    return NextResponse.json({ error: "token and newPassword are required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Find the user by the reset token stored in their `color` field
  const users = await db.user.findMany({
    where: { color: { startsWith: `reset:${token}:` } },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  const user = users[0];
  const colorParts = user.color?.split(":") ?? [];
  if (colorParts.length < 3) {
    return NextResponse.json({ error: "Invalid reset token format" }, { status: 400 });
  }

  const expires = new Date(colorParts[2]);
  if (expires < new Date()) {
    return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
  }

  // Hash the new password + clear the reset token
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      color: null, // Clear the reset token
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Password reset successfully. You can now log in with your new password.",
  });
}
