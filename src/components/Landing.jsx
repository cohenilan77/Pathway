import React from 'react';

export default function Landing({ go, noop }) {
  return (
    <div style={{ background: '#f3f4f9' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 44px', background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e7e9f2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: '#16233f' }}>Pathway</div>
          <div style={{ display: 'flex', gap: 28 }}>
            <button onClick={() => go('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#16233f', borderBottom: '2px solid #d8a83a', paddingBottom: 3 }}>Match</button>
            <button onClick={() => go('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#6b7280' }}>Documents</button>
            <button onClick={() => go('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#6b7280' }}>Profile</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => go('login')} style={{ border: '1px solid #d3d8e6', background: '#fff', borderRadius: 9, padding: '9px 18px', fontSize: 14, fontWeight: 600, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit' }}>Concierge</button>
          <button onClick={() => go('login')} style={{ width: 38, height: 38, borderRadius: '50%', background: '#16233f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>AT</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #c8d4e8 0%, #8fa8c8 100%)', minHeight: 640 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,rgba(238,241,252,.96) 30%,rgba(238,241,252,.5) 56%,rgba(238,241,252,.08) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '96px 44px 120px' }}>
          <div style={{ maxWidth: 560 }}>
            <span style={{ display: 'inline-block', background: '#f5c94c', color: '#5a4410', fontSize: 12, fontWeight: 700, letterSpacing: '.4px', padding: '7px 14px', borderRadius: 7 }}>
              High-Touch Admissions Advisor
            </span>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 64, lineHeight: 1.05, fontWeight: 800, color: '#16233f', margin: '26px 0 22px' }}>
              Elite Graduate Admissions, Engineered.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#414b5e', margin: '0 0 36px', maxWidth: '46ch' }}>
              Pathway combines world-class admissions strategy with advanced AI to architect your perfect application narrative.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <button onClick={() => go('login')} style={{ background: '#0f1a30', color: '#fff', border: 'none', borderRadius: 10, padding: '16px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Begin Your Consultation
              </button>
              <button onClick={() => go('login')} style={{ background: 'rgba(255,255,255,.7)', color: '#16233f', border: '1px solid #c8cee0', borderRadius: 10, padding: '16px 30px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                View Methodology
              </button>
            </div>
          </div>

          {/* Floating AI card */}
          <div style={{ position: 'absolute', right: 44, top: 120, width: 330, background: 'rgba(255,255,255,.86)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.7)', borderRadius: 16, padding: 18, boxShadow: '0 24px 60px rgba(15,26,48,.22)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e26d5c' }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f0c050' }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#67c08a' }} />
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa3b5', fontWeight: 600 }}>Pathway AI Advisor v4.2</span>
            </div>
            <div style={{ background: '#f1f3fa', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginBottom: 5 }}>STRATEGIC ANALYSIS</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#2a3550' }}>"Your profile suggests a 94% narrative alignment with Harvard's John A. Paulson School."</div>
            </div>
            <div style={{ background: '#16233f', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9bb0d8', marginBottom: 5 }}>OPTIMIZATION TIP</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e5ebf6' }}>"Enhance the 'Social Impact' vector of your personal essay. Analyzing 500 successful admits..."</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ width: 34, height: 6, borderRadius: 3, background: '#16233f' }} />
              <span style={{ width: 14, height: 6, borderRadius: 3, background: '#d8dceb' }} />
              <span style={{ fontSize: 11, color: '#9aa3b5', marginLeft: 4 }}>+12 Mentors Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '84px 44px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 800, color: '#16233f', margin: '0 0 12px' }}>Architecting Excellence</h2>
          <p style={{ fontSize: 16, color: '#6b7280', margin: '0 auto', maxWidth: '52ch', lineHeight: 1.6 }}>
            Precision engineering applied to human potential. Our methodology combines historical data with elite human insight.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, marginBottom: 22 }}>
          {/* Feature card 1 */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 34, border: '1px solid #ebedf5' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eef1fc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16233f', marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 700, color: '#16233f', margin: '0 0 12px' }}>Strategic Profile Initiation</h3>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: '#6b7280', margin: '0 0 22px', maxWidth: '46ch' }}>
              A deep dive into your academic and professional trajectory. We do not just record your achievements; we weigh them against elite graduate program acceptance algorithms.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <span style={{ height: 54, background: '#eef1f7', borderRadius: 8 }} />
                <span style={{ height: 54, background: '#eef1f7', borderRadius: 8 }} />
                <span style={{ height: 54, background: '#eef1f7', borderRadius: 8 }} />
              </div>
              <div style={{ width: 120, height: 54, background: '#cdd4e8', borderRadius: 8 }} />
            </div>
          </div>
          {/* Feature card 2 */}
          <div style={{ background: '#16233f', borderRadius: 18, padding: 34, color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#f5c94c', marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="26" height="26" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 700, margin: '0 0 12px' }}>AI-Powered Matching</h3>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: '#c5cee0', margin: '0 0 24px' }}>
              Data-driven school selection based on competitive fit, historical yields, and cultural alignment.
            </p>
            <button onClick={() => go('login')} style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#f5c94c', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
              Explore Logic →
            </button>
          </div>
        </div>
        {/* Feature card 3 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 34, border: '1px solid #ebedf5', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34, alignItems: 'center' }}>
          <div>
            <div style={{ color: '#b8902f', marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 700, color: '#16233f', margin: '0 0 12px' }}>Narrative Excellence</h3>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: '#6b7280', margin: '0 0 20px', maxWidth: '44ch' }}>
              Real-time essay and CV optimization. Our AI identifies "narrative gaps" and suggests strategic revisions that resonate with admissions officers at top-tier institutions.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Tone Consistency Analysis', 'Leadership Vocabulary Optimization'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#2a3550' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: '#1f8a5b', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: 240, background: 'linear-gradient(135deg, #c8d4e8 0%, #8fa8c8 100%)', borderRadius: 14 }} />
        </div>
      </div>

      {/* Quote */}
      <div style={{ background: '#f7f3e9', padding: '80px 44px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 60, lineHeight: .4, color: '#c2962f', marginBottom: 8 }}>&rdquo;</div>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, lineHeight: 1.4, fontWeight: 700, color: '#16233f', maxWidth: '20ch', margin: '0 auto 26px' }}>
          Admissions is no longer a lottery; it is a communication of rare potential to those who speak the language of prestige.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#16233f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>AS</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>Arthur J. Sterling</div>
            <div style={{ fontSize: 12, color: '#8a93a3' }}>Chief Strategist, Former Dean of Admissions</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#0f1a30', padding: '72px 44px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', background: '#16233f', border: '1px solid #243559', borderRadius: 20, padding: '64px 44px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 14px' }}>Ready to Engineer Your Future?</h2>
          <p style={{ fontSize: 16, color: '#aab6cf', margin: '0 auto 32px', maxWidth: '50ch', lineHeight: 1.6 }}>
            Our cohorts fill quickly. Secure your initial diagnostic session to begin your journey to the world's most elite universities.
          </p>
          <button onClick={() => go('login')} style={{ background: '#f5c94c', color: '#3f2f08', border: 'none', borderRadius: 10, padding: '16px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Begin Your Consultation
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0f1a30', padding: '24px 44px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 32, paddingBottom: 32, borderBottom: '1px solid #243559' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Pathway</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8294b5', margin: 0, maxWidth: '34ch' }}>
              Architecting narratives for the next generation of global leaders. High-touch, data-driven, results-oriented.
            </p>
          </div>
          {[
            { title: 'EXPLORATION', items: ['Methodology', 'Success Stories', 'The AI Engine'] },
            { title: 'COMPANY', items: ['Advisors', 'Contact', 'Careers'] },
            { title: 'LEGAL', items: ['Privacy Policy', 'Terms of Service'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#6b7c9c', marginBottom: 14 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.items.map(item => (
                  <button key={item} onClick={noop} style={{ background: 'none', border: 'none', color: '#aab6cf', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0 }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1100, margin: '20px auto 0', fontSize: 12, color: '#6b7c9c' }}>
          © 2024 Pathway Admissions. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
