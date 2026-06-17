export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const expected = process.env.ADMIN_SECRET;
  const { secret } = req.body || {};
  if (!expected) {
    res.status(500).json({ error: 'Admin access is not configured on this server.' });
    return;
  }
  if (!secret || secret !== expected) {
    res.status(401).json({ error: 'Invalid access code.' });
    return;
  }
  res.status(200).json({ ok: true });
}
