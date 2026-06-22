import { getStore } from './store.js';
import { hashPassword, verifyPassword, newToken, newId, normalizeEmail } from './auth.js';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const ROLES = {
  candidate: 'candidate',
  consultant: 'consultant',
  admin: 'admin',
};
export const SUPER_ADMIN_EMAIL = 'cohenilan@gmail.com';

function hasCandidateDetails(user) {
  return !!String(user?.name || '').trim()
    && !!String(user?.residency || '').trim()
    && Number.isFinite(Number(user?.age));
}

export async function createUser({ name, residency, email, age, password }) {
  return createManagedUser({ name, residency, email, age, password, role: ROLES.candidate, allowUnassigned: true });
}

function normalizeRole(role) {
  return Object.values(ROLES).includes(role) ? role : ROLES.candidate;
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function isSuperAdminUser(user) {
  return normalizeEmail(user?.email) === SUPER_ADMIN_EMAIL;
}

async function removeUsernameIndex(store, user) {
  if (user?.username) await store.del(`user:byUsername:${normalizeUsername(user.username)}`);
}

async function setUsernameIndex(store, username, id) {
  const normUsername = normalizeUsername(username);
  if (normUsername) await store.set(`user:byUsername:${normUsername}`, id);
}

function normalizePlan(plan) {
  return plan === 'ai_strategy' || plan === 'aiStrategist' ? 'ai_strategy' : 'free';
}

export async function createManagedUser({ name, residency = '', email, username = '', age = null, password, role = ROLES.candidate, consultantId = '', plan = 'free', allowUnassigned = false }) {
  const store = getStore();
  const normEmail = normalizeEmail(email);
  const normUsername = normalizeUsername(username);
  if (!normEmail) throw new Error('Email is required.');
  if (!String(name || '').trim()) throw new Error('Name is required.');
  if (!password || String(password).length < 6) throw new Error('Password must be at least 6 characters.');
  const existingId = await store.get(`user:byEmail:${normEmail}`);
  if (existingId) {
    throw new Error('An account with this email already exists.');
  }
  if (normUsername) {
    const existingUsernameId = await store.get(`user:byUsername:${normUsername}`);
    if (existingUsernameId) throw new Error('An account with this username already exists.');
  }
  const normalizedRole = isSuperAdminUser({ email: normEmail }) ? ROLES.admin : normalizeRole(role);
  if (normalizedRole === ROLES.candidate && !consultantId && !allowUnassigned) {
    throw new Error('Candidates must be assigned to a consultant.');
  }
  const id = newId();
  const user = {
    id,
    name: String(name).trim(),
    residency,
    username: normUsername || '',
    email: normEmail,
    age: age === '' || age == null ? null : Number(age),
    role: normalizedRole,
    consultantId: normalizedRole === ROLES.candidate ? (consultantId || '') : '',
    isSuperAdmin: isSuperAdminUser({ email: normEmail }),
    passwordHash: hashPassword(password),
    oauthDetailsConfirmed: true,
    plan: normalizedRole === ROLES.candidate ? normalizePlan(plan) : 'free',
    createdAt: Date.now(),
  };
  await store.set(`user:${id}`, user);
  await store.set(`user:byEmail:${normEmail}`, id);
  await setUsernameIndex(store, normUsername, id);
  await store.sadd('users:all', id);
  return user;
}

export async function ensureSuperAdminAccount() {
  const initialPassword = process.env.SUPER_ADMIN_INITIAL_PASSWORD;
  if (!initialPassword) return null;
  const store = getStore();
  const existingId = await store.get(`user:byEmail:${SUPER_ADMIN_EMAIL}`);
  if (existingId) {
    const existing = await getUserById(existingId);
    if (existing?.role === ROLES.admin && existing.isSuperAdmin) return existing;
    return updateManagedUser(existingId, { role: ROLES.admin });
  }
  return createManagedUser({
    name: 'Ilan Cohen',
    email: SUPER_ADMIN_EMAIL,
    username: 'superadmin',
    password: initialPassword,
    role: ROLES.admin,
  });
}

export async function verifyCredentials(identifier, password) {
  const store = getStore();
  const normIdentifier = normalizeEmail(identifier);
  const id = await store.get(`user:byEmail:${normIdentifier}`)
    || await store.get(`user:byUsername:${normalizeUsername(identifier)}`);
  if (!id) return null;
  const user = await store.get(`user:${id}`);
  if (!user) return null;
  if (!user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  if (!user.oauthDetailsConfirmed && hasCandidateDetails(user)) {
    const updated = { ...user, role: user.role || ROLES.candidate, oauthDetailsConfirmed: true };
    await store.set(`user:${id}`, updated);
    return updated;
  }
  return user.role ? user : { ...user, role: ROLES.candidate };
}

export async function findOrCreateOAuthUser({ email, name, provider }) {
  const store = getStore();
  const normEmail = normalizeEmail(email);
  const existingId = await store.get(`user:byEmail:${normEmail}`);
  if (existingId) {
    const user = await store.get(`user:${existingId}`);
    if (user) {
      if ((user.role || ROLES.candidate) !== ROLES.candidate) {
        throw new Error('This sign-in method is only available for candidate accounts.');
      }
      const updated = {
        ...user,
        role: ROLES.candidate,
        plan: normalizePlan(user.plan),
        oauthProvider: user.oauthProvider || provider,
        oauthDetailsConfirmed: user.oauthDetailsConfirmed || hasCandidateDetails(user),
      };
      await store.set(`user:${existingId}`, updated);
      return updated;
    }
  }
  const id = newId();
  const user = {
    id,
    name: name || normEmail,
    residency: '',
    username: '',
    email: normEmail,
    age: null,
    role: ROLES.candidate,
    consultantId: '',
    isSuperAdmin: false,
    passwordHash: null,
    oauthProvider: provider,
    plan: 'free',
    createdAt: Date.now(),
  };
  await store.set(`user:${id}`, user);
  await store.set(`user:byEmail:${normEmail}`, id);
  await store.sadd('users:all', id);
  return user;
}

export async function updateUserDetails(userId, details) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  const updated = {
    ...user,
    name: details.name?.trim() || user.name,
    residency: details.residency?.trim() || user.residency || '',
    age: details.age === '' || details.age == null ? user.age : Number(details.age),
    phone: details.phone != null ? details.phone.trim() : (user.phone || ''),
    linkedin: details.linkedin != null ? details.linkedin.trim() : (user.linkedin || ''),
    plan: details.plan != null ? normalizePlan(details.plan) : normalizePlan(user.plan),
    oauthDetailsConfirmed: details.oauthDetailsConfirmed === true ? true : user.oauthDetailsConfirmed,
    updatedAt: Date.now(),
  };
  await store.set(`user:${userId}`, updated);
  return updated;
}

export async function getUserById(id) {
  const store = getStore();
  const user = await store.get(`user:${id}`);
  if (!user) return null;
  if (!user.oauthDetailsConfirmed && hasCandidateDetails(user)) {
    const updated = { ...user, role: user.role || ROLES.candidate, plan: normalizePlan(user.plan), oauthDetailsConfirmed: true };
    await store.set(`user:${id}`, updated);
    return updated;
  }
  return { ...user, role: user.role || ROLES.candidate, plan: normalizePlan(user.plan) };
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
  return {
    ...rest,
    role: rest.role || ROLES.candidate,
    plan: normalizePlan(rest.plan),
    isSuperAdmin: !!rest.isSuperAdmin || isSuperAdminUser(rest),
  };
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
  if (isSuperAdminUser(user)) throw new Error('Super Admin cannot be suspended.');
  const updated = { ...user, suspended: !!suspended };
  await store.set(`user:${userId}`, updated);
  return updated;
}

export async function deleteUser(userId) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  if (isSuperAdminUser(user)) throw new Error('Super Admin cannot be deleted.');
  await store.del(`user:${userId}`);
  await store.del(`user:byEmail:${user.email}`);
  await removeUsernameIndex(store, user);
  await store.del(`userdata:${userId}`);
  await store.srem('users:all', userId);
}

export async function updateManagedUser(userId, patch) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  const nextRole = isSuperAdminUser(user) ? ROLES.admin : normalizeRole(patch.role ?? user.role);
  const nextEmail = patch.email != null ? normalizeEmail(patch.email) : user.email;
  const nextUsername = patch.username != null ? normalizeUsername(patch.username) : normalizeUsername(user.username);
  if (!nextEmail) throw new Error('Email is required.');
  const existingEmailId = await store.get(`user:byEmail:${nextEmail}`);
  if (existingEmailId && existingEmailId !== userId) throw new Error('An account with this email already exists.');
  if (nextUsername) {
    const existingUsernameId = await store.get(`user:byUsername:${nextUsername}`);
    if (existingUsernameId && existingUsernameId !== userId) throw new Error('An account with this username already exists.');
  }

  const updated = {
    ...user,
    name: patch.name != null ? String(patch.name).trim() : user.name,
    residency: patch.residency != null ? String(patch.residency).trim() : (user.residency || ''),
    email: nextEmail,
    username: nextUsername,
    age: patch.age === '' ? null : (patch.age != null ? Number(patch.age) : user.age),
    role: nextRole,
    consultantId: nextRole === ROLES.candidate ? (patch.consultantId ?? user.consultantId ?? '') : '',
    plan: nextRole === ROLES.candidate ? normalizePlan(patch.plan ?? user.plan) : 'free',
    isSuperAdmin: isSuperAdminUser({ email: nextEmail }),
    updatedAt: Date.now(),
  };
  if (updated.role === ROLES.candidate && !updated.consultantId) {
    throw new Error('Candidates must be assigned to a consultant.');
  }

  if (nextEmail !== user.email) {
    await store.del(`user:byEmail:${user.email}`);
    await store.set(`user:byEmail:${nextEmail}`, userId);
  }
  if (nextUsername !== normalizeUsername(user.username)) {
    await removeUsernameIndex(store, user);
    await setUsernameIndex(store, nextUsername, userId);
  }
  await store.set(`user:${userId}`, updated);
  return updated;
}

export async function resetUserPassword(userId, password) {
  if (!password || String(password).length < 6) throw new Error('Password must be at least 6 characters.');
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  const updated = { ...user, passwordHash: hashPassword(password), updatedAt: Date.now() };
  await store.set(`user:${userId}`, updated);
  return updated;
}

export async function changeUserPassword(userId, currentPassword, nextPassword) {
  if (!currentPassword) throw new Error('Current password is required.');
  if (!nextPassword || String(nextPassword).length < 6) throw new Error('New password must be at least 6 characters.');
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('Current password is incorrect.');
  }
  const updated = { ...user, passwordHash: hashPassword(nextPassword), updatedAt: Date.now() };
  await store.set(`user:${userId}`, updated);
  return updated;
}
