import { getUserIdByToken, getUserById, updateUserDetails, setCandidatePhoneIndex } from '../../lib/db.js';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers['x-session-token'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userId = await getUserIdByToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { whatsappNumber, whatsappOptIn } = req.body;

    // Validate phone number if provided
    if (whatsappNumber && !isValidPhoneNumber(whatsappNumber, 'US')) {
      // Try common country codes
      let isValid = false;
      const countryCodes = ['US', 'GB', 'CA', 'AU', 'IL', 'IN', 'SG', 'BR'];

      for (const cc of countryCodes) {
        if (isValidPhoneNumber(whatsappNumber, cc)) {
          isValid = true;
          break;
        }
      }

      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid phone number format',
          message: 'Please use E.164 format (e.g., +1-555-123-4567 or +972-54-123-4567)',
        });
      }
    }

    // Normalize to E.164 if valid
    let normalizedPhone = whatsappNumber;
    try {
      const parsed = parsePhoneNumber(whatsappNumber);
      if (parsed) {
        normalizedPhone = parsed.format('E.164');
      }
    } catch (err) {
      console.error('Phone normalization error:', err.message);
    }

    // Update user details
    const updated = await updateUserDetails(userId, {
      whatsappNumber: normalizedPhone || '',
      whatsappOptIn: !!whatsappOptIn,
      whatsappOptInTimestamp: whatsappOptIn ? Date.now() : null,
    });

    // Update index
    if (normalizedPhone) {
      await setCandidatePhoneIndex(userId, normalizedPhone);
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp settings saved',
      data: {
        whatsappNumber: updated.whatsappNumber,
        whatsappOptIn: updated.whatsappOptIn,
        whatsappOptInTimestamp: updated.whatsappOptInTimestamp,
      },
    });
  } catch (err) {
    console.error('WhatsApp settings error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
