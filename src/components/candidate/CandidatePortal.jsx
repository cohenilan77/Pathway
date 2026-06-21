import React, { useState } from 'react';
import Advisor from './Advisor.jsx';
import Analysis from './Analysis.jsx';
import Documents from './Documents.jsx';
import NarrativeStrategy from './NarrativeStrategy.jsx';
import Settings from './Settings.jsx';
import HelpModal from './HelpModal.jsx';
import { LANGUAGES } from '../../constants.js';

const PLAN_LABELS = { free: 'Free plan', pathwayAI: 'Pathway AI', aiStrategist: 'AI + Strategist' };

const NAV_ITEMS = [
  {
    key: 'advisor', label: 'Advisor',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>,
  },
  {
    key: 'analysis', label: 'Analysis',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></svg>,
  },
  {
    key: 'strategy', label: 'Narrative Strategy',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 11l19-9-9 19-2-8-8-2Z" /></svg>,
  },
  {
    key: 'documents', label: 'Documents',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>,
  },
  {
    key: 'settings', label: 'Settings',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>,
  },
];

function navStyle(active) {
  return active
    ? { position: 'relative', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', borderRadius: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#faf7f2', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 12px 24px rgba(105,91,255,.36), inset 0 1px 0 rgba(255,255,255,.32)' }
    : { position: 'relative', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', borderRadius: 15, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#5e688c', background: 'transparent' };
}
function navIconStyle(active) {
  return active
    ? { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,.18)', color: '#faf7f2' }
    : { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f1eadd', color: '#8a93b3' };
}
function navDotStyle(active) {
  return active
    ? { marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#faf7f2', boxShadow: '0 0 8px rgba(255,255,255,.8)' }
    : { marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'transparent' };
}

export default function CandidatePortal(props) {
  const { candTab, setCandTab, signOut, plan, language, setLanguage, profile, authUser, resetSession, requiresOAuthDetails, showToast } = props;
  const [showHelp, setShowHelp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHelp = () => { setShowHelp(true); setMenuOpen(false); };
  const handleUpgrade = () => { setCandTab('settings'); setMenuOpen(false); };
  const handleSignOut = () => { setMenuOpen(false); signOut(); };
  const handleNavClick = (key) => {
    if (requiresOAuthDetails && key !== 'settings') {
      setCandTab('settings');
      setMenuOpen(false);
      showToast('Please confirm your details before continuing.');
      return;
    }
    setCandTab(key);
    setMenuOpen(false);
  };

  const name = authUser?.name || profile?.name || 'Candidate';
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const first = name.split(' ')[0];
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const tabLabels = { advisor: 'Advisor', analysis: 'Analysis', strategy: 'Narrative Strategy', documents: 'Documents', settings: 'Settings' };

  return (
    <div className="pw-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1eadd', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: '#141b34', WebkitFontSmoothing: 'antialiased' }}>
      {/* Mobile top bar with hamburger */}
      <div className="pw-mobile-bar">
        <button className="pw-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ fill: 'none', stroke: '#141b34', strokeWidth: '2', strokeLinecap: 'round' }}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.4px', color: '#141b34' }}>Pathway</div>
      </div>

      {/* Backdrop for mobile drawer */}
      {menuOpen && <div className="pw-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <div className={`pw-sidebar${menuOpen ? ' pw-sidebar-open' : ''}`} style={{ width: 266, flexShrink: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '26px 18px', background: '#faf7f2', borderRight: '1px solid #edf0f9' }}>

        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 10px 4px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 15, flexShrink: 0, background: 'linear-gradient(140deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(105,91,255,.36), inset 0 1px 0 rgba(255,255,255,.45)' }}>
            <svg viewBox="0 0 24 24" width="23" height="23" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: '2.3', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 19 C5 13 9 11 12 11 C15 11 19 9 19 4.5" /><circle cx="5" cy="19" r="1.7" fill="#faf7f2" stroke="none" /><circle cx="19" cy="4.6" r="1.7" fill="#faf7f2" stroke="none" />
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', color: '#141b34', lineHeight: 1 }}>Pathway</div>
        </div>

        {/* language */}
        <div style={{ position: 'relative', marginTop: 24 }}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label="Chat language"
            style={{ width: '100%', appearance: 'none', border: '1.5px solid #f1eadd', borderRadius: 14, padding: '12px 15px', fontSize: 13.5, fontWeight: 600, color: '#3c4564', background: '#f6f1e8', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
          <svg viewBox="0 0 24 24" width="15" height="15" style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', fill: 'none', stroke: '#9aa3c0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', color: '#b2bad2', margin: '24px 12px 10px' }}>MENU</div>

        {/* nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NAV_ITEMS.map(item => {
            const active = candTab === item.key;
            const locked = requiresOAuthDetails && item.key !== 'settings';
            return (
              <button key={item.key} onClick={() => handleNavClick(item.key)} style={{ ...navStyle(active), opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                <span style={navIconStyle(active)}>{item.icon}</span>
                <span>{item.label}</span>
                <span style={navDotStyle(active)} />
              </button>
            );
          })}
        </div>

        {/* help */}
        <button onClick={handleHelp} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', marginTop: 10, borderRadius: 15, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#5e688c', background: 'transparent' }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f1eadd', color: '#8a93b3' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
          </span>
          <span>Help</span>
        </button>

        {/* plan card + user */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '17px 17px 18px', background: 'linear-gradient(145deg,#9ba5fb,#c199fb)', boxShadow: '0 16px 30px rgba(105,91,255,.34)' }}>
            <div style={{ position: 'absolute', top: -30, right: -26, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
            <div style={{ position: 'absolute', bottom: -34, left: -20, width: 74, height: 74, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: '#fce7b0', stroke: 'none' }}><path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 21 12 17.3 6.5 21 8 13.4 3 9l6.4-.7L12 2Z" /></svg>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.4px', color: '#f1eadd' }}>{PLAN_LABELS[plan] || 'Pathway AI'}</span>
              </div>
              {plan !== 'aiStrategist' ? (
                <>
                  <div style={{ fontSize: 12.5, color: '#f1eadd', lineHeight: 1.45, marginBottom: 13, fontWeight: 500 }}>Unlock a dedicated strategist &amp; unlimited reviews.</div>
                  <button onClick={handleUpgrade} style={{ width: '100%', background: '#faf7f2', color: '#5b46e0', border: 'none', borderRadius: 12, padding: 11, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 14px rgba(40,20,90,.18)' }}>Upgrade plan</button>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: '#f1eadd', lineHeight: 1.45, fontWeight: 500 }}>You have full access, including your dedicated strategist.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '8px 8px', borderRadius: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(140deg,#fbd2a2,#fcbfcf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#faf7f2', boxShadow: '0 6px 14px rgba(255,122,156,.35)' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2745', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 11.5, color: '#9098b5', fontWeight: 500 }}>Candidate</div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: '#f1eadd', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8a93b3', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '26px 36px', borderBottom: '1px solid #f1eadd', background: '#faf7f2', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', color: '#141b34' }}>Good {tod}, {first}</div>
            <div style={{ fontSize: 13.5, color: '#838bab', fontWeight: 500, marginTop: 3 }}>{tabLabels[candTab] === 'Advisor' ? "Let's keep your application moving forward." : tabLabels[candTab]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleHelp} title="Help" style={{ width: 42, height: 42, borderRadius: 13, border: '1.5px solid #f1eadd', background: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7392' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            </button>
            <button style={{ width: 42, height: 42, borderRadius: 13, border: '1.5px solid #f1eadd', background: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7392', position: 'relative' }}>
              <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
              <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#fcb1c1', border: '2px solid #faf7f2' }} />
            </button>
            <button onClick={resetSession} disabled={requiresOAuthDetails} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf7f2', border: '1.5px solid #f1eadd', borderRadius: 13, padding: '0 16px', height: 42, fontSize: 13, fontWeight: 700, color: '#5b46e0', cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
              New session
            </button>
          </div>
        </div>

        {candTab === 'advisor' && <Advisor {...props} />}
        {candTab === 'analysis' && <Analysis {...props} />}
        {candTab === 'documents' && <Documents {...props} />}
        {candTab === 'strategy' && <NarrativeStrategy {...props} />}
        {candTab === 'settings' && <Settings {...props} />}
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
