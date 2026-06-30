// First-Login Setup API
// Handles the mandatory first-login form submission

import { getUserIdByToken, getUserById, updateUserDetails } from '../../lib/db.js';
import { initializeCandidateClock } from '../../lib/candidate-clock.js';
import { JOURNEY_TYPES, JOURNEY_LABELS } from '../../lib/candidate-journey.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

function validateSetupData(data) {
  const errors = [];

  if (!data.fullName || !String(data.fullName).trim()) {
    errors.push('Full name is required');
  }

  if (!data.contactEmail || !String(data.contactEmail).trim()) {
    errors.push('Contact email is required');
  }

  if (!data.contactEmailConfirm || !String(data.contactEmailConfirm).trim()) {
    errors.push('Email confirmation is required');
  }

  if (data.contactEmail && data.contactEmailConfirm) {
    if (String(data.contactEmail).trim() !== String(data.contactEmailConfirm).trim()) {
      errors.push('Email addresses do not match');
    }
  }

  if (!data.countryOfResidence || !String(data.countryOfResidence).trim()) {
    errors.push('Country of residence is required');
  }

  if (data.age === '' || data.age == null) {
    errors.push('Age is required');
  } else {
    const ageNum = Number(data.age);
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 120) {
      errors.push('Age must be between 13 and 120');
    }
  }

  if (!data.timezone || !String(data.timezone).trim()) {
    errors.push('Timezone is required');
  }

  if (!data.journeyType || !Object.values(JOURNEY_TYPES).includes(data.journeyType)) {
    errors.push('Valid journey type is required');
  }

  if (data.reminderConsent !== true) {
    errors.push('You must agree to receive journey reminders');
  }

  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = getToken(req);
  const userId = await getUserIdByToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { data } = req.body || {};
  if (!data) {
    res.status(400).json({ error: 'Setup data is required' });
    return;
  }

  // Validate the setup data
  const validationErrors = validateSetupData(data);
  if (validationErrors.length > 0) {
    res.status(400).json({ errors: validationErrors });
    return;
  }

  try {
    // Update user with the new details
    const updated = await updateUserDetails(userId, {
      name: data.fullName,
      residency: data.countryOfResidence,
      age: data.age,
      phone: data.phone || '',
      linkedin: data.linkedin || '',
    });

    // Initialize candidate journey and clock
    await initializeCandidateClock(userId, data.journeyType);

    // Store journey setup information
    const now = Date.now();
    const store = (await import('../../lib/store.js')).getStore();
    await store.set(`candidate:setup:${userId}`, {
      journeyType: data.journeyType,
      contactEmail: data.contactEmail,
      timezone: data.timezone,
      reminderConsentAt: data.reminderConsent ? now : null,
      reminderConsent: data.reminderConsent,
      firstLoginCompletedAt: now,
    });

    res.status(200).json({
      ok: true,
      message: 'First-login setup completed successfully',
      journey: {
        type: data.journeyType,
        label: JOURNEY_LABELS[data.journeyType],
      },
    });
  } catch (error) {
    console.error('First-login setup error:', error);
    res.status(500).json({
      error: 'Failed to complete setup',
      details: error.message,
    });
  }
}
