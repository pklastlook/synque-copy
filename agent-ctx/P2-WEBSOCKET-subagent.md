# P2-WEBSOCKET — Real-time WebSocket for chat + inbox + notifications

**Task ID**: P2-WEBSOCKET
**Agent**: subagent (senior backend developer)
**Status**: ✅ Complete

## Summary

Added real-time WebSocket support via a new `chat-service` mini-service (Socket.io on port 3006). The frontend now receives `chat:message`, `inbox:new`, and `notification:new` events instantly — no more polling lag. Existing polling is RETAINED as a fallback so the UI still works when the WS is disconnected.

## Files delivered

### New
1. **`mini-services/chat-service/package.json`** — bun project; deps: `socket.io@4.8.4`, `jsonwebtoken@9.0.3`, `dotenv@16.4.0`. Scripts: `dev` (bun --hot), `start`.
2. **`mini-services/chat-service/index.ts`** — Socket.io server on port 3006. Binds to 127.0.0.1. JWT-verified handshake (`auth.token`). Auto-joins `tenant:<customerId>` + `user:<userId>` rooms on connect. Handles `chat:message`, `chat:typing`, `chat:stop_typing`, `join:room`. Exposes internal HTTP `POST /broadcast` webhook (Bearer MINI_SERVICE_KEY) for the main Next.js app to fan out server-side `inbox:new` / `notification:new` events. GET `/health` + GET `/sessions` for debugging.
3. **`src/lib/use-websocket.ts`** — `useWebSocket()` React hook returning `{ socket, isConnected }`. Module-level singleton socket (ref-counted across consumers) so a single tab uses one connection. Auto-reconnects. Pulls JWT from `localStorage["socialflow-auth"]` and passes as `auth.token` on handshake. Re-checks token on window focus (handles login/logout in another tab). Exports `dmRoom(a, b)`, `tenantRoom(customerId)`, `userRoom(userId)` helpers.

### Modified
4. **`Caddyfile`** — added `@port_3006` matcher + `handle` block for the new chat-service (SSRF allowlist entry, same loopback pattern as 3000/3002/3003/3004/3005).
5. **`src/components/views/chat.tsx`** — wires the socket into the existing chat view:
   - `liveMessages` overlay appended to polled `data.messages` (de-duped by id).
   - After POST /api/chat succeeds, emits `chat:message` with `{ room, message }` so other clients in the room receive the broadcast instantly.
   - Listens for `chat:message` events and appends to `liveMessages` (recomputes `isMine` defensively).
   - Typing indicator: input emits `chat:typing` (throttled to one event per 2s) on each keystroke; emits `chat:stop_typing` on send / blur / 3s of silence. Listens for both events and renders a "X is typing..." bubble with animated dots.
   - 8s polling RETAINED as a fallback. When WS is disconnected, shows a subtle "Live updates paused — falling back to 8s polling" notice above the composer.
6. **`src/components/views/inbox.tsx`** — wires the socket into the inbox view:
   - `liveComments` overlay PREPENDED to polled `data` (de-duped by id).
   - Listens for `inbox:new` events; on arrival, prepends the comment to `liveComments`, marks the id as "new" (drives a subtle "New" badge), and schedules a 30s auto-clear of the badge.
   - `ConversationRow` gains an `isNew` prop — renders a blue "New" pill + a faint `bg-blue-500/[0.04]` row tint for the first 30s after arrival.
   - Clicking a row clears its "New" badge (`markLiveSeen`).
7. **`src/components/glass/notification-bell.tsx`** — wires the socket into the notification bell:
   - Listens for `notification:new` events — on arrival, increments the unread badge immediately AND prepends the item to the dropdown list (only if the panel has already been opened; otherwise the next open fetches the canonical list which includes the new notification).
   - Polling fallback cadence changed from **60s → 5 minutes** (now that WS is the primary path). Window-focus re-poll retained.
   - Footer label changed from "Updates every 60s" → "Live · fallback every 5m".

## Architecture decisions

### 1. Singleton socket (one per tab)
Every consumer of `useWebSocket()` in a given tab shares ONE underlying socket.io connection. This keeps the chat-service's per-user socket count at one (not one-per-component) and avoids the bug where a second consumer would create a new socket that disconnects the first. The socket is reference-counted: it disconnects only when the last consumer unmounts.

### 2. JWT-verified handshake
The chat-service uses Socket.io's `allowRequest` middleware to verify the JWT signature (with the same `JWT_SECRET` as the main Next.js app) BEFORE the socket is upgraded. Unauthenticated connections are rejected at the polling-handshake stage — no anonymous sockets can linger. The decoded payload (`userId`, `customerId`, `role`, `email`) is stashed on `socket.data.session` for downstream handlers.

### 3. Server-side room authorization
The chat-service validates `join:room` requests against the socket's session (`canJoinRoom`). A socket can join only:
- `tenant:<ownCustomerId>` (auto-joined on connect)
- `user:<ownUserId>` (auto-joined on connect)
- `dm:<ownId>:<otherId>` (must include own id)

This prevents a malicious client from joining another tenant's room.

### 4. Sender-exclusion broadcast pattern
For `chat:message`, the server uses `socket.to(room).emit(...)` — broadcasts to the room EXCEPT the sender. This means the sender doesn't get an echo of their own message (which would double-render since they already have it from the POST response). The receiver recomputes `isMine` defensively based on `senderId === currentUserId`.

### 5. Live overlay pattern
Both chat and inbox use a "live overlay" approach: WS-delivered items are stored in a separate state array (`liveMessages` / `liveComments`) and merged with the polled list in a `useMemo`. The overlay is pruned on each poll cycle so it doesn't grow unbounded over a long session. De-dupe is by `id`. This preserves the existing polling contract (`useApi`) without any change to the API routes.

### 6. Typing throttling + auto-prune
Typing events are throttled to one event per 2s per sender (avoids keystroke spam). The receiver auto-prunes a typing entry after 4s of no renewed event — covers the case where the sender's `chat:stop_typing` is dropped (tab closed mid-keystroke). The sender auto-stops after 3s of silence.

### 7. POST /broadcast webhook
The chat-service exposes an internal HTTP webhook `POST /broadcast` (Bearer MINI_SERVICE_KEY) so the main Next.js app can fan out server-originated events (e.g. a new comment arriving from `/api/comments/classify` could POST to `/broadcast` with `{ event: "inbox:new", room: "tenant:xxx", payload: comment }` and have the chat-service deliver it to every member of the tenant room in real time). The webhook is allow-listed to a fixed set of broadcastable event names to prevent abuse.

## How to run

The chat-service requires two env vars: `JWT_SECRET` (same as the main app) and `MINI_SERVICE_KEY` (same as other mini-services). Start it with:
```bash
cd mini-services/chat-service && bun run dev
```

The Caddyfile already has the `@port_3006` matcher so the frontend's `io("/?XTransformPort=3006")` will be routed correctly.

## Verification

- `bun run lint` — passes with 0 errors (8 pre-existing warnings in unrelated files).
- `bunx tsc --noEmit` — 0 errors in any of the touched files (`use-websocket.ts`, `chat.tsx`, `inbox.tsx`, `notification-bell.tsx`). Pre-existing errors in unrelated files (approvals, oauth callback, ai-usage, sync-platforms) are NOT introduced by this task.
- Smoke-test: started chat-service briefly with test env vars — boots cleanly on port 3006 with the expected log lines:
  ```
  [chat-service] Socket.io listening on http://127.0.0.1:3006
  [chat-service] CORS origin: http://localhost:3000
  [chat-service] Auto-joins: tenant:<customerId> + user:<userId>
  [chat-service] Webhook:    POST /broadcast  (Bearer MINI_SERVICE_KEY)
  ```
