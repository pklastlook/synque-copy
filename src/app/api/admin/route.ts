import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireRole(req, "admin");
  if (error) return error;

  const [users, accounts, posts, variants, tasks, comments, activities, health] = await Promise.all([
    db.user.findMany(),
    db.account.findMany({ include: { health: true } }),
    db.post.findMany({ include: { author: true, variants: true } }),
    db.postVariant.findMany(),
    db.task.findMany(),
    db.comment.findMany(),
    db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.accountHealth.findMany(),
  ]);

  // Team performance per user
  const teamPerformance = users.map((u) => {
    const uPosts = posts.filter((p) => p.authorId === u.id);
    const uAccounts = accounts.filter((a) => a.ownerId === u.id);
    const uVariants = variants.filter((v) => uAccounts.some((a) => a.id === v.accountId));
    const uTasks = tasks.filter((t) => t.assigneeId === u.id);
    const uDone = uTasks.filter((t) => t.status === "done");
    const engagement = uVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
    const followers = uAccounts.reduce((s, a) => s + a.followers, 0);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      department: u.department,
      color: u.color,
      permissions: u.permissions ? JSON.parse(u.permissions) : [],
      status: u.status,
      lastActive: u.lastActive?.toISOString() ?? null,
      postsCount: uPosts.length,
      accountsCount: uAccounts.length,
      tasksDone: uDone.length,
      tasksTotal: uTasks.length,
      taskCompletionRate: uTasks.length ? Math.round((uDone.length / uTasks.length) * 100) : 0,
      engagement,
      followers,
    };
  });
  const taskStatus = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
  };

  // Account health summary
  const accountHealth = accounts.map((a) => ({
    id: a.id,
    platform: a.platform,
    handle: a.handle,
    displayName: a.displayName,
    ownerId: a.ownerId,
    followers: a.followers,
    riskLevel: a.health?.riskLevel ?? "safe",
    riskScore: a.health?.riskScore ?? 0,
    status: a.health?.status ?? "healthy",
    reportCount: a.health?.reportCount ?? 0,
  }));
  const atRiskAccounts = accountHealth.filter((a) => a.riskLevel !== "safe").length;
  const healthyAccounts = accountHealth.filter((a) => a.riskLevel === "safe").length;

  // Workflow summary
  const scheduledPosts = posts.filter((p) => p.status === "scheduled").length;
  const publishedPosts = variants.filter((v) => v.status === "published").length;
  const unreadInbox = comments.filter((c) => !c.replied).length;

  // Department breakdown
  const depts: Record<string, { count: number; posts: number; engagement: number }> = {};
  for (const u of users) {
    const d = u.department ?? "Unassigned";
    if (!depts[d]) depts[d] = { count: 0, posts: 0, engagement: 0 };
    depts[d].count++;
    const tp = teamPerformance.find((t) => t.id === u.id)!;
    depts[d].posts += tp.postsCount;
    depts[d].engagement += tp.engagement;
  }

  return NextResponse.json({
    overview: {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === "active").length,
      totalAccounts: accounts.length,
      totalPosts: posts.length,
      publishedPosts,
      scheduledPosts,
      unreadInbox,
      atRiskAccounts,
      healthyAccounts,
      totalEngagement: variants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
      totalFollowers: accounts.reduce((s, a) => s + a.followers, 0),
    },
    teamPerformance: teamPerformance.sort((a, b) => b.engagement - a.engagement),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      assigneeId: t.assigneeId,
      assigneeName: users.find((u) => u.id === t.assigneeId)?.name ?? "Unassigned",
      status: t.status,
      priority: t.priority,
      type: t.type,
      dueAt: t.dueAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
    taskStatus,
    accountHealth,
    departments: Object.entries(depts).map(([name, d]) => ({ name, ...d })),
    activities: activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
