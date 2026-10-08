"use client";

/**
 * useWebSocket — shared Socket.io client hook.
 *
 * Connects to the chat-service gateway at `/?XTransformPort=3006` (per the
 * project's gateway rules — no direct port in the URL; Caddy forwards based
 * on the `XTransformPort` query parameter to the chat-service on port 3006).
 *
 * Authentication:
 *   The current user's JWT is pulled from `localStorage["socialflow-auth"]`
 *   (the same key the rest of the app uses via `useAuth`) and passed as
 *   `auth.token` on the socket.io handshake. The chat-service verifies the
 *   JWT signature with the same `JWT_SECRET` as the main Next.js app and
 *   rejects unauthenticated connections.
 *
 * Rooms:
 *   The chat-service auto-joins every authenticated socket to its tenant
 *   room (`tenant:{customerId}`) and personal room (`user:{userId}`). The
 *   hook does not need to emit `join:room` for these — they happen on
 *   connect. Additional rooms (e.g. a specific DM) can be joined via
 *   `socket.emit("join:room", { room })`.
 *
 * Reconnection:
 *   Socket.io's built-in reconnection is enabled (with exponential
 *   backoff). When the JWT changes (login / logout / token refresh), the
 *   existing socket is torn down and a new one is created with the new
 *   token.
 *
 * Usage:
 *   const { socket, isConnected } = useWebSocket();
 *
 *   React.useEffect(() => {
 *     if (!socket) return;
 *     const onMessage = (m: ChatMessage) => { ... };
 *     socket.on("chat:message", onMessage);
 *     return () => { socket.off("chat:message", onMessage); };
 *   }, [socket]);
 *
 *   // To emit:
 *   socket?.emit("chat:message", { room, message });
 *
 * Multiple consumers in the same tab share a single underlying socket —
 * `useWebSocket` is idempotent across hook instances thanks to a module-
 * level singleton. The socket is reference-counted: it is disconnected
 * only when the last consumer unmounts.
 */

import * as React from "react";
import { io, type Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_PATH = "/?XTransformPort=3006";

// ---------------------------------------------------------------------------
// JWT retrieval — mirrors useAuth's persisted shape so the hook is
// independent of the auth-store subscription lifecycle (and survives
// transient store hydration misses).
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("socialflow-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Singleton socket — every consumer of `useWebSocket` in a given tab shares
// ONE socket.io connection. This keeps the chat-service's per-user socket
// count at one (not one-per-component) and avoids the bug where a second
// consumer would create a new socket that disconnects the first.
// ---------------------------------------------------------------------------

interface SocketState {
  socket: Socket | null;
  token: string | null;
  refCount: number;
  connected: boolean;
}

let singleton: SocketState = {
  socket: null,
  token: null,
  refCount: 0,
  connected: false,
};

// Subscribers — every consumer of useWebSocket registers here so the
// singleton can notify them on connect / disconnect.
type Listener = (connected: boolean) => void;
const listeners = new Set<Listener>();

function notifyAll(connected: boolean) {
  singleton.connected = connected;
  for (const l of listeners) {
    try {
      l(connected);
    } catch {
      // Listener threw — ignore; the others should still fire.
    }
  }
}

function teardownSocketIfIdle() {
  singleton.refCount = Math.max(0, singleton.refCount - 1);
  if (singleton.refCount === 0 && singleton.socket) {
    try {
      singleton.socket.removeAllListeners();
      singleton.socket.disconnect();
    } catch {
      // ignore
    }
    singleton.socket = null;
    singleton.token = null;
    notifyAll(false);
  }
}

function ensureSocket(token: string | null): Socket | null {
  // No token → no socket. The hook returns `null` and the consumer is
  // expected to gracefully fall back to its polling path.
  if (!token) {
    // If we previously had a socket (e.g. user just logged out), tear it
    // down so the server doesn't keep a stale authenticated connection.
    if (singleton.socket) {
      try {
        singleton.socket.removeAllListeners();
        singleton.socket.disconnect();
      } catch {
        // ignore
      }
      singleton.socket = null;
      singleton.token = null;
      notifyAll(false);
    }
    return null;
  }

  // Token unchanged AND a socket exists → reuse it.
  if (singleton.socket && singleton.token === token) {
    return singleton.socket;
  }

  // Token changed (or first connect). Tear down any prior socket first
  // so we don't leak a connection authenticated with the old token.
  if (singleton.socket) {
    try {
      singleton.socket.removeAllListeners();
      singleton.socket.disconnect();
    } catch {
      // ignore
    }
    singleton.socket = null;
    notifyAll(false);
  }

  // Create a fresh socket with the new token.
  const socket = io(WS_PATH, {
    path: "/",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity, // keep trying — chat-service may restart
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    timeout: 10_000,
    auth: (cb) => {
      // Re-read the token at handshake time — if it changed (e.g. the user
      // logged in/out between reconnects) we want the freshest one.
      cb({ token: getAuthToken() });
    },
  });

  socket.on("connect", () => {
    notifyAll(true);
  });
  socket.on("disconnect", () => {
    notifyAll(false);
  });
  socket.on("connect_error", () => {
    notifyAll(false);
  });
  // io.on("reconnect") fires after a successful reconnection — flip the
  // connected flag back to true so UIs re-enable their "live" affordances.
  socket.io.on("reconnect", () => {
    notifyAll(true);
  });

  singleton.socket = socket;
  singleton.token = token;
  return socket;
}

// ---------------------------------------------------------------------------
// The hook itself
// ---------------------------------------------------------------------------

export interface UseWebSocketResult {
  /** The shared socket instance, or null when not authenticated. */
  socket: Socket | null;
  /** True when the socket is currently connected to the chat-service. */
  isConnected: boolean;
}

export function useWebSocket(): UseWebSocketResult {
  const [isConnected, setIsConnected] = React.useState<boolean>(
    singleton.connected
  );
  const [socket, setSocket] = React.useState<Socket | null>(singleton.socket);

  // Subscribe to connection-state updates from the singleton.
  React.useEffect(() => {
    const listener: Listener = (next) => setIsConnected(next);
    listeners.add(listener);

    // Bump the refcount — when this is the only consumer, the singleton
    // creates the socket; when the last consumer unmounts, the singleton
    // tears it down.
    singleton.refCount += 1;

    // Resolve the current token (it may have changed since the last render).
    const token = getAuthToken();
    const s = ensureSocket(token);
    if (s !== socket) setSocket(s);

    // Sync the connected flag to whatever the singleton currently reports.
    setIsConnected(singleton.connected);

    return () => {
      listeners.delete(listener);
      teardownSocketIfIdle();
      // After teardown the local `socket` reference may be stale; clear it
      // so a re-mount starts fresh.
      if (singleton.socket === null) {
        setSocket(null);
        setIsConnected(false);
      }
    };
    // We intentionally do NOT depend on `socket` — that would cause a
    // re-subscription loop every time the singleton updates its reference.
    // (No eslint-disable needed — the effect references `socket` only via
    // the closure on its initial state, which never changes inside this
    // effect. The empty deps array is correct.)
  }, []);

  // Re-check the token on window focus — covers the case where the user
  // logged in/out in another tab and returned. We don't poll on an
  // interval because token changes always come with a state update that
  // re-renders the consumer.
  React.useEffect(() => {
    const onFocus = () => {
      const token = getAuthToken();
      const s = ensureSocket(token);
      if (s !== socket) setSocket(s);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [socket]);

  return { socket, isConnected };
}

// ---------------------------------------------------------------------------
// Convenience helpers — exported for consumers that want to compute room
// names without importing the chat-service internals.
// ---------------------------------------------------------------------------

/** `dm:<smallerId>:<largerId>` — deterministic per pair of users. */
export function dmRoom(a: string, b: string): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}

/** `tenant:<customerId>` — or `tenant:admin` for super-admins. */
export function tenantRoom(customerId: string | null): string {
  return `tenant:${customerId ?? "admin"}`;
}

/** `user:<userId>` — the personal notification room. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
