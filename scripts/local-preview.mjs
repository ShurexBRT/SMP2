// Local QA only. No requests are forwarded to Supabase; nothing here ships in dist.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';

const hh = '11111111-1111-4111-8111-111111111111';
const uid = '22222222-2222-4222-8222-222222222222';
const now = new Date().toISOString();
const d = new Date();
const monday = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const iso = (day) => new Date(monday.getTime() + day * 86400000).toISOString().slice(0, 10);
const user = {
  id: uid,
  email: 'pregled@primer.rs',
  role: 'authenticated',
  aud: 'authenticated',
  email_confirmed_at: now,
  app_metadata: {},
  user_metadata: {},
  created_at: now,
};
const jwt = () =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: uid,
        role: 'authenticated',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url'),
    'local-preview-only',
  ].join('.');
const session = () => ({
  access_token: jwt(),
  refresh_token: 'local-preview-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  user,
});
const names = [
  'Jaja',
  'Paradajz',
  'Crni luk',
  'Pirinač',
  'Pileći file',
  'Spanać',
  'Testenina',
  'Mleko',
  'Maslinovo ulje',
];
const ingredients = names.map((name, i) => ({
  id: `ingredient-${i}`,
  household_id: hh,
  name,
  default_unit: [0].includes(i) ? 'kom' : i === 7 || i === 8 ? 'ml' : 'g',
  created_at: now,
}));
const recipes = [
  [
    'Šakšuka',
    ['breakfast', 'dinner', 'mediteransko', 'brzo'],
    15,
    20,
    'Savršeno uz domaći hleb i malo feta sira.',
  ],
  ['Piletina sa pirinčem', ['lunch', 'porodično'], 20, 30, 'Jednostavan ručak koji svi volimo.'],
  [
    'Kremasta testenina sa spanaćem',
    ['lunch', 'dinner', 'vegetarijansko'],
    10,
    15,
    'Spanać dodajte na kraju kuvanja.',
  ],
  ['Omlet sa pečurkama', ['breakfast', 'brzo'], 5, 10, 'Doručak za miran početak dana.'],
  ['Pirinač sa povrćem', ['lunch', 'dinner', 'posno'], 10, 20, null],
  ['Zapečena jaja sa spanaćem', ['breakfast', 'dinner'], 10, 20, null],
].map(([name, tags, prep_minutes, cook_minutes, notes], i) => ({
  id: `recipe-${i}`,
  household_id: hh,
  name,
  tags,
  prep_minutes,
  cook_minutes,
  default_servings: 2,
  notes,
  steps: [
    'Pripremite i operite sve sastojke. Iseckajte povrće na sitne komade.',
    'Zagrejte tiganj, dodajte sastojke i kuvajte na umerenoj vatri. Poslužite toplo.',
  ],
  created_at: now,
  updated_at: now,
}));
const recipe_ingredients = [
  [0, 1, 2, 8],
  [3, 4, 8],
  [6, 5, 7],
  [0, 5],
  [3, 1, 2],
  [0, 5, 7],
].flatMap((ids, r) =>
  ids.map((i, n) => ({
    id: `ri-${r}-${i}`,
    household_id: hh,
    recipe_id: recipes[r].id,
    ingredient_id: ingredients[i].id,
    qty: i === 0 ? 4 : i === 8 ? 20 : n === 0 ? 300 : 200,
    unit: ingredients[i].default_unit,
    optional: false,
    created_at: now,
  }))
);
const db = {
  households: [{ id: hh, name: 'Naša kuhinja', created_by: uid, created_at: now }],
  household_members: [
    {
      id: 'member-1',
      household_id: hh,
      user_id: uid,
      email: user.email,
      role: 'owner',
      status: 'active',
      created_at: now,
    },
  ],
  recipes,
  ingredients,
  recipe_ingredients,
  meal_plans: [
    { id: 'plan-1', household_id: hh, week_start: iso(0), created_at: now, updated_at: now },
  ],
  meal_plan_items: Array.from({ length: 13 }, (_, i) => ({
    id: `meal-${i}`,
    household_id: hh,
    meal_plan_id: 'plan-1',
    date: iso(Math.floor(i / 3)),
    meal_type: ['breakfast', 'lunch', 'dinner'][i % 3],
    recipe_id: recipes[i % 3 === 0 ? (i % 2 ? 3 : 0) : i % 3 === 1 ? 1 : 2].id,
    servings: 2,
    created_at: now,
  })),
  inventory_items: [
    {
      id: 'stock-1',
      household_id: hh,
      ingredient_id: ingredients[3].id,
      qty: 0.5,
      unit: 'kg',
      min_qty: 0.2,
      expires_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-2',
      household_id: hh,
      ingredient_id: ingredients[0].id,
      qty: 2,
      unit: 'kom',
      min_qty: 6,
      expires_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-3',
      household_id: hh,
      ingredient_id: ingredients[4].id,
      qty: 300,
      unit: 'g',
      min_qty: 0,
      expires_at: null,
      created_at: now,
      updated_at: now,
    },
  ],
  shopping_lists: [
    { id: 'list-1', household_id: hh, week_start: iso(0), status: 'open', created_at: now },
  ],
  shopping_list_items: [
    {
      id: 'manual-1',
      household_id: hh,
      shopping_list_id: 'list-1',
      ingredient_id: null,
      label: 'Kafa',
      qty: 250,
      unit: 'g',
      category: 'Ostalo',
      checked: false,
      source: 'manual',
      created_at: now,
    },
  ],
};

function match(row, url) {
  for (const [key, query] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    const dot = query.indexOf('.');
    const op = query.slice(0, dot),
      value = query.slice(dot + 1);
    if (op === 'eq' && String(row[key]) !== value) return false;
    if (op === 'in' && !value.slice(1, -1).split(',').includes(String(row[key]))) return false;
    if (
      op === 'ilike' &&
      String(row[key]).toLowerCase() !== value.replace(/\\([%_\\])/g, '$1').toLowerCase()
    )
      return false;
  }
  return true;
}
const api = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):517[345]$/.test(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin ?? 'http://localhost:5174');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, apikey, content-type, x-client-info, prefer, accept, accept-profile, content-profile, x-supabase-api-version'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  const url = new URL(req.url, 'http://127.0.0.1:54399');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const send = (data, code = 200) => {
    res.writeHead(code);
    res.end(JSON.stringify(data));
  };
  if (url.pathname === '/__state') return send(db);
  if (url.pathname === '/auth/v1/token') {
    if (
      url.searchParams.get('grant_type') === 'password' &&
      (body.email !== user.email || body.password !== 'Pregled123!')
    )
      return send({ message: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400);
    return send(session());
  }
  if (url.pathname === '/auth/v1/user') return send(user);
  if (url.pathname === '/auth/v1/logout') return send({});
  if (url.pathname === '/auth/v1/signup') return send({ user, session: null });
  if (url.pathname === '/rest/v1/rpc/create_household')
    return send({ message: 'Domaćinstvo već postoji u ovom lokalnom pregledu.' }, 400);
  const table = url.pathname.split('/').at(-1);
  if (!db[table]) return send({ message: 'Unknown local fixture endpoint' }, 404);
  if (!req.headers.authorization?.startsWith('Bearer ey'))
    return send({ message: 'Authentication required' }, 401);
  let rows = db[table].filter((row) => match(row, url));
  if (req.method === 'POST') {
    const inserted = (Array.isArray(body) ? body : [body]).map((item) => ({
      id: randomUUID(),
      created_at: now,
      updated_at: now,
      ...item,
    }));
    if (
      table === 'meal_plan_items' &&
      inserted.some((x) =>
        db[table].some(
          (y) =>
            y.meal_plan_id === x.meal_plan_id && y.date === x.date && y.meal_type === x.meal_type
        )
      )
    )
      return send({ message: 'duplicate slot', code: '23505' }, 409);
    db[table].push(...inserted);
    rows = inserted;
  } else if (req.method === 'PATCH') {
    for (const row of rows) Object.assign(row, body, { updated_at: new Date().toISOString() });
  } else if (req.method === 'DELETE') {
    if (
      table === 'recipes' &&
      rows.some((x) => db.meal_plan_items.some((m) => m.recipe_id === x.id))
    )
      return send({ message: 'still referenced by foreign key', code: '23503' }, 409);
    db[table] = db[table].filter((row) => !rows.includes(row));
  }
  if (url.searchParams.get('select')?.includes('ingredients('))
    rows = rows.map((row) => ({
      ...row,
      ingredients: db.ingredients.find((x) => x.id === row.ingredient_id) ?? null,
    }));
  if (url.searchParams.has('order')) {
    const sort = url.searchParams.get('order').split(',');
    rows = [...rows].sort((a, b) => {
      for (const part of sort) {
        const [key, direction] = part.split('.');
        const cmp = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
        if (cmp) return direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }
  if (url.searchParams.has('offset')) rows = rows.slice(Number(url.searchParams.get('offset')));
  if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
  if (req.headers.accept?.includes('vnd.pgrst.object')) {
    if (rows.length !== 1)
      return send(
        {
          message: 'JSON object requested, multiple (or no) rows returned',
          code: 'PGRST116',
          details: `The result contains ${rows.length} rows`,
        },
        406
      );
    return send(rows[0]);
  }
  return send(rows);
});
api.listen(54399, '127.0.0.1');
process.env.VITE_SUPABASE_URL = 'http://localhost:54399';
process.env.VITE_SUPABASE_ANON_KEY = 'local-preview-only';
const vite = await createServer({
  cacheDir: 'node_modules/.vite-local-preview',
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
await vite.listen();
console.log('LOCAL FIXTURES ONLY — http://localhost:5174 — login pregled@primer.rs / Pregled123!');
const close = async () => {
  api.close();
  await vite.close();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
