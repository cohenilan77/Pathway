import { verifyCredentials, createSessionToken, publicUser, recordLogin } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const user = await verifyCredentials(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
      return;
    }
    const token = await createSessionToken(user.id);
    await recordLogin(user.id);
    res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Login failed.' });
  }
}
