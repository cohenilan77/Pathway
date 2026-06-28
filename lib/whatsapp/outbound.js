import twilio from 'twilio';

let cachedClient;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  if (!cachedClient) cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

function getConfigurationError() {
  if (!process.env.TWILIO_WHATSAPP_FROM) return 'TWILIO_WHATSAPP_FROM is not configured';
  if (!process.env.TWILIO_ACCOUNT_SID) return 'TWILIO_ACCOUNT_SID is not configured';
  if (!process.env.TWILIO_AUTH_TOKEN) return 'TWILIO_AUTH_TOKEN is not configured';
  return '';
}

export async function sendViaWhatsApp(phoneNumber, text) {
  console.log(`[sendViaWhatsApp] START: phone=${phoneNumber}`);

  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[sendViaWhatsApp] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }

  const client = getTwilioClient();
  const phone = String(phoneNumber).startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  console.log(`[sendViaWhatsApp] Normalized phone: ${phone}`);

  try {
    console.log(`[sendViaWhatsApp] Calling Twilio API from=${process.env.TWILIO_WHATSAPP_FROM} to=${phone}`);
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${phone}`,
      body: text,
    });

    console.log(`[sendViaWhatsApp] SUCCESS: ${phone} sid=${message.sid}`);
    return { sid: message.sid, success: true };
  } catch (error) {
    console.error(`[sendViaWhatsApp] TWILIO ERROR for ${phone}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function sendTemplateViaWhatsApp(phoneNumber, templateSid, variables) {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[sendTemplateViaWhatsApp] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }
  if (!templateSid) {
    return { success: false, error: 'WhatsApp template Content SID is required' };
  }

  const client = getTwilioClient();
  const phone = String(phoneNumber).startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  try {
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${phone}`,
      contentSid: templateSid,
      contentVariables: JSON.stringify(variables),
    });

    console.log(`WhatsApp template sent to ${phone}: ${message.sid}`);
    return { sid: message.sid, success: true };
  } catch (error) {
    console.error(`WhatsApp template send failed for ${phone}:`, error.message);
    return { success: false, error: error.message };
  }
}
