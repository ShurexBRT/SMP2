# Smart Meal Planner v2 — Agent Operating Contract

Smart Meal Planner v2 is a React + TypeScript meal-planning PWA with Supabase-backed household data.

Forge is the work-truth layer for agent tasks. GitHub is code truth.

## Before acting

1. Read the Forge ticket and acceptance criteria.
2. Read this file and `.forge/project.json`.
3. Inspect the current household/data flow before editing.
4. Keep the task scoped and preserve unrelated user data behavior.
5. Do not let Builder approve its own work.

Until Forge Cloud is connected, GitHub issues/PRs are the temporary claim/handoff mechanism.

## Product truth

Current architecture includes:

- React + TypeScript + Vite;
- Supabase Auth + Postgres + RLS;
- shared household model for partners;
- meal planning, recipes, inventory and shopping data;
- invite Edge Function;
- TanStack Query;
- React Hook Form + Zod;
- HashRouter for GitHub Pages compatibility.

Nutrition remains a later/placeholder area and recipe images are not part of the current MVP unless explicitly ticketed.

## Supabase/security rules

- Every household-scoped row must remain correctly isolated by `household_id`/membership rules.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Service-role access belongs only in trusted server/Edge Function code.
- Do not weaken RLS to fix frontend behavior.
- Auth and invite changes require negative-case testing.
- Schema/RLS changes require verification against the actual database model.

## Router/Pages rules

The app uses `HashRouter` specifically for GitHub Pages compatibility. Do not replace it with history routing inside a normal feature ticket without a deployment plan and explicit approval.

## High-risk surfaces

- household creation/membership/invites;
- RLS ownership/scoping;
- meal-plan writes and date logic;
- inventory/shopping synchronization;
- recipe schema changes;
- auth callback/session behavior;
- Edge Function invite flow;
- GitHub Pages routing/base paths.

## Agent roles

### Planner
Inspects current data shape, household scope, RLS and affected user flow. Defines the smallest safe plan. Does not implement production code.

### Builder
Implements the approved scope using existing React Query/form patterns. Cannot approve itself or bypass RLS for convenience.

### Reviewer
Checks data isolation, stale-cache/state problems, form validation, routing regressions, RLS risk and scope creep.

### QA
Validates acceptance criteria, empty/error states, household isolation and neighboring planner/inventory/shopping behavior where relevant.

### Browser
Exercises the real user flow at desktop and phone width when UI is touched. For auth/invite work, validate the actual redirect/state flow as far as the test environment safely permits.

### Release
Validates lint/build and GitHub Pages compatibility. Database/Edge Function deployment changes require explicit release notes/evidence.

## Validation gates

Minimum for code changes:

```bash
npm install
npm run lint
npm run build
```

Run focused browser validation for the changed flow. Supabase policy/schema work must be verified against actual queries rather than assumed from SQL text.

## Definition of done

A Smart Meal Planner ticket is done only when:

- acceptance criteria are verified;
- lint/build pass;
- household scoping and RLS impact are checked when relevant;
- mobile/Pages behavior is checked for UI/routing changes;
- no service secret is exposed;
- no unrelated MVP scope is added;
- structured handoff evidence exists.

## Required handoff

```text
Result: PASS | FAIL | BLOCKED | CHANGES REQUESTED
Ticket: SMP-<n>
Role: <role>
Changed/inspected:
- ...
Validation:
- ...
Data/RLS risks:
- ...
Next owner/action:
- ...
```
