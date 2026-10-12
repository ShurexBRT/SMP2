# Smart Meal Planner v2 (React + TS + Supabase)

Modern rewrite of the original Smart Meal Planner, built with:
- React + TypeScript + Vite
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- TanStack Query (React Query)
- React Hook Form + Zod
- HashRouter for GitHub Pages

## Current backend

SMP2 uses the dedicated Supabase project:

- Project ref: `roaqvlxnzlzvhksxtqip`
- Project URL: `https://roaqvlxnzlzvhksxtqip.supabase.co`
- Client auth uses the project publishable key only. Never put a secret/service-role key in frontend code.

The database contains household-scoped tables for recipes, meal planning, inventory and shopping. RLS is enabled on all public app tables.

## Authentication and redirects

Production app URL:

`https://shurexbrt.github.io/SMP2/`

The app uses `HashRouter`, and signup confirmation redirects to:

`https://shurexbrt.github.io/SMP2/#/auth/callback`

In **Supabase → Authentication → URL Configuration** set:

- **Site URL:** `https://shurexbrt.github.io/SMP2/`
- **Redirect URLs:** add `https://shurexbrt.github.io/SMP2/#/auth/callback`

For local development you may additionally allow `http://localhost:5173/**`.

## Household onboarding

After authentication:

1. A user without a household lands on `/account`.
2. Household creation goes through the `create_household` database function so household + owner membership are created atomically.
3. Owner invites are stored in `household_members` by email.
4. If the invited Auth user already exists, the membership is linked immediately by a database trigger.
5. If the Auth user is created later, an `auth.users` trigger links the pending invite automatically.

## Environment

Copy `.env.example` to `.env` for local development.

Required frontend values:

```bash
VITE_SUPABASE_URL="https://roaqvlxnzlzvhksxtqip.supabase.co"
VITE_SUPABASE_ANON_KEY="<publishable key>"
```

`VITE_INVITE_FUNCTION_URL` is optional and currently unused by the MVP invite flow.

## Run locally

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Deploy

Pushes to `main` deploy through GitHub Actions to GitHub Pages. The Pages build is wired to the new SMP2 Supabase project.

## Scope notes

- Nutrition remains later/placeholder scope.
- Recipe images are not part of the current MVP unless separately ticketed.
