const DAY = 86400000;

function timestamp(value) {
  const parsed = typeof value === 'number' ? value : Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function undergradFocus(grade) {
  if (grade >= 12) return 'Complete the next application, essay, recommendation, deadline, or interview task.';
  if (grade === 11) return 'Advance testing, university-list research, leadership evidence, or early essay planning.';
  if (grade === 10) return 'Deepen one activity through a competition, project, stronger grades, or measurable impact.';
  return 'Explore interests, build consistent habits, and take one early leadership or activity step.';
}

export function buildNaggerPlan({ profile = {}, state = {}, events = [], now = Date.now() } = {}) {
  const category = profile.category || state.profile?.category || 'Graduate';
  const degree = profile.degree || state.profile?.degree || '';
  const grade = Number(String(profile.grade || state.profile?.grade || '').match(/\d{1,2}/)?.[0] || 0) || null;
  const undergrad = category === 'Undergraduate';
  const chosenSchools = state.chosenSchools || [];
  const stage = state.journeyStage || state.stage?.name || state.stepIdx || 'profile';
  const completed = state.completedTasks || {};
  const activeTasks = unique((state.tasks || []).filter(task => !completed[typeof task === 'string' ? task : task?.text]));
  const deadlines = (events || []).map(event => ({
    id: event.id,
    title: event.title || event.name || 'Deadline',
    at: timestamp(event.date || event.at),
  })).filter(event => event.at && event.at >= now).sort((a, b) => a.at - b.at).slice(0, 10);

  const staleItems = [];
  if (!undergrad && chosenSchools.length) {
    if (!state.cvText && !(state.documents || []).some(doc => /cv|resume/i.test(`${doc.type} ${doc.name}`))) staleItems.push('CV not completed');
    if (!state.profile?.recommenders && !profile.recommenders) staleItems.push('Recommenders not confirmed');
    if (!(state.essays && Object.keys(state.essays).length)) staleItems.push('School essays not started');
  }
  if (undergrad && grade >= 11 && !profile.sat && !profile.act && !state.profile?.sat && !state.profile?.act) staleItems.push('Testing plan not confirmed');

  const cadence = undergrad
    ? grade >= 12 ? 'weekly' : grade === 11 ? 'biweekly' : 'monthly'
    : 'weekly';
  const cadenceMs = cadence === 'weekly' ? 7 * DAY : cadence === 'biweekly' ? 14 * DAY : 30 * DAY;
  const lastNudgeAt = Number(state.naggerPlan?.lastNudgeAt || state.lastNudgeAt || 0) || null;
  const nearest = deadlines[0];
  const daysUntil = nearest ? Math.ceil((nearest.at - now) / DAY) : null;
  const escalationLevel = daysUntil !== null && daysUntil <= 3 ? 'critical'
    : daysUntil !== null && daysUntil <= 14 ? 'high'
      : staleItems.length ? 'medium' : 'low';

  const trackActive = undergrad || chosenSchools.length > 0;
  const nextBestNudge = nearest
    ? `Prepare for ${nearest.title}${daysUntil !== null ? ` due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}` : ''}.`
    : activeTasks[0]
      ? String(typeof activeTasks[0] === 'string' ? activeTasks[0] : activeTasks[0]?.text || '')
      : staleItems[0]
        ? staleItems[0]
        : undergrad ? undergradFocus(grade || 9) : null;
  const nudgeKey = nextBestNudge ? `${stage}:${nextBestNudge}`.toLowerCase() : null;
  const duplicate = !!nudgeKey && state.naggerPlan?.lastNudgeKey === nudgeKey;
  const cooledDown = !lastNudgeAt || now - lastNudgeAt >= cadenceMs;
  const channels = unique([
    'in_app',
    profile.email || state.email ? 'email' : null,
    'admin_alert',
    profile.whatsappOptIn === true || state.whatsappOptIn === true ? 'whatsapp' : null,
  ]);

  return {
    track: undergrad ? 'Undergraduate' : category,
    grade,
    degree,
    stage,
    cadence,
    activeTasks,
    deadlines,
    staleItems,
    nextBestNudge,
    channels,
    escalationLevel,
    lastNudgeAt,
    active: trackActive,
    shouldNudge: !!(trackActive && nextBestNudge && cooledDown && !duplicate),
    nudgeKey,
  };
}
