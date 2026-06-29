# Vercel Environment Variables Setup - Telegram Integration

**Last Updated**: 2026-06-29  
**Status**: Ready to configure  
**Time to setup**: 5 minutes

---

## 🚀 What to Add in Vercel

### Go to: Vercel Project Settings > Environment Variables

Add these 2 variables:

```
TELEGRAM_BOT_TOKEN = your_bot_token_here
TELEGRAM_WEBHOOK_URL = https://your-project-name.vercel.app/api/telegram/inbound
```

---

## 📋 Step-by-Step Setup

### Step 1: Get Telegram Bot Token (if not done yet)
1. Open Telegram app
2. Search: `@BotFather`
3. Send: `/newbot`
4. Answer prompts:
   - Bot name: "Pathway Assistant"
   - Username: "pathway_assistant_bot" (must be unique)
5. Copy token (format: `123456:ABCdef-GHIjkl-MNOpqrst`)

### Step 2: Get Your Vercel Project URL
1. Go to Vercel Dashboard
2. Select your Pathway project
3. Copy the URL (example: `https://pathway.vercel.app`)

### Step 3: Add Environment Variables to Vercel
1. Open Vercel Project Settings
2. Go to "Environment Variables"
3. Add Variable 1:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: `123456:ABCdef-GHIjkl-MNOpqrst` (your actual bot token)
   - **Environments**: Select all (Production, Preview, Development)

4. Add Variable 2:
   - **Name**: `TELEGRAM_WEBHOOK_URL`
   - **Value**: `https://your-project-name.vercel.app/api/telegram/inbound`
   - **Environments**: Select all

5. Click "Save"

### Step 4: Redeploy
1. Go to Deployments
2. Click the latest deployment
3. Click "Redeploy" (or just push new code to trigger deploy)

### Step 5: Verify
The webhook will auto-register on first inbound message to your bot.

---

## ✅ Complete Configuration Checklist

### Before Deployment
- [ ] Got Telegram bot token from @BotFather
- [ ] Token is in format: `123456:ABCdef-GHIjkl-MNOpqrst`
- [ ] Copied 5 Telegram files to repo
- [ ] Updated `lib/db.js` with Telegram fields
- [ ] Updated `package.json` with `node-telegram-bot-api`
- [ ] Updated `.env` locally with variables
- [ ] Ran `npm install`
- [ ] Tested locally (optional but recommended)

### In Vercel
- [ ] Added `TELEGRAM_BOT_TOKEN` environment variable
- [ ] Added `TELEGRAM_WEBHOOK_URL` environment variable
- [ ] Selected "all" for environments (Production, Preview, Development)
- [ ] Redeployed the project

### After Deployment
- [ ] Message your Telegram bot to test
- [ ] Check that webhook registered (automatic)
- [ ] Test admin → candidate messaging
- [ ] Test AI advisor startup

---

## 🔑 Environment Variables Reference

### TELEGRAM_BOT_TOKEN
- **What it is**: Authentication token for your Telegram bot
- **Format**: `NUMBER:STRING` (e.g., `123456:ABCdef-GHIjkl-MNOpqrst`)
- **Where to get**: @BotFather `/newbot` command on Telegram
- **Visibility**: Keep private! (Vercel keeps it secret)
- **Required**: YES

### TELEGRAM_WEBHOOK_URL
- **What it is**: URL where Telegram sends incoming messages
- **Format**: `https://your-project.vercel.app/api/telegram/inbound`
- **What to replace**: `your-project` with your actual project name
- **Example**: `https://pathway.vercel.app/api/telegram/inbound`
- **Required**: YES

### Other Variables (Keep Existing)
- `ANTHROPIC_API_KEY` - Keep as is
- `ADMIN_SECRET` - Keep as is
- `KV_REST_API_URL` - Keep as is (Redis)
- `KV_REST_API_TOKEN` - Keep as is (Redis)
- All other existing variables - Keep as is

---

## ❓ FAQ

### Q: Do I need to remove Twilio variables?
A: No, you can keep them. They won't interfere. But you can optionally comment them out:
- `TWILIO_ACCOUNT_SID` - Optional to remove
- `TWILIO_AUTH_TOKEN` - Optional to remove
- `TWILIO_WHATSAPP_FROM` - Optional to remove
- `TWILIO_WHATSAPP_LIVE_CHAT_CONTENT_SID` - Optional to remove

### Q: What if I want to restore WhatsApp later?
A: Just keep the Twilio variables and re-enable WhatsApp code. See `WHATSAPP_DISABLED_NOTES.md`

### Q: Does webhook auto-register?
A: Yes! On first inbound message to your bot, the webhook automatically registers with Telegram.

### Q: What if webhook registration fails?
A: It will auto-retry on next message. Check error logs in Vercel.

### Q: How do I test locally?
A: Add variables to `.env` file and run `npm run dev:api`

### Q: Can I use the same token for multiple environments?
A: Yes, one token works for production, preview, and development.

---

## 🔗 Vercel Console Navigation

```
Vercel Dashboard
  → Select "Pathway" project
    → Settings (top menu)
      → Environment Variables (left sidebar)
        → Add new variable
          → TELEGRAM_BOT_TOKEN
          → TELEGRAM_WEBHOOK_URL
        → Save
      → Deployments
        → Redeploy latest
```

---

## 🧪 Testing After Deployment

### Step 1: Wait for Deployment
- Check Vercel Deployments page
- Wait for "Ready" status

### Step 2: Send Test Message
- Open Telegram
- Search for your bot: `@pathway_assistant_bot` (or your chosen username)
- Send any message

### Step 3: Check Webhook Registration
- Vercel Logs should show webhook registration
- Message should be received and processed

### Step 4: Test Features
1. **Live Chat**: Send message from admin panel to candidate
2. **AI Advisor**: Start AI advisor, candidate should see on Telegram
3. **Offline Routing**: Message candidate when they're offline

---

## 📊 Environment Variables Summary Table

| Variable | Value | Required | Keep Secret |
|----------|-------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | `123456:ABC...` | YES | YES |
| `TELEGRAM_WEBHOOK_URL` | `https://your-project.vercel.app/api/telegram/inbound` | YES | NO |
| `ANTHROPIC_API_KEY` | (existing) | YES | YES |
| `ADMIN_SECRET` | (existing) | YES | YES |
| `KV_REST_API_URL` | (existing) | YES | YES |
| `KV_REST_API_TOKEN` | (existing) | YES | YES |
| `TWILIO_*` | (existing - optional to keep) | NO | YES |

---

## 🆘 Troubleshooting

### "Bot not responding after deployment"
1. Check variables are added in Vercel
2. Check project was redeployed
3. Send test message to trigger webhook registration
4. Check Vercel logs for errors

### "Webhook registration failed"
1. Check `TELEGRAM_WEBHOOK_URL` format is correct
2. Verify URL points to your Vercel deployment
3. Check bot token is valid
4. Will auto-retry on next message

### "Permission denied or invalid token"
1. Verify bot token from @BotFather is correct
2. Check no extra spaces in token
3. Verify token format: `NUMBER:STRING`

### "500 errors from Telegram"
1. Check all environment variables are set
2. Check `/api/telegram/inbound` endpoint exists
3. Check `lib/telegram/*` files were copied
4. Check `api/telegram/inbound.js` exists

---

## ✨ After Everything is Working

1. **Tell your team**: Telegram integration is live
2. **Add candidate Telegram IDs**: In admin panel, set `telegramUserId` for each candidate
3. **Test each feature**: Live chat, AI advisor, offline routing
4. **Monitor logs**: Watch Vercel logs for any errors
5. **Keep WhatsApp backup**: All code preserved if you need to revert

---

## 📞 Quick Reference Card

```
TO SETUP:
1. Get bot token: Telegram → @BotFather → /newbot
2. Add to Vercel: TELEGRAM_BOT_TOKEN = token
3. Add to Vercel: TELEGRAM_WEBHOOK_URL = https://your-project.vercel.app/api/telegram/inbound
4. Redeploy

TO TEST:
- Message bot on Telegram
- Check console for "webhook registered"
- Test features in admin panel

TO DEBUG:
- Check Vercel logs
- Check environment variables are set
- Check files were deployed (ls lib/telegram/, api/telegram/)
```

---

**Everything is ready. Follow steps 1-5 above and you're done!** ✅
