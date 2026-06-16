import React from 'react';

export default function Settings({ noop, profile, resetSession, signOut }) {
  return (
    <div style={{ flex: 1, minHeight: '100vh', background: '#f6f7fb', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 44px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 800, color: '#16233f', margin: '0 0 8px' }}>Settings</h1>
        <p style={{ fontSize: 15, color: '#7a8295', margin: '0 0 32px' }}>Manage your private office preferences.</p>

        {/* Profile */}
        <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 28, marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: '0 0 18px' }}>Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>Full Name</label>
              <input defaultValue={profile?.name || ''} placeholder="From your advisor conversation" onChange={noop} style={{ width: '100%', border: '1px solid #d7ddec', borderRadius: 9, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>Target Degree</label>
              <input defaultValue={profile?.degree || ''} placeholder="MBA, Masters, PhD..." onChange={noop} style={{ width: '100%', border: '1px solid #d7ddec', borderRadius: 9, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          </div>
          {profile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>GPA</label>
                <input defaultValue={profile.gpa || ''} onChange={noop} style={{ width: '100%', border: '1px solid #d7ddec', borderRadius: 9, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>GMAT / GRE</label>
                <input defaultValue={profile.gmat || ''} onChange={noop} style={{ width: '100%', border: '1px solid #d7ddec', borderRadius: 9, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: '0 0 6px' }}>Notifications</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f2f7' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#16233f' }}>Strategist updates</div>
              <div style={{ fontSize: 13, color: '#8a93a3' }}>Get notified when your advisor reviews a document.</div>
            </div>
            <span style={{ width: 42, height: 24, borderRadius: 12, background: '#16233f', position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={noop}>
              <span style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#16233f' }}>Weekly score digest</div>
              <div style={{ fontSize: 13, color: '#8a93a3' }}>A summary of your competitiveness metrics.</div>
            </div>
            <span style={{ width: 42, height: 24, borderRadius: 12, background: '#d7ddec', position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={noop}>
              <span style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={noop} style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save Changes
          </button>
          <button onClick={resetSession} style={{ background: 'none', color: '#d64545', border: '1.5px solid #d64545', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear Session Data
          </button>
          <button onClick={signOut} style={{ background: 'none', color: '#7a8295', border: '1.5px solid #d7ddec', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
