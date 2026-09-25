import { NextRequest, NextResponse } from "next/server";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";
import { db as mainDb } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/assistant
 *
 * An AI-powered assistant that can answer questions about SocialFlow data
 * AND execute commands (create tasks, schedule posts, reply to comments).
 *
 * Body: { message: string, history: [{role, content}] }
 * Returns: { reply: string, action?: {tool, params, result} }
 *
 * Flow:
 * 1. User message → AI determines if a tool call is needed
 * 2. If yes: AI returns JSON action → server executes tool → result sent back to AI
 * 3. AI returns natural language summary of the result
 * 4. If no tool needed: AI returns conversational reply directly
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { message, history = [] } = body as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);

  // Build context about the current user
  const userContext = `
Current user: ${user!.email} (role: ${user!.role})
Tenant: ${scope.isSuperAdmin ? "Super-admin (all tenants)" : "Organisation-scoped"}
Time: ${new Date().toISOString()}
`;

  // System prompt describing available tools
  const systemPrompt = `You are SocialFlow AI, an intelligent assistant inside a social media management platform. You can answer questions about the user's data AND execute commands.

${userContext}

You have access to these tools. When you want to use a tool, respond with ONLY a JSON object (no markdown, no explanation before or after):
{"action": "tool_name", "params": {param1: "value"}}

Available tools:
- get_dashboard_stats: Get overview stats (total posts, accounts, members, engagement). No params needed.
- get_posts: List posts. Params: status? ("draft"|"scheduled"|"published"|"failed"), platform? ("instagram"|"facebook"|"x"|"linkedin"|"tiktok"|"youtube"|"threads"), limit? (number, default 10)
- get_post_details: Get a specific post with variants. Params: postId (string)
- get_team_members: List all team members. No params needed.
- get_accounts: List all connected social accounts. No params needed.
- get_analytics: Get analytics summary. Params: platform?, days? (number, default 30)
- get_inbox: Get unread comments/messages. Params: limit? (number, default 10)
- get_tasks: List tasks. Params: status? ("todo"|"in_progress"|"review"|"done"|"blocked")
- create_task: Create a new task. Params: title (string), description? (string), priority? ("low"|"normal"|"high"|"urgent")
- get_calendar: Get upcoming scheduled posts. Params: days? (number, default 7)
- get_team_chat: Get recent team chat messages. Params: limit? (number, default 10)

Rules:
1. If the user asks a question that needs data, use a tool to fetch it.
2. If the user asks you to do something (create task, etc.), use the appropriate tool.
3. If the user just wants to chat or asks a general question, respond conversationally (no tool needed).
4. Be concise, friendly, and helpful. Use the data from tools to give specific answers.
5. When you use a tool, ONLY output the JSON action. The system will execute it and send you the result.
6. After receiving tool results, summarize them in natural language for the user.
7. Format numbers nicely (e.g., "1,234" not "1234").
8. If a tool returns no data, say so honestly.`;

  // Build conversation messages
  const conversationMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // Step 1: Send to AI — does it want to call a tool?
  let aiResponse = "";
  try {
    const result = await chatWithFallback(conversationMessages);
    aiResponse = result.content;
  } catch (err) {
    console.error("[ai/assistant] LLM failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      reply: "I couldn't process your request right now. Please try again.",
    });
  }

  // Check if the AI response is a JSON action
  const actionMatch = aiResponse.match(/\{[\s\S]*"action"[\s\S]*\}/);
  if (!actionMatch) {
    // No tool call — return the conversational reply directly
    return NextResponse.json({ reply: aiResponse.trim() });
  }

  // Parse the action JSON
  let action: { action: string; params: Record<string, unknown> };
  try {
    // Find the JSON object in the response
    const jsonStr = aiResponse.match(/\{[\s\S]+\}/)?.[0];
    if (!jsonStr) throw new Error("No JSON found");
    action = JSON.parse(jsonStr);
  } catch {
    // Not valid JSON — treat as conversational reply
    return NextResponse.json({ reply: aiResponse.trim() });
  }

  // Step 2: Execute the tool
  let toolResult: unknown;
  try {
    toolResult = await executeTool(action.action, action.params, {
      targetDb,
      scope,
      userId: user!.userId,
      userRole: user!.role,
    });
  } catch (err) {
    console.error("[ai/assistant] Tool execution failed:", err instanceof Error ? err.message : String(err));
    // Send error back to AI for a user-friendly message
    const errorMessages: LLMMessage[] = [
      ...conversationMessages,
      { role: "assistant", content: JSON.stringify(action) },
      { role: "user", content: `Tool "${action.action}" failed with error: ${err instanceof Error ? err.message : String(err)}. Please inform the user about this error and suggest an alternative.` },
    ];
    try {
      const result = await chatWithFallback(errorMessages);
      return NextResponse.json({
        reply: result.content,
        action: { tool: action.action, params: action.params, error: err instanceof Error ? err.message : String(err) },
      });
    } catch {
      return NextResponse.json({
        reply: `I tried to use ${action.action} but it failed. Please try again or check if the data exists.`,
      });
    }
  }

  // Step 3: Send tool result back to AI for a natural language summary
  const summaryMessages: LLMMessage[] = [
    ...conversationMessages,
    { role: "assistant", content: JSON.stringify(action) },
    {
      role: "user",
      content: `Tool "${action.action}" returned this data:\n\n${JSON.stringify(toolResult, null, 2).slice(0, 3000)}\n\nPlease summarize this data for the user in a clear, friendly way. Use formatting (bold, lists) if helpful. Be specific with the numbers.`,
    },
  ];

  try {
    const result = await chatWithFallback(summaryMessages);
    return NextResponse.json({
      reply: result.content,
      action: { tool: action.action, params: action.params, result: toolResult },
    });
  } catch {
    // If the summary fails, return raw tool result
    return NextResponse.json({
      reply: `I found the data you requested. Here's what I found:\n\n${JSON.stringify(toolResult, null, 2).slice(0, 1000)}`,
      action: { tool: action.action, params: action.params, result: toolResult },
    });
  }
}

// ============================================================================
// Tool execution functions
// ============================================================================

interface ToolContext {
  targetDb: typeof mainDb;
  scope: { customerId: string | null; isSuperAdmin: boolean };
  userId: string;
  userRole: string;
}

async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const { targetDb, scope, userId } = ctx;

  switch (toolName) {
    case "get_dashboard_stats": {
      const where = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const [posts, accounts, members, tasks] = await Promise.all([
        targetDb.post.count({ where }),
        targetDb.account.count({ where }),
        targetDb.user.count({ where: tenantWhere(scope, { status: "active" }) }),
        targetDb.task.count({ where }),
      ]);
      const published = await targetDb.post.count({ where: { ...where, status: "published" } });
      const scheduled = await targetDb.post.count({ where: { ...where, status: "scheduled" } });
      const drafts = await targetDb.post.count({ where: { ...where, status: "draft" } });
      const failed = await targetDb.post.count({ where: { ...where, status: "failed" } });
      return { posts, published, scheduled, drafts, failed, accounts, members, tasks };
    }

    case "get_posts": {
      const status = params.status as string | undefined;
      const platform = params.platform as string | undefined;
      const limit = (params.limit as number) || 10;
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const posts = await targetDb.post.findMany({
        where: {
          ...baseWhere,
          ...(status ? { status } : {}),
          ...(platform ? { variants: { some: { platform } } } : {}),
        },
        include: { variants: true, author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return posts.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        author: p.author?.name ?? "Unknown",
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        platforms: p.variants.map((v) => v.platform),
        createdAt: p.createdAt.toISOString(),
      }));
    }

    case "get_post_details": {
      const postId = params.postId as string;
      const post = await targetDb.post.findUnique({
        where: { id: postId },
        include: {
          variants: { include: { account: { select: { handle: true, displayName: true } } } },
          author: { select: { name: true, email: true } },
        },
      });
      if (!post) return { error: "Post not found" };
      return {
        id: post.id,
        title: post.title,
        caption: post.caption,
        status: post.status,
        tone: post.tone,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        author: post.author?.name ?? "Unknown",
        variants: post.variants.map((v) => ({
          platform: v.platform,
          account: v.account?.displayName ?? v.account?.handle ?? "Unknown",
          content: v.content.slice(0, 200),
          status: v.status,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          reach: v.reach,
        })),
      };
    }

    case "get_team_members": {
      const members = await targetDb.user.findMany({
        where: tenantWhere(scope, { status: "active" }),
        select: {
          id: true, name: true, email: true, role: true, title: true,
          department: true, avatar: true, lastActive: true,
        },
        orderBy: { name: "asc" },
      });
      return members.map((m) => ({
        id: m.id, name: m.name, email: m.email, role: m.role,
        title: m.title, department: m.department,
        lastActive: m.lastActive?.toISOString() ?? null,
      }));
    }

    case "get_accounts": {
      const accounts = await targetDb.account.findMany({
        where: tenantWhere(scope),
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return accounts.map((a) => ({
        id: a.id, platform: a.platform, handle: a.handle,
        displayName: a.displayName, followers: a.followers,
        owner: a.owner?.name ?? "Unknown",
        verified: a.verified,
      }));
    }

    case "get_analytics": {
      const days = (params.days as number) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const accounts = await targetDb.account.findMany({ where: baseWhere });
      const accountIds = accounts.map((a) => a.id);
      const analytics = await targetDb.analyticsDaily.findMany({
        where: { accountId: { in: accountIds }, date: { gte: since } },
        orderBy: { date: "desc" },
      });
      const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
      const totalImpressions = analytics.reduce((s, a) => s + a.impressions, 0);
      const totalReach = analytics.reduce((s, a) => s + a.reach, 0);
      const totalEngagement = analytics.reduce((s, a) => s + a.engagement, 0);
      return {
        period: `Last ${days} days`,
        accounts: accounts.length,
        totalFollowers,
        totalImpressions,
        totalReach,
        totalEngagement,
        avgEngagementRate: totalFollowers > 0 ? ((totalEngagement / totalFollowers) * 100).toFixed(2) + "%" : "0%",
      };
    }

    case "get_inbox": {
      const limit = (params.limit as number) || 10;
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const accounts = await targetDb.account.findMany({ where: baseWhere });
      const accountIds = accounts.map((a) => a.id);
      const comments = await targetDb.comment.findMany({
        where: { accountId: { in: accountIds }, replied: false },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return comments.map((c) => ({
        id: c.id, author: c.author, text: c.text,
        type: c.type, sentiment: c.sentiment,
        createdAt: c.createdAt.toISOString(),
      }));
    }

    case "get_tasks": {
      const status = params.status as string | undefined;
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const tasks = await targetDb.task.findMany({
        where: { ...baseWhere, ...(status ? { status } : {}) },
        include: {
          assignee: { select: { name: true } },
          creator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return tasks.map((t) => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        assignee: t.assignee?.name ?? "Unassigned",
        creator: t.creator?.name ?? "Unknown",
        dueAt: t.dueAt?.toISOString() ?? null,
      }));
    }

    case "create_task": {
      const title = params.title as string;
      const description = params.description as string | undefined;
      const priority = params.priority as string | undefined;
      if (!title) return { error: "Title is required" };
      const task = await targetDb.task.create({
        data: {
          title,
          description: description || null,
          content: description || null,
          priority: priority || "normal",
          status: "todo",
          creatorId: userId,
          customerId: scope.customerId,
        },
      });
      return { id: task.id, title: task.title, status: task.status, priority: task.priority };
    }

    case "get_calendar": {
      const days = (params.days as number) || 7;
      const since = new Date();
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const posts = await targetDb.post.findMany({
        where: {
          ...baseWhere,
          status: "scheduled",
          scheduledAt: { gte: since, lte: until },
        },
        include: {
          variants: { select: { platform: true } },
          author: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
      });
      return posts.map((p) => ({
        id: p.id, title: p.title,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        author: p.author?.name ?? "Unknown",
        platforms: p.variants.map((v) => v.platform),
      }));
    }

    case "get_team_chat": {
      const limit = (params.limit as number) || 10;
      const messages = await targetDb.chatMessage.findMany({
        where: { receiverId: null },
        include: { sender: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return messages.reverse().map((m) => ({
        id: m.id,
        sender: m.sender?.name ?? "Unknown",
        text: m.text.slice(0, 200),
        createdAt: m.createdAt.toISOString(),
      }));
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
