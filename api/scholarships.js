import { getUserIdByToken, getUserData } from '../lib/db.js';
import { getScholarships, saveScholarshipInterest } from '../lib/agents/tools/update.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

// Scholarships a candidate has saved live in two places by design: the
// Undergraduate chat path folds save_scholarship_interest into the normal
// statePatch/session-blob flow (getUserData(candidateId).scholarships, same
// as programs/documents), while the Graduate ScholarshipAgent persists
// directly to the shared scholarships:${candidateId} store key (like
// documents/calendar events). This endpoint merges both so the Workspace
// "Scholarships" tab shows every saved scholarship regardless of track.
export async function mergedScholarships(candidateId) {
  const [fromSession, fromStore] = await Promise.all([
    getUserData(candidateId).then(data => (Array.isArray(data?.scholarships) ? data.scholarships : [])),
    getScholarships(candidateId),
  ]);
  const byKey = new Map();
  for (const record of [...fromSession, ...fromStore]) {
    if (!record?.name) continue;
    byKey.set(record.id || record.name.toLowerCase(), record);
  }
  return [...byKey.values()];
}

export default async function handler(req, res) {
  const token = getToken(req);
  const candidateId = await getUserIdByToken(token);
  if (!candidateId) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  if (req.method === 'GET') {
    const scholarships = await mergedScholarships(candidateId);
    res.status(200).json({ scholarships });
    return;
  }

  if (req.method === 'PATCH') {
    const { nameOrId, status } = req.body || {};
    if (!nameOrId || !status) {
      res.status(400).json({ error: 'nameOrId and status are required.' });
      return;
    }
    const needle = String(nameOrId).toLowerCase();
    const current = await mergedScholarships(candidateId);
    const existing = current.find(r => r.id === nameOrId || String(r.name).toLowerCase() === needle);
    if (existing) {
      // Upsert into the shared store so a status change sticks even for a
      // scholarship that was only ever saved into the session blob
      // (Undergraduate path) — setScholarshipStatus alone would no-op then.
      await saveScholarshipInterest(candidateId, { ...existing, status });
    }
    const scholarships = await mergedScholarships(candidateId);
    res.status(200).json({ scholarships });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
