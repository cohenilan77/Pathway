// Email Reminder System
// Manages sending and tracking email reminders to candidates

import { Resend } from 'resend';
import { getStore } from './store.js';
import { getUserById } from './db.js';
import { getCandidateClock, recordReminderSent as recordClockReminder } from './candidate-clock.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'pathway@resend.dev';

export const EMAIL_TYPES = {
  weeklyCheckIn: 'weekly-check-in',
  monthlyReview: 'monthly-review',
  assignmentReminder: 'assignment-reminder',
  stageMilestone: 'stage-milestone',
  inactivityReminder: 'inactivity-reminder',
  consultantUpdate: 'consultant-update',
  applicationDeadline: 'application-deadline',
};

// Email template generators
function generateWeeklyCheckInEmail(candidate, summary) {
  return {
    subject: 'Your Pathway weekly check-in is ready',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #94b3fb, #b899fb); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { background: #faf7f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .button { display: inline-block; background: #5b46e0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
    .footer { font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Hello ${candidate.name || 'there'}!</h2>
      <p>Your weekly check-in is ready.</p>
    </div>
    <div class="content">
      <p>${summary || 'Check in on your progress this week and get personalized next steps.'}</p>
      <a href="https://pathway.ai/dashboard" class="button">View your check-in →</a>
    </div>
    <div class="footer">
      <p><a href="https://pathway.ai/settings" style="color: #5b46e0;">Update notification settings</a> | <a href="https://pathway.ai/unsubscribe" style="color: #5b46e0;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

function generateAssignmentReminderEmail(candidate, assignment, daysUntil) {
  const timeLabel = daysUntil > 0
    ? `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
    : daysUntil === 0
      ? 'today'
      : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`;

  return {
    subject: `Your next Pathway step is ready: ${assignment.title}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #94b3fb, #b899fb); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { background: #faf7f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .button { display: inline-block; background: #5b46e0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
    .footer { font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Hello ${candidate.name || 'there'}!</h2>
      <p>Your next action is ready.</p>
    </div>
    <div class="content">
      <h3>${assignment.title}</h3>
      <p>${assignment.description || ''}</p>
      <p><strong>Due ${timeLabel}</strong></p>
      <a href="https://pathway.ai/assignments/${assignment.id}" class="button">Continue your work →</a>
    </div>
    <div class="footer">
      <p><a href="https://pathway.ai/settings" style="color: #5b46e0;">Update notification settings</a> | <a href="https://pathway.ai/unsubscribe" style="color: #5b46e0;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

function generateInactivityReminderEmail(candidate, daysSinceActive) {
  let message = 'We haven\'t seen you in a while.';
  let urgency = '';

  if (daysSinceActive >= 30) {
    urgency = 'Your next action is waiting.';
  } else if (daysSinceActive >= 14) {
    urgency = 'Your progress is at risk.';
  } else if (daysSinceActive >= 7) {
    urgency = 'Let\'s get back on track.';
  }

  return {
    subject: 'We miss you! Your Pathway is waiting',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #94b3fb, #b899fb); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { background: #faf7f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .button { display: inline-block; background: #5b46e0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
    .footer { font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome back, ${candidate.name || 'there'}!</h2>
      <p>${message}</p>
    </div>
    <div class="content">
      <p>${urgency}</p>
      <p>You're ${daysSinceActive} days away from your last check-in. Let's continue your journey.</p>
      <a href="https://pathway.ai/dashboard" class="button">Continue your journey →</a>
    </div>
    <div class="footer">
      <p><a href="https://pathway.ai/settings" style="color: #5b46e0;">Update notification settings</a> | <a href="https://pathway.ai/unsubscribe" style="color: #5b46e0;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

export async function sendEmailReminder(userId, type, data = {}) {
  try {
    const user = await getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    // Get contact email from setup
    const store = getStore();
    const setupData = await store.get(`candidate:setup:${userId}`);
    const contactEmail = setupData?.contactEmail;

    if (!contactEmail) {
      return { success: false, error: 'No contact email configured' };
    }

    // Get candidate clock to check if reminders are allowed
    const clock = await getCandidateClock(userId);
    if (clock && clock.nextEligibleReminderAt && Date.now() < clock.nextEligibleReminderAt) {
      return { success: false, error: 'Too soon to send another reminder' };
    }

    let emailData;

    switch (type) {
      case EMAIL_TYPES.weeklyCheckIn:
        emailData = generateWeeklyCheckInEmail(user, data.summary);
        break;
      case EMAIL_TYPES.assignmentReminder: {
        const daysUntil = data.daysUntilDue ?? 0;
        emailData = generateAssignmentReminderEmail(user, data.assignment, daysUntil);
        break;
      }
      case EMAIL_TYPES.inactivityReminder:
        emailData = generateInactivityReminderEmail(user, data.daysSinceActive);
        break;
      default:
        return { success: false, error: 'Unknown email type' };
    }

    // Send the email
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: contactEmail,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return { success: false, error: result.error.message };
    }

    // Record the reminder as sent
    await recordClockReminder(userId);

    // Store email log
    const store2 = getStore();
    await store2.lpush(`emails:sent:${userId}`, {
      type,
      sentAt: Date.now(),
      to: contactEmail,
      result: result.id,
    });

    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Error sending email reminder:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBatchReminders(userIds, type, dataFn) {
  const results = [];
  for (const userId of userIds) {
    const data = typeof dataFn === 'function' ? await dataFn(userId) : dataFn;
    const result = await sendEmailReminder(userId, type, data);
    results.push({ userId, ...result });
  }
  return results;
}

export async function checkEmailDelivery(messageId) {
  try {
    // Note: Resend doesn't have a direct check-delivery API
    // This would be implemented through webhooks in a real system
    return { messageId, status: 'sent' };
  } catch (error) {
    console.error('Error checking email delivery:', error);
    return { messageId, status: 'unknown', error: error.message };
  }
}

export async function recordUnsubscribe(userId) {
  const store = getStore();
  const setupData = await store.get(`candidate:setup:${userId}`);
  if (setupData) {
    await store.set(`candidate:setup:${userId}`, {
      ...setupData,
      unsubscribedAt: Date.now(),
      reminderConsent: false,
    });
  }
}

export async function canSendReminderToUser(userId) {
  const store = getStore();
  const setupData = await store.get(`candidate:setup:${userId}`);
  if (!setupData) return false;
  if (!setupData.reminderConsent) return false;
  if (setupData.unsubscribedAt) return false;

  const user = await getUserById(userId);
  if (user?.suspended) return false;

  return !!setupData.contactEmail;
}
