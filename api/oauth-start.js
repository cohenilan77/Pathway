import crypto from 'crypto';

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_ID', 'AUTH_GOOGLE_ID'],
    scope: 'openid email profile',
  },
  microsoft: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientIdEnv: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_ID', 'AUTH_MICROSOFT_ID'],
    scope: 'openid email profile User.Read',
  },
};

function getRequestUrl(req) {
  return new URL(req.url, `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`);
}

function getOrigin(req) {
  const explicitOrigin = process.env.OAUTH_REDIRECT_ORIGIN;
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '');
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionUrl) {
    return productionUrl.startsWith('http')
      ? productionUrl.replace(/\/$/, '')
      : `https://${productionUrl.replace(/\/$/, '')}`;
  }
  const proto = req.headers['x-forwarded-proto'] || (req.headers.host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${req.headers.host}`;
}

function readEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return { value, name };
  }
  return { value: '', name: names[0] };
}

export default async function handler(req, res) {
  const url = getRequestUrl(req);
  const provider = String(req.query?.provider || url.searchParams.get('provider') || '');
  const config = PROVIDERS[provider];
  if (!config) {
    res.status(400).json({ error: 'Unknown OAuth provider.' });
    return;
  }
  const { value: clientId, name: clientIdEnv } = readEnv(config.clientIdEnv);
  if (!clientId) {
    res.status(500).json({ error: `${provider} sign-in is missing ${clientIdEnv}.` });
    return;
  }

  const origin = getOrigin(req);
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
