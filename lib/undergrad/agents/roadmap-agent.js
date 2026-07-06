// RoadmapAgent — builds/updates the long-term undergrad roadmap from the profile
// graph, grade, target country/major, weak areas, and time until applications.
// Produces roadmap items grouped by the six sections. Deterministic + idempotent
// (content-addressed ids), so re-running does not duplicate items.

import { makeRoadmapItem } from '../schemas.js';
import { upsertRoadmapItem } from '../store.js';
import { weakProfileAreas } from './undergrad-profile-agent.js';
import { DAY_MS } from '../constants.js';
import { undergradProfileStage } from '../../undergrad-profile.js';

const SECTION_DEADLINE_DAYS = {
  'This week': 7,
  'This month': 30,
  'This semester': 120,
  'Summer': 210,
  'Application season': 300,
  'Submission season': 360,
};

const AREA_TO_TASK_AREA = {
  academics: 'Academic depth', testing: 'Testing', activities: 'Activities',
  leadership: 'Leadership', awards: 'Awards', research: 'Research', volunteering: 'Volunteering',
};

function gradeNumber(grade) {
  const m = String(grade || '').match(/\d{1,2}/);
  return m ? Number(m[0]) : null;
}

// Returns an array of roadmap item drafts (not stored).
export function buildRoadmap({ candidateId = null, profile = {}, grade = null, targetCountry = '', targetMajor = '', now = Date.now() } = {}) {
  const items = [];
  const push = (section, title, area, extra = {}) => {
    items.push(makeRoadmapItem({
      candidateId,
      title,
      area,
      section,
      deadline: now + (SECTION_DEADLINE_DAYS[section] || 30) * DAY_MS,
      ...extra,
    }, now));
  };

  const g = gradeNumber(grade);
  const profileStage = undergradProfileStage({ ...profile, grade });
  const weak = weakProfileAreas(profile);

  // This week: always give one concrete near-term step keyed off the weakest area.
  const firstWeak = weak[0];
  if (firstWeak) {
    push('This week', `Take one concrete step on ${firstWeak}`, AREA_TO_TASK_AREA[firstWeak] || 'Academic depth', { priority: 'high', expectedImpact: `starts closing the ${firstWeak} gap` });
  } else {
    push('This week', 'Log this week’s academic and activity progress', 'Academic depth', { priority: 'medium' });
  }

  // This month: convert each weak area into a build task.
  for (const area of weak.slice(0, 3)) {
    push('This month', `Build ${area}: pick one activity or project to commit to`, AREA_TO_TASK_AREA[area] || 'Activities', { priority: 'high', expectedImpact: `develops ${area} evidence` });
  }
  if (targetMajor) {
    push('This month', `Deepen ${targetMajor} focus with a related course or project`, 'Major fit', { priority: 'medium', expectedImpact: 'improves major fit' });
  }

  // This semester: testing + a leadership/research anchor.
  if (!(profile.testing || []).length) {
    const testingTitle = ['discovery', 'exploratory'].includes(profileStage)
      ? 'Learn the testing timeline and revisit SAT/ACT planning later'
      : 'Set and register for an SAT/ACT test plan';
    push('This semester', testingTitle, 'Testing', { priority: profileStage === 'application' ? 'high' : 'medium', expectedImpact: 'builds age-appropriate testing readiness' });
  }
  push('This semester', 'Grow one activity into a leadership role', 'Leadership', { priority: 'medium', expectedImpact: 'strengthens leadership profile' });

  // Summer: signature project / research / program.
  push('Summer', `Run a signature summer project${targetMajor ? ` in ${targetMajor}` : ''} (research, internship, or program)`, 'Research', { priority: 'high', expectedImpact: 'adds a distinctive profile anchor' });

  // Application season (grade 11+ or unknown): university list + essays.
  if (g == null || g >= 11) {
    push('Application season', `Finalize a balanced ${targetCountry || 'target'} university list`, 'Applications', { priority: 'high', expectedImpact: 'defines application targets' });
    push('Application season', 'Draft the personal statement / main essay', 'Essays', { priority: 'high', expectedImpact: 'improves essay readiness' });
  }

  // Submission season (grade 12 or unknown): submit + recommendations.
  if (g == null || g >= 12) {
    push('Submission season', 'Submit applications and confirm recommendations', 'Applications', { priority: 'urgent', expectedImpact: 'completes application submission' });
  }

  return items;
}

// Build + store the roadmap, returning the new state. Idempotent.
export function syncRoadmap(state, opts = {}) {
  let next = state;
  const now = opts.now || Date.now();
  for (const item of buildRoadmap(opts)) next = upsertRoadmapItem(next, item, now);
  const log = [...(next.log || []), { id: `log_roadmap_${now}`, event: 'roadmap_updated', at: now, payload: { count: (next.roadmap || []).length } }];
  return { ...next, log };
}
