/**
 * Chat Mini-Service — Real-time WebSocket gateway
 *
 * Socket.io server on port 3006. Powers:
 *   - Team chat (group + DM) live message delivery + typing indicators
 *   - Inbox live updates (new comments / mentions broadcast to a tenant)
 *   - Notification live push (new notifications delivered to a single user)
 *
 * Auth: every socket MUST present a valid JWT (verified with the same
 * JWT_SECRET as the main app) in the `auth.token` field of the socket.io
 * handshake. The decoded payload yields { userId, email, role, customerId }
 * which we use to derive the rooms the socket is allowed to join.
 *
 * Rooms:
 *   - `tenant:{customerId}`  — tenant-wide (every member of the org).
 *                              Super-admins (customerId === null) join
 *                              `tenant:admin` instead.
 *   - `user:{userId}`        — direct pipe to a single user (notifications).
 *   - `dm:{userIdA}:{userIdB}` — direct message between two users. The two
 *                              IDs are sorted lexicographically so both
 *                              parties compute the same room name.
 *
 * Gateway rules (per project convention):
 *   - The server binds to 127.0.0.1 (loopback only — never 0.0.0.0).
 *   - The frontend connects via `io("/?XTransformPort=3006")` — Caddy
 *     forwards that to this port based on the XTransformPort query.
 *   - The socket.io `path` is `/` so Caddy can route by query alone.
 *
 * Events:
 *   client → server:
 *     `chat:message`     { room, message }        → broadcast to room (excl. sender)
 *     `chat:typing`      { room, userId, name }   → broadcast to room (excl. sender)
 *     `chat:stop_typing` { room, userId }         → broadcast to room (excl. sender)
 *     `join:room`        { room }                 → join an allowed room
 *
 *   server → client:
 *     `chat:message`        message            (other clients in the room)
 *     `chat:typing`         { userId, name }   (other clients in the room)
 *     `chat:stop_typing`    { userId }         (other clients in the room)
 *     `inbox:new`           comment payload    (all sockets in the tenant room)
 *     `notification:new`    notification       (the single user's socket)
 *
 *   HTTP webhook (for the main Next.js app to fan out server-side events):
 *     POST /broadcast   Bearer <MINI_SERVICE_KEY>
 *       { event: "inbox:new" | "notification:new" | "chat:message",
 *         room: string, payload: unknown }
 *     → io.to(room).emit(event, payload)
 *
 *   GET /health        (no auth) — liveness probe.
 */
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { config as loadEnv } from "dotenv";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

loadEnv({ override: true });

// ─── Security config ────────────────────────────────────────────────────────
const SERVICE_KEY = process.env.MINI_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PORT = parseInt(process.env.PORT || "3006", 10);

if (!SERVICE_KEY) {
  console.error("[chat-service] FATAL: MINI_SERVICE_KEY env var is required");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("[chat-service] FATAL: JWT_SECRET env var is required");
  process.exit(1);
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  customerId?: string | null;
}

interface SocketSession {
  userId: string;
  email: string;
  role: string;
  customerId: string | null;
  roomsJoined: Set<string>;
}

// socket.data.session — keyed access for handlers
declare module "socket.io" {
  interface SocketData {
    session?: SocketSession;
  }
}

// ─── Per-socket session map (for /broadcast introspection + debug) ─────────
const sessions = new Map<string, SocketSession>();

// ─── Helpers ───────────────────────────────────────────────────────────────
function tenantRoomFor(customerId: string | null): string {
  // Super-admins (no tenant) get a shared admin room. They typically only
  // use this for live platform-wide events; regular users never join here.
  return `tenant:${customerId ?? "admin"}`;
}

function userRoomFor(userId: string): string {
  return `user:${userId}`;
}

/** Build a deterministic DM room name from two user IDs. */
function dmRoomFor(a: string, b: string): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}

/** Verify a room name is one the socket is allowed to join.
 *  - tenant:<ownCustomerId>        (always allowed)
 *  - user:<ownUserId>              (always allowed — for self-notifications)
 *  - dm:<ownId>:<otherId>          (only if the requester is one of the two) */
function canJoinRoom(room: string, session: SocketSession): boolean {
  if (room === tenantRoomFor(session.customerId)) return true;
  if (room === userRoomFor(session.userId)) return true;

  // DM rooms — must include the requester's own id
  const dmMatch = room.match(/^dm:([^:]+):([^:]+)$/);
  if (dmMatch) {
    const [, a, b] = dmMatch;
    return a === session.userId || b === session.userId;
  }
  return false;
}

function verifyToken(token: string | undefined | null): JwtPayload | null {
  if (!token || typeof token !== "string") return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    if (!decoded?.userId) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ─── HTTP server (for /health + internal /broadcast webhook) ───────────────
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // CORS — scoped to APP_URL only (no wildcard).
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": APP_URL,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Health — no auth required.
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({
      ok: true,
      service: "chat-service",
      port: PORT,
      connections: sessions.size,
      uptimeSec: Math.round(process.uptime()),
    }));
    return;
  }

  // Auth gate — every other route requires the shared MINI_SERVICE_KEY.
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SERVICE_KEY}`) {
    res.writeHead(401, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // POST /broadcast — internal webhook for the main Next.js app to fan
  // out server-originated events (new comment, new notification, etc.).
  // Body: { event: "inbox:new"|"notification:new"|"chat:message", room: string, payload: unknown }
  if (req.method === "POST" && url.pathname === "/broadcast") {
    let body: any = {};
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }

    const { event, room, payload } = body as {
      event?: string;
      room?: string;
      payload?: unknown;
    };

    if (!event || !room || typeof event !== "string" || typeof room !== "string") {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "event and room are required" }));
      return;
    }

    // Allow-list of fan-out events to prevent abuse of the webhook.
    const ALLOWED_EVENTS = new Set([
      "inbox:new",
      "notification:new",
      "chat:message",
      "chat:typing",
      "chat:stop_typing",
    ]);
    if (!ALLOWED_EVENTS.has(event)) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: `Event "${event}" is not broadcastable` }));
      return;
    }

    io.to(room).emit(event, payload);
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ ok: true, event, room, delivered: true }));
    return;
  }

  // GET /sessions — debug-only; lists the currently connected sockets
  // (no PII — just userId + room count). Useful when triaging why a user
  // isn't receiving live updates.
  if (req.method === "GET" && url.pathname === "/sessions") {
    const list = Array.from(sessions.entries()).map(([socketId, s]) => ({
      socketId,
      userId: s.userId,
      customerId: s.customerId,
      rooms: Array.from(s.roomsJoined),
    }));
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ sessions: list, total: list.length }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
  res.end(JSON.stringify({ error: "Not found" }));
});

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

// ─── Socket.io server ──────────────────────────────────────────────────────
const io = new Server(httpServer, {
  // DO NOT change the path — Caddy routes by ?XTransformPort alone.
  path: "/",
  // Same-origin under the gateway; we still set CORS to APP_URL so direct
  // (non-gateway) connections during local dev work.
  cors: {
    origin: APP_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60_000,
  pingInterval: 25_000,
  // Allow long-polling as a fallback when WebSocket can't establish
  // (corporate proxies, etc.). The client prefers websocket.
  transports: ["websocket", "polling"],
  // Reject the connection at the middleware layer if the JWT is invalid —
  // this prevents anonymous sockets from lingering.
  allowRequest: (req, fn) => {
    try {
      // The token is in `auth.token` of the handshake — socket.io serialises
      // it as a query param `auth` (URL-encoded JSON) during the polling
      // handshake, then promotes it to socket.handshake.auth on upgrade.
      const authHeader = req.headers.authorization;
      let token: string | null = null;

      // 1) Direct Authorization: Bearer <jwt> (used by the /broadcast
      //    webhook and by clients that opt into header-based auth).
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }

      // 2) socket.io `auth` field — passed as ?auth=<json> on the
      //    initial polling handshake. Parse it defensively.
      if (!token) {
        const url = new URL(req.url ?? "/", "http://localhost");
        const authRaw = url.searchParams.get("auth");
        if (authRaw) {
          try {
            const parsed = JSON.parse(decodeURIComponent(authRaw));
            token = parsed?.token ?? parsed?.Authorization?.replace(/^Bearer\s+/, "") ?? null;
          } catch {
            // Malformed — fall through.
          }
        }
      }

      const payload = verifyToken(token);
      if (!payload) {
        fn("Authentication required", false);
        return;
      }
      // Stash the payload on the request so the `connection` handler can
      // pick it up without re-verifying the token. We use a custom symbol
      // to avoid mutating the typed IncomingMessage interface.
      (req as IncomingMessage & { __jwt?: JwtPayload }).__jwt = payload;
      fn(null, true);
    } catch (e) {
      fn(e instanceof Error ? e.message : "Auth error", false);
    }
  },
});

// ─── Connection lifecycle ──────────────────────────────────────────────────
io.on("connection", (socket: Socket) => {
  const jwtPayload = (socket.request as IncomingMessage & { __jwt?: JwtPayload }).__jwt;
  if (!jwtPayload) {
    // Should never happen — allowRequest already filtered this — but be safe.
    socket.disconnect(true);
    return;
  }

  const session: SocketSession = {
    userId: jwtPayload.userId,
    email: jwtPayload.email,
    role: jwtPayload.role,
    customerId: jwtPayload.customerId ?? null,
    roomsJoined: new Set(),
  };

  socket.data.session = session;
  sessions.set(socket.id, session);

  // Auto-join the user's tenant room + their personal user room so server
  // broadcasts (e.g. notification:new) reach them without an explicit join.
  const tenantRoom = tenantRoomFor(session.customerId);
  const userRoom = userRoomFor(session.userId);
  void socket.join(tenantRoom);
  void socket.join(userRoom);
  session.roomsJoined.add(tenantRoom);
  session.roomsJoined.add(userRoom);

  console.log(
    `[chat-service] connect  user=${session.userId}  tenant=${session.customerId ?? "admin"}  socket=${socket.id}`
  );

  // Tell the client its session is ready (the client uses this to fire
  // any deferred "after-connect" work, e.g. marking notifications read).
  socket.emit("session:ready", {
    userId: session.userId,
    tenantRoom,
    userRoom,
  });

  // ─── join:room ──────────────────────────────────────────────────────────
  // Allows the client to opt into additional rooms (e.g. a specific DM).
  // We validate the room name against the session to prevent a client
  // from joining another tenant's room.
  socket.on("join:room", (data: unknown, ack?: (res: unknown) => void) => {
    const room = (data as { room?: string })?.room;
    if (!room || typeof room !== "string") {
      ack?.({ ok: false, error: "room required" });
      return;
    }
    if (!canJoinRoom(room, session)) {
      ack?.({ ok: false, error: "Not allowed to join this room" });
      return;
    }
    void socket.join(room);
    session.roomsJoined.add(room);
    ack?.({ ok: true, room });
  });

  // ─── chat:message ───────────────────────────────────────────────────────
  // Client emits this after the POST /api/chat succeeds. We broadcast
  // to the rest of the room (NOT the sender — the sender already has the
  // message locally from the API response).
  socket.on("chat:message", (data: unknown) => {
    const d = data as { room?: string; message?: unknown };
    if (!d?.room || !d?.message) return;
    if (!canJoinRoom(d.room, session)) {
      // Don't leak that the room exists — just silently drop.
      return;
    }
    socket.to(d.room).emit("chat:message", d.message);
  });

  // ─── chat:typing ────────────────────────────────────────────────────────
  socket.on("chat:typing", (data: unknown) => {
    const d = data as { room?: string; userId?: string; name?: string };
    if (!d?.room || !d?.userId) return;
    if (!canJoinRoom(d.room, session)) return;
    // Sanity-check the userId matches the sender — never trust the
    // client's claimed identity for typing indicators.
    if (d.userId !== session.userId) return;
    socket.to(d.room).emit("chat:typing", { userId: d.userId, name: d.name });
  });

  // ─── chat:stop_typing ───────────────────────────────────────────────────
  socket.on("chat:stop_typing", (data: unknown) => {
    const d = data as { room?: string; userId?: string };
    if (!d?.room || !d?.userId) return;
    if (!canJoinRoom(d.room, session)) return;
    if (d.userId !== session.userId) return;
    socket.to(d.room).emit("chat:stop_typing", { userId: d.userId });
  });

  // ─── disconnect ─────────────────────────────────────────────────────────
  socket.on("disconnect", (reason: string) => {
    sessions.delete(socket.id);
    console.log(
      `[chat-service] disconnect  user=${session.userId}  socket=${socket.id}  reason=${reason}`
    );
  });

  socket.on("error", (err: unknown) => {
    console.error(`[chat-service] socket error (${socket.id}):`, err);
  });
});

// ─── Heartbeat log (every 60s) ─────────────────────────────────────────────
setInterval(() => {
  console.log(
    `[chat-service] ♥ ${sessions.size} socket(s) connected`
  );
}, 60_000);

// ─── Start ──────────────────────────────────────────────────────────────────
function main() {
  process.on("unhandledRejection", (err) => {
    console.error("[chat-service] Unhandled rejection:", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[chat-service] Uncaught exception:", err);
  });

  httpServer.listen(PORT, "127.0.0.1", () => {
    console.log(`[chat-service] Socket.io listening on http://127.0.0.1:${PORT}`);
    console.log(`[chat-service] CORS origin: ${APP_URL}`);
    console.log("[chat-service] Auto-joins: tenant:<customerId> + user:<userId>");
    console.log("[chat-service] Webhook:    POST /broadcast  (Bearer MINI_SERVICE_KEY)");
  });
}

main();
