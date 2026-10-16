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

The source schema defines household-scoped tables for recipes, meal planning, inventory and shopping, with RLS policies. The current production schema and effective permissions must be checked on the actual project before release; source SQL alone does not prove isolation.

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
4. The client first reads an active membership by user ID. For a legacy pending invitation it verifies the signed-in user with Auth, requires a confirmed matching email, and attempts to claim only that unlinked invitation under RLS.
5. Production triggers, `create_household`, and claim policies require live verification. Their complete definitions are not reproduced by the checked-in schema. This UI does not send invitation emails.

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
npm test
npm run build
```

## Deploy

Pushes to `main` deploy through GitHub Actions to GitHub Pages. The Pages build is wired to the new SMP2 Supabase project.

## Scope notes

- Nutrition remains later/placeholder scope.
- Recipe images are not part of the current MVP unless separately ticketed.

## Stitch redesign and local review

The existing React application now uses the supplied Stitch visual direction: warm off-white, sage green, Inter, shared form/dialog components and mobile bottom navigation. All recipe, planner, stock and shopping content still comes through the existing data layer.

For an isolated review with disposable example data:

```bash
npm ci
npm run preview:local
```

Open `http://localhost:5174/` and sign in with `pregled@primer.rs` / `Pregled123!`. The local API uses port 54399, holds fixtures only in memory, and never forwards requests to Supabase. Restarting resets the fixtures. It does not emulate RLS or prove production compatibility. It is not included in the Vite production bundle.

See [implementation handoff](IMPLEMENTATION_HANDOFF.md) for fixes and outstanding release gates, and [visual QA](design-qa.md) for screenshot evidence.

## PWA installation

The app now includes a relative-scope manifest, PNG icons, a network-only service worker and an install action under Account. Chrome can offer installation when its installability checks pass. The worker does not cache private pages, Auth or API responses. It shows a retry page if navigation fails; editing and household data still require a connection.

For the Android emulator, use loopback port forwarding and open `http://localhost:5174/` while `npm run preview:local` is running:

```bash
adb -s emulator-5554 reverse tcp:5174 tcp:5174
adb -s emulator-5554 reverse tcp:54399 tcp:54399
```

Use the current device serial shown by `adb devices -l`. A plain HTTP LAN IP or `10.0.2.2` URL is not equivalent to localhost for PWA secure-context checks. Chrome's Account install action or browser menu opens the native install dialog. Browser/OS support controls whether the result is a WebAPK or a launcher shortcut; this repo does not create an Android APK itself.

The public GitHub Pages app continues to show the previous version until an explicitly authorized release. Local installation does not deploy the redesign.
