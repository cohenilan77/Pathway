# WhatsApp Integration Setup Checklist

## Pre-Flight Checklist

### Environment Setup
- [ ] Update `package.json` with `twilio` and `libphonenumber-js` dependencies
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env.local`

### Twilio Configuration
- [ ] Create Twilio account at [twilio.com](https://www.twilio.com)
- [ ] Copy Account SID from Twilio Console
- [ ] Copy Auth Token from Twilio Console
- [ ] Activate WhatsApp Sandbox
- [ ] Copy sandbox FROM number (e.g., `+14155238886`)
- [ ] Add test phone numbers to sandbox (send "join [code]" to sandbox number)

### Environment Variables
- [ ] Set `TWILIO_ACCOUNT_SID` in `.env.local`
- [ ] Set `TWILIO_AUTH_TOKEN` in `.env.local`
- [ ] Set `TWILIO_WHATSAPP_FROM` in `.env.local`
- [ ] Verify all 3 variables are set with `echo $TWILIO_*` (or Windows equivalent)

### Vercel Deployment
- [ ] Add `TWILIO_ACCOUNT_SID` to Vercel Environment Variables
- [ ] Add `TWILIO_AUTH_TOKEN` to Vercel Environment Variables
- [ ] Add `TWILIO_WHATSAPP_FROM` to Vercel Environment Variables

## Files Created

### Database Layer
- [x] `lib/db.js` — Extended with WhatsApp fields + functions:
  - `postWhatsAppMessage()`
  - `getCandidateWhatsAppMessages()`
  - `getUserByCandidatePhone()`
  - `getUserByBSUID()`
  - `setCandidatePhoneIndex()`
  - `setCandidateBSUIDIndex()`
  - `getLastInboundFromCandidate()`

### Core Library Functions
- [x] `lib/whatsapp/resolveCandidate.js` — Phone/BSUID resolution
- [x] `lib/whatsapp/outbound.js` — Twilio integration (sendViaWhatsApp, sendTemplateViaWhatsApp)
- [x] `lib/whatsapp/postMessage.js` — Message routing logic (THE CHOKEPOINT)
- [x] `lib/whatsapp/advisorTurn.js` — AI advisor wrapper

### API Endpoints
- [x] `api/whatsapp/inbound.js` — Webhook for incoming messages
- [x] `api/candidate/whatsapp-settings.js` — Save phone + opt-in

### Frontend Components
- [x] `src/components/candidate/WhatsAppOptIn.jsx` — Phone setup UI
- [x] Integration into `src/components/candidate/Settings.jsx`

### Configuration
- [x] `config/whatsappTemplates.js` — Pre-approved message templates
- [x] `.env.example` — Updated with Twilio variables

### Documentation
- [x] `docs/WHATSAPP_INTEGRATION.md` — Complete setup + API reference
- [x] `docs/WHATSAPP_SETUP_CHECKLIST.md` — This file

## Database Migration

Run these commands to add WhatsApp fields to existing candidate records:

```javascript
// In your database admin console or migration script:
// For Redis, update each user record:
const store = getStore();
const userIds = await store.smembers('users:all');

for (const userId of userIds) {
  const user = await store.get(`user:${userId}`);
  if (!user.whatsappNumber) {
    await store.set(`user:${userId}`, {
      ...user,
      whatsappNumber: '',
      whatsappOptIn: false,
      whatsappOptInTimestamp: null,
      whatsappOptOut: false,
      bsuid: '',
      lastActiveAt: user.lastActiveAt || user.createdAt || Date.now(),
    });
  }
}
```

## Testing Steps

### Step 1: Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev:api

# Set test env vars
export TWILIO_ACCOUNT_SID="your_sid"
export TWILIO_AUTH_TOKEN="your_token"
export TWILIO_WHATSAPP_FROM="+14155238886"
```

### Step 2: Twilio Sandbox Setup

1. Go to Twilio Console → Messaging → WhatsApp
2. Copy sandbox FROM number
3. Send this text to sandbox number from your phone:
   ```
   join [template-word]
   ```
4. You should receive: "You have joined Pathway WhatsApp sandbox"

### Step 3: Test Inbound Message

1. Send message from your phone to sandbox number:
   ```
   What schools should I apply to?
   ```
2. Should receive AI advisor reply within 5 seconds
3. Check server logs for successful webhook call

### Step 4: Test UI Opt-In

1. Go to portal Settings page
2. Click "Allow Pathway to message me on WhatsApp"
3. Select country
4. Enter your test phone number
5. Click "Save Settings"
6. Verify success message

### Step 5: Test Offline Delivery

1. Log out of portal
2. Send system message from consultant dashboard
3. Message should appear on WhatsApp within 30 seconds

### Step 6: Test Opt-Out

1. Send "STOP" to sandbox number from your phone
2. Should receive: "You have been unsubscribed from Pathway messages"
3. Subsequent messages should NOT deliver

## Integration with Portal

### Update Portal Login Handler

Add `updateLastActive()` call in login flow:

```javascript
// In login.js or session handler
import { updateLastActive } from '@/lib/db.js';

// After successful login
await updateLastActive(userId);
```

### Update Key Portal Actions

Add `updateLastActive()` to these high-value events:

```javascript
// In Settings.jsx, Dashboard.jsx, Documents.jsx, etc.
import { updateLastActive } from '@/lib/db.js';

// When user performs action (document upload, profile update, etc.)
const handleProfileUpdate = async () => {
  await updateLastActive(userId);
  // ... rest of handler
};
```

## Webhook Configuration in Twilio

1. Go to Twilio Console → Messaging → WhatsApp
2. Scroll to "When a Message Comes In"
3. Select "HTTP POST" (if not already selected)
4. Enter webhook URL:
   ```
   https://your-production-domain.com/api/whatsapp/inbound
   ```
5. Click "Save"

For local testing, use ngrok to expose your local server:
```bash
ngrok http 3000
# Copy ngrok URL and use in Twilio webhook
# https://xxxx-xxxx-xxx.ngrok.io/api/whatsapp/inbound
```

## Monitoring & Debugging

### View Twilio Logs
- Twilio Console → Monitoring → Logs → Recent Requests
- Filter by "WhatsApp" to see all message activity

### Check Server Logs
```bash
# Local development
npm run dev:api 2>&1 | grep -i whatsapp

# Vercel logs
vercel logs --tail
```

### Test Webhook Manually
```bash
curl -X POST http://localhost:3000/api/whatsapp/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "From": "whatsapp:+972541234567",
    "To": "whatsapp:+14155238886",
    "Body": "Test message"
  }'
```

## Rate Limiting & Limits

### Twilio Limits
- **Message rate**: 10 messages/second per account
- **Payload size**: 8KB max
- **Webhook timeout**: 3 seconds

### Pathway Limits
- **Inbound queue**: No queue (real-time only)
- **AI timeout**: 10 seconds (configurable in advisorTurn.js)
- **Message storage**: Unlimited (per Redis capacity)

## Rollback Plan

If issues occur:

1. **Disable WhatsApp UI**: Comment out `<WhatsAppOptIn />` in Settings.jsx
2. **Disable webhook**: Remove webhook URL from Twilio console
3. **Revert environment**: Remove `TWILIO_*` env vars from Vercel
4. **Audit data**: Check `whatsapp:*` keys in Redis for stale data

## Phase 2: July 2026 BSUID Rollout

When Meta BSUID support is available:

1. Update `resolveCandidate()` to prefer BSUID over phone
2. Sync BSUIDs from Twilio webhook `ExternalUserId` field
3. Deprecate phone-based lookups (keep as fallback)
4. Update documentation

## Support & Troubleshooting

See `docs/WHATSAPP_INTEGRATION.md` for:
- Architecture diagrams
- Detailed API documentation
- Troubleshooting guide
- Security considerations
- Compliance notes

## Success Criteria

✅ **Green light when:**
- [ ] Sandbox test message delivers in <5 seconds
- [ ] Opt-in UI saves phone successfully
- [ ] Portal logout triggers WhatsApp delivery
- [ ] STOP keyword unsubscribes candidate
- [ ] All 3 Twilio env vars set in Vercel
- [ ] Webhook logs show successful POST calls
