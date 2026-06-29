# Telegram Integration Guide

## Overview

This Pathway integration enables:
1. **Live Chat via Telegram** — admins send messages to candidates via Telegram, candidates reply and messages appear in live chat
2. **Telegram AI Advisor** — candidate can trigger an AI advisor session on Telegram with trigger words

## Setup

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Type `/newbot` and follow the prompts to create a bot
3. Copy the **Bot Token** (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Configure Environment Variables

Add to your Vercel production environment:

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_URL=https://yourapp.vercel.app/api/telegram/inbound
```

### 3. Register Webhook

**Option A: Via Admin Dashboard (Recommended)**

1. Deploy the app to Vercel
2. Log in as Admin
3. Go to **Admin → Telegram Setup**
4. Click **"Register Webhook"**
5. Should see: ✅ "Telegram webhook registered successfully"

**Option B: Manual curl command**

After deploying, run:

```bash
curl -X POST https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourapp.vercel.app/api/telegram/inbound"}'
```

Verify:
```bash
curl https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getWebhookInfo
```

## User Guide for Candidates

### Linking Telegram

Candidates must manually link their Telegram account to activate messaging:

1. Open Pathway app in their account settings
2. Enter their Telegram Chat ID (they can get this by messaging the bot: `/start` returns their ID)
3. Toggle **Opt-in to Telegram**

### Receiving Live Chat

Once linked and opted-in:
- When consultants send messages via Live Chat, they are delivered to Telegram
- Candidate replies on Telegram are automatically added to Live Chat
- Acknowledgment message: ✓ "Your message was delivered to your consultant."

### Starting AI Advisor

Trigger words to start the AI Advisor on Telegram:

- `/advisor`
- `advisor`
- `/ai`
- `ai chat`
- `assistant`
- `/start`

Example: candidate types `/advisor` → AI Advisor activates and responds

Type `/stop` or wait for consultant to pause it.

## Admin Setup & Testing

### Test Telegram Connection

**Endpoint:** `POST /api/admin/telegram-test`

Tests if the bot token is valid and returns bot info + webhook status.

```bash
curl -X POST https://yourapp.vercel.app/api/admin/telegram-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{}'
```

Response:
```json
{
  "ok": true,
  "message": "Telegram bot is working",
  "botInfo": {
    "id": 7123456789,
    "isBot": true,
    "firstName": "PathwayBot",
    "username": "pathway_admissions_bot"
  },
  "webhookInfo": {
    "url": "https://yourapp.vercel.app/api/telegram/inbound",
    "pendingUpdateCount": 0
  }
}
```

### Register Webhook via API

**Endpoint:** `POST /api/admin/telegram-setup`

Registers the webhook URL with Telegram automatically (no curl needed).

```bash
curl -X POST https://yourapp.vercel.app/api/admin/telegram-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{}'
```

Response:
```json
{
  "ok": true,
  "message": "Telegram webhook registered successfully",
  "webhookUrl": "https://yourapp.vercel.app/api/telegram/inbound",
  "webhookInfo": {
    "url": "https://yourapp.vercel.app/api/telegram/inbound",
    "pendingUpdateCount": 0,
    "maxConnections": 40
  }
}
```

---

## Admin/Consultant Guide

### Send Messages via Live Chat

1. Open candidate profile
2. Click **Live Chat**
3. Type message and send
4. Message is automatically delivered to:
   - Telegram (if candidate is linked & opted-in)
   - WhatsApp (if candidate is linked & opted-in)

### Manage Telegram AI Advisor

In the candidate profile, there is a **Telegram AI Advisor** toggle (like WhatsApp):

- **OFF** (default): Website chat is the default; Telegram AI does not auto-reply
- **ON**: Approved kickoff template sent; after candidate replies, AI can respond

The toggle manually controls whether the AI Advisor is active on Telegram.

## Architecture

### Files Added

- **`api/telegram/inbound.js`** — Webhook handler for incoming Telegram messages
- **`lib/telegram/outbound.js`** — Send messages to Telegram via Telegram Bot API
- **`lib/telegramAiAdvisor/service.js`** — Telegram AI Advisor logic
- **`api/telegram-ai-advisor-toggle.js`** — API to start/stop AI Advisor

### Database Fields

Added to candidate user object:

```javascript
telegramChatId: '',                           // Telegram chat ID (used as key to route replies)
telegramOptIn: false,                         // Candidate opted in to Telegram messaging
telegramOptInTimestamp: null,                 // When they opted in
telegramOptOut: false,                        // Candidate opted out of Telegram messaging
telegramLastInboundAt: null,                  // Last message from candidate (24h window for AI)
telegramAiAdvisorSessionActive: false,        // Is AI Advisor on for this candidate?
telegramAiAdvisorSessionStartedAt: null,      // When AI session started
telegramAiAdvisorSessionPausedAt: null,       // When AI session paused
telegramAiAdvisorSessionStartedBy: null,      // Who started it ('admin' or candidate)
telegramAiAdvisorLastTurnAt: null,            // Last AI Advisor response time
```

### Message Flow

#### Incoming (Candidate → Telegram)

```
Candidate sends message on Telegram
         ↓
/api/telegram/inbound receives update
         ↓
Matches candidate by Telegram chat_id
         ↓
If message is AI trigger → handleTelegramAiAdvisor()
If AI session active → handleTelegramAiAdvisor()
Otherwise → appendMessage() to Live Chat
         ↓
Acknowledgment sent to Telegram
```

#### Outgoing (Admin → Telegram)

```
Admin sends in Live Chat
         ↓
appendMessage() called
         ↓
Routes to sendViaTelegram() if candidate opted-in
         ↓
Message delivered to Telegram
```

## Troubleshooting

### Messages Not Received on Telegram

1. **Is webhook configured?**
   ```bash
   curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo
   ```
   Should show your URL as `"url"`.

2. **Is candidate linked?**
   - Check candidate profile: `telegramChatId` should have a value
   - Check opted-in: `telegramOptIn` should be `true`

3. **Is bot token valid?**
   - Test manually: `curl -X POST https://api.telegram.org/bot{TOKEN}/sendMessage -H "Content-Type: application/json" -d '{"chat_id":"123","text":"test"}'`

### AI Advisor Not Responding

1. **Is the session active?**
   - Check candidate profile: `telegramAiAdvisorSessionActive` should be `true`

2. **Did candidate send a trigger word?**
   - Valid triggers: `/advisor`, `advisor`, `/ai`, `ai chat`, `assistant`, `/start`
   - Case-insensitive matching

3. **Check server logs** for `[TelegramAiAdvisor]` entries

## Limits

- **Message length**: Telegram max 4096 characters (responses are truncated if longer)
- **24-hour window**: AI Advisor only responds within 24h of last candidate message (Telegram API rate limit protection)
- **Rate limits**: Telegram allows ~30 requests/second per bot

## Testing

### Test Webhook Locally

1. Install Telegram Bot API server (BotAPI) locally or use a tunnel (ngrok)
2. Set `TELEGRAM_WEBHOOK_URL` to your tunnel URL
3. Send a message from your Telegram bot to the bot account
4. Check logs in `/api/telegram/inbound.js`

### Test Messages

1. Create a test candidate with `telegramChatId` set to your personal Telegram chat ID
2. Send a live chat message from admin
3. Verify it appears on Telegram

### Test AI Advisor

1. Enable Telegram AI Advisor for test candidate
2. Send `/advisor` on Telegram
3. Check that AI responds within 3-5 seconds
