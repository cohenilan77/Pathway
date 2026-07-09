import React, { useState } from 'react';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Phoenix',
  'America/Toronto',
  'America/Mexico_City',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

const JOURNEY_TYPES = {
  undergraduate: 'Undergraduate',
  graduate: 'Graduate',
  mba: 'MBA',
  phd: 'PhD or Doctoral',
  personalDevelopment: 'Personal Development',
};

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Ireland',
  'France',
  'Germany',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Australia',
  'New Zealand',
  'China',
  'India',
  'Japan',
  'South Korea',
  'Singapore',
  'Hong Kong',
  'Thailand',
  'Vietnam',
  'Philippines',
  'Malaysia',
  'Indonesia',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'South Africa',
  'Other',
];

export default function FirstLoginSetup({ onComplete, user }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    contactEmail: '',
    contactEmailConfirm: '',
    countryOfResidence: '',
    age: '',
    timezone: 'UTC',
    journeyType: '',
    phone: '',
    linkedin: '',
    reminderConsent: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const validateStep = () => {
    setError('');
    switch (step) {
      case 0:
        if (!formData.fullName.trim()) {
          setError('Full name is required');
          return false;
        }
        return true;
      case 1:
        if (!formData.contactEmail.trim()) {
          setError('Contact email is required');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.contactEmail)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (!formData.contactEmailConfirm.trim()) {
          setError('Email confirmation is required');
          return false;
        }
        if (formData.contactEmail !== formData.contactEmailConfirm) {
          setError('Email addresses do not match');
          return false;
        }
        return true;
      case 2:
        if (!formData.countryOfResidence) {
          setError('Country of residence is required');
          return false;
        }
        if (formData.age === '' || isNaN(formData.age)) {
          setError('Age is required');
          return false;
        }
        if (parseInt(formData.age) < 13 || parseInt(formData.age) > 120) {
          setError('Age must be between 13 and 120');
          return false;
        }
        return true;
      case 3:
        if (!formData.journeyType) {
          setError('Please select a journey type');
          return false;
        }
        if (!formData.reminderConsent) {
          setError('You must agree to receive journey reminders');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(Math.max(0, step - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('pathway_token');
      const response = await fetch('/api/candidate/first-login-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: formData }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.errors?.[0] || result.error || 'Setup failed');
        return;
      }

      // Reload session to get updated journey data
      const sessionRes = await fetch('/api/session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sessionRes.ok) {
        const { journey: journeyData } = await sessionRes.json();
        onComplete(journeyData || result.journey);
      } else {
        onComplete(result.journey);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Welcome to Pathway', subtitle: 'Let\'s start with your name' },
    { title: 'Contact Email', subtitle: 'Where should we send updates?' },
    { title: 'Profile Information', subtitle: 'Help us understand your context' },
    { title: 'Your Journey', subtitle: 'Choose your learning path' },
  ];

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={{
      flex: 1,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f0e8 0%, #fffaf0 100%)',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 500,
        background: 'white',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(20, 27, 52, 0.15)',
        padding: '40px 30px',
      }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 30 }}>
          <div style={{
            height: 4,
            background: '#f1eadd',
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 20,
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #94b3fb, #b899fb)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#141b34', margin: '0 0 8px' }}>
            {currentStep.title}
          </h2>
          <p style={{ fontSize: 14, color: '#6b7392', margin: 0 }}>
            {currentStep.subtitle}
          </p>
        </div>

        {/* Step content */}
        <div style={{ minHeight: 200, marginBottom: 30 }}>
          {error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
              color: '#c33',
              fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {step === 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 6, display: 'block' }}>
                  Full Name *
                </span>
                <input
                  type="text"
                  name="fullName"
                  className="pw-firstlogin-input"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #e7dcc7',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div>
              <label style={{ display: 'block', marginBottom: 18 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 6, display: 'block' }}>
                  Contact Email *
                </span>
                <input
                  type="email"
                  name="contactEmail"
                  className="pw-firstlogin-input"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #e7dcc7',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 6, display: 'block' }}>
                  Confirm Email *
                </span>
                <input
                  type="email"
                  name="contactEmailConfirm"
                  className="pw-firstlogin-input"
                  value={formData.contactEmailConfirm}
                  onChange={handleChange}
                  placeholder="Re-enter your email"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #e7dcc7',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <label style={{ display: 'block', marginBottom: 18 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 6, display: 'block' }}>
                  Country of Residence *
                </span>
                <select
                  name="countryOfResidence"
                  className="pw-firstlogin-input"
                  value={formData.countryOfResidence}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #e7dcc7',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: 18 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 6, display: 'block' }}>
                  Age *
                </span>
                <input
                  type="number"
                  name="age"
                  className="pw-firstlogin-input"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Your age"
                  min="13"
                  max="120"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #e7dcc7',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 6, display: 'block' }}>
                  Timezone
                </span>
                <select
                  name="timezone"
                  className="pw-firstlogin-input"
                  value={formData.timezone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #e7dcc7',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5b46e0', marginBottom: 12, display: 'block' }}>
                  Choose Your Journey *
                </span>
                <div style={{ display: 'grid', gap: 10 }}>
                  {Object.entries(JOURNEY_TYPES).map(([key, label]) => (
                    <label key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 12,
                      border: formData.journeyType === key ? '2px solid #5b46e0' : '1.5px solid #e7dcc7',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: formData.journeyType === key ? '#f8f6ff' : '#faf7f2',
                      transition: 'all 0.2s ease',
                    }}>
                      <input
                        type="radio"
                        name="journeyType"
                        value={key}
                        checked={formData.journeyType === key}
                        onChange={handleChange}
                        style={{ marginRight: 12, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#141b34' }}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 12,
                background: '#fffaf0',
                border: '1px solid #f1eadd',
                borderRadius: 10,
                cursor: 'pointer',
                marginTop: 20,
              }}>
                <input
                  type="checkbox"
                  name="reminderConsent"
                  checked={formData.reminderConsent}
                  onChange={handleChange}
                  style={{ marginTop: 4, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: '#6b7392', lineHeight: 1.5 }}>
                  I agree to receive Pathway journey reminders at this email address
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          {step > 0 && (
            <button
              onClick={handleBack}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: '1.5px solid #e7dcc7',
                background: '#faf7f2',
                color: '#5b46e0',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={step === steps.length - 1 ? handleSubmit : handleNext}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #94b3fb, #b899fb)',
              color: '#faf7f2',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
              boxShadow: '0 8px 16px rgba(105, 91, 255, 0.3)',
            }}
          >
            {loading ? 'Setting up...' : step === steps.length - 1 ? 'Get Started' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
