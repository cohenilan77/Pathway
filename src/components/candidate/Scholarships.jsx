import React, { useCallback, useEffect, useState } from 'react';

// Workspace "Scholarships" tab — item #13 of the scholarship rebuild. Both
// tracks save scholarships from chat (UndergradAgent / ScholarshipAgent tool
// calls); this page is a read/update view onto api/scholarships.js, which
// merges the Undergraduate session-blob field with the Graduate
// scholarships:${candidateId} store key so either track's saves show up here.
// 'suggested' is what the scholarship engine writes when it searches by the
// candidate's chosen schools — a machine-found match the candidate hasn't
// acted on yet, distinct from 'interested' (something they said they want).
const STATUS_OPTIONS = ['suggested', 'interested', 'applying', 'applied', 'awarded', 'declined'];

const statusColor = (status) => ({
  suggested: { bg: '#f2effa', color: '#5b46e0' },
  interested: { bg: '#eef1f7', color: '#141b34' },
  applying: { bg: '#fff8ea', color: '#b27620' },
  applied: { bg: '#eaf1ff', color: '#3457d5' },
  awarded: { bg: '#eafdf6', color: '#119467' },
  declined: { bg: '#fdeceb', color: '#c0392b' },
}[status] || { bg: '#eef1f7', color: '#141b34' });

export default function Scholarships({ authToken, showToast, chosenSchools, programs, profile, scores }) {
  const [scholarships, setScholarships] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/scholarships', { headers: { authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load scholarships.');
      setScholarships(data.scholarships || []);
    } catch (err) {
      setError(err.message || 'Failed to load scholarships.');
    }
  }, [authToken]);

  useEffect(() => { load(); }, [load]);

  // Search the candidate's own list (chosen schools first, then recommended
  // programs) through the same advisor endpoint the chat uses, then reload so
  // the freshly-persisted "suggested" scholarships appear. The word
  // "scholarship" in the message is what routes this to the ScholarshipAgent.
  const searchSchoolNames = (Array.isArray(chosenSchools) && chosenSchools.length
    ? chosenSchools
    : (Array.isArray(programs) ? programs.map(p => p?.name) : [])).filter(Boolean);

  const searchForSchools = async () => {
    if (!authToken || searching) return;
    setSearching(true);
    setError('');
    try {
      const message = searchSchoolNames.length
        ? `Find scholarships for my chosen schools: ${searchSchoolNames.join(', ')}.`
        : 'Find scholarships that fit my profile.';
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'candidate_message',
          message,
          messages: [{ role: 'user', text: message }],
          payload: { searchScholarships: true, programs: programs || [] },
          candidateState: { profile: profile || {}, scores: scores || {}, programs: programs || [], chosenSchools: chosenSchools || [] },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Scholarship search failed.');
      }
      await load();
    } catch (err) {
      showToast?.(err.message || 'Scholarship search failed.');
      setError(err.message || 'Scholarship search failed.');
    } finally {
      setSearching(false);
    }
  };

  const updateStatus = async (nameOrId, status) => {
    setScholarships(prev => prev.map(s => (s.id === nameOrId || s.name === nameOrId) ? { ...s, status } : s));
    try {
      const res = await fetch('/api/scholarships', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nameOrId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update status.');
      setScholarships(data.scholarships || []);
    } catch (err) {
      showToast?.(err.message || 'Failed to update status.');
      load();
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, padding: '24px 28px 28px', background: '#f6f1e8', overflowY: 'auto' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#141b34', margin: '0 0 4px', letterSpacing: '-.4px' }}>Scholarships</h1>
        <div style={{ fontSize: 13, color: '#6b7392', marginBottom: 16 }}>
          Real, grounded scholarships you've asked about or saved in chat — never invented, always with a source link.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            onClick={searchForSchools}
            disabled={searching}
            style={{ border: 'none', borderRadius: 999, padding: '10px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', cursor: searching ? 'wait' : 'pointer', opacity: searching ? 0.65 : 1 }}
          >
            {searching ? 'Searching…' : (searchSchoolNames.length ? 'Find scholarships for my schools' : 'Find scholarships for my profile')}
          </button>
          {searchSchoolNames.length > 0 && (
            <span style={{ fontSize: 12.5, color: '#6b7392' }}>Searches {searchSchoolNames.length} school{searchSchoolNames.length === 1 ? '' : 's'} on your list.</span>
          )}
        </div>

        {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fdeceb', color: '#c0392b', fontSize: 13.5, marginBottom: 16 }}>{error}</div>}

        {scholarships === null && !error && (
          <div style={{ color: '#6b7392', fontSize: 13.5 }}>Loading…</div>
        )}

        {scholarships && scholarships.length === 0 && (
          <div style={{ padding: '28px 24px', borderRadius: 16, background: '#faf7f2', border: '1px solid #f1eadd', color: '#6b7392', fontSize: 13.5, textAlign: 'center' }}>
            No scholarships saved yet. Ask your advisor in chat — e.g. "find scholarships for MIT" or "any scholarships for first-gen engineering students?" — and results you save will show up here.
          </div>
        )}

        {scholarships && scholarships.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scholarships.map((s) => {
              const sc = statusColor(s.status);
              return (
                <div key={s.id || s.name} style={{ padding: '16px 18px', borderRadius: 14, background: '#faf7f2', border: '1px solid #f1eadd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 15, fontWeight: 800, color: '#141b34', textDecoration: 'none' }}>{s.name}</a>
                        <span style={{ borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.3px', background: sc.bg, color: sc.color }}>
                          {(s.status || 'interested') === 'suggested' ? 'Suggested' : (s.status || 'interested')[0].toUpperCase() + (s.status || 'interested').slice(1)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#6b7392', marginTop: 4 }}>
                        {s.amountUSD ? `$${Number(s.amountUSD).toLocaleString()}` : ''}
                        {s.amountUSD && s.deadline ? ' · ' : ''}
                        {s.deadline ? `Deadline: ${s.deadline}` : ''}
                      </div>
                      {s.eligibility && <div style={{ fontSize: 12.5, color: '#6b7392', marginTop: 4 }}>{s.eligibility}</div>}
                    </div>
                    <select
                      value={s.status || 'interested'}
                      onChange={e => updateStatus(s.id || s.name, e.target.value)}
                      style={{ border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: sc.bg, color: sc.color }}
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt[0].toUpperCase() + opt.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
