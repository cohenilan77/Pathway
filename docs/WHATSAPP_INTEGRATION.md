# WhatsApp Integration for Pathway

Complete WhatsApp messaging system that delivers AI advisor messages, consultant replies, and system notifications to candidates when they're not logged into the portal.

## Architecture Overview

```
Candidate Portal          WhatsApp Messages
    ↓                          ↓
    └─ postMessage() ──→ [Message Store]
       (chokepoint)            ↓
                    ┌─ lastActiveAt check
                    │  (15 min timeout)
                    ├─→ If logged in: Silent (already in portal)
                    └─→ If offline: Send via Twilio
                          ├─ Inside 24h: Free-form
                          └─ Outside 24h: Pre-approved template
```

## Setup Instructions

### 1. Twilio Configuration

1. **Sign up** at [twilio.com](https://www.twilio.com)
2. **Get credentials**: Account SID, Auth Token (Console > Settings > Account)
3. **Activate WhatsApp Sandbox**:
   - Go to Messaging → WhatsApp
   - Copy sandbox FROM number (e.g., `+14155238886`)
   - Save to-approved numbers in sandbox for testing

4. **Set environment variables** in `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_FROM=+14155238886
   ```

5. **Webhook URL**: Configure inbound message handling at `/api/whatsapp/inbound.js`
   - In Twilio Console → WhatsApp Settings → When a Message Comes In:
   - POST to: `https://your-domain.com/api/whatsapp/inbound`

### 2. Database Schema

WhatsApp fields added to candidate records:

```javascript
whatsappNumber: string       // E.164 format (+972541234567)
whatsappOptIn: boolean       // Consent flag
whatsappOptInTimestamp: datetime  // When consent given
whatsappOptOut: boolean      // STOP keyword sets this
bsuid: string                // Meta username (July 2026)
lastActiveAt: datetime       // Portal activity tracking
```

### 3. Environment Variables

Add to `.env` and Vercel:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+14155238886
```

## API Endpoints

### Inbound Messages
**POST** `/api/whatsapp/inbound.js`

Twilio webhook for receiving candidate messages. Auto-replies with AI advisor response.

**Body** (from Twilio):
```json
{
  "From": "whatsapp:+972541234567",
  "Body": "What schools should I apply to?",
  "ExternalUserId": "BSUID123"  // Optional, for July 2026 rollout
}
```

**Flow**:
1. Resolve candidate by phone or BSUID
2. Check for STOP opt-out
3. Log inbound message
4. Get AI advisor reply via `advisorTurn()`
5. Send reply via Twilio
6. Log outbound message

### WhatsApp Settings
**POST** `/api/candidate/whatsapp-settings`

Save candidate phone & opt-in consent from UI.

**Headers**:
```
x-session-token: [session token]
```

**Body**:
```json
{
  "whatsappNumber": "+972541234567",
  "whatsappOptIn": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "whatsappNumber": "+972541234567",
    "whatsappOptIn": true,
    "whatsappOptInTimestamp": 1719604800000
  }
}
```

## Core Functions

### `postMessage(candidateId, sender, text, originChannel)`

**The chokepoint function**. All messages flow through here.

- Writes to canonical message store
- Mirrors non-portal messages to portal (Stream Chat)
- Checks if candidate is logged in (via `lastActiveAt`)
- Routes to WhatsApp if offline and opted in
- Handles 24-hour template window

**Parameters**:
- `candidateId`: User ID
- `sender`: 'ai' | 'consultant' | 'system'
- `text`: Message text
- `originChannel`: 'whatsapp' | 'portal'

**Usage**:
```javascript
import { postMessage } from '@/lib/whatsapp/postMessage.js';

await postMessage(candidateId, 'ai', 'Your GPA is strong...', 'portal');
```

### `advisorTurn(candidateId, userMessage)`

Wrapper around Anthropic Claude to generate contextual AI responses.

- Loads candidate profile + conversation history
- Sends to Claude with system prompt
- Returns reply + language preference

**Usage**:
```javascript
import { advisorTurn } from '@/lib/whatsapp/advisorTurn.js';

const { reply, language } = await advisorTurn(candidateId, 'What\'s my fit?');
```

### `resolveCandidate(phoneOrBsuid)`

Resolve phone number or BSUID to candidateId.

**Logic**:
1. Try phone lookup first (exact E.164 match)
2. If not found and input is short (<20 chars), try BSUID lookup
3. Throw error if not found

**Usage**:
```javascript
const candidateId = await resolveCandidate('+972541234567');
const candidateId = await resolveCandidate('BSUID123');
```

### `sendViaWhatsApp(phoneNumber, text)`

Send free-form message via Twilio.

**Usage**:
```javascript
await sendViaWhatsApp('+972541234567', 'Your essay looks great!');
```

### `sendTemplateViaWhatsApp(phoneNumber, templateSid, variables)`

Send pre-approved template (outside 24-hour window).

**Usage**:
```javascript
await sendTemplateViaWhatsApp(
  '+972541234567',
  'HTdeadline123',
  { school: 'Stanford', days: '5' }
);
```

## Portal Activity Tracking

Update `lastActiveAt` on every key action in the portal:

```javascript
import { updateLastActive } from '@/lib/db.js';

// On login
await recordLogin(userId);  // Already calls updateLastActive

// On every portal action (in middleware or component)
await updateLastActive(userId);
```

**Timeout Logic**:
- If `lastActiveAt` is NULL or > 15 minutes old → offline
- Otherwise → online (skip WhatsApp delivery)

## WhatsApp Templates

Pre-approved templates for messages outside the 24-hour window:

```javascript
export const WHATSAPP_TEMPLATES = {
  deadline_nudge: {
    sid: 'HTdeadline123',
    variables: ['school', 'days'],
  },
  advisor_replied: {
    sid: 'HTadvisor123',
    variables: ['name'],
  },
  missing_fields: {
    sid: 'HTmissing123',
    variables: ['fields'],
  },
};
```

**To submit a new template to Meta**:

1. Go to Twilio Console → WhatsApp Sandbox → Templates
2. Click "Create Template"
3. Fill in template body + variables
4. Submit to Meta for approval (usually within 2 hours)
5. Once approved, add SID to `whatsappTemplates.js`

## Component: WhatsAppOptIn

React component for candidate phone setup in Settings page.

**Features**:
- Country code dropdown
- Phone number input (E.164 validation)
- Consent checkbox
- Shows opt-in status & timestamp

**Props**:
- `user`: Authenticated user object
- `onSave`: Callback after save
- `disabled`: Disable inputs

**Usage** (already integrated in `Settings.jsx`):
```jsx
<WhatsAppOptIn user={authUser} disabled={false} onSave={handleSave} />
```

## Testing

### Sandbox Testing (Development)

1. **Add your number to Twilio sandbox**:
   - Twilio Console → WhatsApp Sandbox
   - Send "join [code]" to sandbox number
   - Receive confirmation

2. **Send test message** from your number to sandbox number

3. **Verify webhook delivery**:
   - Twilio Console → Logs → Recent Requests
   - Check that `/api/whatsapp/inbound` received POST

4. **Check response**:
   - You should receive AI reply within 5 seconds

### Integration Testing

1. Log out of portal (or trigger offline state)
2. Send system message from consultant dashboard
3. Verify message arrives on WhatsApp

### Opt-Out Testing

Send "STOP" from WhatsApp number → should receive unsubscribe confirmation.

## 24-Hour Window Logic

WhatsApp Business Account rules require:

1. **Inside 24-hour window** (after candidate last sent inbound):
   - Can send any free-form message
   - No template required

2. **Outside 24-hour window**:
   - Can only send pre-approved templates
   - Fallback: If template fails, retry with free-form (may fail)

**Code flow**:
```javascript
const lastInbound = await getLastInboundFromCandidate(candidateId);
const isIn24h = lastInbound && (now - lastInbound) < 24 * 60 * 60 * 1000;

if (sender !== 'ai' && !isIn24h) {
  // Use template
  await sendTemplateViaWhatsApp(...);
} else {
  // Free-form (AI or inside window)
  await sendViaWhatsApp(...);
}
```

## Encryption at Rest

Messages are flagged with `encrypted: true` for future compliance:

```javascript
const message = {
  id: messageId,
  candidateId,
  sender,
  text,
  originChannel,
  timestamp,
  encrypted: true,  // Future: implement AES-256-GCM
};
```

## Security Notes

1. **Phone numbers**: Never shown to consultants in portal
2. **Message content**: Encrypted flag ready for at-rest encryption
3. **STOP keyword**: Immediately sets `whatsappOptOut` flag
4. **Rate limiting**: Consider adding rate limit on inbound webhook
5. **Phone validation**: E.164 format enforced, `libphonenumber-js` validates

## Compliance

- **GDPR**: Phone numbers treated as PII, opt-in required
- **CCPA**: Candidate can opt-out anytime via STOP
- **WhatsApp ToS**: Use only for customer service (admissions advice is permitted)

## Troubleshooting

### Messages not delivering

**Check**:
1. `whatsappOptIn` = true and `whatsappOptOut` = false
2. Phone number is valid E.164 format
3. `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` set correctly
4. Webhook URL in Twilio console is correct

**Logs**: Check Twilio Console → WhatsApp → Message Logs

### AI replies not generating

1. Check `ANTHROPIC_API_KEY` is set
2. Review Claude API usage dashboard
3. Look for errors in server logs from `advisorTurn()`

### Out-of-order or duplicate messages

- Message store uses timestamps; ensure server clocks synchronized
- Idempotency: Each Twilio webhook retry includes same `MessageSid`

## Future Enhancements (July 2026)

- **BSUID routing**: Use Meta username instead of phone (more privacy-friendly)
- **Message encryption**: Implement AES-256-GCM at rest
- **Rich media**: Support image/PDF delivery via WhatsApp
- **Two-way Stream Chat**: Consultant replies visible to candidate in portal
- **Analytics**: Track delivery, reads, response rates
