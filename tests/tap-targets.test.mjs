import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTapTargets } from '../skills/vibe2prod/scripts/lib/tap-targets.mjs';

let n = 0;
const target = (x, y, w, h, extra = {}) => ({ i: n++, selector: `#t${n}`, x, y, w, h, hidden: null, inline: false, related: [], ...extra });

test('visually hidden skip link is excluded and counted', () => {
  const r = evaluateTapTargets([target(0, 0, 1, 1, { hidden: '1px' })]);
  assert.equal(r.eligible_failing, 0);
  assert.deepEqual(r.excluded.visually_hidden, { '1px': 1 });
});

test('inline link inside a sentence is excluded', () => {
  const r = evaluateTapTargets([target(100, 100, 30, 18, { inline: true })]);
  assert.equal(r.excluded.inline, 1);
  assert.equal(r.eligible_failing, 0);
});

test('an isolated undersized target passes by spacing', () => {
  const r = evaluateTapTargets([target(100, 100, 16, 16), target(300, 300, 48, 48)]);
  assert.equal(r.excluded.spacing, 1);
  assert.equal(r.eligible_failing, 0);
});

test('two adjacent undersized targets both fail', () => {
  const r = evaluateTapTargets([target(100, 100, 16, 16), target(120, 100, 16, 16)]);
  assert.equal(r.eligible_failing, 2);
  assert.equal(r.failing[0].w, 16);
});

test('a target nested in another does not count against itself', () => {
  const outer = target(100, 100, 18, 18);
  const inner = target(102, 102, 10, 10);
  outer.related = [inner.i];
  inner.related = [outer.i];
  const r = evaluateTapTargets([outer, inner]);
  assert.equal(r.eligible_failing, 0);
});

test('AAA percentage covers the non-inline visible set', () => {
  const r = evaluateTapTargets([target(0, 0, 44, 44), target(0, 100, 30, 30), target(0, 200, 20, 15, { inline: true })]);
  assert.equal(r.aaa.eligible, 2);
  assert.equal(r.aaa.pct, 50);
});
