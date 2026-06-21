import { ensureSuperAdminAccount, verifyCredentials, createSessionToken, publicUser, recordLogin } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email, identifier, password } = req.body || {};
    const loginId = identifier || email;
    if (!loginId || !password) {
      res.status(400).json({ error: 'Email or username and password are required.' });
      return;
    }
    await ensureSuperAdminAccount();
    const user = await verifyCredentials(loginId, password);
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
