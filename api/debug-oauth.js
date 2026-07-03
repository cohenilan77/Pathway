export default function handler(req, res) {
  res.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✓ SET' : '✗ NOT SET',
    GOOGLE_ID: process.env.GOOGLE_ID ? '✓ SET' : '✗ NOT SET',
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? '✓ SET' : '✗ NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✓ SET' : '✗ NOT SET',
    GOOGLE_SECRET: process.env.GOOGLE_SECRET ? '✓ SET' : '✗ NOT SET',
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ? '✓ SET' : '✗ NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  });
}
