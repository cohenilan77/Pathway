# Database Additions for Telegram Support

Add these functions to `lib/db.js`:

## 1. Add Telegram fields to user creation (around line 82-96 in createManagedUser)

In the `createManagedUser` function, add these fields alongside existing whatsapp fields:

```javascript
// After whatsappHumanChatLastDeliveredAt, add:
telegramUserId: '',                          // Telegram user ID
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

## 2. Add Telegram indexing functions (after line 735)

Add these new functions after `setCandidateBSUIDIndex`:

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

## Why these fields?

**telegramUserId**: Unique identifier from Telegram API (not a phone number, just a user ID)
**telegramOptIn/OptOut**: Track user preferences
**telegramLastInboundAt**: Timestamp of last message from candidate (used for 24-hour window)
**telegramAiAdvisorSessionActive**: Whether AI advisor is currently active
**telegramHumanChatActive/Pending**: Track live chat state and pending messages
**telegramHumanChatPendingMessages**: Queue messages while candidate is offline

## How to apply:

1. Open `lib/db.js`
2. Find line ~82 in `createManagedUser` function
3. Add the Telegram fields after the WhatsApp fields
4. Find line ~735 after `setCandidateBSUIDIndex`
5. Add the new Telegram functions
6. Save and test
