# WhatsApp Mini-Service

Persistent Node.js service that connects to WhatsApp via the [Baileys](https://github.com/WhiskeySockets/Baileys) library. Generates QR codes for scanning (just like WhatsApp Web) and forwards incoming messages to the main app via webhook.

**Cannot run on Vercel** (serverless = no persistent WebSocket connections). Deploy on Railway / Render / Fly.io / VPS.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Connection status + QR code (if any) |
| GET | `/qr` | Just the QR code |
| POST | `/logout` | Disconnect + clear session |
| POST | `/webhook-target` | Set the webhook URL for incoming messages |
| POST | `/restart` | Force restart (generates fresh QR) |

## Local Development

```bash
cd mini-services/whatsapp-service
bun install
node index.js
```

Runs on `http://localhost:3002`. The main app's `start-dev.sh` auto-starts this service.

## Deploy on Railway (recommended)

### Step 1: Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `SYNQUE` repo
3. Railway will ask for the root directory — set it to `mini-services/whatsapp-service`

### Step 2: Configure the service

Railway auto-detects Node.js from `package.json`. The `railway.toml` in this folder tells Railway:
- Start command: `node index.js`
- Health check: `GET /status`
- Auto-restart on failure (max 5 retries)

### Step 3: Add a persistent volume (IMPORTANT)

The Baileys library stores auth session files in `./sessions/`. Without a persistent volume, you'd have to re-scan the QR code after every deploy.

1. Railway dashboard → your WhatsApp service → **Settings** → **Volumes**
2. Click **Add Volume**
3. Mount path: `/app/sessions`
4. Size: 1 GB (plenty for auth files)

### Step 4: Get your Railway URL

After the first deploy, Railway gives you a public URL like:
```
https://socialflow-whatsapp-production.up.railway.app
```

### Step 5: Set the env var on Vercel

In your Vercel project settings → **Environment Variables**:
```
WHATSAPP_SERVICE_URL = https://socialflow-whatsapp-production.up.railway.app
```

Redeploy your Vercel app. The WhatsApp view will now fetch the QR code from Railway.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3002` | HTTP port (Railway sets this automatically) |

The service doesn't need any other env vars — it's self-contained. The webhook target is set dynamically via `POST /webhook-target` from the main app.

## Cost on Railway

~$5/month for a single always-on Node.js process with 1 GB volume.

## How incoming messages flow

```
WhatsApp servers
      ↕ (WebSocket, persistent)
WhatsApp service (Railway)
      ↓ (HTTP POST webhook)
Main app /api/whatsapp/webhook
      ↓ (save to DB)
WhatsApp view in the app
```

## Troubleshooting

**QR code not showing?**
- Check `GET /status` returns `qr` field (should be a `data:image/png;base64,...` string)
- Check the main app's `WHATSAPP_SERVICE_URL` env var is set correctly on Vercel
- Check the Railway service logs for Baileys errors

**Have to re-scan QR after every deploy?**
- You didn't add a persistent volume. See Step 3 above.

**Connection drops frequently?**
- Railway may restart the service if it exceeds memory limits. Upgrade to a bigger plan or check the logs for OOM errors.
- Baileys auto-reconnects, but you may need to re-scan the QR if the auth state was corrupted.
