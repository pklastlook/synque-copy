import { NextResponse } from "next/server";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

/**
 * GET /api/docs
 *
 * Returns an OpenAPI 3.0 spec describing the public SYNQUE REST API.
 *
 * This is the spec rendered by the Swagger UI page at `/api-docs`. Every
 * endpoint listed here is documented (auth scheme + sample schema) so
 * consumers can integrate against SYNQUE without reading the source.
 *
 * The spec is intentionally narrow — it advertises the STABLE surface
 * (posts, accounts, analytics, inbox, webhooks, etc.) and not the
 * internal admin routes. Endpoints require a Bearer JWT in the
 * Authorization header.
 *
 * Auth: required by the middleware (any valid JWT — no special role).
 * The spec itself is identical for every caller; access control happens
 * at the route level via requireAuth / requireRole.
 */

// Common reusable parameter objects
const bearerAuth = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Authorization: Bearer <token>. The JWT is issued by POST /api/auth/login. Carry it on every protected request.",
};

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
});

const okResponse = (schema: unknown, description = "OK") => ({
  description,
  content: {
    "application/json": {
      schema,
    },
  },
});

const spec = {
  openapi: "3.0.0",
  info: {
    title: "SYNQUE API",
    version: "1.0",
    description:
      "SYNQUE is a liquid-retina social media team work management platform. This API exposes posts, accounts, analytics, inbox, competitors, webhooks, and team performance endpoints. All endpoints (except /api/auth/* and /api/oauth/callback/*) require a Bearer JWT in the Authorization header.",
    contact: { name: "SYNQUE", url: "https://synque.cloud" },
  },
  servers: [
    { url: "/", description: "Relative to the SYNQUE origin (uses the gateway)" },
  ],
  components: {
    securitySchemes: { bearerAuth },
    schemas: {
      Post: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          caption: { type: "string" },
          mediaUrl: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["draft", "scheduled", "published", "failed", "pending_approval"],
          },
          scheduledAt: { type: "string", format: "date-time", nullable: true },
          authorId: { type: "string" },
          authorName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          variants: {
            type: "array",
            items: { $ref: "#/components/schemas/PostVariant" },
          },
        },
      },
      PostVariant: {
        type: "object",
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          platform: { type: "string" },
          handle: { type: "string" },
          content: { type: "string" },
          hashtags: { type: "string", nullable: true },
          status: { type: "string", enum: ["draft", "scheduled", "published", "failed"] },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          likes: { type: "integer" },
          comments: { type: "integer" },
          shares: { type: "integer" },
          reach: { type: "integer" },
          impressions: { type: "integer" },
          saves: { type: "integer" },
        },
      },
      Account: {
        type: "object",
        properties: {
          id: { type: "string" },
          platform: { type: "string" },
          handle: { type: "string" },
          displayName: { type: "string" },
          avatar: { type: "string", nullable: true },
          followers: { type: "integer" },
          postsCount: { type: "integer" },
          verified: { type: "boolean" },
          ownerId: { type: "string" },
        },
      },
      AnalyticsSummary: {
        type: "object",
        properties: {
          totals: {
            type: "object",
            properties: {
              impressions: { type: "integer" },
              reach: { type: "integer" },
              engagement: { type: "number" },
              followers: { type: "integer" },
            },
          },
          perAccount: {
            type: "array",
            items: { type: "object" },
          },
          followerSeries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                followers: { type: "integer" },
              },
            },
          },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          author: { type: "string" },
          authorAvatar: { type: "string", nullable: true },
          text: { type: "string" },
          type: { type: "string", enum: ["comment", "message", "mention"] },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          replied: { type: "boolean" },
          replyText: { type: "string", nullable: true },
          assigneeId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Webhook: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          url: { type: "string" },
          events: { type: "array", items: { type: "string" } },
          secret: { type: "string", description: "masked in GET responses" },
          active: { type: "boolean" },
          customerId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Competitor: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          handle: { type: "string" },
          platform: { type: "string" },
          followers: { type: "integer" },
          engagementRate: { type: "number" },
          growthRate: { type: "number" },
          postingFreq: { type: "number" },
          status: { type: "string", enum: ["tracking", "paused"] },
        },
      },
      CompetitorAnalysis: {
        type: "object",
        properties: {
          posts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                likes: { type: "integer" },
                comments: { type: "integer" },
                shares: { type: "integer" },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                postedAt: { type: "string", format: "date-time" },
              },
            },
          },
          sentimentBreakdown: {
            type: "object",
            properties: {
              positive: { type: "integer" },
              neutral: { type: "integer" },
              negative: { type: "integer" },
            },
          },
          contentGaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                competitorPosts: { type: "integer" },
                yourPosts: { type: "integer" },
              },
            },
          },
          shareOfVoice: {
            type: "number",
            description: "Competitor engagement / (competitor + your engagement), 0–1.",
          },
          topPosts: {
            type: "array",
            items: { type: "object" },
          },
        },
      },
      TeamMemberPerformance: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          title: { type: "string", nullable: true },
          department: { type: "string", nullable: true },
          color: { type: "string", nullable: true },
          status: { type: "string" },
          metrics: {
            type: "object",
            properties: {
              postsCreated: { type: "integer" },
              publishedPosts: { type: "integer" },
              avgEngagementPerPost: { type: "number" },
              avgResponseTimeMin: { type: "number", description: "Minutes (avg time-to-first-reply on assigned comments)." },
              tasksAssigned: { type: "integer" },
              completedTasks: { type: "integer" },
              activeDays: { type: "integer", description: "Days with at least one action in the last 30 days." },
              activityScore: { type: "number", description: "Weighted combination of the above (0–100)." },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/posts": {
      get: {
        summary: "List posts",
        description:
          "Returns the 50 most recent posts in the caller's tenant, newest first. Optional `?status=` and `?authorId=` filters.",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" }, required: false },
          { name: "authorId", in: "query", schema: { type: "string" }, required: false },
        ],
        responses: {
          200: okResponse({
            type: "array",
            items: { $ref: "#/components/schemas/Post" },
          }),
          401: errorResponse("Authentication required."),
        },
      },
      post: {
        summary: "Create a post",
        description:
          "Creates a post + per-account PostVariant entries. Editors/members auto-route to pending_approval; admins/managers can publish immediately or schedule.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "caption", "accountIds", "variants", "authorId"],
                properties: {
                  title: { type: "string" },
                  caption: { type: "string" },
                  mediaUrl: { type: "string", nullable: true },
                  tone: { type: "string" },
                  scheduledAt: { type: "string", format: "date-time", nullable: true },
                  accountIds: { type: "array", items: { type: "string" } },
                  variants: {
                    type: "object",
                    description: "Map of accountId → { content, hashtags? }.",
                  },
                  authorId: { type: "string" },
                  sendForApproval: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: okResponse({
            type: "object",
            properties: {
              id: { type: "string" },
              ok: { type: "boolean" },
              status: { type: "string" },
            },
          }),
          400: errorResponse("Missing required fields."),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/api/posts/{id}": {
      get: {
        summary: "Get a single post",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: okResponse({ $ref: "#/components/schemas/Post" }),
          404: errorResponse("Post not found."),
        },
      },
      patch: {
        summary: "Update a post",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          200: okResponse({ type: "object", properties: { ok: { type: "boolean" } } }),
          404: errorResponse("Post not found."),
        },
      },
      delete: {
        summary: "Delete a post",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: okResponse({ type: "object", properties: { ok: { type: "boolean" } } }),
          404: errorResponse("Post not found."),
        },
      },
    },
    "/api/accounts": {
      get: {
        summary: "List social accounts",
        description:
          "Returns the connected social accounts owned by the caller (tenant-scoped). Each account has a platform, handle, follower count, and owner.",
        responses: {
          200: okResponse({
            type: "array",
            items: { $ref: "#/components/schemas/Account" },
          }),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/api/analytics": {
      get: {
        summary: "Get aggregated analytics",
        description:
          "Returns engagement / reach / impression totals + per-account breakdowns + a follower time-series. Optional `?days=30&accountId=all` query params.",
        parameters: [
          { name: "days", in: "query", schema: { type: "integer" }, required: false },
          { name: "accountId", in: "query", schema: { type: "string" }, required: false },
        ],
        responses: {
          200: okResponse({ $ref: "#/components/schemas/AnalyticsSummary" }),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/api/inbox": {
      get: {
        summary: "List inbox comments",
        description:
          "Returns comments/messages/mentions across the caller's connected accounts. Optional `?status=` and `?sentiment=` filters.",
        responses: {
          200: okResponse({
            type: "array",
            items: { $ref: "#/components/schemas/Comment" },
          }),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/api/inbox/{id}/reply": {
      post: {
        summary: "Reply to a comment",
        description:
          "Posts a reply on the actual platform (X/IG/FB) using stored credentials. Falls back to saving the reply locally if the platform call fails. Fires a `comment.received` webhook after the reply is stored.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["replyText"],
                properties: { replyText: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: okResponse({
            type: "object",
            properties: {
              ok: { type: "boolean" },
              postedToPlatform: { type: "boolean" },
              message: { type: "string" },
            },
          }),
          404: errorResponse("Comment not found."),
        },
      },
    },
    "/api/competitors": {
      get: {
        summary: "List competitors",
        description:
          "Returns tracked competitors for the caller's tenant, sorted by follower count. Each row includes a 30-day follower snapshot series.",
        responses: {
          200: okResponse({
            type: "array",
            items: { $ref: "#/components/schemas/Competitor" },
          }),
          401: errorResponse("Authentication required."),
        },
      },
      post: {
        summary: "Add a competitor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "handle", "platform"],
                properties: {
                  name: { type: "string" },
                  handle: { type: "string" },
                  platform: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: okResponse({
            type: "object",
            properties: { id: { type: "string" }, ok: { type: "boolean" } },
          }),
          400: errorResponse("Missing required fields."),
        },
      },
    },
    "/api/competitors/sync": {
      post: {
        summary: "Sync competitor metrics + posts",
        description:
          "Fetches real follower counts, engagement rates, and recent posts from each tracked competitor's platform API. Stores posts as CompetitorPost rows for the analyze endpoint. Body `{ competitorId?: string }` to sync a single competitor.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { competitorId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: okResponse({
            type: "object",
            properties: {
              ok: { type: "boolean" },
              synced: { type: "array", items: { type: "object" } },
              errors: { type: "array", items: { type: "string" } },
              total: { type: "integer" },
              updated: { type: "integer" },
            },
          }),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/api/competitors/{id}/analyze": {
      post: {
        summary: "Deep analysis of a competitor",
        description:
          "Fetches the competitor's recent posts, runs sentiment analysis on each, identifies content gaps (topics they cover that you don't), and calculates share-of-voice (their engagement vs yours). Returns posts, sentimentBreakdown, contentGaps, shareOfVoice.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: okResponse({ $ref: "#/components/schemas/CompetitorAnalysis" }),
          404: errorResponse("Competitor not found."),
        },
      },
    },
    "/api/team-performance": {
      get: {
        summary: "Per-member team metrics",
        description:
          "Returns per-member content activity (posts created/published, avg engagement, response time, task completion, active days, weighted activity score) plus team totals, a leaderboard, a 90-day activity heatmap, and account-health summaries.",
        responses: {
          200: okResponse({
            type: "object",
            properties: {
              members: {
                type: "array",
                items: { $ref: "#/components/schemas/TeamMemberPerformance" },
              },
              teamTotals: { type: "object" },
              leaderboard: { type: "object" },
              pipeline: { type: "object" },
              trend: { type: "array", items: { type: "object" } },
              activityHeatmap: { type: "array", items: { type: "object" } },
              recentActivities: { type: "array", items: { type: "object" } },
              accountHealth: { type: "array", items: { type: "object" } },
              healthSummary: { type: "object" },
            },
          }),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/api/webhooks": {
      get: {
        summary: "List outbound webhooks",
        description:
          "Returns webhooks registered for the caller's tenant. The `secret` is masked (only the first 4 + last 4 chars).",
        responses: {
          200: okResponse({
            type: "array",
            items: { $ref: "#/components/schemas/Webhook" },
          }),
          401: errorResponse("Authentication required."),
        },
      },
      post: {
        summary: "Register a webhook endpoint",
        description:
          "Mints a new webhook with a random HMAC secret. The full secret is returned ONCE in this response (never again on GET). Valid events: " +
          WEBHOOK_EVENTS.join(", ") +
          ".",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url", "events"],
                properties: {
                  url: { type: "string", format: "uri" },
                  label: { type: "string" },
                  events: { type: "array", items: { type: "string" } },
                  active: { type: "boolean" },
                  customerId: { type: "string", description: "Super-admin only." },
                },
              },
            },
          },
        },
        responses: {
          200: okResponse({
            type: "object",
            properties: {
              id: { type: "string" },
              secret: { type: "string", description: "Full secret — shown ONCE." },
              ok: { type: "boolean" },
            },
          }),
          400: errorResponse("Invalid url or events."),
        },
      },
    },
    "/api/webhooks/{id}": {
      get: {
        summary: "Get a webhook",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: okResponse({ $ref: "#/components/schemas/Webhook" }),
          404: errorResponse("Webhook not found."),
        },
      },
      patch: {
        summary: "Update a webhook",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  url: { type: "string", format: "uri" },
                  events: { type: "array", items: { type: "string" } },
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: okResponse({ type: "object", properties: { ok: { type: "boolean" } } }),
          404: errorResponse("Webhook not found."),
        },
      },
      delete: {
        summary: "Delete a webhook",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: okResponse({ type: "object", properties: { ok: { type: "boolean" } } }),
          404: errorResponse("Webhook not found."),
        },
      },
    },
  },
  tags: [
    { name: "Posts", description: "Create, schedule, publish, and analyze posts." },
    { name: "Accounts", description: "Manage connected social accounts." },
    { name: "Analytics", description: "Engagement, reach, follower growth." },
    { name: "Inbox", description: "Comments, mentions, DMs across platforms." },
    { name: "Competitors", description: "Track rivals + deep content analysis." },
    { name: "Team Performance", description: "Per-member content activity metrics." },
    { name: "Webhooks", description: "Outbound HMAC-signed event delivery." },
  ],
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
