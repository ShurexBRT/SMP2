# Household creation regression

Ticket: ShurexBRT/SMP2#2. Project: `roaqvlxnzlzvhksxtqip` (SMP2), Maylo's Org.

## Production diagnosis and release, 2026-10-16

The live `public.create_household(text)` function was SECURITY INVOKER. Its
`INSERT INTO households ... RETURNING id` required SELECT permission before the
caller had an active household membership. The membership was inserted only in
the next statement. The pre-fix failure was reproduced under `authenticated`
with server-side claims from an existing confirmed account, then rolled back.

Migration `20261016183954_fix_household_bootstrap_returning.sql` generates the
UUID inside the same function and uses two plain INSERT statements, followed by
returning the local UUID. The live creator policy already permits the first owner
membership. Signature, input checks, invoker security, empty search_path, owner,
ACL, all RLS policies and existing rows are preserved. Independent review passed.

The exact migration SQL was applied and committed through the Supabase Dashboard
SQL Editor. It was not applied through the migration-history API; the repository
migration can safely be replayed with CREATE OR REPLACE during later reconciliation.
Do not assume the historical `supabase/schema.sql` is a complete live-schema dump.

## Verification

Run `household_bootstrap.sql` as an administrator in the SMP2 SQL Editor.
It selects a confirmed account internally, simulates database request claims,
switches to the actual client roles, and ends with ROLLBACK. It prints no user
identity or email and leaves no household or membership rows behind.

The test passed both with the candidate inside a rolled-back transaction and
again against the committed production function:

- authenticated creation and immediate owner/household reads;
- empty/null names, missing identity and missing email rejected;
- unrelated principal cannot read household/members, update the household,
  enroll itself as owner, or insert a recipe into the household;
- anonymous RPC denied; no unexpected partial writes;
- RPC remains SECURITY INVOKER with no anonymous EXECUTE grant.

This is database-role verification, not an end-to-end browser login test. A real
signed-in production user still needs to exercise the unchanged frontend RPC.
The separate Codex MCP OAuth grant was not completed as part of this SQL release.

## Rollback

Only the body of `public.create_household(text)` changed. To restore the former
body, remove `new_household := pg_catalog.gen_random_uuid();` and replace the
household INSERT with:

```sql
insert into public.households(name, created_by)
values (trim(household_name), uid)
returning id into new_household;
```

Keep the rest of the CREATE OR REPLACE definition unchanged. This restores the
known creation bug; it does not delete any user data or change RLS/ACL.
