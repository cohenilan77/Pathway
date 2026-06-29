# Telegram Integration Setup Guide

**Last Updated**: 2026-06-29  
**Status**: Replacing WhatsApp functionality  
**Revert Guide**: See [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md)

---

## 🤖 What Changed

- **WhatsApp**: Disabled (commented with `/* WHATSAPP_DISABLED_... */` markers for easy restoration)
- **Telegram**: New integration for:
  - ✅ 1:1 Live Chat (Consultant ↔ Candidate)
  - ✅ AI Advisor Chat (Candidate messaging AI advisor on Telegram)
  - ✅ Offline Routing (If candidate offline, message queued on Telegram)

---

## 📋 Environment Variables to Add

Add these to your `.env` file:

```env
# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-deployed-url.vercel.app/api/telegram/inbound
```

---

## 🔧 How to Get Telegram Bot Token

1. **Open Telegram** and search for `@BotFather`
2. **Send `/start`** to BotFather
3. **Send `/newbot`**
4. **Name your bot** (e.g., "Pathway Assistant")
5. **Name your username** (e.g., "pathway_assistant_bot") - must be unique
6. **Copy the bot token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
7. **Paste it** into `.env` as `TELEGRAM_BOT_TOKEN`

---

## 🔗 Webhook Setup

### For Local Development:
```bash
# Use ngrok or similar to expose your local server
ngrok http 3000

# Then set TELEGRAM_WEBHOOK_URL in .env:
TELEGRAM_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/telegram/inbound
```

### For Production (Vercel):
1. **Deploy your code**
2. **Set TELEGRAM_WEBHOOK_URL** in Vercel Project Settings > Environment Variables:
   ```
   TELEGRAM_WEBHOOK_URL=https://your-project.vercel.app/api/telegram/inbound
   ```
3. **The webhook automatically registers** on first inbound message

---

## 📁 New File Structure

```
lib/telegram/
├── outbound.js          # Send messages to Telegram
├── phone.js             # Normalize Telegram user ID
├── resolveCandidate.js  # Map Telegram user to candidate
├── humanChat.js         # 1:1 live chat logic
└── advisorTurn.js       # AI advisor response logic

api/telegram/
└── inbound.js           # Webhook handler for Telegram messages
```

---

## 🧪 Testing the Integration

### 1. Add candidate's Telegram user ID to their profile:

```javascript
// In your candidate object:
candidate.telegramUserId = 123456789  // Their Telegram user ID
```

### 2. Test 1:1 live chat:
- **User sends message to bot** → `/start` to activate
- **Consultant sends message** via admin panel → User receives on Telegram

### 3. Test AI Advisor:
- **Start AI Advisor** from admin panel
- **Candidate chats with AI** on Telegram

---

## 🔄 Message Routing Logic

### Inbound Messages (Candidate → System)
1. Message received on Telegram
2. Resolve candidate by Telegram user ID
3. **Check if live chat is active**:
   - ✅ YES → Route to consultant (append to chat history, notify consultant)
   - ❌ NO → Route to AI Advisor (if active)
   - ❌ NO AI → Queue for later

### Outbound Messages (System → Candidate)
1. **Live Chat**: Consultant sends message → Immediately to Telegram
2. **Offline Queue**: If candidate offline → Queue message → Send when they return
3. **AI Advisor**: AI response → Directly to Telegram

---

## 📝 Database Schema Updates

Candidate object changes:

```javascript
// OLD (WhatsApp)
candidate.whatsappNumber
candidate.whatsappHumanChatActive
candidate.whatsappHumanChatPending
candidate.whatsappAiAdvisorSessionActive
// ... etc

// NEW (Telegram)
candidate.telegramUserId              // Unique Telegram user ID
candidate.telegramHumanChatActive     // Live chat active?
candidate.telegramHumanChatPending    // Messages waiting?
candidate.telegramHumanChatPendingMessages // Queue
candidate.telegramAiAdvisorSessionActive   // AI advisor running?
// ... similar structure to WhatsApp
```

---

## 🚨 Troubleshooting

### Message not delivering to Telegram?
- ✅ Check `TELEGRAM_BOT_TOKEN` is correct
- ✅ Check `TELEGRAM_WEBHOOK_URL` is reachable
- ✅ Check candidate has `telegramUserId` set
- ✅ Check bot permissions in Telegram (should be able to send messages)

### Webhook not registering?
```bash
# Manually register webhook (replace with your values):
curl -X POST https://api.telegram.org/botYOUR_TOKEN/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-domain.vercel.app/api/telegram/inbound"}'
```

### How to remove webhook (revert to polling):
```bash
curl -X POST https://api.telegram.org/botYOUR_TOKEN/deleteWebhook
```

---

## 🔙 Reverting to WhatsApp

**See [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md) for step-by-step reversion guide**

TL;DR:
1. Remove `/* WHATSAPP_DISABLED_...` comment markers
2. Uncomment all disabled WhatsApp code
3. Disable Telegram code
4. Restore `TWILIO_*` environment variables
5. Deploy

---

## 📚 Related Files

- [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md) - Detailed reversion guide
- `lib/telegram/` - All Telegram service logic
- `api/telegram/inbound.js` - Webhook handler
- `.env.example` - Environment variable template
