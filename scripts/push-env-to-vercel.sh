#!/bin/bash
# ============================================================================
# SYNQUE — Push all .env variables to Vercel
# ============================================================================
# Prerequisites:
#   1. Vercel CLI installed: npm install -g vercel
#   2. Logged in: vercel login
#   3. Project linked: vercel link (run once in the project root)
#
# Usage:
#   bash scripts/push-env-to-vercel.sh
#
# This script reads .env and pushes each variable to Vercel for the
# current environment (preview). It then promotes them to production.
# ============================================================================

set -euo pipefail

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found. Make sure you're in the project root."
  exit 1
fi

echo "📤 Reading $ENV_FILE..."
echo ""

# Read .env line by line, skip comments and empty lines
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  if [[ -z "$line" ]] || [[ "$line" =~ ^# ]]; then
    continue
  fi

  # Extract key and value
  key=$(echo "$line" | cut -d'=' -f1)
  value=$(echo "$line" | cut -d'=' -f2-)

  # Skip if key is empty
  if [[ -z "$key" ]]; then
    continue
  fi

  echo "  → $key"

  # Push to preview environment
  echo "$value" | vercel env add "$key" preview 2>/dev/null || true

  # Push to production environment
  echo "$value" | vercel env add "$key" production 2>/dev/null || true

done < "$ENV_FILE"

echo ""
echo "✅ All environment variables pushed to Vercel!"
echo ""
echo "Next steps:"
echo "  1. Verify in Vercel dashboard: Settings → Environment Variables"
echo "  2. Redeploy: vercel --prod"
