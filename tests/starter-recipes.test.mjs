import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

// Workflow tests use an in-memory client, not production credentials or rows.
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:1';
process.env.VITE_SUPABASE_ANON_KEY = 'test-only';
const server = await createServer({
  server: { middlewareMode: true, hmr: false, preTransformRequests: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
after(() => server.close());
const { supabase } = await server.ssrLoadModule('/src/lib/supabase.ts');
const { importStarterRecipes } = await server.ssrLoadModule(
  '/src/features/recipes/importStarterRecipes.ts'
);
const collection = JSON.parse(
  await readFile(new URL('../src/features/recipes/starter-recipes.json', import.meta.url))
);
const householdId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
let db, currentUser, failIngredients, onWrite;

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = 'read';
  }
  select() {
    return this;
  }
  eq(key, value) {
    this.filters.push((r) => r[key] === value);
    return this;
  }
  order() {
    return this;
  }
  range(from, to) {
    this.bounds = [from, to];
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  insert(data) {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }
  upsert(data, options) {
    this.operation = 'upsert';
    this.payload = data;
    this.options = options;
    return this;
  }
  update(data) {
    this.operation = 'update';
    this.payload = data;
    return this;
  }
  async then(resolve, reject) {
    try {
      return resolve(this.execute());
    } catch (error) {
      return reject(error);
    }
  }
  execute() {
    const table = db[this.table];
    let rows = table.filter((r) => this.filters.every((f) => f(r)));
    if (this.operation !== 'read') {
      onWrite?.(this);
      if (this.table === 'recipe_ingredients' && failIngredients) {
        failIngredients = false;
        return { data: null, error: { message: 'Connection interrupted', code: '503' } };
      }
      if (this.operation === 'update') {
        for (const row of rows) Object.assign(row, this.payload);
      } else {
        rows = [];
        for (const value of Array.isArray(this.payload) ? this.payload : [this.payload]) {
          assert.equal(
            value.household_id,
            householdId,
            'Every write must retain the requested household'
          );
          const columns = this.options?.onConflict?.split(',') ?? ['id'];
          const conflict = table.find((r) =>
            columns.every((c) => value[c] != null && r[c] === value[c])
          );
          if (conflict) {
            if (this.operation === 'upsert' && this.options.ignoreDuplicates) continue;
            return { data: null, error: { code: '23505', message: 'Duplicate primary key' } };
          }
          const row = { id: randomUUID(), ...structuredClone(value) };
          table.push(row);
          rows.push(row);
        }
      }
    }
    if (this.bounds) rows = rows.slice(this.bounds[0], this.bounds[1] + 1);
    return this.one
      ? rows.length === 1
        ? { data: structuredClone(rows[0]), error: null }
        : { data: null, error: { code: 'PGRST116', message: 'Expected one row' } }
      : { data: structuredClone(rows), error: null };
  }
}

function reset() {
  db = { recipes: [], ingredients: [], recipe_ingredients: [] };
  currentUser = userId;
  failIngredients = false;
  onWrite = undefined;
  supabase.from = (table) => new Query(table);
  supabase.auth.getSession = async () => ({
    data: { session: { user: { id: currentUser } } },
    error: null,
  });
}
const run = (extra = {}) =>
  importStarterRecipes({
    householdId,
    userId,
    isCurrent: () => true,
    onProgress: () => {},
    ...extra,
  });

test('starter collection has 24 complete recipes and shopping-compatible quantities', () => {
  assert.equal(collection.length, 24);
  assert.equal(new Set(collection.map((r) => r.name)).size, 24);
  assert.equal(collection.flatMap((r) => r.ingredients).length, 200);
  for (const r of collection) {
    assert(r.default_servings > 0 && Number.isInteger(r.default_servings));
    assert(r.steps.length >= 3 && r.steps.every((s) => s.trim()));
    assert(r.tags.some((t) => ['breakfast', 'lunch', 'dinner'].includes(t)));
    assert(r.ingredients.length >= 4);
    assert(r.ingredients.every((i) => i.qty > 0 && ['kom', 'g', 'ml'].includes(i.unit)));
    assert(!r.ingredients.some((i) => i.name === 'Voda'));
  }
});

test('repeat imports keep 24 recipes, 200 links, and user edits unchanged', async () => {
  reset();
  assert.deepEqual(await run(), { added: 24, skipped: 0 });
  db.recipes[0].name = 'Moja izmenjena kajgana';
  db.recipes[0].notes = 'Moja napomena';
  db.recipe_ingredients[0].qty = 9;
  assert.deepEqual(await run(), { added: 0, skipped: 24 });
  assert.equal(db.recipes.length, 24);
  assert.equal(db.recipe_ingredients.length, 200);
  assert.equal(db.recipes[0].notes, 'Moja napomena');
  assert.equal(db.recipe_ingredients[0].qty, 9);
});

test('matching custom recipes are preserved and pending imports resume after failure', async () => {
  reset();
  db.recipes.push({
    id: randomUUID(),
    household_id: householdId,
    name: collection[0].name,
    notes: 'Originalni porodični recept',
    steps: ['Sačuvaj me'],
    tags: [],
  });
  failIngredients = true;
  await assert.rejects(run());
  assert.equal(db.recipes.length, 2);
  assert.match(db.recipes[1].notes, /Uvoz početnog recepta nije završen/);
  assert.deepEqual(await run(), { added: 23, skipped: 1 });
  assert.equal(db.recipes.length, 24);
  assert.equal(db.recipe_ingredients.length, 200 - collection[0].ingredients.length);
  assert.equal(db.recipes[0].notes, 'Originalni porodični recept');
  assert(!db.recipes.some((r) => r.notes?.includes('Uvoz početnog recepta nije završen')));
});

test('simultaneous imports converge without duplicating rows', async () => {
  reset();
  await Promise.all([run(), run()]);
  assert.equal(db.recipes.length, 24);
  assert.equal(db.recipe_ingredients.length, 200);
  assert.equal(new Set(db.ingredients.map((r) => r.name)).size, db.ingredients.length);
});

test('changed account or household context stops later writes', async () => {
  reset();
  await assert.rejects(run({ isCurrent: () => false }), /domaćinstvo/);
  assert.equal(db.ingredients.length, 0);
  let sameContext = true;
  onWrite = () => {
    sameContext = false;
  };
  await assert.rejects(run({ isCurrent: () => sameContext }), /domaćinstvo/);
  assert.equal(db.recipes.length, 0);
  reset();
  currentUser = 'other-user';
  await assert.rejects(run(), /Prijava/);
  assert.equal(db.ingredients.length, 0);
});
