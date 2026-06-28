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
  if (plan === 'ai_strategy' || plan === 'aiStrategist') return 'ai_strategy';
  if (plan === 'ai' || plan === 'pathwayAI') return 'ai';
  return 'free';
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
    whatsappNumber: '',
    whatsappOptIn: false,
    whatsappOptInTimestamp: null,
    whatsappOptOut: false,
    whatsappLastInboundAt: null,
    whatsappAiAdvisorSessionActive: false,
    whatsappAiAdvisorSessionStartedAt: null,
    whatsappAiAdvisorSessionPausedAt: null,
    whatsappAiAdvisorSessionStartedBy: null,
    whatsappAiAdvisorLastTemplateSentAt: null,
    bsuid: '',
    lastActiveAt: Date.now(),
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
    whatsappNumber: '',
    whatsappOptIn: false,
    whatsappOptInTimestamp: null,
    whatsappOptOut: false,
    whatsappLastInboundAt: null,
    whatsappAiAdvisorSessionActive: false,
    whatsappAiAdvisorSessionStartedAt: null,
    whatsappAiAdvisorSessionPausedAt: null,
    whatsappAiAdvisorSessionStartedBy: null,
    whatsappAiAdvisorLastTemplateSentAt: null,
    bsuid: '',
    lastActiveAt: Date.now(),
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
    whatsappNumber: details.whatsappNumber != null ? details.whatsappNumber.trim() : (user.whatsappNumber || ''),
    whatsappOptIn: details.whatsappOptIn !== undefined ? details.whatsappOptIn : user.whatsappOptIn,
    whatsappOptInTimestamp: details.whatsappOptIn === true ? (details.whatsappOptInTimestamp || Date.now()) : user.whatsappOptInTimestamp,
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
  await store.sadd(`sessions:byUser:${userId}`, token);
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

export async function updateLastActive(userId) {
  return touchActivity(userId);
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

  const sessionTokens = await store.smembers(`sessions:byUser:${userId}`);
  await Promise.all((sessionTokens || []).map((token) => store.del(`session:${token}`)));
  await store.del(`sessions:byUser:${userId}`);

  const usageIds = await store.smembers(`usage:byUser:${userId}`);
  await Promise.all((usageIds || []).map(async (id) => {
    const record = await store.get(`usage:record:${id}`);
    if (record?.createdAt) {
      const dayKey = new Date(record.createdAt).toISOString().slice(0, 10);
      await store.srem(`usage:byUser:${userId}:${dayKey}`, id);
    }
    await store.srem('usage:all', id);
    await store.srem(`usage:byUser:${userId}`, id);
    await store.del(`usage:record:${id}`);
  }));
  await store.del(`usage:byUser:${userId}`);

  await store.del(`user:${userId}`);
  await store.del(`user:byEmail:${user.email}`);
  await removeUsernameIndex(store, user);
  await store.del(`userdata:${userId}`);
  await store.del(`chat:${userId}:messages`);
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

// Community functions
export async function getCommunityGroups(userId, category, selectedSchools, selectedPrograms) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');
  const data = await getUserData(userId);
  const userProfile = data?.profile || {};
  const userCategory = userProfile.category;

  if (!userCategory) return [];
  if (category !== userCategory) throw new Error('Access denied: category mismatch');

  const allGroups = await store.smembers('community:groups:all') || [];
  const eligible = [];

  for (const groupId of allGroups) {
    const group = await store.get(`community:group:${groupId}`);
    if (!group) continue;

    if (group.category !== userCategory) continue;
    if (userCategory === 'Undergraduate') {
      const userGrade = userProfile.grade;
      if (!userGrade || !['11th', '12th'].includes(userGrade)) continue;
      if (userGrade !== group.grade) continue;
    }

    if (!(selectedSchools || []).includes(group.school)) continue;
    if (group.program && !(selectedPrograms || []).includes(group.program)) continue;

    const memberCount = (await store.scard(`community:group:${groupId}:members`)) || 0;
    const isMember = await store.sismember(`community:group:${groupId}:members`, userId);
    eligible.push({
      id: groupId,
      name: group.name,
      school: group.school,
      program: group.program,
      category: group.category,
      grade: group.grade,
      memberCount,
      isMember: !!isMember,
    });
  }

  return eligible;
}

export async function joinCommunityGroup(userId, groupId, category) {
  const store = getStore();
  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');

  const group = await store.get(`community:group:${groupId}`);
  if (!group) throw new Error('Group not found.');

  const data = await getUserData(userId);
  const userProfile = data?.profile || {};
  const userCategory = userProfile.category;

  if (category !== userCategory) throw new Error('Access denied: category mismatch');
  if (group.category !== userCategory) throw new Error('Group category does not match user category.');

  if (userCategory === 'Undergraduate') {
    const userGrade = userProfile.grade;
    if (!userGrade || userGrade !== group.grade) throw new Error('User grade does not match group grade.');
  }

  await store.sadd(`community:group:${groupId}:members`, userId);
  await store.sadd(`community:user:${userId}:groups`, groupId);
  return true;
}

export async function createCommunityMessage(groupId, userId, text, category) {
  const store = getStore();
  if (!text || !String(text).trim()) throw new Error('Message text is required.');

  const group = await store.get(`community:group:${groupId}`);
  if (!group) throw new Error('Group not found.');

  const isMember = await store.sismember(`community:group:${groupId}:members`, userId);
  if (!isMember) throw new Error('User is not a member of this group.');

  const user = await store.get(`user:${userId}`);
  if (!user) throw new Error('User not found.');

  const data = await getUserData(userId);
  const userProfile = data?.profile || {};

  if (group.category !== userProfile.category) throw new Error('Access denied: category mismatch');

  const messageId = newId();
  const message = {
    id: messageId,
    groupId,
    userId,
    text: String(text).trim(),
    createdAt: Date.now(),
  };

  await store.set(`community:message:${messageId}`, message);
  await store.sadd(`community:group:${groupId}:messages`, messageId);

  return message;
}

export async function getGroupMessages(groupId, userId, limit = 50) {
  const store = getStore();
  const group = await store.get(`community:group:${groupId}`);
  if (!group) throw new Error('Group not found.');

  const isMember = await store.sismember(`community:group:${groupId}:members`, userId);
  if (!isMember) throw new Error('User is not a member of this group.');

  const data = await getUserData(userId);
  const userProfile = data?.profile || {};
  if (group.category !== userProfile.category) throw new Error('Access denied: category mismatch');

  const messageIds = await store.smembers(`community:group:${groupId}:messages`) || [];
  const messages = await Promise.all(messageIds.map(id => store.get(`community:message:${id}`)));

  return messages
    .filter(Boolean)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-limit);
}

export async function sendFriendRequest(fromUserId, toUserId) {
  const store = getStore();
  if (fromUserId === toUserId) throw new Error('Cannot send friend request to yourself.');

  const fromUser = await store.get(`user:${fromUserId}`);
  const toUser = await store.get(`user:${toUserId}`);
  if (!fromUser || !toUser) throw new Error('User not found.');

  const fromData = await getUserData(fromUserId);
  const toData = await getUserData(toUserId);
  const fromCategory = fromData?.profile?.category;
  const toCategory = toData?.profile?.category;

  if (fromCategory !== toCategory) throw new Error('Can only befriend users in the same category.');

  if (fromCategory === 'Undergraduate') {
    const fromGrade = fromData?.profile?.grade;
    const toGrade = toData?.profile?.grade;
    if (fromGrade !== toGrade) throw new Error('Undergraduates can only befriend users in the same grade.');
  }

  const existingRequest = await store.get(`friendship:request:${fromUserId}:${toUserId}`);
  if (existingRequest) throw new Error('Friend request already sent.');

  const requestId = newId();
  const request = {
    id: requestId,
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: Date.now(),
  };

  await store.set(`friendship:request:${fromUserId}:${toUserId}`, request);
  await store.sadd(`friendship:requests:incoming:${toUserId}`, `${fromUserId}`);
  await store.sadd(`friendship:requests:outgoing:${fromUserId}`, `${toUserId}`);

  return request;
}

export async function acceptFriendRequest(userId, fromUserId) {
  const store = getStore();
  const request = await store.get(`friendship:request:${fromUserId}:${userId}`);
  if (!request) throw new Error('Friend request not found.');

  await store.set(`friendship:request:${fromUserId}:${userId}`, { ...request, status: 'accepted', acceptedAt: Date.now() });
  await store.sadd(`friendship:friends:${userId}`, fromUserId);
  await store.sadd(`friendship:friends:${fromUserId}`, userId);
  await store.srem(`friendship:requests:incoming:${userId}`, fromUserId);
  await store.srem(`friendship:requests:outgoing:${fromUserId}`, userId);

  return request;
}

export async function declineFriendRequest(userId, fromUserId) {
  const store = getStore();
  const request = await store.get(`friendship:request:${fromUserId}:${userId}`);
  if (!request) throw new Error('Friend request not found.');

  await store.del(`friendship:request:${fromUserId}:${userId}`);
  await store.srem(`friendship:requests:incoming:${userId}`, fromUserId);
  await store.srem(`friendship:requests:outgoing:${fromUserId}`, userId);
}

export async function removeFriend(userId, friendId) {
  const store = getStore();
  await store.srem(`friendship:friends:${userId}`, friendId);
  await store.srem(`friendship:friends:${friendId}`, userId);
}

export async function blockUser(userId, blockedUserId) {
  const store = getStore();
  if (userId === blockedUserId) throw new Error('Cannot block yourself.');

  const user = await store.get(`user:${userId}`);
  const blockedUser = await store.get(`user:${blockedUserId}`);
  if (!user || !blockedUser) throw new Error('User not found.');

  await store.sadd(`friendship:blocks:${userId}`, blockedUserId);
  await store.srem(`friendship:friends:${userId}`, blockedUserId);
  await store.srem(`friendship:friends:${blockedUserId}`, userId);

  return true;
}

export async function isBlocked(userId, otherUserId) {
  const store = getStore();
  return await store.sismember(`friendship:blocks:${userId}`, otherUserId);
}

export async function sendDirectMessage(conversationId, fromUserId, toUserId, text) {
  const store = getStore();

  if (!text || !String(text).trim()) throw new Error('Message text is required.');
  if (fromUserId === toUserId) throw new Error('Cannot send message to yourself.');

  const blocked = await isBlocked(fromUserId, toUserId);
  if (blocked) throw new Error('Cannot send message: user is blocked.');

  const friends = await store.sismember(`friendship:friends:${fromUserId}`, toUserId);
  if (!friends) throw new Error('You can only message accepted friends.');

  const messageId = newId();
  const message = {
    id: messageId,
    fromUserId,
    toUserId,
    text: String(text).trim(),
    createdAt: Date.now(),
  };

  await store.set(`community:dm:${messageId}`, message);
  await store.sadd(`community:conversation:${conversationId}`, messageId);

  return message;
}

export async function getDirectMessages(conversationId, userId) {
  const store = getStore();
  const messageIds = await store.smembers(`community:conversation:${conversationId}`) || [];
  const messages = await Promise.all(messageIds.map(id => store.get(`community:dm:${id}`)));

  return messages
    .filter(Boolean)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function postWhatsAppMessage(candidateId, sender, text, originChannel) {
  const store = getStore();
  const candidate = await store.get(`user:${candidateId}`);
  if (!candidate) throw new Error('Candidate not found.');

  const messageId = newId();
  const message = {
    id: messageId,
    candidateId,
    sender,
    text: String(text).trim(),
    originChannel,
    timestamp: Date.now(),
    encrypted: true,
  };

  await store.set(`whatsapp:message:${messageId}`, message);
  await store.sadd(`whatsapp:messages:candidate:${candidateId}`, messageId);

  return message;
}

export async function getCandidateWhatsAppMessages(candidateId, limit = 100) {
  const store = getStore();
  const messageIds = await store.smembers(`whatsapp:messages:candidate:${candidateId}`) || [];
  const messages = await Promise.all(messageIds.map(id => store.get(`whatsapp:message:${id}`)));

  return messages
    .filter(Boolean)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .slice(-limit);
}

export async function getUserByCandidatePhone(phoneNumber) {
  const store = getStore();
  return await store.get(`whatsapp:phone:${phoneNumber}`);
}

export async function getUserByBSUID(bsuid) {
  const store = getStore();
  return await store.get(`whatsapp:bsuid:${bsuid}`);
}

export async function setCandidatePhoneIndex(userId, phoneNumber) {
  const store = getStore();
  if (phoneNumber) {
    await store.set(`whatsapp:phone:${phoneNumber}`, userId);
  }
}

export async function setCandidateBSUIDIndex(userId, bsuid) {
  const store = getStore();
  if (bsuid) {
    await store.set(`whatsapp:bsuid:${bsuid}`, userId);
  }
}

export async function getLastInboundFromCandidate(candidateId) {
  const store = getStore();
  const messageIds = await store.smembers(`whatsapp:messages:candidate:${candidateId}`) || [];
  const messages = await Promise.all(messageIds.map(id => store.get(`whatsapp:message:${id}`)));

  const inbound = messages
    .filter(m => m && m.originChannel === 'whatsapp' && m.sender === 'candidate')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return inbound.length > 0 ? inbound[0].timestamp : null;
}
