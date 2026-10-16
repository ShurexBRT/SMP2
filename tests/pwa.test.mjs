import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const manifest = JSON.parse(
  await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')
);
const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

test('installation resources work at localhost and a GitHub Pages subpath', async () => {
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.name);
  for (const base of ['http://localhost:5174/', 'https://shurexbrt.github.io/SMP2/']) {
    assert.equal(new URL(manifest.scope, base).href, base);
    assert.equal(new URL(manifest.id, base).href, base);
    assert.equal(new URL(manifest.start_url, base).href, `${base}#/plan`);
  }
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((x) => x.sizes === `${size}x${size}` && x.purpose === 'any');
    assert.ok(icon);
    const png = await readFile(new URL(`../public/${icon.src}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

function workerHandler(fetch) {
  const events = new Map();
  // No CacheStorage is supplied: accidental caching of private content fails the test.
  vm.runInNewContext(worker, {
    self: { addEventListener: (type, handler) => events.set(type, handler) },
    fetch,
    Response,
  });
  return events.get('fetch');
}

test('the installation worker leaves Auth, API, POST and assets untouched', () => {
  const onFetch = workerHandler(() => {
    throw new Error('must not intercept');
  });
  for (const request of [
    { mode: 'cors', method: 'GET', url: 'https://example.supabase.co/rest/v1/recipes' },
    { mode: 'cors', method: 'POST', url: 'https://example.supabase.co/auth/v1/token' },
    { mode: 'no-cors', method: 'GET', url: 'http://localhost:5174/assets/app.js' },
  ])
    onFetch({
      request,
      respondWith: () => assert.fail('private/API or asset request was intercepted'),
    });
});

test('offline navigation has an honest retry page and never returns cached household data', async () => {
  const onFetch = workerHandler(async () => {
    throw new TypeError('offline');
  });
  let response;
  onFetch({
    request: { mode: 'navigate', url: 'http://localhost:5174/' },
    respondWith: (value) => {
      response = value;
    },
  });
  const result = await response;
  assert.equal(result.status, 503);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.match(await result.text(), /Nema internet veze/);
});
