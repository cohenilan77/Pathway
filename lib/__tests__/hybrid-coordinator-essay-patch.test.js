// Regression coverage for the essay specialistPatch bug: specialistPatch's
// `if (!parsed) return {}` ran BEFORE the `agent === 'essay'` branch, so any
// prose output from draft()/improve() (the normal case — they don't return
// JSON) silently discarded the save with no error surfaced. Separately,
// even the review() JSON case was broken: it read `parsed.insights`, but
// review() returns the scored critique directly with no "insights" wrapper
// key, so insights never populated even when review() succeeded.
import test from 'node:test';
import assert from 'node:assert/strict';

import { specialistPatch, HybridCoordinator } from '../hybrid-coordinator.js';
import { MainAgent } from '../agents/MainAgent.js';
import { getDocuments } from '../agents/tools/update.js';

test('specialistPatch(essay): JSON review output becomes insights (no "insights" wrapper needed)', () => {
  const reviewJson = { scores: { structure: 8 }, overallScore: 8, strengths: ['Clear voice'], weaknesses: [], specificFeedback: [], verdict: 'strong' };
  const patch = specialistPatch('essay', { text: JSON.stringify(reviewJson) });
  assert.deepEqual(patch, { insights: reviewJson });
});

test('specialistPatch(essay): prose (draft/improve output) does not throw and yields an empty patch here', () => {
  // The actual save for this case happens in HybridCoordinator.execute()'s
  // loop (saveDocument), not in this pure function — see the integration
  // test below.
  const patch = specialistPatch('essay', { text: 'Dear admissions committee, I have always...' });
  assert.deepEqual(patch, {});
});

test('specialistPatch(essay): empty/missing text yields an empty patch, not a throw', () => {
  assert.deepEqual(specialistPatch('essay', {}), {});
  assert.deepEqual(specialistPatch('essay', { text: '' }), {});
});

test('HybridCoordinator.execute(): a prose essay draft gets saved via saveDocument, not silently dropped', async () => {
  const originalHandle = MainAgent.prototype.handle;
  const candidateId = `cand_essay_patch_${Date.now()}`;
  const draftText = 'Dear admissions committee, my summer internship taught me...';
  MainAgent.prototype.handle = async function stub(_candidateId, _message, { forcedAgent } = {}) {
    if (forcedAgent === 'essay') {
      return { agent: 'essay', intent: 'draft', result: { text: draftText, toolUses: [], usage: null, raw: null }, latencyMs: 3 };
    }
    return { agent: forcedAgent || 'chat', intent: '', result: { text: '', toolUses: [], usage: null, raw: null }, latencyMs: 1 };
  };
  try {
    const coordinator = new HybridCoordinator();
    await coordinator.execute({
      candidateId,
      message: 'Please write me an essay about my summer internship',
      candidateState: { profile: { category: 'Graduate', degree: 'MBA' } },
    });
    const documents = await getDocuments(candidateId);
    const essayDoc = documents.find(doc => doc.type === 'essay_draft');
    assert.ok(essayDoc, 'the draft must have been saved as a document');
    assert.equal(essayDoc.content, draftText);
  } finally {
    MainAgent.prototype.handle = originalHandle;
  }
});
