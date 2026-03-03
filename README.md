# Smart Meal Planner v2 (React + TS + Supabase)

Modern rewrite of the original Smart Meal Planner, built with:
- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth Magic Link + Postgres + RLS)
- TanStack Query (React Query)
- React Hook Form + Zod
- HashRouter (GitHub Pages friendly)

## 0) Prerequisites
- Node.js 18+ (recommended 20+)
- A Supabase project (free tier is fine)

## 1) Setup Supabase
1. Create a new Supabase project.
2. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
3. Deploy the Edge Function (for email invite):
   - `supabase/functions/invite-member/index.ts`
   - Then set environment variables for the function (see below).

### Required secrets / env
In Supabase project settings:
- **Project URL**
- **Anon public key**

For the Edge Function:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

> The service role key must NEVER be used in the frontend. Only in the Edge Function.

## 2) Configure app env
Copy `.env.example` to `.env` and fill:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_INVITE_FUNCTION_URL` (Edge Function URL, optional but recommended)

## 3) Run locally
```bash
npm install
npm run dev
```

## 4) Build
```bash
npm run build
npm run preview
```

## 5) Deploy to GitHub Pages
This project uses HashRouter, so it plays nicely with GitHub Pages.

Typical flow:
1. Build: `npm run build`
2. Deploy `dist/` (use any GH Pages deploy method)

## App flow (high level)
- Auth: Magic link (email OTP)
- Household: one household shared by partners (recipes/plan/inventory/shopping shared)
- Invite: the household owner can invite by email (Edge Function sends invite + creates membership record)
- Sync: everything is scoped by `household_id`

## Notes
- Nutrition is placeholder for later (v2 scope).
- Recipe images not included in MVP (text only).
