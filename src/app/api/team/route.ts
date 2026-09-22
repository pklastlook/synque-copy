import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  const accounts = await db.account.findMany();
  const posts = await db.post.findMany();
  const variants = await db.postVariant.findMany();

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
