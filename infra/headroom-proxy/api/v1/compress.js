import { handleCompress } from '../../lib/compress.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const result = handleCompress(req.body || {});
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
