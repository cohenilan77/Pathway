import { Resend } from 'resend';
import { getUserById, ROLES } from '../../lib/db.js';
import { appendMessage, getMessages } from '../../lib/chat.js';
import { authorizeCandidateChat } from '../../lib/chat-auth.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function notifyConsultantOfFirstMessage(candidate, text) {
  if (!candidate?.consultantId) return;
  const consultant = await getUserById(candidate.consultantId);
  if (!consultant?.email) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: 'Pathway Admissions <onboarding@resend.dev>',
      to: consultant.email,
      subject: `New Live Chat message from ${candidate.name || 'a candidate'}`,
      html: `
        <h2 style="color:#16233f;font-family:Georgia,serif">New Live Chat Message</h2>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#33405e">
          ${escapeHtml(candidate.name || 'A candidate')} started a Live Chat conversation.
        </p>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600">Candidate</td><td>${escapeHtml(candidate.name)}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600">Email</td><td>${escapeHtml(candidate.email)}</td></tr>
        </table>
        <p style="font-family:Arial,sans-serif;font-size:14px;margin-top:16px"><strong>Message:</strong><br>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        <hr style="margin-top:24px;border-color:#eee"/>
        <p style="font-family:Arial,sans-serif;font-size:11px;color:#999">Sent via Pathway Live Chat</p>
      `,
    });
    if (error) console.error('Live Chat alert Resend error:', error);
  } catch (err) {
    console.error('Live Chat alert email error:', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { candidateId, text } = req.body || {};
  if (!candidateId || !String(text || '').trim()) {
    res.status(400).json({ error: 'candidateId and text are required.' });
    return;
  }

  const context = await authorizeCandidateChat(req, candidateId);
  if (!context.actor) {
    res.status(context.status).json({ error: context.error });
    return;
  }
  const user = context.actor;
  const candidate = context.candidate;
  const role = user.role || ROLES.candidate;
  const existingMessages = await getMessages(candidateId);
  const message = await appendMessage(candidateId, { senderId: user.id, senderRole: role, text });
  const isFirstCandidateMessage = role === ROLES.candidate
    && !existingMessages.some((m) => m.senderRole === ROLES.candidate);
  if (isFirstCandidateMessage) {
    notifyConsultantOfFirstMessage(candidate, text).catch((err) => {
      console.error('Live Chat alert failed:', err.message);
    });
  }
  res.status(200).json({
    ok: true,
    message,
    deliveryWarning: message.telegramDelivery?.error || null,
    deliveryChannel: message.telegramDelivery?.attempted ? 'telegram' : 'portal',
  });
}
