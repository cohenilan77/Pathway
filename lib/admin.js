export function checkAdminSecret(req) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  const provided = req.headers['x-admin-secret'];
  return provided && provided === expected;
}
