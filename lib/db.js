import { getStore } from './store.js';
import { hashPassword, verifyPassword, newToken, newId, normalizeEmail } from './auth.js';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function createUser({ name, residency, email, age, password }) {
  const store = getStore();
  const normEmail = normalizeEmail(email);
  const existingId = await store.get(`user:byEmail:${normEmail}`);
  if (existingId) {
    throw new Error('An account with this email already exists.');
  }
  const id = newId();
  const user = {
    id,
    name,
    residency,
    email: normEmail,
    age,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  await store.set(`user:${id}`, user);
  await store.set(`user:byEmail:${normEmail}`, id);
  await store.sadd('users:all', id);
  return user;
}

export async function verifyCredentials(email, password) {
  const store = getStore();
  const normEmail = normalizeEmail(email);
  const id = await store.get(`user:byEmail:${normEmail}`);
  if (!id) return null;
  const user = await store.get(`user:${id}`);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export async function getUserById(id) {
  return getStore().get(`user:${id}`);
}

export async function createSessionToken(userId) {
  const store = getStore();
  const token = newToken();
  await store.set(`session:${token}`, userId, { ex: SESSION_TTL_SECONDS });
  return token;
}

export async function getUserIdByToken(token) {
  if (!token) return null;
  return getStore().get(`session:${token}`);
}

export async function getAllUserIds() {
  return getStore().smembers('users:all');
}

export async function getUserData(userId) {
  const data = await getStore().get(`userdata:${userId}`);
  return data || null;
}

export async function setUserData(userId, data) {
  await getStore().set(`userdata:${userId}`, data);
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

const LOGIN_HISTORY_LIMIT = 20;

export async function recordLogin(userId) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) return;
  const now = Date.now();
  const history = Array.isArray(user.loginHistory) ? [...user.loginHistory] : [];
  history.push({ at: now });
  if (history.length > LOGIN_HISTORY_LIMIT) history.splice(0, history.length - LOGIN_HISTORY_LIMIT);
  await store.set(`user:${userId}`, {
    ...user,
    lastLoginAt: now,
    lastActiveAt: now,
    loginCount: (user.loginCount || 0) + 1,
    loginHistory: history,
  });
}

export async function touchActivity(userId) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) return;
  await store.set(`user:${userId}`, { ...user, lastActiveAt: Date.now() });
}

export async function setUserSuspended(userId, suspended) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  const updated = { ...user, suspended: !!suspended };
  await store.set(`user:${userId}`, updated);
  return updated;
}

export async function deleteUser(userId) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  await store.del(`user:${userId}`);
  await store.del(`user:byEmail:${user.email}`);
  await store.del(`userdata:${userId}`);
  await store.srem('users:all', userId);
}
