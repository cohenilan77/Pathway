import React, { useState } from 'react';

const PLAN_DETAILS = [
  {
    key: 'free',
    label: 'Free',
    description: 'Chat through profile, analysis, and program selection.',
  },
  {
    key: 'ai_strategy',
    label: 'AI + Strategy',
    description: 'Everything in Pathway AI, plus 1:1 access to a human admissions consultant.',
  },
];

export default function Settings({ profile, plan, setPlan, setShowContactModal, resetSession, signOut, showToast, authUser, authToken, requiresOAuthDetails, saveUserDetails, setCandTab }) {
  const [notifStrategist, setNotifStrategist] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [form, setForm] = useState({
    name: authUser?.name || profile?.name || '',
    degree: profile?.degree || '',
    gpa: profile?.gpa || '',
    gmat: profile?.gmat || '',
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const [details, setDetails] = useState(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem('pathway_details') || '{}'); }
      catch { return {}; }
    })();
    return {
      name: authUser?.name || stored.name || profile?.name || '',
      email: authUser?.email || stored.email || '',
      country: authUser?.residency || stored.country || '',
      age: authUser?.age || stored.age || '',
      phone: authUser?.phone || stored.phone || '',
      linkedin: authUser?.linkedin || stored.linkedin || '',
    };
  });

  const persistDetails = async (confirmOAuth = false) => {
    const payload = {
      name: details.name || form.name,
      residency: details.country,
      age: details.age,
      phone: details.phone,
      linkedin: details.linkedin,
      oauthDetailsConfirmed: confirmOAuth,
    };
    if (saveUserDetails) await saveUserDetails(payload);
    localStorage.setItem('pathway_details', JSON.stringify({ ...details, name: payload.name }));
  };

  const handleSave = async () => {
    setSavingDetails(true);
    try {
      const prefs = JSON.parse(localStorage.getItem('pathway_prefs') || '{}');
      localStorage.setItem('pathway_prefs', JSON.stringify({ ...prefs, profile: form, notifStrategist, notifDigest }));
      await persistDetails(false);
      showToast('Preferences saved.');
    } catch (err) {
      showToast(err.message || 'Could not save preferences.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleUnlock = async () => {
    if (!details.name?.trim() || !details.country?.trim() || !details.age?.toString().trim()) {
      showToast('Please fill in Full Name, Country of Residence, and Age to continue.');
      return;
    }
    setSavingDetails(true);
    try {
      await persistDetails(true);
      showToast('Details saved — Pathway is now unlocked.');
      setCandTab('advisor');
    } catch (err) {
      showToast(err.message || 'Could not save details.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSelectPlan = (key) => {
    if (key === plan) return;
    setPlan(key);
    const label = PLAN_DETAILS.find(p => p.key === key)?.label || key;
    if (key === 'ai_strategy') {
      showToast('AI + Strategy selected — connecting you with a consultant.');
      setShowContactModal(true);
    } else {
      showToast(`Plan updated to ${label}.`);
    }
  };

  const handleChangePassword = async () => {
    if (!authToken) {
      showToast('Please sign in again to change your password.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not change password.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password updated.');
    } catch (err) {
      showToast(err.message || 'Could not change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const Toggle = ({ on, onToggle }) => (
    <span onClick={onToggle} style={{ width: 42, height: 24, borderRadius: 12, background: on ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : '#e7dcc7', position: 'relative', flexShrink: 0, cursor: 'pointer', display: 'inline-block', transition: 'background .2s', boxShadow: on ? '0 4px 10px rgba(105,91,255,.32)' : 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#faf7f2', transition: 'left .2s' }} />
    </span>
  );

  const inputStyle = { width: '100%', border: '1.5px solid #f1eadd', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#141b34', background: '#f6f1e8' };

  const lockedCardStyle = requiresOAuthDetails ? { opacity: 0.3, pointerEvents: 'none', userSelect: 'none', position: 'relative' } : { position: 'relative' };

  const LockOverlay = () => (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,.18) 6px, rgba(255,255,255,.18) 7px)', zIndex: 1 }} />
  );

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 34px 64px' }}>

        {requiresOAuthDetails && (
          <div style={{ background: 'linear-gradient(135deg,#94b3fb18,#b899fb18)', border: '1.5px solid #b899fb55', borderRadius: 16, padding: '16px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#faf7f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#141b34' }}>Confirm your details to unlock Pathway</div>
              <div style={{ fontSize: 12.5, color: '#6b7392' }}>This is required once after Google or Outlook sign-in.</div>
            </div>
          </div>
        )}

        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#141b34', margin: '0 0 8px', letterSpacing: '-.5px' }}>Settings</h1>
          <p style={{ fontSize: 14.5, color: '#6b7392', margin: '0 0 28px', fontWeight: 500 }}>{requiresOAuthDetails ? 'Confirm your candidate details before continuing.' : 'Manage your private office preferences.'}</p>

        {/* Plan */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 18px 40px rgba(60,72,130,.06)', ...lockedCardStyle }}>
          {requiresOAuthDetails && <LockOverlay />}
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: '0 0 6px', letterSpacing: '-.3px' }}>Plan</h3>
          <p style={{ fontSize: 13, color: '#9098b5', margin: '0 0 18px' }}>Choose how much of the process you want to unlock.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            {PLAN_DETAILS.map(p => {
              const active = plan === p.key;
              return (
                <div key={p.key} style={{
                  display: 'flex', flexDirection: 'column',
                  border: active ? '2px solid #9285e4' : '1.5px solid #f1eadd',
                  background: active ? '#f6f1e8' : '#faf7f2',
                  borderRadius: 16, padding: '20px 18px',
                }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: '#141b34', marginBottom: 8 }}>{p.label}</div>
                  <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.5, marginBottom: 18, flex: 1 }}>{p.description}</div>
                  <button onClick={() => handleSelectPlan(p.key)} disabled={active} style={{
                    background: active ? 'none' : 'linear-gradient(135deg,#94b3fb,#b899fb)',
                    color: active ? '#9098b5' : '#faf7f2',
                    border: active ? '1.5px solid #f1eadd' : 'none',
                    borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 700,
                    cursor: active ? 'default' : 'pointer', fontFamily: 'inherit',
                    boxShadow: active ? 'none' : '0 8px 16px rgba(105,91,255,.3)',
                  }}>
                    {active ? 'Current Plan' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 18px 40px rgba(60,72,130,.06)', ...lockedCardStyle }}>
          {requiresOAuthDetails && <LockOverlay />}
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: '0 0 6px', letterSpacing: '-.3px' }}>Profile</h3>
          <p style={{ fontSize: 13, color: '#9098b5', margin: '0 0 18px' }}>Auto-filled from your advisor conversation. Override manually here.</p>
          <div className="pw-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Target Degree</label>
              <input value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} placeholder="MBA, Masters, PhD..." style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>GPA</label>
              <input value={form.gpa} onChange={e => setForm(f => ({ ...f, gpa: e.target.value }))} placeholder="e.g. 3.7" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>GMAT / GRE</label>
              <input value={form.gmat} onChange={e => setForm(f => ({ ...f, gmat: e.target.value }))} placeholder="e.g. 720" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ background: '#faf7f2', border: requiresOAuthDetails ? '1.5px solid #b899fb88' : '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 18px 40px rgba(60,72,130,.06)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: 0, letterSpacing: '-.3px' }}>Details</h3>
            {requiresOAuthDetails && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9285e4', background: '#f1eadd', padding: '3px 9px', borderRadius: 8 }}>Required</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#9098b5', margin: '0 0 18px' }}>
            {requiresOAuthDetails
              ? 'Fill in all required fields to unlock your Pathway private office.'
              : 'Your personal details used by your AI strategist.'}
          </p>
          <div className="pw-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Full Name</label>
              <input value={details.name || ''} onChange={e => setDetails(d => ({ ...d, name: e.target.value }))} placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Email</label>
              <input value={details.email || authUser?.email || ''} disabled placeholder="you@example.com" style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Country of Residence</label>
              <input value={details.country || ''} onChange={e => setDetails(d => ({ ...d, country: e.target.value }))} placeholder="e.g. United States" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Age</label>
              <input type="number" value={details.age || ''} onChange={e => setDetails(d => ({ ...d, age: e.target.value }))} placeholder="e.g. 27" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Phone Number</label>
              <input value={details.phone || ''} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} placeholder="Optional" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>LinkedIn URL</label>
              <input value={details.linkedin || ''} onChange={e => setDetails(d => ({ ...d, linkedin: e.target.value }))} placeholder="Optional" style={inputStyle} />
            </div>
          </div>
          <div style={{ height: 1, background: '#f1eadd', margin: '20px 0 14px' }} />
          <p style={{ fontSize: 12, color: '#9098b5', margin: 0, lineHeight: 1.5 }}>
            These details are used by your AI strategist only to personalise your admissions risk evaluation.
          </p>
        </div>

        {/* Security */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: '0 0 6px', letterSpacing: '-.3px' }}>Security</h3>
          <p style={{ fontSize: 13, color: '#9098b5', margin: '0 0 18px' }}>Change your password using the normal encrypted authentication system.</p>
          <div className="pw-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Current Password</label>
              <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Current password" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>New Password</label>
              <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="New password" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33405e', marginBottom: 7 }}>Confirm New Password</label>
              <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm new password" style={inputStyle} />
            </div>
          </div>
          <button onClick={handleChangePassword} disabled={savingPassword} style={{ marginTop: 16, background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '12px 22px', fontSize: 13.5, fontWeight: 700, cursor: savingPassword ? 'wait' : 'pointer', opacity: savingPassword ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
            {savingPassword ? 'Saving...' : 'Change Password'}
          </button>
        </div>

        {/* Notifications */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 24, boxShadow: '0 18px 40px rgba(60,72,130,.06)', ...lockedCardStyle }}>
          {requiresOAuthDetails && <LockOverlay />}
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: '0 0 6px', letterSpacing: '-.3px' }}>Notifications</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1eadd' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34' }}>Strategist updates</div>
              <div style={{ fontSize: 12.5, color: '#9098b5', marginTop: 2 }}>Get notified when your advisor reviews a document.</div>
            </div>
            <Toggle on={notifStrategist} onToggle={() => setNotifStrategist(v => !v)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34' }}>Weekly score digest</div>
              <div style={{ fontSize: 12.5, color: '#9098b5', marginTop: 2 }}>A summary of your competitiveness metrics.</div>
            </div>
            <Toggle on={notifDigest} onToggle={() => setNotifDigest(v => !v)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {requiresOAuthDetails ? (
            <>
              <button onClick={handleUnlock} disabled={savingDetails} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: savingDetails ? 'wait' : 'pointer', opacity: savingDetails ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                {savingDetails ? 'Saving…' : 'Save & Unlock Pathway →'}
              </button>
              <span style={{ fontSize: 12.5, color: '#9098b5' }}>Fill in required fields above to continue</span>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={savingDetails} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: savingDetails ? 'wait' : 'pointer', opacity: savingDetails ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                {savingDetails ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={resetSession} style={{ background: 'none', color: '#e0457a', border: '1.5px solid #ffd3e3', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear Session Data
              </button>
              <button onClick={signOut} style={{ background: 'none', color: '#6b7392', border: '1.5px solid #f1eadd', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
