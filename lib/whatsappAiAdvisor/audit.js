import { getStore } from '../store.js';
import { newId } from '../auth.js';

export async function recordWhatsAppAiAdvisorAudit({ candidateId, actorUserId, action, metadata = {} }) {
  const event = {
    id: newId(),
    candidateId,
    actorUserId,
    action,
    timestamp: Date.now(),
    metadata,
  };
  await getStore().rpush(`whatsappAiAdvisor:audit:${candidateId}`, event);
  return event;
}
