import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
test('server refuses to start without SESSION_SECRET', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], {
    env: { ...process.env, SESSION_SECRET: '' }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SESSION_SECRET/);
});
test('offline health, protected routes, CORS and Swagger', async t => {
  const server = createApp({ secret: randomBytes(32).toString('hex'), idleMs: 1800_000, absoluteMs: 28_800_000, secure: false }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  let response = await fetch(`${base}/api/v1/health`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'DATABASE_UNAVAILABLE');
  response = await fetch(`${base}/unknown`);
  assert.equal(response.status, 404); assert.deepEqual((await response.json()).error.details, []);
  response = await fetch(`${base}/api/v1/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(response.status, 503);
  response = await fetch(`${base}/api/v1/orders`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'bad' });
  assert.equal(response.status, 503);
  response = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'https://example.com' } });
  assert.equal(response.status, 403);
  response = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'http://127.0.0.1:5173' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
  response = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'http://127.0.0.1:4000' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4000');
  response = await fetch(`${base}/api-docs/`);
  assert.equal(response.status, 200); assert.match(await response.text(), /swagger-ui/);
});
