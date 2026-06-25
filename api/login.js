import { ensureSuperAdminAccount, verifyCredentials, createSessionToken, publicUser, recordLogin, checkLoginRateLimit } from '../lib/db.js';
import { safeError } from '../lib/api-error.js';

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const ip = getClientIp(req);
    const allowed = await checkLoginRateLimit(ip);
    if (!allowed) {
      res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      return;
    }
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
    res.status(400).json({ error: safeError(err, 'Login failed.') });
  }
}
