import React from 'react';
import Advisor from './Advisor.jsx';
import Analysis from './Analysis.jsx';
import Documents from './Documents.jsx';
import NarrativeStrategy from './NarrativeStrategy.jsx';
import Settings from './Settings.jsx';

const sideStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? '#16233f' : 'transparent', color: active ? '#fff' : '#3a425a',
});

export default function CandidatePortal(props) {
  const { candTab, setCandTab, signOut, send, showToast } = props;

  const handleHelp = () => {
    setCandTab('advisor');
    send('How do I use this platform? Give me a quick guide to the key features.');
  };

  const handleUpgrade = () => {
    showToast('Elite Strategy tier coming soon — contact your advisor to learn more.');
  };

  const navItems = [
    {
      key: 'advisor', label: 'Admissions Advisor',
      icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>
    },
    {
      key: 'documents', label: 'Documents',
      icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
    },
    {
      key: 'analysis', label: 'Analysis',
      icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>
    },
    {
      key: 'strategy', label: 'Narrative Strategy',
      icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 11l19-9-9 19-2-8-8-2Z" /></svg>
    },
    {
      key: 'settings', label: 'Settings',
      icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f7fb' }}>
      {/* Sidebar */}
      <div style={{ width: 264, flexShrink: 0, background: '#eef1fc', borderRight: '1px solid #e1e6f5', display: 'flex', flexDirection: 'column', padding: '26px 18px', minHeight: '100vh' }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 25, fontWeight: 800, color: '#16233f' }}>Pathway</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginTop: 2 }}>HIGH-TOUCH ADMISSIONS</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 26 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setCandTab(item.key)} style={sideStyle(candTab === item.key)}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: '#16233f', borderRadius: 14, padding: 18, marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: '#9bb0d8', fontWeight: 600, marginBottom: 10 }}>Tier: Private Office</div>
            <button onClick={handleUpgrade} style={{ width: '100%', background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Upgrade to Elite Strategy
            </button>
          </div>
          <div style={{ height: 1, background: '#dde3f4', marginBottom: 14 }} />
          <button onClick={handleHelp} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#3a425a', fontWeight: 600, padding: 8, width: '100%' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            Help
          </button>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#3a425a', fontWeight: 600, padding: 8, width: '100%' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      {candTab === 'advisor' && <Advisor {...props} />}
      {candTab === 'analysis' && <Analysis {...props} />}
      {candTab === 'documents' && <Documents {...props} />}
      {candTab === 'strategy' && <NarrativeStrategy {...props} />}
      {candTab === 'settings' && <Settings {...props} />}
    </div>
  );
}
