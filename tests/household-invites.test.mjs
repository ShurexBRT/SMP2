import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
  server: { middlewareMode: true, hmr: false, preTransformRequests: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
after(() => server.close());
const { createInviteHandler } = await server.ssrLoadModule(
  '/supabase/functions/invite-member/handler.ts'
);
const household = '11111111-1111-4111-8111-111111111111';
function setup(overrides = {}) {
  const state = {
    row: null,
    owner: true,
    user: { id: 'owner', email: 'owner@example.com', email_confirmed_at: 'yes' },
    writes: 0,
    sends: [],
    providerStatus: 200,
  };
  const gateway = {
    user: async () => state.user,
    owner: async () => state.owner,
    invitation: async () => state.row,
    insert: async () => {
      state.writes++;
      state.row = { id: 'invite', role: 'member', status: 'invited', user_id: null };
    },
  };
  const handler = createInviteHandler({
    appUrl: 'https://shurexbrt.github.io/SMP2/',
    mailFrom: 'SMP <invites@example.com>',
    mailKey: 'test',
    now: () => 600000,
    gateway: () => gateway,
    fetcher: async (url, init) => {
      state.sends.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return Response.json({ id: 'mail-1' }, { status: state.providerStatus });
    },
    ...overrides,
  });
  const request = (body = { household_id: household, email: ' Sandra@Example.com ' }, opts = {}) =>
    handler(
      new Request('https://example.supabase.co/functions/v1/invite-member', {
        method: 'POST',
        headers: {
          Origin: 'https://shurexbrt.github.io',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          ...opts.headers,
        },
        body: JSON.stringify(body),
        ...opts,
      })
    );
  return { state, request, handler };
}
test('owner creates invitation and email for normalized address, fixed Pages login URL', async () => {
  const { state, request } = setup();
  assert.equal((await request()).status, 200);
  assert.equal(state.writes, 1);
  assert.deepEqual(state.sends[0].body.to, ['sandra@example.com']);
  assert.ok(state.sends[0].body.text.includes('https://shurexbrt.github.io/SMP2/#/login'));
  assert.equal(state.sends[0].headers['Idempotency-Key'], 'smp2-invite-invite-1');
});
test('retry of pending invitation does not rewrite membership and reuses provider dedup key', async () => {
  const { state, request } = setup();
  await request();
  await request();
  assert.equal(state.writes, 1);
  assert.equal(state.sends.length, 2);
  assert.equal(
    state.sends[0].headers['Idempotency-Key'],
    state.sends[1].headers['Idempotency-Key']
  );
});
for (const row of [
  { role: 'owner', status: 'active', user_id: 'u' },
  { role: 'member', status: 'active', user_id: 'u' },
  { role: 'owner', status: 'invited', user_id: null },
  { role: 'member', status: 'invited', user_id: 'u' },
])
  test(`preserves existing ${JSON.stringify(row)}`, async () => {
    const { state, request } = setup();
    state.row = { id: 'i', ...row };
    assert.equal((await request()).status, 409);
    assert.equal(state.writes, 0);
    assert.equal(state.sends.length, 0);
  });
test('member or outsider cannot invite, even through direct endpoint', async () => {
  const { state, request } = setup();
  state.owner = false;
  assert.equal((await request()).status, 403);
  assert.equal(state.writes, 0);
  assert.equal(state.sends.length, 0);
});
test('rejects unverified user, expired identity and absent token', async () => {
  const { state, request, handler } = setup();
  state.user.email_confirmed_at = undefined;
  assert.equal((await request()).status, 401);
  state.user = null;
  assert.equal((await request()).status, 401);
  assert.equal((await handler(new Request('https://example.com', { method: 'POST' }))).status, 401);
  assert.equal(state.writes, 0);
  assert.equal(state.sends.length, 0);
});
test('CORS supports browser preflight, rejects arbitrary origins and GET', async () => {
  const { handler, state } = setup();
  const preflight = await handler(
    new Request('https://example.com', {
      method: 'OPTIONS',
      headers: { Origin: 'https://shurexbrt.github.io' },
    })
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://shurexbrt.github.io');
  assert.equal(
    (
      await handler(
        new Request('https://example.com', { headers: { Origin: 'https://evil.example' } })
      )
    ).status,
    403
  );
  assert.equal((await handler(new Request('https://example.com'))).status, 405);
  assert.equal(state.sends.length, 0);
});
test('provider failure retains retryable invitation and never reports success', async () => {
  const { request, state } = setup();
  state.providerStatus = 429;
  const response = await request();
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.ok, undefined);
  assert.equal(body.invitation_saved, true);
  state.providerStatus = 200;
  assert.equal((await request()).status, 200);
  assert.equal(state.writes, 1);
});
test('missing mail configuration fails before inserting or sending', async () => {
  const { request, state } = setup({ mailKey: '' });
  assert.equal((await request()).status, 503);
  assert.equal(state.writes, 0);
  assert.equal(state.sends.length, 0);
});
test('invalid body and self-invite are rejected without writes or email', async () => {
  const { request, state } = setup();
  for (const body of [
    null,
    {},
    { household_id: household, email: 'bad\r\n@example.com' },
    { household_id: 'bad', email: 'a@b.com' },
  ])
    assert.equal((await request(body)).status, 400);
  assert.equal(
    (await request({ household_id: household, email: 'owner@example.com' })).status,
    409
  );
  assert.equal(state.writes, 0);
  assert.equal(state.sends.length, 0);
});
