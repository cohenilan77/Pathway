import { Resend } from 'resend';
import { getUserIdByToken, getUserById, ROLES } from '../../lib/db.js';
import { canAccessCandidate } from '../../lib/admin.js';
import { appendMessage, getMessages } from '../../lib/chat.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

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
  const userId = await getUserIdByToken(getToken(req));
  const user = userId ? await getUserById(userId) : null;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  const { candidateId, text } = req.body || {};
  if (!candidateId || !String(text || '').trim()) {
    res.status(400).json({ error: 'candidateId and text are required.' });
    return;
  }
  const role = user.role || ROLES.candidate;
  const candidate = await getUserById(candidateId);
  if (role === ROLES.candidate) {
    if (user.id !== candidateId) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
  } else {
    if (!canAccessCandidate({ ...user, role }, candidate)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
  }
  const existingMessages = await getMessages(candidateId);
  const message = await appendMessage(candidateId, { senderId: user.id, senderRole: role, text });
  const isFirstCandidateMessage = role === ROLES.candidate
    && !existingMessages.some((m) => m.senderRole === ROLES.candidate);
  if (isFirstCandidateMessage) {
    notifyConsultantOfFirstMessage(candidate, text).catch((err) => {
      console.error('Live Chat alert failed:', err.message);
    });
  }
  res.status(200).json({ ok: true, message });
}
