import { getStore } from '../../store.js';

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
  const user = await store.get(`user:${candidateId}`);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    residency: user.residency,
    age: user.age,
    gmat: user.gmat,
    gpa: user.gpa,
    workExperience: user.workExperience,
    targetPrograms: user.targetPrograms,
    journeyType: user.journeyType,
    plan: user.plan,
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
