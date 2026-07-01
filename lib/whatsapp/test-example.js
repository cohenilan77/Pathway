// Example: How the WhatsApp integration works end-to-end
// This is NOT meant to be run, but shows the flow for reference

import { getUserById, postWhatsAppMessage, updateLastActive } from '../db.js';
import { advisorTurn } from './advisorTurn.js';
import { postMessage } from './postMessage.js';
import { sendViaWhatsApp } from './outbound.js';
import { resolveCandidate } from './resolveCandidate.js';

// --- SCENARIO 1: Candidate messages advisor on WhatsApp while offline ---
async function scenarioInboundMessage() {
  // Twilio delivers webhook to /api/whatsapp/inbound
  const from = '+972541234567';
  const body = 'What GPA do I need for Stanford?';

  // Webhook handler:
  // 1. Resolve candidate
  const candidateId = await resolveCandidate(from);

  // 2. Log inbound message
  await postWhatsAppMessage(candidateId, 'candidate', body, 'whatsapp');

  // 3. Get AI reply
  const { reply } = await advisorTurn(candidateId, body);

  // 4. Send reply via Twilio
  await sendViaWhatsApp(from, reply);

  // 5. Log outbound message
  await postMessage(candidateId, 'ai', reply, 'whatsapp');
}

// --- SCENARIO 2: Consultant sends message to offline candidate ---
async function scenarioConsultantMessage() {
  const candidateId = 'cand_xyz123';
  const consultantMessage = 'Your essay is excellent! Submit it now.';

  // This happens in the portal's consultant interface:
  // await postMessage(candidateId, 'consultant', consultantMessage, 'portal');

  // postMessage() logic:
  const candidate = await getUserById(candidateId);

  // Check if logged in (lastActiveAt within 15 minutes)
  const now = new Date().getTime();
  const lastActive = candidate.lastActiveAt || 0;
  const isLoggedIn = (now - lastActive) < 15 * 60 * 1000;

  if (!isLoggedIn && candidate.whatsappNumber && candidate.whatsappOptIn) {
    // Candidate is OFFLINE → send WhatsApp
    // (Inside 24h window, so use free-form)
    await sendViaWhatsApp(candidate.whatsappNumber, consultantMessage);
    console.log(`✓ WhatsApp delivered to ${candidate.whatsappNumber}`);
  } else if (isLoggedIn) {
    console.log('✓ Candidate is online → message already in portal');
  }
}

// --- SCENARIO 3: Candidate logs in and interacts with portal ---
async function scenarioPortalLogin() {
  const candidateId = 'cand_xyz123';

  // Login handler in portal:
  // 1. Verify credentials
  // 2. Create session
  // 3. UPDATE lastActiveAt
  await updateLastActive(candidateId);
  console.log(`✓ Portal activity recorded for ${candidateId}`);

  // Any future WhatsApp messages will check lastActiveAt:
  // If now - lastActiveAt < 15 minutes → candidate is online
  // → Messages go to portal only, not WhatsApp
}

// --- SCENARIO 4: Candidate opts out ---
async function scenarioOptOut() {
  const from = '+972541234567';

  // Candidate sends STOP from WhatsApp
  // Webhook intercepts and:
  // 1. Finds candidate by phone
  const candidateId = await resolveCandidate(from);

  // 2. Sets whatsappOptOut = true (in inbound.js)
  // 3. Sends confirmation
  await sendViaWhatsApp(from, 'You have been unsubscribed from Pathway messages.');
  console.log(`✓ Opt-out processed for ${candidateId}`);

  // Subsequent calls to postMessage() will check:
  // if (!candidate.whatsappOptOut) { /* send */ }
  // → Will NOT send
}

// --- SCENARIO 5: Portal UI - Candidate enters phone number ---
async function scenarioUIOptIn() {
  const userId = 'cand_xyz123';
  const phoneInput = '+972541234567';

  // WhatsApp settings endpoint:
  // 1. Validate phone with libphonenumber-js
  // 2. Normalize to E.164
  // 3. Update user record
  // 4. Index by phone for lookup

  const user = await getUserById(userId);
  const updated = {
    ...user,
    whatsappNumber: phoneInput,
    whatsappOptIn: true,
    whatsappOptInTimestamp: Date.now(),
  };
  // await store.set(`user:${userId}`, updated);
  // await setCandidatePhoneIndex(userId, phoneInput);

  console.log(`✓ Opt-in saved: ${phoneInput}`);
}

// --- SCENARIO 6: Template message (outside 24h window) ---
async function scenarioTemplateMessage() {
  const candidateId = 'cand_xyz123';
  const candidate = await getUserById(candidateId);

  // Consultant sends "Your Stanford deadline is in 5 days"
  // But it's been >24h since candidate last messaged

  const lastInbound = 1719604800000; // Timestamp from 3 days ago
  const now = Date.now();
  const isIn24h = (now - lastInbound) < 24 * 60 * 60 * 1000;

  if (!isIn24h) {
    console.log('Outside 24h window → use template');
    // await sendTemplateViaWhatsApp(
    //   candidate.whatsappNumber,
    //   'HTdeadline123',
    //   { school: 'Stanford', days: '5' }
    // );
  }
}

console.log(`
WhatsApp Integration Example Flows
===================================

SCENARIO 1: Inbound message from candidate
  Phone: +972541234567
  Message: "What GPA do I need?"
  Flow: resolveCandidate → log inbound → advisorTurn → send reply → log outbound

SCENARIO 2: Consultant sends while candidate offline
  Consultant: "Great essay!"
  Check: Is candidate.lastActiveAt < 15 min old?
  If YES (online): Deliver to portal only
  If NO (offline): Also send WhatsApp

SCENARIO 3: Candidate logs into portal
  Action: Click "Dashboard" or "Documents"
  Effect: updateLastActive(candidateId)
  Next 15 min: All messages stay in portal (don't ping WhatsApp)

SCENARIO 4: Candidate opts out
  Message sent to sandbox: "STOP"
  Response: "You have been unsubscribed"
  Effect: whatsappOptOut = true → never send again

SCENARIO 5: Candidate adds phone in Settings UI
  Input: Country + phone number
  Validation: libphonenumber-js checks format
  Save: Normalized to E.164, indexed by phone
  Effect: Can now receive WhatsApp messages

SCENARIO 6: Template message outside 24h
  Scenario: Last inbound was 3 days ago
  Message: Consultant send "Deadline in 5 days"
  Check: getLastInboundFromCandidate() = 3 days ago
  Result: Outside 24h → use pre-approved template
          (Fallback to free-form if template fails)
`);
