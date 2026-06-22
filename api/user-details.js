import { getUserIdByToken, updateUserDetails, publicUser } from '../lib/db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const userId = await getUserIdByToken(getToken(req));
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { name, residency, age, phone, linkedin, oauthDetailsConfirmed, plan } = req.body || {};
  const isPlanOnlyUpdate = plan != null
    && name == null
    && residency == null
    && age == null
    && phone == null
    && linkedin == null
    && oauthDetailsConfirmed == null;
  if (isPlanOnlyUpdate) {
    const user = await updateUserDetails(userId, { plan });
    res.status(200).json({ user: publicUser(user) });
    return;
  }
  const ageNumber = age === '' || age == null ? null : Number(age);
  if (!String(name || '').trim()) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }
  if (!String(residency || '').trim()) {
    res.status(400).json({ error: 'Country of residence is required.' });
    return;
  }
  if (!Number.isFinite(ageNumber) || ageNumber < 13 || ageNumber > 120) {
    res.status(400).json({ error: 'Enter a valid age.' });
    return;
  }

  const user = await updateUserDetails(userId, {
    name,
    residency,
    age: ageNumber,
    phone,
    linkedin,
    oauthDetailsConfirmed,
    plan,
  });

  res.status(200).json({ user: publicUser(user) });
}
