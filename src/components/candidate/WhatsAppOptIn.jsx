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
          const countryCode = parsed.country || 'US';
          setSelectedCountry(countryCode);
          setLocalNumber(parsed.nationalNumber?.toString() || '');
        }
      } catch (err) {
        console.error('Error parsing stored phone:', err);
      }
    }
    setOptIn(user?.whatsappOptIn || false);
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!optIn) {
      if (onSave) {
        onSave({ whatsappNumber: '', whatsappOptIn: false });
      }
      setSuccess('WhatsApp messaging disabled');
      return;
    }

    if (!localNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    const country = COUNTRY_CODES.find(c => c.code === selectedCountry);
    if (!country) {
      setError('Invalid country selected');
      return;
    }

    const fullNumber = `${country.prefix}${localNumber}`;

    if (!isValidPhoneNumber(fullNumber, selectedCountry)) {
      setError(`Invalid phone number for ${country.country}. Check the format and try again.`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch('/api/candidate/whatsapp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          whatsappNumber: fullNumber,
          whatsappOptIn: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || data.error || 'Failed to save settings');
        return;
      }

      const data = await response.json();
      setSuccess('WhatsApp settings saved! You can now receive messages.');

      if (onSave) {
        onSave(data.data);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOptInChange = (e) => {
    setOptIn(e.target.checked);
    setError('');
  };

  return (
    <div className="whatsapp-optin-card" style={styles.card}>
      <h3 style={styles.heading}>WhatsApp Messaging</h3>
      <p style={styles.description}>
        Receive messages from Pathway on WhatsApp when you're not logged into the portal.
      </p>

      <div style={styles.checkboxContainer}>
        <input
          type="checkbox"
          id="whatsapp-consent"
          checked={optIn}
          onChange={handleOptInChange}
          disabled={disabled || loading}
          style={styles.checkbox}
        />
        <label htmlFor="whatsapp-consent" style={styles.label}>
          Allow Pathway to message me on WhatsApp
        </label>
      </div>

      {optIn && (
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="country-select" style={styles.inputLabel}>
              Country
            </label>
            <select
              id="country-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              disabled={disabled || loading}
              style={styles.select}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.country} ({c.prefix})
                </option>
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
              onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g., 5551234567"
              disabled={disabled || loading}
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}

          {user?.whatsappOptInTimestamp && (
            <p style={styles.timestamp}>
              Last confirmed: {new Date(user.whatsappOptInTimestamp).toLocaleDateString()}
            </p>
          )}

          <button
            type="submit"
            disabled={disabled || loading}
            style={styles.button}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#fafafa',
  },
  heading: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '8px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    cursor: 'pointer',
  },
  form: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e0e0e0',
  },
  formGroup: {
    marginBottom: '16px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  button: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  error: {
    fontSize: '14px',
    color: '#d32f2f',
    marginBottom: '12px',
  },
  success: {
    fontSize: '14px',
    color: '#388e3c',
    marginBottom: '12px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '12px',
  },
};
