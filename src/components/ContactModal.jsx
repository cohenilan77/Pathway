import React, { useState } from 'react';

export default function ContactModal({ onClose, profile }) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: '',
    program: profile?.program || '',
    message: '',
  });

  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openMailto = (f) => {
    const subject = encodeURIComponent('Pathway Elite Strategy — Upgrade Inquiry');
    const body = encodeURIComponent(
      `Name: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone || '—'}\nProgram: ${f.program || '—'}\n\nMessage:\n${f.message || '—'}`
    );
    window.location.href = `mailto:cohenilan@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('sent');
      } else {
        // API not configured — open native email client as fallback
        openMailto(form);
        setStatus('sent');
      }
    } catch {
      openMailto(form);
      setStatus('sent');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,26,48,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#faf7f2',
          borderRadius: 20,
          maxWidth: 540,
          width: '100%',
          boxShadow: '0 24px 80px rgba(15,26,48,0.32), 0 4px 16px rgba(15,26,48,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#122621',
            padding: '32px 40px 28px',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 18, right: 20,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9a8a72', fontSize: 22, lineHeight: 1,
              padding: '4px 8px', borderRadius: 6,
              transition: 'color .15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#c0844a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9a8a72')}
          >
            ×
          </button>
          <div
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg,#c0844a,#c0844a)',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 11, fontWeight: 700, letterSpacing: '1.2px',
              color: '#8a6a3e', marginBottom: 12,
              fontFamily: "'Public Sans',sans-serif",
              textTransform: 'uppercase',
            }}
          >
            Private Office
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 26, fontWeight: 800,
              color: '#faf7f2', margin: 0, lineHeight: 1.2,
            }}
          >
            Upgrade to Elite Strategy
          </h2>
          <p
            style={{
              fontFamily: "'Public Sans',sans-serif",
              fontSize: 14, color: '#9a8a72',
              margin: '8px 0 0', lineHeight: 1.5,
            }}
          >
            Our advisors will reach out within one business day to discuss your pathway.
          </p>
        </div>

        {/* Success state */}
        {status === 'sent' && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#cdd8d1', border: '2px solid #bcccc4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#122621', margin: '0 0 10px' }}>Inquiry Sent</h3>
            <p style={{ fontSize: 14, color: '#6b7872', margin: '0 0 24px', lineHeight: 1.6 }}>We'll be in touch within one business day.</p>
            <button onClick={onClose} style={{ background: '#122621', color: '#faf7f2', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{ margin: '0 40px', padding: '12px 16px', background: '#f3e3df', border: '1px solid #f3e3df', borderRadius: 10, fontSize: 13, color: '#a8453f', fontWeight: 600 }}>
            Couldn't send — please email <a href="mailto:cohenilan@gmail.com" style={{ color: '#a8453f' }}>cohenilan@gmail.com</a> directly.
          </div>
        )}

        {/* Form */}
        {status !== 'sent' && <form onSubmit={handleSubmit} style={{ padding: '32px 40px 0' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Jane Smith"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="jane@example.com"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                Phone{' '}
                <span style={{ color: '#9a8a72', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Program Type</label>
              <input
                name="program"
                value={form.program}
                onChange={handleChange}
                placeholder="MBA, JD, MD…"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about your goals and how we can help…"
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 96,
                lineHeight: 1.5,
              }}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#c0844a,#c0844a)',
              color: '#8a6a3e',
              border: 'none', borderRadius: 10,
              padding: '14px 0',
              fontSize: 15, fontWeight: 800,
              fontFamily: "'Public Sans',sans-serif",
              cursor: 'pointer',
              letterSpacing: '.3px',
              boxShadow: '0 4px 14px rgba(184,144,47,0.28)',
              transition: 'opacity .15s, transform .1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.92';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send Inquiry'}
          </button>
        </form>}

        {/* Or call us */}
        <div style={{ padding: '24px 40px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,#c0844a)' }} />
            <span
              style={{
                fontFamily: "'Public Sans',sans-serif",
                fontSize: 12, fontWeight: 700,
                color: '#c0844a', letterSpacing: '.8px',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}
            >
              Or call us
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,#c0844a,transparent)' }} />
          </div>
          <div style={{ textAlign: 'center', marginBottom: 0 }}>
            <a
              href="tel:+1XXXXXXXXXX"
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 20, fontWeight: 700,
                color: '#122621',
                textDecoration: 'none',
                letterSpacing: '.5px',
              }}
            >
              +1 (XXX) XXX-XXXX
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 40px 24px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'Public Sans',sans-serif",
              fontSize: 11, color: '#9a8a72',
              letterSpacing: '.4px',
            }}
          >
            Pathway Private Office · Confidential
          </span>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontFamily: "'Public Sans',sans-serif",
  fontSize: 12, fontWeight: 700,
  color: '#122621', marginBottom: 6,
  letterSpacing: '.3px',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: "'Public Sans',sans-serif",
  fontSize: 14, color: '#122621',
  background: '#f6f1e8',
  border: '1.5px solid #e7dcc7',
  borderRadius: 9,
  padding: '10px 13px',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
};

function inputFocus(e) {
  e.currentTarget.style.borderColor = '#c0844a';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,144,47,0.12)';
  e.currentTarget.style.background = '#faf7f2';
}

function inputBlur(e) {
  e.currentTarget.style.borderColor = '#e7dcc7';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = '#f6f1e8';
}
