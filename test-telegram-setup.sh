#!/bin/bash

# Telegram Setup Test Script
# Usage: ./test-telegram-setup.sh <VERCEL_URL> <ADMIN_SECRET>
# Example: ./test-telegram-setup.sh https://pathway.vercel.app my-admin-secret

if [ -z "$1" ]; then
  echo "❌ Error: VERCEL_URL required"
  echo "Usage: ./test-telegram-setup.sh <VERCEL_URL> <ADMIN_SECRET>"
  echo "Example: ./test-telegram-setup.sh https://pathway.vercel.app my-secret"
  exit 1
fi

if [ -z "$2" ]; then
  echo "❌ Error: ADMIN_SECRET required"
  echo "Usage: ./test-telegram-setup.sh <VERCEL_URL> <ADMIN_SECRET>"
  exit 1
fi

VERCEL_URL="$1"
ADMIN_SECRET="$2"

echo "🔧 Testing Telegram Setup Endpoint"
echo "URL: $VERCEL_URL/api/admin/telegram-setup"
echo "---"

# Test 1: Test Telegram Connection
echo "📱 Test 1: Check Telegram bot connection..."
echo ""

curl -X POST "$VERCEL_URL/api/admin/telegram-test" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: $ADMIN_SECRET" \
  -d '{}' \
  -s | jq '.'

echo ""
echo "---"

# Test 2: Register Webhook
echo "📡 Test 2: Register Telegram webhook..."
echo ""

curl -X POST "$VERCEL_URL/api/admin/telegram-setup" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: $ADMIN_SECRET" \
  -d '{}' \
  -s | jq '.'

echo ""
echo "✅ Tests complete!"
