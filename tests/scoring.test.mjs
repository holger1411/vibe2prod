import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, GATES, compute, MeasurementError } from '../skills/vibe2prod/scripts/lib/scoring.mjs';

function allPass(mode = 'remote') {
  const gates = Object.fromEntries(GATES.map((id) => [id, 'pass']));
  const categories = { performance: { lighthouse: 1 }, accessibility: { lighthouse: 1 }, seo: { lighthouse: 1 } };
  for (const [cat, ids] of Object.entries(CHECKS)) categories[cat] = Object.fromEntries(ids.map((id) => [id, null]));
  if (mode === 'remote') categories.stack = null;
  return {
    mode,
    vetos: { V1: 'pass', V2: 'pass', V3: 'pass', V4: 'pass', V5: 'pass' },
    gates,
    categories,
  };
}

test('gate set is 27 regular gates', () => {
  assert.equal(GATES.length, 27);
});

test('all gates passing in remote mode is READY at 100 %', () => {
  const { twoprod, readiness } = compute(allPass());
  assert.equal(twoprod.band, 'READY');
  assert.equal(twoprod.pct, 100);
  assert.equal(twoprod.denominator, 27);
  assert.equal(readiness.total, 100);
  assert.equal(readiness.stack_skipped, true);
});

test('local mode defers Sec1–Sec3: denominator 24', () => {
  const m = allPass('local');
  m.gates.Sec1 = 'fail';
  const { twoprod } = compute(m);
  assert.equal(twoprod.denominator, 24);
  assert.deepEqual(twoprod.deferred, ['Sec1', 'Sec2', 'Sec3']);
  assert.equal(twoprod.failed.length, 0);
});

test('local mode accepts omitted deferred gates', () => {
  const m = allPass('local');
  delete m.gates.Sec1; delete m.gates.Sec2; delete m.gates.Sec3;
  assert.equal(compute(m).twoprod.denominator, 24);
});

test('inconclusive gates leave numerator and denominator', () => {
  const m = allPass();
  m.gates.H1 = 'inconclusive';
  const { twoprod } = compute(m);
  assert.equal(twoprod.denominator, 26);
  assert.equal(twoprod.passed, 26);
  assert.deepEqual(twoprod.inconclusive, ['H1']);
  assert.ok(twoprod.notes.some((n) => n.includes('audit confidence: reduced')));
});

test('a failed veto blocks without a percentage', () => {
  const m = allPass();
  m.vetos.V5 = 'fail';
  const { twoprod } = compute(m);
  assert.equal(twoprod.band, 'BLOCKED');
  assert.equal(twoprod.pct, null);
  assert.deepEqual(twoprod.vetos_failed, ['V5']);
});

test('Resp1 failure caps a green band at NOT YET', () => {
  const m = allPass();
  m.gates.Resp1 = 'fail';
  const { twoprod } = compute(m);
  assert.equal(twoprod.pct, 96.3);
  assert.equal(twoprod.band, 'NOT YET');
  assert.ok(twoprod.notes[0].includes('Resp1'));
});

test('an inconclusive veto caps a green band at NOT YET', () => {
  const m = allPass();
  m.vetos.V1 = 'inconclusive';
  const { twoprod } = compute(m);
  assert.equal(twoprod.band, 'NOT YET');
  assert.ok(twoprod.notes.some((n) => n.includes('provisional')));
});

test('band thresholds', () => {
  const m = allPass();
  // 23/27 = 85.2 % → Light Green
  for (const id of ['P1', 'P2', 'P3', 'P4']) m.gates[id] = 'fail';
  assert.equal(compute(m).twoprod.band, 'Light Green');
  // 19/27 = 70.4 % → NOT YET
  for (const id of ['A1', 'A2', 'A3', 'S1']) m.gates[id] = 'fail';
  assert.equal(compute(m).twoprod.band, 'NOT YET');
  // 13/27 = 48.1 % → BLOCKED
  for (const id of ['S2', 'S3', 'S4', 'S5', 'S6', 'H1']) m.gates[id] = 'fail';
  assert.equal(compute(m).twoprod.band, 'BLOCKED');
});

test('missing gate results are an error, not a silent pass', () => {
  const m = allPass();
  delete m.gates.R4;
  assert.throws(() => compute(m), MeasurementError);
});

test('unknown and missing Method-B checks are errors', () => {
  const m = allPass();
  m.categories.security.made_up = 'HIGH';
  assert.throws(() => compute(m), /unknown checks: made_up/);
  const n = allPass();
  delete n.categories.html['html-errors'];
  assert.throws(() => compute(n), /missing checks: html-errors/);
});

test('a check deducts once, at its worst severity', () => {
  const m = allPass('local');
  m.categories.stack = { 'node-runtime': null, vulnerabilities: null, 'dependency-integrity': null };
  m.categories.html['html-errors'] = ['LOW', 'MEDIUM', 'LOW'];
  const { readiness } = compute(m);
  // HTML Quality: 3 points / 4 checks = 0.75 per check; MEDIUM deducts half → 2.625
  assert.equal(readiness.categories.html, 2.6);
  assert.equal(readiness.deductions.length, 1);
  assert.equal(readiness.deductions[0].severity, 'MEDIUM');
});

test('stack freshness counts one check per watched package', () => {
  const m = allPass('local');
  m.categories.stack = { 'node-runtime': null, vulnerabilities: 'CRITICAL', 'dependency-integrity': null, 'pkg:next': 'HIGH', 'pkg:react': null };
  const { readiness } = compute(m);
  // 2 points / 5 checks = 0.4; two full deductions → 1.2
  assert.equal(readiness.categories.stack, 1.2);
  assert.equal(readiness.check_values['stack/pkg:next'], 0.4);
});

test('Method A maps the Lighthouse score onto the (scaled) weight', () => {
  const m = allPass();
  m.categories.accessibility.lighthouse = 0.8;
  const { readiness } = compute(m);
  // remote: weights scaled by 100/98; 0.8 × 17 × 100/98 = 13.88
  assert.equal(readiness.categories.accessibility, 13.9);
  assert.equal(readiness.caps.accessibility, 17.3);
});

test('a category never goes below zero', () => {
  const m = allPass();
  for (const id of CHECKS.html) m.categories.html[id] = 'CRITICAL';
  assert.equal(compute(m).readiness.categories.html, 0);
});
