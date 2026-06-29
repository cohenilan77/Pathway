# 📊 Visual Reference - Telegram Integration

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      TELEGRAM BOT                           │
│              (@pathway_assistant_bot)                       │
└─────────────────────────────────────┬───────────────────────┘
                                       │
                                       │ (Messages)
                                       ↓
┌─────────────────────────────────────────────────────────────┐
│              TELEGRAM BOT API                               │
│          https://api.telegram.org/bot...                    │
└─────────────────────────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │ Webhook Registration                │
                    │ /api/telegram/inbound               │
                    ↓                                      ↓
         ┌──────────────────────┐          ┌──────────────────────┐
         │  MESSAGE INBOUND     │          │  MESSAGE OUTBOUND    │
         │                      │          │                      │
         │ 1. Receive message   │          │ 1. Build message     │
         │ 2. Resolve candidate │          │ 2. Send via API      │
         │ 3. Route to handler  │          │ 3. Log delivery      │
         │ 4. Process message   │          │                      │
         └──────────┬───────────┘          └──────────────────────┘
                    │
        ┌───────────┼──────────────┐
        ↓           ↓              ↓
    ┌─────────┐ ┌─────────┐  ┌──────────────┐
    │LIVE CHAT│ │   AI    │  │   OFFLINE    │
    │ HANDLER │ │ ADVISOR │  │   QUEUE      │
    └─────────┘ └─────────┘  └──────────────┘
        │           │              │
        └───────────┼──────────────┘
                    ↓
        ┌──────────────────────────┐
        │  CANDIDATE DATABASE      │
        │  (lib/store.js)          │
        │                          │
        │ • Chat history           │
        │ • Session state          │
        │ • Pending messages       │
        └──────────────────────────┘
```

---

## 🔄 Message Flow: Live Chat

```
                    ADMIN PANEL
                        │
                        │ Consultant sends message
                        ↓
                  ┌───────────────┐
                  │ Check: Online? │
                  └────┬─────────┬─┘
                      │         │
         YES (online)  │         │ NO (offline)
                      ↓         ↓
            ┌──────────────┐  ┌──────────────────────┐
            │ Send direct  │  │ Queue on Telegram    │
            │ to Telegram  │  │ (24-hour window)     │
            └──────┬───────┘  └──────────┬───────────┘
                   │                     │
                   │                     │ Candidate returns
                   │                     │
                   ↓                     ↓
            ┌──────────────────────────────────┐
            │ TELEGRAM USER RECEIVES MESSAGE   │
            └────────────┬─────────────────────┘
                         │
                         │ Candidate replies on Telegram
                         ↓
            ┌──────────────────────────────────┐
            │ MESSAGE SENT TO /api/telegram/   │
            │ inbound WEBHOOK                  │
            └────────────┬─────────────────────┘
                         │
                         │ Process & append to chat history
                         ↓
            ┌──────────────────────────────────┐
            │ ADMIN PANEL - NEW MESSAGE        │
            │ Consultant sees response         │
            └──────────────────────────────────┘
```

---

## 🤖 Message Flow: AI Advisor

```
                    ADMIN PANEL
                        │
                  Consultant starts AI
                        │
                        ↓
          ┌────────────────────────────┐
          │ sendViaTelegram() kickoff  │
          │ "AI advisor is ready..."   │
          └────────────┬───────────────┘
                       │
                       ↓
          ┌────────────────────────────┐
          │ TELEGRAM - User notified   │
          │ Candidate can now chat     │
          └────────────┬───────────────┘
                       │
      Candidate types question on Telegram
                       │
                       ↓
          ┌────────────────────────────┐
          │ /api/telegram/inbound      │
          │ Receives message           │
          └────────────┬───────────────┘
                       │
                       ↓
          ┌────────────────────────────┐
          │ Check: AI advisor active?  │
          │ YES → handleInbound()      │
          └────────────┬───────────────┘
                       │
                       ↓
          ┌────────────────────────────┐
          │ Call Anthropic API         │
          │ Generate response          │
          └────────────┬───────────────┘
                       │
                       ↓
          ┌────────────────────────────┐
          │ sendViaTelegram() response │
          └────────────┬───────────────┘
                       │
                       ↓
          ┌────────────────────────────┐
          │ TELEGRAM - AI response     │
          │ Candidate sees answer      │
          └────────────────────────────┘
```

---

## 📂 File Structure

```
Your Repository/
│
├── lib/
│   ├── telegram/                (NEW)
│   │   ├── outbound.js          # Send messages to Telegram API
│   │   ├── resolveCandidate.js  # Map Telegram ID → Candidate
│   │   ├── humanChat.js         # Live chat logic
│   │   └── advisorService.js    # AI advisor logic
│   │
│   ├── whatsapp/                (DISABLED)
│   │   └── /* WHATSAPP_DISABLED_START */
│   │       ... (code commented out)
│   │       /* WHATSAPP_DISABLED_END */
│   │
│   └── db.js                    (MODIFIED)
│       ├── Add telegramUserId fields
│       ├── Add getUserByTelegramId()
│       └── Add setCandidateTelegramIdIndex()
│
├── api/
│   ├── telegram/                (NEW)
│   │   └── inbound.js           # Webhook handler
│   │
│   └── whatsapp/                (DISABLED)
│       └── /* WHATSAPP_DISABLED_START */
│           ... (code commented out)
│           /* WHATSAPP_DISABLED_END */
│
├── .env                         (MODIFIED)
│   ├── TELEGRAM_BOT_TOKEN=...   (NEW)
│   └── TELEGRAM_WEBHOOK_URL=... (NEW)
│
└── package.json                 (MODIFIED)
    └── "node-telegram-bot-api": "^0.63.0" (NEW)
```

---

## 🗄️ Database Changes

### New Fields Added to User Object

```javascript
{
  // ... existing fields ...
  
  // TELEGRAM FIELDS (NEW)
  
  // User identification
  telegramUserId: "987654321",
  
  // Preferences
  telegramOptIn: false,
  telegramOptOut: false,
  
  // Live chat state
  telegramHumanChatActive: false,
  telegramHumanChatPending: false,
  telegramHumanChatPendingAt: null,
  telegramHumanChatPendingMessages: [
    {
      sender: "admin",
      text: "Hello! How can I help?",
      at: 1688123456789
    }
  ],
  telegramHumanChatLastDeliveredAt: null,
  telegramLastInboundAt: 1688123456789,
  
  // AI advisor state
  telegramAiAdvisorSessionActive: false,
  telegramAiAdvisorSessionStartedAt: null,
  telegramAiAdvisorSessionPausedAt: null,
  telegramAiAdvisorSessionStartedBy: "consultant_id",
  
  // ... existing fields continue ...
}
```

### Storage Index Keys

```
telegram:user:{telegramUserId}           → Maps to user ID
telegram:human-inbound:{messageId}       → Deduplication flag
telegram:advisor-inbound:{messageId}     → Deduplication flag
```

---

## 🔐 Environment Variables

```env
# TELEGRAM CONFIGURATION
TELEGRAM_BOT_TOKEN=123456:ABCdef-GHIjkl-MNOpqrst
                   ↑
                   └─ Get from @BotFather /newbot

TELEGRAM_WEBHOOK_URL=https://your-project.vercel.app/api/telegram/inbound
                     ↑
                     └─ Your deployed URL + /api/telegram/inbound

# Production (Vercel):
# Add these in Project Settings > Environment Variables

# Development (local):
# Add to .env file
```

---

## 🧪 Test Scenarios

### Scenario 1: Candidate Offline
```
Timeline:
  T=0:00  → Admin sends "Hello from your advisor!"
  T=0:00  → System checks: Candidate online? NO
  T=0:00  → Message queues on Telegram
  T=5:30  → Candidate opens Telegram
  T=5:30  → Message auto-delivers
  T=5:31  → Candidate reads: "Hello from your advisor!"
  ✅ SUCCESS
```

### Scenario 2: AI Advisor Chat
```
Timeline:
  T=0:00  → Admin starts AI advisor in panel
  T=0:01  → Candidate gets Telegram notification
  T=0:30  → Candidate opens Telegram bot
  T=1:00  → Candidate: "What programs match my profile?"
  T=1:02  → AI responds: "Based on your scores..."
  T=1:03  → Candidate reads response
  ✅ SUCCESS
```

### Scenario 3: Live Chat Reply
```
Timeline:
  T=0:00  → Candidate online, sends Telegram message
  T=0:01  → Admin sees in live chat panel
  T=0:05  → Admin replies: "Great question!"
  T=0:06  → Candidate sees on Telegram
  T=0:30  → Candidate sends follow-up
  ✅ SUCCESS
```

---

## 📊 Comparison: WhatsApp vs Telegram

```
┌──────────────────┬─────────────────┬──────────────────┐
│ Feature          │ WhatsApp        │ Telegram         │
├──────────────────┼─────────────────┼──────────────────┤
│ User ID          │ Phone number    │ Numeric ID       │
│                  │ +1234567890     │ 987654321        │
├──────────────────┼─────────────────┼──────────────────┤
│ Message limit    │ 1500 chars      │ 4000 chars       │
├──────────────────┼─────────────────┼──────────────────┤
│ API provider     │ Twilio          │ Telegram (free)  │
├──────────────────┼─────────────────┼──────────────────┤
│ Cost             │ Per message     │ Free tier        │
├──────────────────┼─────────────────┼──────────────────┤
│ Webhook setup    │ Twilio URL      │ Telegram URL     │
├──────────────────┼─────────────────┼──────────────────┤
│ Templates        │ Pre-approved    │ Flexible         │
├──────────────────┼─────────────────┼──────────────────┤
│ Setup time       │ ~30 min         │ ~5 min           │
└──────────────────┴─────────────────┴──────────────────┘
```

---

## 🔧 Troubleshooting Flow

```
                    Problem?
                        │
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
   Bot not       Messages not      Can't deploy?
   responding?   delivering?
        │               │               │
        ↓               ↓               ↓
   Check token    Check webhook    Check env vars
   vs .env        URL reachable    in Vercel
        │               │               │
        ↓               ↓               ↓
   Restart dev     Check logs       Re-deploy
   server         for errors
        │               │               │
        └───────────────┼───────────────┘
                        ↓
            ✅ Issue resolved!
```

---

## 📞 Where to Find Help

| Issue | File to Check |
|-------|---------------|
| Setup questions | [QUICK_START.md](./QUICK_START.md) |
| How to get bot token | [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) |
| Need to restore WhatsApp | [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md) |
| Database changes | [TELEGRAM_DB_ADDITIONS.md](./TELEGRAM_DB_ADDITIONS.md) |
| Step-by-step guide | [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) |
| Complete overview | [TELEGRAM_IMPLEMENTATION_SUMMARY.md](./TELEGRAM_IMPLEMENTATION_SUMMARY.md) |

---

## ✅ Implementation Checklist (Quick View)

- [ ] Get Telegram bot token from @BotFather
- [ ] Add `TELEGRAM_BOT_TOKEN` to `.env`
- [ ] Add `TELEGRAM_WEBHOOK_URL` to `.env`
- [ ] Copy 5 Telegram files to repo
- [ ] Update `lib/db.js` with new fields
- [ ] Update `package.json` with `node-telegram-bot-api`
- [ ] Run `npm install`
- [ ] Comment out WhatsApp code (optional)
- [ ] Deploy to Vercel
- [ ] Test with bot
- [ ] Test in admin panel
- [ ] Done! 🎉
