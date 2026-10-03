# Task ID: P1-2-a — subagent (security engineer)

**Task**: Add shared-secret bearer authentication to all three mini-services, bind them to localhost, and scope CORS. Also remove hardcoded ZAI credentials.

## Work performed (mirror of the worklog entry)

### Files changed
1. `mini-services/whatsapp-service/index.ts` — added `SERVICE_KEY`/`APP_URL` env reads + fail-fast exit; scoped CORS (`APP_URL` instead of `*`, added `Authorization` to allowed headers); inserted bearer-auth middleware exempting `/health`; changed `server.listen(PORT, ...)` → `server.listen(PORT, "127.0.0.1", ...)`.
2. `mini-services/ai-service/index.js` — same auth/bind/CORS pattern; **removed** the boot-time `console.log` that printed the API key + chat ID + user ID; changed ZAI `API_KEY` fallback from `"Z.ai"` to `""`.
3. `mini-services/zai-proxy/index.js` — **removed** hardcoded `API_KEY`, `CHAT_ID`, `TOKEN`, `USER_ID` constants (replaced with `process.env.ZAI_*` reads); made ZAI request headers conditional; added auth/bind/CORS pattern.
4. `mini-services/scheduler-service/index.ts` (source TS — compiled `index.js` is P1-3's job) — added `SERVICE_KEY` fail-fast; rewrote HTTP handler to include scoped CORS, OPTIONS preflight, URL parsing, bearer-auth middleware exempting `/health`; bound to `127.0.0.1`.
5. `.env` — appended `MINI_SERVICE_KEY=synque-mini-service-key-CHANGE-ME-2026` (preserved existing `APP_URL` and `ZAI_*` values per "APPEND, do NOT overwrite" rule).
6. `.env.example` — added `MINI_SERVICE_KEY=` placeholder in the SECURITY section.

## Ports (unchanged — for downstream tasks)
- whatsapp-service: **3002**
- ai-service: **3004**
- zai-proxy: **3005**
- scheduler-service: **3003**

## Auth contract (downstream tasks MUST follow this)
- Header: `Authorization: Bearer <MINI_SERVICE_KEY>`
- Only `/health` is exempt.
- Mismatch / missing header → `401 { "error": "Unauthorized" }`.
- Fail-fast at boot if `MINI_SERVICE_KEY` env var is missing.
- CORS now returns `Access-Control-Allow-Origin: <APP_URL>` (was `*`).
- All services bind to `127.0.0.1` only.

## Known follow-ups (NOT in P1-2-a's scope)
- `mini-services/whatsapp-service/index.js` — single-session compiled bundle, still ships the old code (no auth, CORS `*`, bound to `0.0.0.0`). P1-3 should regenerate.
- `mini-services/scheduler-service/index.js` — compiled bundle still ships the `X-Scheduler-Key: process.env.SCHEDULER_API_KEY || "REDACTED"` fallback (per SECURITY-INFRA audit). P1-3 should regenerate from the fixed `index.ts`.
- The `X-Scheduler-Key` fallback at `scheduler-service/index.ts:98` is a separate SECURITY-INFRA finding; not addressed here per task scope ("ONLY add auth, bind, CORS, and credential removal").

## Lint
- `bun run lint` → clean, zero errors / zero warnings.
