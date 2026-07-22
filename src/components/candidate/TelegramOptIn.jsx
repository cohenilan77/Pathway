import React, { useState, useEffect } from 'react';

export default function TelegramOptIn({ user, onSave, disabled = false }) {
  const [telegramId, setTelegramId] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTelegramId(String(user?.telegramUserId || ''));
    setOptIn(user?.telegramOptIn === true);
  }, [user]);

  const saveSettings = async (nextOptIn) => {
    setError('');
    setSuccess('');

    if (nextOptIn && !telegramId.trim()) {
      setError('Please enter your Telegram User ID');
      return false;
    }

    if (nextOptIn && !/^\d+$/.test(telegramId.trim())) {
      setError('Telegram User ID must be a number (e.g., 987654321)');
      return false;
    }

    setLoading(true);

    try {
      const authData = localStorage.getItem('pathway_auth');
      let token = '';
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          token = parsed.token || '';
        } catch (err) {
          console.error('Failed to parse auth:', err);
        }
      }

      if (!token) {
        setError('Session expired. Please log in again.');
        return false;
      }

      const response = await fetch('/api/candidate/telegram-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          telegramUserId: telegramId.trim(),
          telegramOptIn: nextOptIn,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to save settings');
      setOptIn(nextOptIn);
      setSuccess(nextOptIn
        ? 'Telegram connected. You can now chat while logged out.'
        : 'Telegram messaging disabled.');

      if (onSave) {
        await onSave(data.data);
      }
      return true;
    } catch (err) {
      setError(err.message || 'Could not update Telegram settings.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await saveSettings(true);
  };

  const handleOptInChange = async (e) => {
    const checked = e.target.checked;
    setError('');
    if (checked) {
      setOptIn(true);
      return;
    }
    await saveSettings(false);
  };

  return (
    <div className="telegram-optin-card" style={styles.card}>
      <h3 style={styles.heading}>Telegram Messaging</h3>
      <p style={styles.description}>
        Receive messages from Pathway on Telegram when you're not logged into the portal.
      </p>

      <div style={styles.checkboxContainer}>
        <input
          type="checkbox"
          id="telegram-consent"
          checked={optIn}
          onChange={handleOptInChange}
          disabled={disabled || loading}
          style={styles.checkbox}
        />
        <label htmlFor="telegram-consent" style={styles.label}>
          Allow Pathway to message me on Telegram
        </label>
      </div>

      {optIn && (
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="telegram-id-input" style={styles.inputLabel}>
              Telegram User ID
            </label>
            <input
              id="telegram-id-input"
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g., 987654321"
              disabled={disabled || loading}
              style={styles.input}
            />
            <p style={styles.helpText}>
              First open the Pathway bot and tap <strong>Start</strong>. Then use <strong>@userinfobot</strong> to copy your numeric ID.
            </p>
          </div>

          {user?.telegramOptInTimestamp && (
            <p style={styles.timestamp}>
              Last confirmed: {new Date(user.telegramOptInTimestamp).toLocaleDateString()}
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
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #e3ebfa',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#ffffff',
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
    borderTop: '1px solid #e3ebfa',
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
    marginBottom: '8px',
  },
  helpText: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
    lineHeight: '1.4',
  },
  button: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#2f52e6',
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
    color: '#e8476b',
    marginBottom: '12px',
  },
  success: {
    fontSize: '14px',
    color: '#0ca678',
    marginBottom: '12px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '12px',
  },
};
