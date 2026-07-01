import twilio from 'twilio';

let cachedClient;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  if (!cachedClient) cachedClient = twilio(accountSid.trim(), authToken.trim());
  return cachedClient;
}

function getConfigurationError() {
  if (!String(process.env.TWILIO_WHATSAPP_FROM || '').trim()) return 'TWILIO_WHATSAPP_FROM is not configured';
  if (!String(process.env.TWILIO_ACCOUNT_SID || '').trim()) return 'TWILIO_ACCOUNT_SID is not configured';
  if (!String(process.env.TWILIO_AUTH_TOKEN || '').trim()) return 'TWILIO_AUTH_TOKEN is not configured';
  return '';
}

function normalizeWhatsAppAddress(value) {
  const raw = String(value || '').trim();
  const withoutChannel = raw.replace(/^whatsapp:/i, '').trim();
  const e164 = withoutChannel.startsWith('+') ? withoutChannel : `+${withoutChannel}`;
  return `whatsapp:${e164}`;
}

function describeTwilioError(error) {
  const code = error?.code ? `Twilio ${error.code}` : 'Twilio error';
  const message = String(error?.message || 'Unknown messaging error').trim();
  return `${code}: ${message}`;
}

function logTwilioError(label, error, metadata = {}) {
  console.error(label, {
    ...metadata,
    code: error?.code || null,
    status: error?.status || null,
    message: error?.message || null,
    moreInfo: error?.moreInfo || null,
  });
}

export async function sendViaWhatsApp(phoneNumber, text) {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[sendViaWhatsApp] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }

  const client = getTwilioClient();
  const from = normalizeWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM);
  const to = normalizeWhatsAppAddress(phoneNumber);

  try {
    const message = await client.messages.create({ from, to, body: text });
    console.log(`[sendViaWhatsApp] SUCCESS: ${to} sid=${message.sid}`);
    return { sid: message.sid, success: true };
  } catch (error) {
    logTwilioError('[sendViaWhatsApp] TWILIO ERROR', error, { to });
    return { success: false, error: describeTwilioError(error), code: error?.code || null };
  }
}

export async function sendTemplateViaWhatsApp(phoneNumber, templateSid, variables) {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[sendTemplateViaWhatsApp] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }

  const normalizedTemplateSid = String(templateSid || '').trim();
  if (!/^HX[0-9a-f]{32}$/i.test(normalizedTemplateSid)) {
    return {
      success: false,
      error: 'WhatsApp kickoff template SID is invalid. Copy the HX… Content SID from Twilio Content Template Builder.',
    };
  }

  const client = getTwilioClient();
  const from = normalizeWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM);
  const to = normalizeWhatsAppAddress(phoneNumber);
  const contentVariables = variables && Object.keys(variables).length
    ? JSON.stringify(variables)
    : undefined;

  try {
    const message = await client.messages.create({
      from,
      to,
      contentSid: normalizedTemplateSid,
      ...(contentVariables ? { contentVariables } : {}),
    });

    console.log(`WhatsApp template sent to ${to}: ${message.sid}`);
    return { sid: message.sid, success: true };
  } catch (error) {
    logTwilioError('WhatsApp template send failed', error, {
      to,
      fromFormatValid: /^whatsapp:\+[1-9]\d+$/.test(from),
      contentSidFormatValid: true,
      hasContentVariables: !!contentVariables,
    });
    return { success: false, error: describeTwilioError(error), code: error?.code || null };
  }
}
