// Integration tests: run the measurement scripts against the eval fixtures.
// Skipped when Playwright is not resolvable (see scripts/lib/runtime.mjs).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'skills', 'vibe2prod', 'scripts');
const fixtures = join(root, 'evals', 'fixtures');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

const servers = [];
const base = {};
let available = true;

// Serves one fixture at the server root, dotfiles included — like a misconfigured static host.
async function serve(dir) {
  const server = createServer((req, res) => {
    const path = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
    if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'text/plain' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/`;
}

before(async () => {
  // Probe in a child process: loadPlaywright() exits the process when nothing resolves.
  try {
    await run(process.execPath, ['-e', `import(${JSON.stringify(join(scripts, 'lib', 'runtime.mjs'))}).then(m => m.loadPlaywright())`]);
  } catch {
    available = false;
    return;
  }
  for (const name of ['sloppy-site', 'leaky-site', 'clean-site']) base[name] = await serve(join(fixtures, name));
});

after(() => servers.forEach((s) => s.close()));

async function script(name, ...args) {
  const { stdout } = await run(process.execPath, [join(scripts, name), ...args], { maxBuffer: 32 * 1024 * 1024, timeout: 180000 });
  return JSON.parse(stdout);
}

test('responsive: sloppy site overflows at xs, skip link and inline link do not fail Resp2', async (t) => {
  if (!available) return t.skip('playwright not resolvable');
  const out = mkdtempSync(join(tmpdir(), 'v2p-resp-'));
  const r = await script('responsive.mjs', base['sloppy-site'], '--out', out);
  assert.equal(r.gates.Resp1, 'fail');
  assert.equal(r.breakpoints.xs.overflow, true);
  assert.equal(r.breakpoints.xl.overflow, false);
  assert.ok(r.breakpoints.xs.overflow_offenders.some((o) => o.selector.includes('hero-strip')));
  assert.equal(r.gates.Resp2, 'pass');
  assert.ok(r.breakpoints.xs.tap_targets.excluded.visually_hidden['1px'] >= 1);
  assert.ok(r.breakpoints.xs.tap_targets.excluded.inline >= 1);
  assert.ok(existsSync(join(out, 'xs.png')));
});

test('responsive: clean site passes both gates', async (t) => {
  if (!available) return t.skip('playwright not resolvable');
  const out = mkdtempSync(join(tmpdir(), 'v2p-resp-'));
  const r = await script('responsive.mjs', base['clean-site'], '--out', out);
  assert.equal(r.gates.Resp1, 'pass');
  assert.equal(r.gates.Resp2, 'pass');
  assert.equal(r.global.viewport_zoom_lock, false);
  assert.equal(r.breakpoints.xs.img_missing_dimensions, 0);
});

test('secret scan: Supabase anon key alone does not fail V5', async (t) => {
  if (!available) return t.skip('playwright not resolvable');
  const r = await script('secret-scan.mjs', base['sloppy-site']);
  assert.equal(r.v5, 'pass');
  assert.equal(r.secrets.length, 0);
  assert.ok(r.informational.some((i) => i.role === 'anon'));
});

test('secret scan: runtime-injected key and exposed .env fail V5 without printing the value', async (t) => {
  if (!available) return t.skip('playwright not resolvable');
  const { stdout } = await run(process.execPath, [join(scripts, 'secret-scan.mjs'), base['leaky-site']], { timeout: 180000 });
  const r = JSON.parse(stdout);
  assert.equal(r.v5, 'fail');
  assert.ok(r.secrets.some((s) => s.pattern === 'openai'));
  assert.ok(r.exposed_files.some((f) => f.endsWith('/.env')));
  assert.ok(!stdout.includes('FIXTUREnotArealKEY'));
});

test('secret scan: SPA fallback answering 200 with HTML is not an exposed file', async (t) => {
  if (!available) return t.skip('playwright not resolvable');
  const spa = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>App shell</title><p>hello</p>'); });
  await new Promise((r) => spa.listen(0, '127.0.0.1', r));
  try {
    const r = await script('secret-scan.mjs', `http://127.0.0.1:${spa.address().port}/`);
    assert.equal(r.exposed_files.length, 0);
    assert.equal(r.v5, 'pass');
  } finally {
    spa.close();
  }
});

test('gates.mjs rejects incomplete measurements with exit 2', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'v2p-gates-'));
  const file = join(dir, 'm.json');
  writeFileSync(file, JSON.stringify({ mode: 'remote', vetos: {}, gates: {} }));
  await assert.rejects(run(process.execPath, [join(scripts, 'gates.mjs'), file]), (err) => err.code === 2 && /missing gate results/.test(err.stderr));
});
