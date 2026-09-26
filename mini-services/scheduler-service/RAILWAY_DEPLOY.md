# Scheduler Mini-Service

Persistent Node.js service that polls the database every 60 seconds for scheduled posts whose `scheduledAt` time has passed, and publishes them by calling the main app's `/api/publish/[platform]` endpoint.

**Cannot run on Vercel** (serverless functions can't run a continuous polling loop — they time out at 60s on the Hobby tier). Deploy on Railway / Render / Fly.io / VPS.

## How it works

```
Every 60 seconds:
  1. Query DB for posts WHERE status = 'scheduled' AND scheduledAt <= NOW()
  2. For each due post, call POST <APP_URL>/api/publish/<platform>
  3. Update the post status to 'published' or 'failed' in the DB
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (returns `{ ok: true }`) |

The actual work is a `setInterval` polling loop, not triggered by HTTP requests.

## Local Development

```bash
cd mini-services/scheduler-service
bun install
node index.js
```

Runs on `http://localhost:3003`. The main app's `start-dev.sh` auto-starts this service.

## Deploy on Railway (recommended)

### Step 1: Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `SYNQUE` repo
3. Railway will ask for the root directory — set it to `mini-services/scheduler-service`

### Step 2: Set environment variables

In the Railway service → **Variables** tab, add:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_...@ep-...neon.tech/neondb?sslmode=require` | ✅ Yes |
| `DIRECT_URL` | `postgresql://neondb_owner:npg_...@ep-...neon.tech/neondb?sslmode=require` | ✅ Yes (same as DATABASE_URL is fine) |
| `APP_URL` | `https://your-vercel-app.vercel.app` | ✅ Yes (your Vercel URL) |

**Important:** Use the **direct** Neon connection URL (not the pooler) — the scheduler makes long-lived DB connections, and the pooler has connection limits.

### Step 3: Verify the deploy

After deploy, check the Railway logs. You should see:
```
[scheduler] Running. Press Ctrl+C to stop.
[scheduler] Health check on http://localhost:3003
[scheduler] Polling every 60s for scheduled posts
[scheduler] App URL: https://your-vercel-app.vercel.app
[scheduler] 2026-09-25T07:30:00.000Z — No scheduled posts due
[scheduler] 2026-09-25T07:31:00.000Z — No scheduled posts due
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | — | Neon PostgreSQL connection string |
| `DIRECT_URL` | ✅ Yes | — | Neon direct connection (same as DATABASE_URL is fine) |
| `APP_URL` | ✅ Yes | `http://localhost:3000` | Base URL of the main app (for calling /api/publish) |

## Cost on Railway

~$5/month for a single always-on Node.js process (no volume needed — the scheduler doesn't store files).

## Why this can't run on Vercel

Vercel's serverless functions:
- Have a max duration of 60s (Hobby) / 300s (Pro)
- Are invoked per-request — there's no way to keep a `setInterval` running
- Cold-start between invocations (DB connection overhead each time)

The scheduler needs to poll every 60s, 24/7. That's exactly what Railway is for.

## Vercel Cron alternative (NOT recommended)

Vercel has a `vercel.json` cron feature, but:
- Hobby tier: limited to 2 cron jobs, daily frequency only
- Pro tier: 40 cron jobs, but each invocation is a cold start (slow)
- Can't run logic that takes >60s

The Railway polling approach is simpler, cheaper, and more reliable.
