function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

export function mergeCandidateState({ body = {}, frontendState = {}, storedState = {} } = {}) {
  const stored = object(storedState);
  const request = object(body);
  const frontend = object(frontendState);
  const merged = { ...stored, ...request, ...frontend };

  merged.profile = {
    ...object(stored.profile),
    ...object(request.profile),
    ...object(frontend.profile),
  };
  merged.scores = {
    ...object(stored.scores),
    ...object(request.scores),
    ...object(frontend.scores),
  };
  merged.candidateFacts = {
    ...object(stored.candidateFacts),
    ...object(request.candidateFacts),
    ...object(frontend.candidateFacts),
  };
  merged.profileSources = {
    ...object(stored.profileSources),
    ...object(request.profileSources),
    ...object(frontend.profileSources),
  };

  merged.messages = firstDefined(request.messages, frontend.messages, stored.messages, []);
  merged.message = firstDefined(request.message, frontend.message, stored.message, '');
  merged.cvExtraction = firstDefined(request.cvExtraction, frontend.cvExtraction, stored.cvExtraction);
  merged.extraText = firstDefined(request.extraText, frontend.extraText, stored.extraText);
  merged.systemContext = firstDefined(request.systemContext, frontend.systemContext, stored.systemContext);
  merged.chosenSchools = firstDefined(frontend.chosenSchools, request.chosenSchools, stored.chosenSchools, []);
  return merged;
}

export function hasProfileSource(state = {}) {
  const sources = object(state.profileSources);
  const profile = object(state.profile);
  const candidateFacts = object(profile.candidateFacts);
  const coverage = object(candidateFacts.profileSources);
  const sourceText = [
    sources.fileText,
    sources.pastedText,
    sources.additionalText,
    state.cvExtraction,
    state.extraText,
  ].filter(value => typeof value === 'string').join('\n').trim();
  const messageText = Array.isArray(state.messages)
    ? state.messages.map(message => String(message?.text || message?.content || '')).join('\n')
    : '';

  return !!sourceText
    || /END PROFILE SOURCE BUNDLE|UPLOADED FILE TEXT|PASTED CV \/ FIRST TEXT BOX/i.test(messageText)
    || coverage.hasFileText === true
    || coverage.hasPastedText === true
    || coverage.hasAdditionalText === true;
}

export function shouldRequestProfileUpload(state = {}) {
  if (hasProfileSource(state)) return false;
  const profile = object(state.profile);
  const category = String(profile.category || '').trim().toLowerCase();
  const degree = String(profile.degree || profile.program || '').trim().toLowerCase();
  const isSelectedGraduateTrack = (category === 'graduate' && degree && degree !== 'graduate')
    || /mba|llm|msc|master|\bma\b|\bmd\b/.test(degree);
  if (!isSelectedGraduateTrack) return false;

  const knownBaseline = [
    profile.gpa,
    profile.academic,
    profile.education,
    profile.currentRole,
    profile.currentCompany,
    profile.workYears,
    profile.yearsExperience,
    profile.achievementsImpact,
    profile.careerGoal,
    profile.postMbaGoal,
  ].filter(value => value !== undefined && value !== null && String(value).trim() !== '');
  return knownBaseline.length < 3;
}
