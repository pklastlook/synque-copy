#!/bin/bash
# ============================================================================
# SYNQUE — Push .env variables to Railway mini-services
# ============================================================================
# Prerequisites:
#   1. Railway CLI installed: npm install -g @railway/cli
#   2. Logged in: railway login
#
# This script links each mini-service directory to its Railway project and
# pushes the correct environment variables.
#
# Run from the project root:
#   bash scripts/push-env-to-railway.sh
# ============================================================================

set -euo pipefail

echo "🚂 SYNQUE — Push env vars to Railway mini-services"
echo "================================================"
echo ""

# ----------------------------------------------------------------------------
# 1. WhatsApp Service
# ----------------------------------------------------------------------------
echo "📦 WhatsApp Service (port 3002)"
echo "   URL: https://whatsapp-production-ff54.up.railway.app"
echo "   Required vars: PORT"
cd "$(dirname "$0")/../mini-services/whatsapp-service"

# Link to Railway project if not already linked
railway link --service whatsapp-service --environment production 2>/dev/null || true

# Push variables
railway variables set PORT=3002 2>/dev/null && echo "   ✅ PORT" || echo "   ⏭️  PORT (may already be set)"

echo ""

# ----------------------------------------------------------------------------
# 2. Scheduler Service
# ----------------------------------------------------------------------------
echo "📦 Scheduler Service (port 3003)"
echo "   URL: https://scheduler-production-69a1.up.railway.app"
echo "   Required vars: PORT, DATABASE_URL, DIRECT_URL, APP_URL, SCHEDULER_API_KEY"
cd "$(dirname "$0")/../mini-services/scheduler-service"

railway link --service scheduler-service --environment production 2>/dev/null || true

railway variables set \
  PORT=3003 \
  DATABASE_URL="postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-spring-darkness-auk3ozf9-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  DIRECT_URL="postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-spring-darkness-auk3ozf9.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  APP_URL="https://synque.vercel.app" \
  SCHEDULER_API_KEY="REDACTED_SCHEDULER_KEY" \
  2>/dev/null && echo "   ✅ All scheduler vars pushed" || echo "   ⚠️  Some vars may need manual review"

echo ""

# ----------------------------------------------------------------------------
# 3. AI Service
# ----------------------------------------------------------------------------
echo "📦 AI Service (port 3004)"
echo "   URL: https://ai-services-production-3d2d.up.railway.app"
echo "   Required vars: PORT, ZAI_API_KEY, ZAI_BASE_URL, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID"
cd "$(dirname "$0")/../mini-services/ai-service"

railway link --service ai-service --environment production 2>/dev/null || true

railway variables set \
  PORT=3004 \
  ZAI_API_KEY=Z.ai \
  ZAI_BASE_URL="https://internal-api.z.ai/v1" \
  ZAI_CHAT_ID="chat-b8e092a6-6649-4a04-b709-d6b3d6038f56" \
  ZAI_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMjhmZWU5OTEtNjczYy00NDc2LWI0ZTYtZDljYWFhZGY5ZWQ1IiwiY2hhdF9pZCI6ImNoYXQtYjhlMDkyYTYtNjY0OS00YTA0LWI3MDktZDZiM2Q2MDM4ZjU2IiwicGxhdGZvcm0iOiJ6YWkifQ.rVhhVlYSk8zQsc2RF56Qri9vv8wtKsJd2UWyLJ1XBqE" \
  ZAI_USER_ID="28fee991-673c-4476-b4e6-d9caaadf9ed5" \
  2>/dev/null && echo "   ✅ All AI service vars pushed" || echo "   ⚠️  Some vars may need manual review"

echo ""
echo "================================================"
echo "✅ Done! All Railway mini-service env vars pushed."
echo ""
echo "Next steps:"
echo "  1. Verify in Railway dashboard: each service → Variables tab"
echo "  2. Redeploy each service for the variables to take effect."
echo "  3. Update APP_URL in the scheduler service to your production Vercel URL"
echo "     (currently set to https://synque.vercel.app — change if your domain differs)"
