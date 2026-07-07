import { getStore } from '../../store.js';
import { getUserData } from '../../db.js';

export async function searchPrograms({ keywords = [], country, degree, gmat, gpa, limit = 10 } = {}) {
  const store = getStore();
  const allKeys = await store.keys('program:*');
  const programs = await Promise.all(allKeys.map(k => store.get(k)));
  let results = programs.filter(Boolean);

  if (country) results = results.filter(p => p.country?.toLowerCase() === country.toLowerCase());
  if (degree) results = results.filter(p => p.degree?.toLowerCase().includes(degree.toLowerCase()));
  if (gmat) results = results.filter(p => !p.avgGmat || p.avgGmat <= Number(gmat) + 50);
  if (gpa) results = results.filter(p => !p.avgGpa || p.avgGpa <= Number(gpa) + 0.5);
  if (keywords.length) {
    results = results.filter(p =>
      keywords.some(kw =>
        p.name?.toLowerCase().includes(kw.toLowerCase()) ||
        p.school?.toLowerCase().includes(kw.toLowerCase())
      )
    );
  }

  return results.slice(0, limit).map(p => ({
    id: p.id,
    name: p.name,
    school: p.school,
    degree: p.degree,
    country: p.country,
    avgGmat: p.avgGmat,
    avgGpa: p.avgGpa,
    ranking: p.ranking,
  }));
}

export async function getCandidateProfile(candidateId) {
  const store = getStore();
  // The candidate's actual journey data (category, grade, intendedMajor,
  // pathwayType, candidateFacts, scores, chosenSchools, etc.) lives in
  // userdata:<id> — written by the advisor conversation via
  // persistStatePatch/setUserData — not on the raw account record at
  // user:<id>, which only ever has account fields (name/email/residency/
  // age/plan). Reading user:<id> alone left every consumer of this function
  // (ChatAgent, SimulationAgent, InterviewAgent, SettingsAgent,
  // CommunityAgent, NaggerAgent, MatchingAgent) with an effectively empty
  // profile regardless of how much the candidate had actually shared.
  const [user, data] = await Promise.all([
    store.get(`user:${candidateId}`),
    getUserData(candidateId).catch(() => null),
  ]);
  if (!user && !data) return null;

  const profile = data?.profile || {};
  const chosenSchools = Array.isArray(data?.chosenSchools) ? data.chosenSchools : [];
  return {
    id: user?.id || candidateId,
    name: user?.name,
    email: user?.email,
    residency: user?.residency,
    age: user?.age,
    plan: user?.plan,
    // Full real profile first, so category/degree/grade/intendedMajor/
    // destination/pathwayType/candidateFacts/whyMBA/etc. are all present.
    ...profile,
    // Backward-compatible aliases the existing callers above already read.
    gmat: profile.gmat ?? null,
    gpa: profile.gpa ?? null,
    workExperience: profile.workYears ?? profile.workExperience ?? null,
    targetPrograms: chosenSchools.length ? chosenSchools : (profile.targetSchools || []),
    journeyType: profile.category || profile.degree || null,
    scores: data?.scores || null,
  };
}

export async function searchCommunityMembers({ journeyType, targetSchool, limit = 20 } = {}) {
  const store = getStore();
  const allKeys = await store.keys('user:*');
  const users = await Promise.all(
    allKeys
      .filter(k => !k.includes(':') || k.split(':').length === 2)
      .map(k => store.get(k))
  );
  let members = users.filter(u => u && u.role === 'candidate' && u.communityOptIn);

  if (journeyType) members = members.filter(u => u.journeyType === journeyType);
  if (targetSchool) {
    members = members.filter(u =>
      u.targetPrograms?.some(p => p.toLowerCase().includes(targetSchool.toLowerCase()))
    );
  }

  return members.slice(0, limit).map(u => ({
    id: u.id,
    name: u.name,
    journeyType: u.journeyType,
    targetPrograms: u.targetPrograms,
    residency: u.residency,
  }));
}
