import { findOrCreateOAuthUser, createSessionToken, recordLogin } from '../lib/db.js';

const PROVIDERS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    mapUser: (info) => ({ email: info.email, name: info.name }),
  },
  microsoft: {
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
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

export default async function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  const fail = (message) => {
    res.writeHead(302, { Location: `${origin}/?oauth_error=${encodeURIComponent(message)}` });
    res.end();
  };

  try {
    const { code, state, error } = req.query;
    if (error) return fail(String(error));

    const [provider, stateValue] = String(state || '').split(':');
    const config = PROVIDERS[provider];
    if (!config) return fail('Unknown OAuth provider.');

    const cookies = parseCookies(req);
    if (!stateValue || cookies.pw_oauth_state !== stateValue) {
      return fail('Sign-in session expired — please try again.');
    }

    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    if (!clientId || !clientSecret) return fail(`${provider} sign-in is not configured yet.`);

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
