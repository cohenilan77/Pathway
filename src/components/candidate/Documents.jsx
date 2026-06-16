import React from 'react';

const docNavStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? '#fbf1d6' : 'transparent', color: active ? '#16233f' : '#3a425a',
});

export default function Documents({ docTab, setDocTab, noop }) {
  const subNavItems = [
    {
      key: 'documents', label: 'Documents',
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 20V6a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /></svg>
    },
    {
      key: 'editor', label: 'Essay Editor',
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
    },
    {
      key: 'insights', label: 'AI Insights',
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /></svg>
    },
    {
      key: 'history', label: 'Version History',
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3v6h6M3 9a9 9 0 1 0 2.6-5.6L3 9M12 8v4l3 2" /></svg>
    },
    {
      key: 'archive', label: 'Archive',
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg>
    },
  ];

  const recentAssets = [
    {
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>,
      name: 'CV_Draft_Final.docx', type: 'Word Document • 2.4 MB', time: 'Edited 2h ago',
      badge: 'AI REVIEWED', badgeStyle: { background: '#dfe6f7', color: '#3a4b6e' },
      cardStyle: { background: '#fff', border: '1px solid #eaedf4' },
      iconBg: '#eef1f7',
    },
    {
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>,
      name: 'Stanford_Essay_V3.pdf', type: 'Portable Document • 1.1 MB', time: null,
      badge: 'CURRENTLY EDITING', badgeStyle: { background: '#f5c94c', color: '#5a4410' },
      cardStyle: { background: '#fffaf0', border: '1px solid #ecd9a8', borderLeft: '4px solid #c2962f' },
      iconBg: '#fbf1d6',
      activeTime: true,
    },
    {
      icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="m12 2 2.4 5 5.6.5-4.2 3.7 1.3 5.3L12 18.8 6.9 21.5l1.3-5.3L4 12.5l5.6-.5Z" /></svg>,
      name: 'Official_Transcripts.pdf', type: 'Portable Document • 5.8 MB', time: 'Edited Oct 12',
      badge: 'VERIFIED', badgeStyle: { background: '#dfeee4', color: '#2c6c49' },
      cardStyle: { background: '#fff', border: '1px solid #eaedf4' },
      iconBg: '#eef1f7',
    },
  ];

  return (
    <div style={{ flex: 1, minHeight: '100vh', display: 'grid', gridTemplateColumns: '320px 1fr 320px', background: '#fff' }}>
      {/* Left nav */}
      <div style={{ borderRight: '1px solid #eef1f6', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 22px 16px', borderBottom: '1px solid #eef1f6' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {subNavItems.map(item => (
              <button key={item.key} onClick={() => setDocTab(item.key)} style={docNavStyle(docTab === item.key)}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: 0 }}>Recent Assets</h3>
            <button onClick={noop} style={{ background: 'none', border: 'none', color: '#b8902f', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recentAssets.map(asset => (
              <div key={asset.name} style={{ ...asset.cardStyle, borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 8, background: asset.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16233f' }}>
                    {asset.icon}
                  </span>
                  <span style={{ ...asset.badgeStyle, fontSize: 10, fontWeight: 700, padding: '5px 9px', borderRadius: 6, height: 'fit-content' }}>
                    {asset.badge}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#16233f' }}>{asset.name}</div>
                <div style={{ fontSize: 12, color: '#8a93a3', margin: '4px 0 10px' }}>{asset.type}</div>
                {asset.activeTime ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#b8902f', fontWeight: 700 }}>
                    Active now
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9aa3b5' }}>{asset.time}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div style={{ background: '#f6f7fb', padding: 40, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', maxWidth: 560, width: '100%', borderRadius: 8, boxShadow: '0 10px 40px rgba(15,26,48,.08)', padding: '56px 60px', minHeight: 640 }}>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#b6bdcd', marginBottom: 34 }}>Pathway Strategist Review Mode</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, lineHeight: 1.2, fontWeight: 700, color: '#16233f', margin: '0 0 30px' }}>
            Personal Statement: Stanford University
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.9, color: '#33405a', margin: '0 0 18px' }}>
            <span style={{ float: 'left', fontFamily: "'Playfair Display',serif", fontSize: 56, lineHeight: .8, fontWeight: 700, color: '#16233f', margin: '6px 10px 0 0' }}>T</span>
            he intersection of computational linguistics and social justice has always felt like a necessary collision rather than a forced marriage. Growing up in a community where language barriers often dictated the quality of legal representation, I witnessed firsthand how access is mediated by who gets to be understood.
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.9, color: '#33405a', margin: '0 0 18px' }}>
            My undergraduate research focused on bias mitigation in NLP systems deployed across immigration courts. What began as a technical curiosity matured into a conviction: that the tools we build are never neutral, and that designing them responsibly is itself a form of advocacy.
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.9, color: '#33405a', margin: 0 }}>
            At Stanford, I intend to bridge the Human-Centered AI Institute with the Law School's clinical programs — translating rigorous research into instruments that materially expand who the system can hear.
          </p>
        </div>
      </div>

      {/* Insights */}
      <div style={{ borderLeft: '1px solid #eef1f6', background: '#fbfcfe', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#eef1fc', padding: 22, borderBottom: '1px solid #e1e6f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#b8902f' }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.5px', color: '#16233f' }}>STRATEGIST INSIGHTS</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7a8295' }}>
            <span>Tone: Professional &amp; Academic</span>
            <span style={{ color: '#1f8a5b', fontWeight: 700 }}>92% MATCH</span>
          </div>
        </div>
        <div style={{ padding: 22, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#16233f', marginBottom: 8 }}>
            WORD COUNT <span style={{ color: '#7a8295' }}>850 / 1000</span>
          </div>
          <div style={{ height: 6, background: '#e7eaf3', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ width: '85%', height: '100%', background: '#16233f' }} />
          </div>
          <div style={{ background: '#fffaf0', border: '1px solid #ecd9a8', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16233f', marginBottom: 6 }}>STRENGTHEN VERBS</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: '#5d6577', marginBottom: 10 }}>
              Paragraph 2: Consider replacing "focused on" with "spearheaded" or "pioneered" to emphasize leadership.
            </div>
            <button onClick={noop} style={{ background: 'none', border: 'none', color: '#b8902f', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              APPLY AUTOMATICALLY →
            </button>
          </div>
          <div style={{ background: '#eef3fb', border: '1px solid #d7e1f2', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16233f', marginBottom: 6 }}>CLARITY CHECK</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: '#5d6577' }}>
              The sentence regarding 'Human-Centered AI' is quite complex. Try breaking it into two for better readability.
            </div>
          </div>
        </div>
        <div style={{ padding: '0 22px 22px' }}>
          <button onClick={noop} style={{ width: '100%', background: '#16233f', color: '#fff', border: 'none', borderRadius: 12, padding: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            ✦ Rewrite with AI
          </button>
        </div>
      </div>
    </div>
  );
}
