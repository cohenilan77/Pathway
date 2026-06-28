import { authorizeCandidateChat } from '../../lib/chat-auth.js';
import { getMessages } from '../../lib/chat.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const candidateId = new URL(req.url, 'http://x').searchParams.get('candidateId');
  if (!candidateId) {
    res.status(400).json({ error: 'candidateId is required.' });
    return;
  }

  const context = await authorizeCandidateChat(req, candidateId);
  if (!context.actor) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  const messages = await getMessages(candidateId);
  res.status(200).json({ messages });
}
