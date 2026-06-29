# WhatsApp Disabled - Reversion Guide

**Date Disabled**: 2026-06-29  
**Reason**: Switched to Telegram for better feature set  
**Status**: All WhatsApp code preserved and commented out

---

## 🎯 Reversion Checklist

To restore WhatsApp functionality, follow these steps:

### Step 1: Environment Variables
```bash
# In .env, UNCOMMENT these Twilio variables:
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_WHATSAPP_LIVE_CHAT_CONTENT_SID=HX...

# Then COMMENT OUT these Telegram variables:
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_WEBHOOK_URL=...
```

### Step 2: Code Reversion

#### Find & Replace Comments
All disabled WhatsApp code is marked with:
```javascript
/* WHATSAPP_DISABLED_START_<timestamp> */
// ... disabled code here ...
/* WHATSAPP_DISABLED_END_<timestamp> */
```

**Search for this pattern** in your IDE:
```
WHATSAPP_DISABLED_START
```

For each match:
1. Delete the `/* WHATSAPP_DISABLED_START_... */` line
2. Delete the `/* WHATSAPP_DISABLED_END_... */` line
3. Uncomment the code between

#### Files Modified

**Disabled (Comment out these imports/calls):**
- `api/telegram/inbound.js` - NEW FILE, delete or disable
- `lib/telegram/*` - NEW FILES, delete or disable entire directory

**Restored (Uncomment):**
- `lib/whatsapp/humanChat.js` - All functions should be active
- `lib/whatsapp/outbound.js` - `sendViaWhatsApp()` and `sendTemplateViaWhatsApp()` functions
- `lib/whatsappAiAdvisor/service.js` - `start()`, `pause()`, `handleInbound()` functions
- `api/whatsapp/inbound.js` - Webhook handler

### Step 3: Dependencies

**Add back to package.json:**
```json
{
  "dependencies": {
    "twilio": "^4.13.0"
  }
}
```

Then run:
```bash
npm install
```

**Remove from package.json:**
```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.63.0"
  }
}
```

### Step 4: API Routes

Restore these routes in your router/vercel.json:
```javascript
// DELETE:
POST /api/telegram/inbound

// RESTORE:
POST /api/whatsapp/inbound
```

### Step 5: Database Migration (if needed)

If you've added candidates with Telegram:
```javascript
// Run this migration to remove Telegram fields:
const candidates = await getAllCandidates();
for (const candidate of candidates) {
  const cleaned = {
    ...candidate,
    // Remove all telegram* fields
    telegramUserId: undefined,
    telegramHumanChatActive: undefined,
    telegramHumanChatPending: undefined,
    telegramHumanChatPendingMessages: undefined,
    telegramHumanChatPendingAt: undefined,
    telegramAiAdvisorSessionActive: undefined,
    // etc...
  };
  await store.set(`user:${candidate.id}`, cleaned);
}
```

### Step 6: Tests

Run WhatsApp tests:
```bash
npm run test:whatsapp-live-chat
```

---

## 📋 Detailed File Changes

### lib/whatsapp/humanChat.js
**Status**: All code DISABLED with comments  
**How to restore**:
```javascript
// BEFORE:
/* WHATSAPP_DISABLED_START_2026-06-29 */
export function isHumanChatStaff(sender) {
  return sender === 'consultant' || sender === 'admin';
}
/* WHATSAPP_DISABLED_END_2026-06-29 */

// AFTER:
export function isHumanChatStaff(sender) {
  return sender === 'consultant' || sender === 'admin';
}
```

### lib/whatsapp/outbound.js
**Status**: All code DISABLED  
**Key functions to restore**:
- `getTwilioClient()` - Initialize Twilio client
- `sendViaWhatsApp(phoneNumber, text)` - Send text messages
- `sendTemplateViaWhatsApp(phoneNumber, templateSid, variables)` - Send templates

### lib/whatsappAiAdvisor/service.js
**Status**: Functions DISABLED  
**Key functions to restore**:
- `start(candidateId, actorUser)` - Start AI advisor session
- `pause(candidateId, actorUser)` - Pause AI advisor
- `handleInbound(candidate, inboundMessage)` - Process inbound AI messages

### api/whatsapp/inbound.js
**Status**: Entire endpoint DISABLED  
**Purpose**: Twilio webhook that receives inbound WhatsApp messages  
**How to restore**:
1. Uncomment all exports
2. Make sure imports to `lib/whatsapp/*` are uncommented
3. Redeploy

---

## 🔄 Message Flow (WhatsApp - Original)

```
WhatsApp User sends message
    ↓
Twilio webhook (api/whatsapp/inbound.js)
    ↓
Resolve candidate by phone number
    ↓
Check: Is human live chat active?
    ├─ YES → handleHumanChatInbound() → append to chat, notify consultant
    └─ NO → handleInbound() (AI Advisor) → generate response, send template
```

---

## 🧪 Quick Reversion Verification

After following all steps, test:

```bash
# 1. Check environment
echo $TWILIO_ACCOUNT_SID  # Should output your SID

# 2. Test WhatsApp endpoint
curl -X POST https://localhost:3000/api/whatsapp/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "From": "whatsapp:+1234567890",
    "Body": "Test message",
    "MessageSid": "SM12345"
  }'

# 3. Run tests
npm run test:whatsapp-live-chat
```

Expected output: `PASS lib/whatsapp/__tests__/human-chat.test.js`

---

## ⚠️ Important Notes

1. **Data loss**: Telegram conversation history will NOT be migrated to WhatsApp
2. **User IDs**: Candidates will need to re-add their WhatsApp numbers
3. **Sessions**: Active Telegram sessions will be lost (candidates need to restart)
4. **Templates**: WhatsApp templates require re-approval from Meta

---

## 🆘 Need Help?

If reversion fails:
1. Check that ALL imports reference WhatsApp correctly
2. Verify Twilio credentials are valid
3. Make sure `npm install` completed successfully
4. Check that API route is registered in your server
5. Review Twilio webhook URL configuration

---

## 📞 Contact

For questions about reversion, check:
- Original Twilio setup guide: [WHATSAPP_BUILD_COMPLETE.md](./WHATSAPP_BUILD_COMPLETE.md)
- Twilio documentation: https://www.twilio.com/docs/whatsapp
