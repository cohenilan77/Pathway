export const WHATSAPP_TEMPLATES = {
  deadline_nudge: {
    sid: 'HTdeadline123',
    name: 'Deadline Reminder',
    variables: ['school', 'days'],
    description: '{{school}} deadline is in {{days}} days. Complete your profile now!',
  },
  advisor_replied: {
    sid: 'HTadvisor123',
    name: 'Advisor Reply Notification',
    variables: ['name'],
    description: '{{name}} replied to your question. Check Pathway for details.',
  },
  missing_fields: {
    sid: 'HTmissing123',
    name: 'Complete Profile',
    variables: ['fields'],
    description: 'You have {{fields}} missing. Complete them to unlock better recommendations.',
  },
  session_nudge: {
    sid: 'HTsession123',
    name: 'Session Available',
    variables: ['consultant'],
    description: 'Your advisor {{consultant}} has availability. Book a session in Pathway.',
  },
  payment_required: {
    sid: 'HTpayment123',
    name: 'Payment Required',
    variables: ['plan'],
    description: 'Upgrade to {{plan}} to unlock premium features in Pathway.',
  },
};

export function getTemplateById(templateKey) {
  return WHATSAPP_TEMPLATES[templateKey] || null;
}

export function validateTemplate(templateKey, variables) {
  const template = WHATSAPP_TEMPLATES[templateKey];
  if (!template) return { valid: false, error: `Template ${templateKey} not found` };

  const missing = template.variables.filter(v => !variables[v]);
  if (missing.length > 0) {
    return { valid: false, error: `Missing variables: ${missing.join(', ')}` };
  }

  return { valid: true };
}
