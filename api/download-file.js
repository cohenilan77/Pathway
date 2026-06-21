import { get } from '@vercel/blob';
import { Readable } from 'stream';
import { canAccessCandidate, getActor } from '../lib/admin.js';
import { getUserById, getUserData, getUserIdByToken } from '../lib/db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function safeDownloadName(name) {
  return String(name || 'pathway-document')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'pathway-document';
}

async function resolveUserId(req) {
  const url = new URL(req.url, 'http://x');
  const requestedUserId = url.searchParams.get('userId');

  if (requestedUserId) {
    const actor = await getActor(req);
    const candidate = await getUserById(requestedUserId);
    if (!canAccessCandidate(actor, candidate)) return null;
    return requestedUserId;
  }

  const token = getToken(req);
  return getUserIdByToken(token);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const userId = await resolveUserId(req);
  if (!userId) {
    json(res, 401, { error: 'Not authorized.' });
    return;
  }

  const data = await getUserData(userId);
  const file = data?.cvFile;
  if (!file?.pathname) {
    json(res, 404, { error: 'Original file not found.' });
    return;
  }

  const result = await get(file.pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    json(res, 404, { error: 'Original file not found.' });
    return;
  }

  const filename = safeDownloadName(file.name);
  res.statusCode = 200;
  res.setHeader('Content-Type', result.blob.contentType || file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (result.blob.size != null) res.setHeader('Content-Length', String(result.blob.size));

  Readable.fromWeb(result.stream).pipe(res);
}
