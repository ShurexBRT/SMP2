import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { reconcileShopping } = await server.ssrLoadModule('/src/features/shopping/calculate.ts');
const { addDaysISO, startOfWeekISO } = await server.ssrLoadModule('/src/lib/utils.ts');
const { convertQuantity } = await server.ssrLoadModule('/src/lib/quantities.ts');
const { RecipeSchema } = await server.ssrLoadModule('/src/features/recipes/schema.ts');
const { mayClaimInvitation } = await server.ssrLoadModule('/src/features/household/invitation.ts');
const { allRows } = await server.ssrLoadModule('/src/lib/paginate.ts');
const today = '2026-10-16';
const demand = (qty, unit = 'g') => [{ label: 'Pirinač', ingredientId: 'rice', qty, unit }];
const row = (overrides = {}) => ({
  id: 'existing',
  label: 'Pirinač',
  ingredient_id: 'rice',
  qty: 500,
  unit: 'g',
  checked: false,
  source: 'plan',
  ...overrides,
});

test('calendar week navigation preserves dates across DST and year boundaries', () => {
  assert.equal(addDaysISO('2026-10-19', 7), '2026-10-26');
  assert.equal(addDaysISO('2026-03-23', 7), '2026-03-30');
  assert.equal(addDaysISO('2026-12-28', 7), '2027-01-04');
  assert.equal(addDaysISO('2024-02-28', 1), '2024-02-29');
  assert.equal(startOfWeekISO(new Date('2026-10-18T15:00:00')), '2026-10-12');
});
test('stock is subtracted after converting kg to g', () => {
  const result = reconcileShopping(
    demand(800),
    [{ name: ' pirinač ', qty: 0.5, unit: 'kg' }],
    [],
    today
  );
  assert.deepEqual(result.inserts, [
    { label: 'Pirinač', ingredientId: 'rice', qty: 300, unit: 'g' },
  ]);
});
test('refreshing the same plan twice is idempotent', () => {
  const first = reconcileShopping(demand(500), [], [], today);
  const existing = first.inserts.map((x) => row({ qty: x.qty, unit: x.unit }));
  assert.deepEqual(reconcileShopping(demand(500), [], existing, today), {
    inserts: [],
    updates: [],
    deletes: [],
  });
});
test('changed portions replace outstanding demand rather than adding again', () => {
  const result = reconcileShopping(demand(750), [], [row()], today);
  assert.equal(result.updates[0].item.qty, 750);
  assert.equal(result.inserts.length, 0);
});
test('manual and already purchased quantities are preserved', () => {
  const existing = [
    row({ id: 'bought', qty: 200, checked: true }),
    row({ id: 'manual', source: 'manual', qty: 50 }),
    row({ qty: 300 }),
  ];
  assert.deepEqual(reconcileShopping(demand(500), [], existing, today), {
    inserts: [],
    updates: [],
    deletes: [],
  });
});
test('deleting a planned meal removes only outstanding generated items', () => {
  const result = reconcileShopping(
    [],
    [],
    [row(), row({ id: 'bought', checked: true }), row({ id: 'manual', source: 'manual' })],
    today
  );
  assert.deepEqual(result.deletes, ['existing']);
});
test('expired inventory never hides a shopping requirement', () => {
  const result = reconcileShopping(
    demand(500),
    [{ name: 'Pirinač', qty: 1, unit: 'kg', expiresAt: '2026-10-15' }],
    [],
    today
  );
  assert.equal(result.inserts[0].qty, 500);
});
test('different measurement dimensions stay separate', () => {
  const result = reconcileShopping(
    demand(500),
    [{ name: 'Pirinač', qty: 1, unit: 'kom' }],
    [],
    today
  );
  assert.equal(result.inserts[0].qty, 500);
  assert.equal(convertQuantity(1, 'kg', 'g'), 1000);
  assert.equal(convertQuantity(1, 'ml', 'g'), null);
});
test('all occurrences aggregate and duplicate generated rows converge', () => {
  const result = reconcileShopping(
    [...demand(250), ...demand(0.25, 'kg')],
    [],
    [row(), row({ id: 'duplicate' })],
    today
  );
  assert.equal(result.inserts.length, 0);
  assert.deepEqual(result.deletes, ['duplicate']);
});
test('recipe validation rejects whitespace names, negative times and fractional portions', () => {
  const recipe = { name: 'Pirinač', steps: ['Skuvaj'], default_servings: 2 };
  assert.equal(RecipeSchema.safeParse(recipe).success, true);
  assert.equal(RecipeSchema.safeParse({ ...recipe, name: '  ' }).success, false);
  assert.equal(RecipeSchema.safeParse({ ...recipe, prep_minutes: -5 }).success, false);
  assert.equal(RecipeSchema.safeParse({ ...recipe, default_servings: 1.5 }).success, false);
});
test('inventory must last until the date of the planned meal', () => {
  const result = reconcileShopping(
    [{ ...demand(500)[0], date: '2026-10-23' }],
    [{ name: 'Pirinač', qty: 500, unit: 'g', expiresAt: '2026-10-17' }],
    [],
    today
  );
  assert.equal(result.inserts[0].qty, 500);
});
test('shared stock is allocated once, to meals before its expiry', () => {
  const result = reconcileShopping(
    [
      { ...demand(300)[0], date: '2026-10-16' },
      { ...demand(300)[0], date: '2026-10-20' },
    ],
    [{ name: 'Pirinač', qty: 500, unit: 'g', expiresAt: '2026-10-17' }],
    [],
    today
  );
  assert.equal(result.inserts[0].qty, 300);
});
test('explicitly reconciled purchases already in stock are not subtracted twice', () => {
  const result = reconcileShopping(
    demand(1000),
    [{ name: 'Pirinač', qty: 300, unit: 'g' }],
    [row({ id: 'bought', qty: 300, checked: true })],
    today,
    ['bought']
  );
  assert.equal(result.inserts[0].qty, 700);
});
test('all result pages are read, including more than 1000 rows', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const received = await allRows(async (from, to) => ({
    data: rows.slice(from, to + 1),
    error: null,
  }));
  assert.equal(received.length, 1201);
  assert.equal(received.at(-1).id, 1200);
});
test('an invite can only be claimed by its confirmed, matching, unlinked user', () => {
  const invite = { email: 'person@example.test', status: 'invited', user_id: null };
  const user = { id: 'person', email: 'PERSON@example.test', email_confirmed_at: today };
  assert.equal(mayClaimInvitation(invite, user), true);
  assert.equal(mayClaimInvitation(invite, { ...user, email: 'other@example.test' }), false);
  assert.equal(mayClaimInvitation(invite, { ...user, email_confirmed_at: undefined }), false);
  assert.equal(mayClaimInvitation({ ...invite, user_id: 'other' }, user), false);
  assert.equal(mayClaimInvitation({ ...invite, status: 'active' }, user), false);
});
