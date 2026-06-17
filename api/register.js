import { createUser, createSessionToken, publicUser } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { name, residency, email, age, password } = req.body || {};
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    const user = await createUser({ name, residency, email, age, password });
    const token = await createSessionToken(user.id);
    res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
}
