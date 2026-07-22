import React, { useState, useEffect } from 'react';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

const COUNTRY_CODES = [
  { code: 'US', country: 'United States', prefix: '+1' },
  { code: 'GB', country: 'United Kingdom', prefix: '+44' },
  { code: 'CA', country: 'Canada', prefix: '+1' },
  { code: 'AU', country: 'Australia', prefix: '+61' },
  { code: 'IL', country: 'Israel', prefix: '+972' },
  { code: 'IN', country: 'India', prefix: '+91' },
  { code: 'SG', country: 'Singapore', prefix: '+65' },
  { code: 'BR', country: 'Brazil', prefix: '+55' },
  { code: 'MX', country: 'Mexico', prefix: '+52' },
  { code: 'DE', country: 'Germany', prefix: '+49' },
  { code: 'FR', country: 'France', prefix: '+33' },
];

function getToken() {
  try {
    const parsed = JSON.parse(localStorage.getItem('pathway_auth') || '{}');
    return parsed.token || '';
  } catch { return ''; }
}

export default function WhatsAppOptIn({ user, onSave, disabled = false }) {
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [localNumber, setLocalNumber] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.whatsappNumber) {
      try {
        const parsed = parsePhoneNumber(user.whatsappNumber);
        if (parsed) {
          setSelectedCountry(parsed.country || 'US');
          setLocalNumber(parsed.nationalNumber?.toString() || '');
        }
      } catch (err) {
        console.error('Error parsing stored phone:', err);
      }
    }
    // Only true if explicitly saved as true — never default on
    setOptIn(user?.whatsappOptIn === true);
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = getToken();
    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      if (!optIn) {
        // Disable path — always call the API so the change persists
        const response = await fetch('/api/candidate/whatsapp-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ whatsappNumber: '', whatsappOptIn: false }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save settings');
        setSuccess('WhatsApp messaging disabled');
        if (onSave) onSave({ whatsappNumber: '', whatsappOptIn: false });
        return;
      }

      // Enable path — validate phone first
      if (!localNumber.trim()) {
        setError('Please enter your phone number');
        return;
      }
      const country = COUNTRY_CODES.find(c => c.code === selectedCountry);
      if (!country) { setError('Invalid country selected'); return; }

      const fullNumber = `${country.prefix}${localNumber}`;
      if (!isValidPhoneNumber(fullNumber, selectedCountry)) {
        setError(`Invalid phone number for ${country.country}. Check the format and try again.`);
        return;
      }

      const response = await fetch('/api/candidate/whatsapp-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ whatsappNumber: fullNumber, whatsappOptIn: true }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to save settings');
      }
      const data = await response.json();
      setSuccess('WhatsApp settings saved! You can now receive messages.');
      if (onSave) await onSave(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>WhatsApp Messaging</h3>
      <p style={styles.description}>
        Receive messages from Pathway on WhatsApp when you're not logged into the portal.
      </p>

      <form onSubmit={handleSave}>
        <div style={styles.checkboxContainer}>
          <input
            type="checkbox"
            id="whatsapp-consent"
            checked={optIn}
            onChange={e => { setOptIn(e.target.checked); setError(''); setSuccess(''); }}
            disabled={disabled || loading}
            style={styles.checkbox}
          />
          <label htmlFor="whatsapp-consent" style={styles.label}>
            Allow Pathway to message me on WhatsApp
          </label>
        </div>

        {optIn && (
          <div style={styles.phoneFields}>
            <div style={styles.formGroup}>
              <label htmlFor="country-select" style={styles.inputLabel}>Country</label>
              <select
                id="country-select"
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                disabled={disabled || loading}
                style={styles.select}
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.country} ({c.prefix})</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="phone-input" style={styles.inputLabel}>
                Phone Number (without country code)
              </label>
              <input
                id="phone-input"
                type="tel"
                value={localNumber}
                onChange={e => setLocalNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g., 5551234567"
                disabled={disabled || loading}
                style={styles.input}
              />
            </div>
            {user?.whatsappOptInTimestamp && (
              <p style={styles.timestamp}>
                Last confirmed: {new Date(user.whatsappOptInTimestamp).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <button type="submit" disabled={disabled || loading} style={styles.button}>
          {loading ? 'Saving...' : optIn ? 'Save Settings' : 'Disable WhatsApp'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #dbe4f7',
    borderRadius: 20,
    padding: 28,
    marginBottom: 18,
    backgroundColor: '#f2f6ff',
    boxShadow: '0 18px 40px rgba(30,45,90,.06)',
  },
  heading: {
    fontSize: 18,
    fontWeight: 800,
    color: '#111a33',
    margin: '0 0 6px',
    letterSpacing: '-.3px',
  },
  description: {
    fontSize: 13,
    color: '#8b97b8',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
    accentColor: '#6d8cff',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111a33',
    cursor: 'pointer',
  },
  phoneFields: {
    marginTop: 8,
    paddingTop: 16,
    borderTop: '1px solid #dbe4f7',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    display: 'block',
    fontSize: 12.5,
    fontWeight: 700,
    color: '#38456b',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #dbe4f7',
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: '#eef4ff',
    color: '#111a33',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #dbe4f7',
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: '#eef4ff',
    color: '#111a33',
  },
  button: {
    display: 'inline-block',
    padding: '12px 22px',
    background: 'linear-gradient(135deg,#3a63ff,#6d8cff)',
    color: '#f2f6ff',
    border: 'none',
    borderRadius: 13,
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 10px 20px rgba(58,99,255,.32)',
  },
  error: {
    fontSize: 13,
    color: '#e8476b',
    marginBottom: 12,
  },
  success: {
    fontSize: 13,
    color: '#0ca678',
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#8b97b8',
    marginBottom: 12,
  },
};
