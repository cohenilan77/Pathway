import { findOrCreateOAuthUser, createSessionToken, recordLogin } from '../lib/db.js';

const PROVIDERS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_ID', 'AUTH_GOOGLE_ID'],
    clientSecretEnv: ['GOOGLE_CLIENT_SECRET', 'GOOGLE_SECRET', 'AUTH_GOOGLE_SECRET'],
    mapUser: (info) => ({ email: info.email, name: info.name }),
  },
  microsoft: {
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientIdEnv: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_ID', 'AUTH_MICROSOFT_ID'],
    clientSecretEnv: ['MICROSOFT_CLIENT_SECRET', 'MICROSOFT_SECRET', 'AUTH_MICROSOFT_SECRET'],
    mapUser: (info) => ({ email: info.mail || info.userPrincipalName, name: info.displayName }),
  },
};

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return acc;
    acc[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    return acc;
  }, {});
}

function getRequestUrl(req) {
  return new URL(req.url, `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`);
}

function getOrigin(req) {
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
  const origin = getOrigin(req);
  const fail = (message) => {
    res.writeHead(302, { Location: `${origin}/?oauth_error=${encodeURIComponent(message)}` });
    res.end();
  };

  try {
    const url = getRequestUrl(req);
    const code = req.query?.code || url.searchParams.get('code');
    const state = req.query?.state || url.searchParams.get('state');
    const error = req.query?.error || url.searchParams.get('error');
    if (error) return fail(String(error));

    const [provider, stateValue] = String(state || '').split(':');
    const config = PROVIDERS[provider];
    if (!config) return fail('Unknown OAuth provider.');

    const cookies = parseCookies(req);
    if (!stateValue || cookies.pw_oauth_state !== stateValue) {
      return fail('Sign-in session expired — please try again.');
    }

    const { value: clientId, name: clientIdEnv } = readEnv(config.clientIdEnv);
    const { value: clientSecret, name: clientSecretEnv } = readEnv(config.clientSecretEnv);
    if (!clientId || !clientSecret) {
      return fail(`${provider} sign-in is missing ${!clientId ? clientIdEnv : clientSecretEnv}.`);
    }

    const redirectUri = `${origin}/api/oauth-callback`;
    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code || ''),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return fail('Could not complete sign-in with this provider.');
    }

    const userInfoRes = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const info = await userInfoRes.json();
    const { email, name } = config.mapUser(info);
    if (!email) return fail('Could not retrieve your email address from this provider.');

    const user = await findOrCreateOAuthUser({ email, name, provider });
    const sessionToken = await createSessionToken(user.id);
    await recordLogin(user.id);

    res.setHeader('Set-Cookie', 'pw_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    res.writeHead(302, { Location: `${origin}/?oauth_token=${encodeURIComponent(sessionToken)}` });
    res.end();
  } catch (err) {
    fail(err.message || 'Sign-in failed.');
  }
}
