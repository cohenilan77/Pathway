# WhatsApp AI Advisor

This module owns the candidate-specific start/pause lifecycle for continuing Pathway's existing AI Advisor conversation on WhatsApp.

## Product boundary

- It is not a general WhatsApp routing switch.
- Starting sends the approved Twilio Content template and records a system event in the candidate's existing `userdata.chat`.
- Inbound WhatsApp messages are always stored in that same advisor history.
- AI replies are sent only while the feature is active, the candidate remains opted in, and the inbound message opened the 24-hour WhatsApp window.
- Pausing stops automatic replies and does not send a WhatsApp message.

## Environment

`TWILIO_WHATSAPP_ADVISOR_KICKOFF_CONTENT_SID` must point to the approved template:

> Hi {{1}}, your AI admissions advisor is ready to continue with you here on WhatsApp. Reply START to begin.

Existing Twilio account, auth token, and WhatsApp sender variables are also required.
