# ⚡ Telegram Integration - Quick Start (5 Minutes)

## Get Your Bot Token (2 minutes)

1. **Open Telegram** app on your phone/desktop
2. **Search for**: `@BotFather`
3. **Send**: `/newbot`
4. **Answer prompts**:
   - Bot name: `Pathway Assistant`
   - Username: `pathway_assistant_bot` (must be unique, use your project name)
5. **Copy the token** (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

---

## Add to Your Project (3 minutes)

### 1️⃣ Update `.env`
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_URL=https://your-project.vercel.app/api/telegram/inbound
```

### 2️⃣ Copy These Files to Your Repo
```
From: /Users/ilancohen/Documents/Codex/

Copy to your repo:
  lib/telegram/outbound.js        → lib/telegram/outbound.js
  lib/telegram/resolveCandidate.js → lib/telegram/resolveCandidate.js
  lib/telegram/humanChat.js        → lib/telegram/humanChat.js
  lib/telegram/advisorService.js   → lib/telegram/advisorService.js
  api/telegram/inbound.js          → api/telegram/inbound.js
```

### 3️⃣ Update Your Database (`lib/db.js`)

**Add to `createManagedUser()` function (around line 82)**:
```javascript
// After whatsappHumanChatLastDeliveredAt, add:
telegramUserId: '',
telegramOptIn: false,
telegramOptOut: false,
telegramLastInboundAt: null,
telegramAiAdvisorSessionActive: false,
telegramAiAdvisorSessionStartedAt: null,
telegramAiAdvisorSessionPausedAt: null,
telegramAiAdvisorSessionStartedBy: null,
telegramHumanChatActive: false,
telegramHumanChatPending: false,
telegramHumanChatPendingAt: null,
telegramHumanChatPendingMessages: [],
telegramHumanChatLastDeliveredAt: null,
```

**Add after line 735**:
```javascript
export async function getUserByTelegramId(telegramUserId) {
  const store = getStore();
  return await store.get(`telegram:user:${telegramUserId}`);
}

export async function setCandidateTelegramIdIndex(userId, telegramUserId) {
  const store = getStore();
  if (telegramUserId) {
    await store.set(`telegram:user:${telegramUserId}`, userId);
  }
}
```

### 4️⃣ Update `package.json`
Add to dependencies:
```json
"node-telegram-bot-api": "^0.63.0"
```

Run:
```bash
npm install
```

### 5️⃣ Disable WhatsApp (Optional)
Comment out WhatsApp code with markers:
```javascript
/* WHATSAPP_DISABLED_START_2026-06-29 */
// WhatsApp code here
/* WHATSAPP_DISABLED_END_2026-06-29 */
```

Files to update:
- `lib/whatsapp/humanChat.js`
- `lib/whatsapp/outbound.js`
- `lib/whatsappAiAdvisor/service.js`
- `api/whatsapp/inbound.js`

### 6️⃣ Deploy
```bash
git add .
git commit -m "Add Telegram integration, disable WhatsApp"
git push
```

---

## 🧪 Test It

### Local Test
1. Start dev server: `npm run dev:api`
2. Open Telegram
3. Go to your bot: `@pathway_assistant_bot`
4. Send `/start`
5. Check console logs for webhook registration

### Production Test (After Deploy)
1. In Vercel, set environment variables:
   - `TELEGRAM_BOT_TOKEN` = your token
   - `TELEGRAM_WEBHOOK_URL` = `https://your-vercel-url.vercel.app/api/telegram/inbound`
2. Open Telegram, message your bot
3. Webhook auto-registers on first message

---

## 📝 What Each File Does

| File | Purpose |
|------|---------|
| `lib/telegram/outbound.js` | Send messages to Telegram |
| `lib/telegram/resolveCandidate.js` | Map Telegram ID to candidate |
| `lib/telegram/humanChat.js` | 1:1 live chat logic |
| `lib/telegram/advisorService.js` | AI advisor on Telegram |
| `api/telegram/inbound.js` | Webhook handler |

---

## 🎯 How It Works

### For Candidates (Offline)
```
Consultant sends message via admin
  ↓
Candidate offline? → Message queues on Telegram
  ↓
Candidate opens Telegram → Auto-delivers
  ↓
Candidate replies → Consultant sees in admin
```

### For AI Advisor
```
Consultant starts AI advisor in admin
  ↓
Candidate gets Telegram notification
  ↓
Candidate opens bot chat
  ↓
Candidate asks questions
  ↓
AI responds on Telegram
```

---

## 🔑 API Key Location

**File**: `.env`  
**Format**: 
```env
TELEGRAM_BOT_TOKEN=123456:ABCdef-GHIjkl-MNO
```

**Get from**: @BotFather `/newbot` command

---

## 🚀 Next Steps

1. ✅ Get bot token
2. ✅ Add `.env` variables
3. ✅ Copy 5 Telegram files
4. ✅ Update `lib/db.js`
5. ✅ Update `package.json`
6. ✅ Disable WhatsApp (optional)
7. ✅ Deploy
8. ✅ Test

---

## 📚 Full Documentation

- [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - Complete setup guide
- [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md) - How to restore WhatsApp
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Step-by-step checklist
- [TELEGRAM_IMPLEMENTATION_SUMMARY.md](./TELEGRAM_IMPLEMENTATION_SUMMARY.md) - Full technical overview

---

## ❓ Troubleshooting

**Bot not responding?**
- Check bot token in `.env` is correct
- Restart dev server
- Check console for errors

**Webhook not registering?**
- Make sure `TELEGRAM_WEBHOOK_URL` is reachable
- Check network connectivity
- Look for error logs

**Revert to WhatsApp?**
- See [WHATSAPP_DISABLED_NOTES.md](./WHATSAPP_DISABLED_NOTES.md)
- Takes ~15 minutes
- All code is preserved

---

**🎉 That's it! You're ready to go!**
