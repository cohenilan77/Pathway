import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendViaWhatsApp(phoneNumber, text) {
  if (!process.env.TWILIO_WHATSAPP_FROM) {
    console.error('TWILIO_WHATSAPP_FROM not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const phone = String(phoneNumber).startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  try {
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${phone}`,
      body: text,
    });

    console.log(`WhatsApp sent to ${phone}: ${message.sid}`);
    return { sid: message.sid, success: true };
  } catch (err) {
    console.error(`WhatsApp send failed for ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendTemplateViaWhatsApp(phoneNumber, templateSid, variables) {
  if (!process.env.TWILIO_WHATSAPP_FROM) {
    console.error('TWILIO_WHATSAPP_FROM not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

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
  } catch (err) {
    console.error(`WhatsApp template send failed for ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
}
