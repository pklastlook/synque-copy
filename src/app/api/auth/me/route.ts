import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { parsePermissions } from "@/lib/module-permissions";

const SECRET_RAW = process.env.JWT_SECRET;
if (!SECRET_RAW) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}
// Assert non-null after the runtime check above — TypeScript strict mode
// (P3-9: ignoreBuildErrors=false) does not carry this narrowing across module
// boundaries to the jwt.verify call site below.
const SECRET: string = SECRET_RAW;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, SECRET) as unknown as { userId: string };

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        department: true,
        color: true,
        avatar: true,
        bio: true,
        timezone: true,
        language: true,
        customerId: true,
        emailVerified: true,
        twoFactorEnabled: true,
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        ...user,
        permissions: parsePermissions(user.permissions),
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
