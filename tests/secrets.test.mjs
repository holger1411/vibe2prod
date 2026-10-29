import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyJwt, findPublicSecretNames, looksLikeExposedFile, scanText, sourceMapUrl,
} from '../skills/vibe2prod/scripts/lib/secrets.mjs';

// Key-shaped strings are assembled at runtime so the repository never contains a literal one.
const fake = (...parts) => parts.join('');
const jwt = (payload) => [
  Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'c2lnbmF0dXJl',
].join('.');

test('AI-provider keys are secrets', () => {
  const text = [
    fake('sk-', 'proj-', 'a'.repeat(40)),
    fake('sk-', 'ant-', 'api03-', 'b'.repeat(90)),
    fake('sk-', 'or-', 'v1-', 'c'.repeat(64)),
    fake('gs', 'k_', 'D'.repeat(52)),
  ].join(' ');
  const names = scanText(text, 'bundle.js').secrets.map((s) => s.pattern);
  assert.deepEqual(names, ['openai', 'anthropic', 'openrouter', 'groq']);
});

test('reported matches carry no secret value', () => {
  const key = fake('sk-', 'proj-', 'z'.repeat(40));
  const { secrets } = scanText(`const k = "${key}";`, 'app.js');
  assert.equal(secrets.length, 1);
  assert.ok(!JSON.stringify(secrets).includes(key));
  assert.equal(secrets[0].offset, 11);
});

test('Supabase anon key is public by design, service_role is a secret', () => {
  assert.equal(classifyJwt(jwt({ iss: 'supabase', role: 'anon' })).verdict, 'public');
  assert.equal(classifyJwt(jwt({ iss: 'supabase', role: 'service_role' })).verdict, 'secret');
  const { secrets, informational } = scanText(jwt({ role: 'anon' }), 'index.html');
  assert.equal(secrets.length, 0);
  assert.equal(informational.length, 1);
});

test('other JWTs fail unless long-expired without credential claims', () => {
  assert.equal(classifyJwt(jwt({ sub: 'user-1', exp: 4102444800 })).verdict, 'secret');
  assert.equal(classifyJwt(jwt({ exp: 1000000000 })).verdict, 'review');
});

test('publishable keys are not reported, Google keys go to their own bucket', () => {
  const text = `${fake('pk_', 'live_', 'abc123')} ${fake('sb_', 'publishable_', 'x'.repeat(30))} ${fake('AI', 'za', 'S'.repeat(35))}`;
  const r = scanText(text, 'x');
  assert.equal(r.secrets.length, 0);
  assert.equal(r.googleKeys.length, 1);
});

test('exposed files must match their format, not just return 200', () => {
  assert.equal(looksLikeExposedFile('/.env', 'API_KEY=abc\n'), true);
  assert.equal(looksLikeExposedFile('/.env', '<!doctype html><html>'), false);
  assert.equal(looksLikeExposedFile('/.git/config', '[core]\n\tbare = false'), true);
  assert.equal(looksLikeExposedFile('/.git/HEAD', 'ref: refs/heads/main\n'), true);
  assert.equal(looksLikeExposedFile('/.git/HEAD', '<html>'), false);
});

test('secret-named variables with a client-exposing prefix are found', () => {
  const found = findPublicSecretNames('const a = import.meta.env.VITE_OPENAI_API_KEY; process.env.NEXT_PUBLIC_SITE_URL', 'src/a.ts');
  assert.deepEqual(found.map((f) => f.name), ['VITE_OPENAI_API_KEY']);
});

test('source map URLs resolve against the script URL', () => {
  assert.equal(sourceMapUrl('x()\n//# sourceMappingURL=app.js.map', 'https://s.test/assets/app.js'), 'https://s.test/assets/app.js.map');
  assert.equal(sourceMapUrl('x()\n//# sourceMappingURL=data:application/json;base64,e30=', 'https://s.test/a.js'), null);
});
