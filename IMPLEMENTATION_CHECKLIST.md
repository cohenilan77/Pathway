# Telegram Integration Implementation Checklist

**Status**: Ready to implement  
**Effort**: ~30 mins  
**Files Modified**: 2 files  
**Files Created**: 5 files

---

## ✅ Implementation Steps

### Step 1: Update Database (lib/db.js)
- [ ] Open `lib/db.js`
- [ ] Around line 82 in `createManagedUser`: Add Telegram fields (see [TELEGRAM_DB_ADDITIONS.md](./TELEGRAM_DB_ADDITIONS.md))
- [ ] After line 735: Add `getUserByTelegramId()` and `setCandidateTelegramIdIndex()` functions
- [ ] Save file

**Time**: 5 minutes

---

### Step 2: Update package.json
- [ ] Open `package.json`
- [ ] Add to dependencies:
```json
"node-telegram-bot-api": "^0.63.0"
```
- [ ] Run `npm install`

**Time**: 2 minutes

---

### Step 3: Add WhatsApp Disabled Comments
- [ ] Comment out all WhatsApp code with markers:
```javascript
/* WHATSAPP_DISABLED_START_2026-06-29 */
// ... code to disable ...
/* WHATSAPP_DISABLED_END_2026-06-29 */
```

**Files to modify**:
- [ ] `lib/whatsapp/humanChat.js` - Comment out all exports
- [ ] `lib/whatsapp/outbound.js` - Comment out all exports  
- [ ] `lib/whatsappAiAdvisor/service.js` - Comment out `start()`, `pause()`, `handleInbound()`
- [ ] `api/whatsapp/inbound.js` - Comment out handler

**Time**: 10 minutes

---

### Step 4: Update Environment Variables
- [ ] Copy `.env.example` to `.env` (if not done)
- [ ] Add to `.env`:
```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_WEBHOOK_URL=https://your-deployed-url.vercel.app/api/telegram/inbound
```

**To get bot token**:
1. Open Telegram
2. Search `@BotFather`
3. Send `/newbot`
4. Follow prompts
5. Copy token to `.env`

**Time**: 5 minutes

---

### Step 5: Copy New Files to Your Repo

New files are already created in `/Users/ilancohen/Documents/Codex/`:

```
lib/telegram/
├── outbound.js          ✅ Created
├── resolveCandidate.js  ✅ Created
├── humanChat.js         ✅ Created
└── advisorService.js    ✅ Created

api/telegram/
└── inbound.js           ✅ Created
```

- [ ] Create directories in your repo:
  ```bash
  mkdir -p lib/telegram
  mkdir -p api/telegram
  ```
- [ ] Copy files from `/Users/ilancohen/Documents/Codex/` to your repo

**Time**: 2 minutes

---

### Step 6: Test Locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev:api

# 3. Test by sending message to your bot on Telegram
```

**Time**: 5 minutes

---

### Step 7: Deploy to Production

- [ ] Commit changes:
  ```bash
  git add .
  git commit -m "Switch messaging from WhatsApp to Telegram"
  ```
- [ ] Push to GitHub
- [ ] Deploy to Vercel (auto or manual)
- [ ] Set environment variables in Vercel:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_URL` (from deployment URL)

**Time**: 5 minutes

---

### Step 8: Test in Production

- [ ] Add test candidate in admin panel with Telegram user ID
- [ ] Send message from admin → candidate receives on Telegram
- [ ] Start AI advisor → candidate can chat with AI on Telegram
- [ ] Test offline routing (candidate offline when message sent)

**Time**: 5 minutes

---

## 🎯 Quick Reference

### Where to Put API Key
**File**: `.env`  
**Variable**: `TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234...`

### Webhook URL Format
**For Vercel**: `https://your-project.vercel.app/api/telegram/inbound`  
**For local dev**: `https://your-ngrok-url.ngrok.io/api/telegram/inbound`

### Database Fields Added
```javascript
candidate.telegramUserId           // e.g., "987654321"
candidate.telegramHumanChatActive  // e.g., true/false
candidate.telegramAiAdvisorSessionActive
// ... (see TELEGRAM_DB_ADDITIONS.md for full list)
```

### Key Differences from WhatsApp

| Aspect | WhatsApp | Telegram |
|--------|----------|----------|
| **User ID** | Phone number (+1234567890) | Numeric ID (987654321) |
| **API** | Twilio | Telegram Bot API |
| **Message limit** | 1500 chars | 4000 chars |
| **Webhook** | Custom Twilio URL | Telegram updates |
| **Cost** | Per message | Free tier available |

---

## ⚠️ Important Notes

1. **WhatsApp code is preserved** - All commented with `WHATSAPP_DISABLED_*` markers
2. **Telegram code is new** - No prior implementation to worry about
3. **Database migration not needed** - New fields added to user object automatically
4. **No breaking changes** - Existing WhatsApp data stays intact
5. **Easy to revert** - See [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md)

---

## 📞 Testing Commands

Once implemented, test these scenarios:

### 1. Live Chat (Consultant → Candidate)
```bash
# Admin sends message
# Candidate offline
# Message queues on Telegram
# Candidate returns online
# Message auto-delivers
```

### 2. AI Advisor
```bash
# Admin starts AI advisor for candidate
# Candidate starts chat with bot
# AI responds on Telegram
```

### 3. Offline Routing
```bash
# Candidate logged out of web app
# Admin sends message
# Appears on Telegram immediately
```

---

## 🔍 Files to Review

1. [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - Full setup guide
2. [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md) - Reversion guide
3. [TELEGRAM_DB_ADDITIONS.md](./TELEGRAM_DB_ADDITIONS.md) - Database changes
4. `lib/telegram/outbound.js` - Message sending
5. `api/telegram/inbound.js` - Webhook handler

---

## 💾 Summary of Changes

**Files Modified**: 2
- `lib/db.js` - Add Telegram support
- `package.json` - Add telegram library

**Files Created**: 5
- `lib/telegram/outbound.js`
- `lib/telegram/resolveCandidate.js`
- `lib/telegram/humanChat.js`
- `lib/telegram/advisorService.js`
- `api/telegram/inbound.js`

**Total New Code**: ~600 lines (well-structured, commented)

**Estimated Time**: 30 minutes (including testing)
