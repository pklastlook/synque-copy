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
  const systemPrompt = `You are SocialFlow AI, an advanced AI assistant inside a social media management platform. You can answer questions about the user's data, provide analytics and reports, AND execute commands like scheduling posts, replying to comments, and creating tasks.

${userContext}

You have access to 18 tools. When you want to use a tool, respond with ONLY a JSON object (no markdown, no explanation before or after):
{"action": "tool_name", "params": {param1: "value"}}

**Data & Analytics:**
- get_dashboard_stats: Get overview stats (posts, accounts, members, tasks). No params.
- get_posts: List posts. Params: status? ("draft"|"scheduled"|"published"|"failed"), platform? ("instagram"|"facebook"|"x"|"linkedin"|"tiktok"|"youtube"|"threads"), limit? (number, default 10)
- get_post_details: Get a specific post with all variants. Params: postId (string)
- get_post_engagement: Get detailed engagement metrics for a post. Params: postId (string)
- search_posts: Search posts by keyword. Params: query (string), limit? (number, default 10)
- get_analytics: Get analytics summary. Params: platform?, days? (number, default 30)
- get_accounts: List all connected social accounts. No params.
- get_media: Search media library. Params: query?, type? ("image"|"video"|"audio"), limit? (number)

**Team & Activity:**
- get_team_members: List all team members. No params.
- get_user_activity: Get user activity report. Params: userId? (defaults to current user), days? (number, default 30)
- get_team_chat: Get recent team chat messages. Params: limit? (number, default 10)

**Inbox & Comments:**
- get_inbox: Get unread comments/messages. Params: limit? (number, default 10)
- reply_to_comment: Reply to a comment. Params: commentId (string), text (string)

**Tasks:**
- get_tasks: List tasks. Params: status? ("todo"|"in_progress"|"review"|"done"|"blocked")
- create_task: Create a new task. Params: title (string), description? (string), priority? ("low"|"normal"|"high"|"urgent")

**Posts:**
- get_calendar: Get upcoming scheduled posts. Params: days? (number, default 7)
- schedule_post: Schedule or draft a post. Params: caption (string — the full post text), platforms (array of platform names like ["instagram","x"]), scheduledAt (string — ISO date, "tomorrow 3pm", or "next week")
- delete_post: Delete a post. Params: postId (string)

Rules:
1. If the user asks a question that needs data, use a tool to fetch it.
2. If the user asks you to do something (create task, schedule post, reply to comment, etc.), use the appropriate tool. Extract the required params from the user's message.
3. For schedule_post: the "caption" param should be the post text the user wants to publish. The "platforms" param should be an array like ["instagram"]. The "scheduledAt" should be a time string.
4. For reply_to_comment: first use get_inbox to find comments, then use reply_to_comment with the commentId and the reply text.
5. If the user just wants to chat or asks a general question, respond conversationally (no tool needed).
6. Be concise, friendly, and helpful. Use the data from tools to give specific answers.
7. When you use a tool, ONLY output the JSON action. The system will execute it and send you the result.
8. After receiving tool results, summarize them in natural language for the user.
9. Format numbers nicely (e.g., "1,234" not "1234"). Use bold for key metrics.
10. If a tool returns no data, say so honestly and suggest an action.
11. When the user asks to "schedule a post about X for Instagram tomorrow", extract: caption="X", platforms=["instagram"], scheduledAt="tomorrow".
12. When the user asks to "reply to a comment", first call get_inbox to get the comment list, then ask which one to reply to (or reply to the first one if specified).`;

  // Build conversation messages
  const conversationMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // Multi-step tool execution loop (max 2 rounds — keeps API calls low to avoid rate limits)
  // Round 1: AI decides to call a tool or respond directly
  // Round 2: AI summarizes the tool result (or calls a second tool if needed)
  const MAX_TOOL_ROUNDS = 2;
  let currentMessages = [...conversationMessages];
  let lastAction: { tool: string; params: Record<string, unknown>; result?: unknown; error?: string } | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Step 1: Ask AI what to do
    let aiResponse = "";
    try {
      const result = await chatWithFallback(currentMessages);
      aiResponse = result.content;
    } catch (err) {
      console.error("[ai/assistant] LLM failed:", err instanceof Error ? err.message : String(err));
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = errMsg.includes("429") || errMsg.includes("Too many requests");
      return NextResponse.json({
        reply: isRateLimit
          ? "I'm getting too many requests from the AI service. Please wait a few seconds and try again."
          : "I couldn't process your request right now. Please try again in a moment.",
      });
    }

    // Check if the AI response is a JSON action
    const actionMatch = aiResponse.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (!actionMatch) {
      // No tool call — return the conversational reply directly
      return NextResponse.json({
        reply: aiResponse.trim(),
        action: lastAction ?? undefined,
      });
    }

    // Parse the action JSON
    let action: { action: string; params: Record<string, unknown> };
    try {
      const jsonStr = aiResponse.match(/\{[\s\S]+\}/)?.[0];
      if (!jsonStr) throw new Error("No JSON found");
      action = JSON.parse(jsonStr);
    } catch {
      // Not valid JSON — treat as conversational reply
      return NextResponse.json({
        reply: aiResponse.trim(),
        action: lastAction ?? undefined,
      });
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
      lastAction = { tool: action.action, params: action.params, result: toolResult };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[ai/assistant] Tool execution failed:", errMsg);
      lastAction = { tool: action.action, params: action.params, error: errMsg };

      // Send error back to AI — it can retry with a different approach
      currentMessages.push(
        { role: "assistant", content: JSON.stringify(action) },
        { role: "user", content: `Tool "${action.action}" failed with error: ${errMsg}. Please inform the user about this error and suggest an alternative.` }
      );
      continue; // Let the AI respond with an error message
    }

    // Step 3: Send tool result back to AI
    // On the last round, ask for a final summary. On earlier rounds,
    // let the AI decide if it needs another tool call.
    const isLastRound = round === MAX_TOOL_ROUNDS - 1;
    const resultPrompt = isLastRound
      ? `Tool "${action.action}" returned this data:\n\n${JSON.stringify(toolResult, null, 2).slice(0, 3000)}\n\nPlease summarize this data for the user in a clear, friendly way. Use formatting (bold, lists) if helpful. Be specific with the numbers. This is your final response — do not call another tool.`
      : `Tool "${action.action}" returned this data:\n\n${JSON.stringify(toolResult, null, 2).slice(0, 3000)}\n\nYou can now either:\n1. Call another tool if needed (respond with JSON action)\n2. Summarize the results for the user in natural language`;

    currentMessages.push(
      { role: "assistant", content: JSON.stringify(action) },
      { role: "user", content: resultPrompt }
    );
  }

  // If we exhausted all rounds, do a final summary
  try {
    const result = await chatWithFallback(currentMessages);
    return NextResponse.json({
      reply: result.content,
      action: lastAction ?? undefined,
    });
  } catch {
    return NextResponse.json({
      reply: lastAction?.result
        ? `Here's what I found:\n\n${JSON.stringify(lastAction.result, null, 2).slice(0, 1000)}`
        : "I couldn't complete your request. Please try again.",
      action: lastAction ?? undefined,
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

    case "reply_to_comment": {
      const commentId = params.commentId as string;
      const replyText = params.text as string;
      if (!commentId || !replyText) {
        return { error: "commentId and text are required" };
      }
      // Verify the comment exists
      const comment = await targetDb.comment.findUnique({ where: { id: commentId } }).catch(() => null);
      if (!comment) return { error: "Comment not found" };
      // Mark as replied + store the reply
      const updated = await targetDb.comment.update({
        where: { id: commentId },
        data: {
          replied: true,
          replyText: replyText.trim(),
          repliedAt: new Date(),
        },
      });
      return {
        ok: true,
        commentId: updated.id,
        author: updated.author,
        originalText: updated.text.slice(0, 100),
        reply: replyText.trim(),
        repliedAt: new Date().toISOString(),
      };
    }

    case "schedule_post": {
      const caption = params.caption as string;
      const platforms = params.platforms as string[];
      const scheduledAt = params.scheduledAt as string;
      if (!caption || !platforms?.length) {
        return { error: "caption and platforms are required" };
      }
      // Parse the scheduled time
      let scheduleDate: Date | null = null;
      if (scheduledAt) {
        try {
          scheduleDate = new Date(scheduledAt);
          if (isNaN(scheduleDate.getTime())) {
            // Try parsing natural language like "tomorrow 3pm" — basic support
            const now = new Date();
            if (scheduledAt.toLowerCase().includes("tomorrow")) {
              scheduleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              scheduleDate.setHours(15, 0, 0, 0); // default 3pm
            } else if (scheduledAt.toLowerCase().includes("next week")) {
              scheduleDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              scheduleDate.setHours(12, 0, 0, 0);
            } else {
              scheduleDate = new Date(scheduledAt);
            }
          }
        } catch {
          scheduleDate = null;
        }
      }

      // Find accounts for the requested platforms
      const accounts = await targetDb.account.findMany({
        where: {
          ...tenantWhere(scope),
          platform: { in: platforms },
        },
      });

      if (accounts.length === 0) {
        return { error: `No connected accounts found for platforms: ${platforms.join(", ")}. Connect accounts first in the Accounts section.` };
      }

      // Create the post
      const post = await targetDb.post.create({
        data: {
          title: caption.slice(0, 60),
          caption: caption,
          status: scheduleDate ? "scheduled" : "draft",
          scheduledAt: scheduleDate,
          authorId: userId,
          customerId: scope.customerId,
          tone: "Confident",
          variants: {
            create: accounts.map((a) => ({
              accountId: a.id,
              content: caption,
              status: scheduleDate ? "scheduled" : "draft",
            })),
          },
        },
        include: { variants: true },
      });

      return {
        ok: true,
        postId: post.id,
        title: post.title,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        platforms: post.variants.map((v) => v.platform),
        message: scheduleDate
          ? `Post scheduled for ${scheduleDate.toLocaleString()} to ${accounts.length} account(s)`
          : `Post saved as draft. ${accounts.length} variant(s) created.`,
      };
    }

    case "get_user_activity": {
      const targetUserId = (params.userId as string) || userId;
      const days = (params.days as number) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [posts, tasks, comments, activities] = await Promise.all([
        targetDb.post.count({
          where: {
            authorId: targetUserId,
            ...tenantWhere(scope),
            createdAt: { gte: since },
          },
        }),
        targetDb.task.count({
          where: {
            ...tenantWhere(scope),
            OR: [
              { creatorId: targetUserId },
              { assigneeId: targetUserId },
            ],
            createdAt: { gte: since },
          },
        }),
        targetDb.comment.count({
          where: { assigneeId: targetUserId, createdAt: { gte: since } },
        }),
        targetDb.activity.findMany({
          where: { userId: targetUserId, createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

      // Get user info
      const userInfo = await targetDb.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, email: true, role: true, title: true, department: true },
      }).catch(() => null);

      return {
        user: userInfo ?? { name: "Unknown" },
        period: `Last ${days} days`,
        postsCreated: posts,
        tasksInvolved: tasks,
        commentsAssigned: comments,
        recentActivities: activities.map((a) => ({
          type: a.type,
          description: a.description,
          date: a.createdAt.toISOString(),
        })),
      };
    }

    case "delete_post": {
      const postId = params.postId as string;
      if (!postId) return { error: "postId is required" };
      const post = await targetDb.post.findUnique({ where: { id: postId } }).catch(() => null);
      if (!post) return { error: "Post not found" };
      await targetDb.post.delete({ where: { id: postId } });
      return { ok: true, deletedPostId: postId, title: post.title };
    }

    case "search_posts": {
      const query = params.query as string;
      const limit = (params.limit as number) || 10;
      if (!query) return { error: "query is required" };
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const posts = await targetDb.post.findMany({
        where: {
          ...baseWhere,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { caption: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          variants: { select: { platform: true, status: true, likes: true, comments: true, shares: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return posts.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        author: p.author?.name ?? "Unknown",
        platforms: p.variants.map((v) => v.platform),
        totalEngagement: p.variants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
        createdAt: p.createdAt.toISOString(),
      }));
    }

    case "get_post_engagement": {
      const postId = params.postId as string;
      if (!postId) return { error: "postId is required" };
      const post = await targetDb.post.findUnique({
        where: { id: postId },
        include: {
          variants: {
            include: { account: { select: { handle: true, displayName: true } } },
          },
        },
      }).catch(() => null);
      if (!post) return { error: "Post not found" };
      const variants = post.variants.map((v) => ({
        platform: v.platform,
        account: v.account?.displayName ?? v.account?.handle ?? "Unknown",
        status: v.status,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        reach: v.reach,
        impressions: v.impressions,
        engagement: v.likes + v.comments + v.shares,
      }));
      return {
        postId: post.id,
        title: post.title,
        status: post.status,
        totalLikes: variants.reduce((s, v) => s + v.likes, 0),
        totalComments: variants.reduce((s, v) => s + v.comments, 0),
        totalShares: variants.reduce((s, v) => s + v.shares, 0),
        totalReach: variants.reduce((s, v) => s + v.reach, 0),
        totalEngagement: variants.reduce((s, v) => s + v.engagement, 0),
        perPlatform: variants,
      };
    }

    case "get_media": {
      const query = params.query as string | undefined;
      const type = params.type as string | undefined;
      const limit = (params.limit as number) || 10;
      const baseWhere = scope.isSuperAdmin ? {} : tenantWhere(scope);
      const assets = await targetDb.mediaAsset.findMany({
        where: {
          ...baseWhere,
          ...(type ? { type } : {}),
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        thumbnail: a.thumbnail,
        size: a.size,
        folder: a.folder,
        createdAt: a.createdAt.toISOString(),
      }));
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
