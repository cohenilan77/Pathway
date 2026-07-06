import test from 'node:test';
import assert from 'node:assert/strict';
import { claimsPortfolioReady, requestsProgramList } from '../agents/sub/AdvisorAgent.js';

test('detects false claims that a portfolio was already shared', () => {
  assert.equal(claimsPortfolioReady("I've already shared your full portfolio in the Analysis tab. You have 15 schools matched."), true);
  assert.equal(claimsPortfolioReady('Your recommended programs are ready in Analysis.'), true);
  assert.equal(claimsPortfolioReady("I've matched 12 computer science programs for you."), true);
  assert.equal(claimsPortfolioReady('Your 12-school portfolio spans realistic reaches, targets, and likelies.'), true);
  assert.equal(claimsPortfolioReady('Which geography do you prefer?'), false);
});

test('detects direct school-list generation and recovery requests', () => {
  assert.equal(requestsProgramList('Recommend a tailored portfolio of programs for me.'), true);
  assert.equal(requestsProgramList('Generate my complete school list now. I cannot see any schools in Chat or Analysis.'), true);
  assert.equal(requestsProgramList('recommend'), true);
  assert.equal(requestsProgramList('match me'), true);
  assert.equal(requestsProgramList('next', { hasPrograms: false }), true);
  assert.equal(requestsProgramList('next', { hasPrograms: true }), false);
  assert.equal(requestsProgramList('Tell me about my leadership score.'), false);
});
