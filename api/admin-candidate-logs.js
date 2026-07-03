import { canAccessCandidate, getActor } from '../lib/admin.js';
import { getUserById, publicUser } from '../lib/db.js';
import { getMessages } from '../lib/chat.js';
import { getCandidateActivity } from '../lib/candidate-activity.js';

function chatEvent(message) {
  const role = message.senderRole || 'system';
  const isCandidate = role === 'candidate';
  const isAi = role === 'ai';
  return {
    id: `chat_${message.id || message.sentAt}`,
    at: Number(message.sentAt || 0),
    type: isCandidate ? 'candidate_message' : isAi ? 'advisor_response' : 'staff_message',
    label: isCandidate ? 'Candidate message' : isAi ? 'AI Advisor response' : `${role} message`,
    status: 'success',
    agent: isAi ? 'AdvisorAgent' : '',
    detail: String(message.text || ''),
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0,
    latencyMs: 0,
    metadata: { source: 'chat' },
  };
}

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const candidateId = new URL(req.url, 'http://x').searchParams.get('candidateId');
  if (!candidateId) return res.status(400).json({ error: 'candidateId is required.' });
  const user = await getUserById(candidateId);
  if (!user) return res.status(404).json({ error: 'Candidate not found.' });
  if (!canAccessCandidate(actor, user)) return res.status(403).json({ error: 'Forbidden.' });

  const [activity, messages] = await Promise.all([
    getCandidateActivity(candidateId),
    getMessages(candidateId),
  ]);
  const events = [...activity, ...messages.map(chatEvent)]
    .filter(event => event?.at)
    .sort((a, b) => Number(a.at) - Number(b.at))
    .slice(-500);
  return res.status(200).json({ candidate: publicUser(user), events });
}
