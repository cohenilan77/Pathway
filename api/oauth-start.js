import crypto from 'crypto';

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    scope: 'openid email profile',
  },
  microsoft: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    scope: 'openid email profile User.Read',
  },
};

export default async function handler(req, res) {
  const provider = String(req.query.provider || '');
  const config = PROVIDERS[provider];
  if (!config) {
    res.status(400).json({ error: 'Unknown OAuth provider.' });
    return;
  }
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    res.status(500).json({ error: `${provider} sign-in is not configured yet.` });
    return;
  }

  const origin = `https://${req.headers.host}`;
  const redirectUri = `${origin}/api/oauth-callback`;
  const state = crypto.randomBytes(16).toString('hex');

  res.setHeader('Set-Cookie', `pw_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: `${provider}:${state}`,
    prompt: 'select_account',
  });

  res.writeHead(302, { Location: `${config.authorizeUrl}?${params.toString()}` });
  res.end();
}
