# Shopping → inventory release, 2026-10-19

Result: PASS (shopping sync); email delivery remains BLOCKED on provider configuration.
Ticket: GitHub #9; partial assistance for #7.
Roles: Builder, QA, Release; independent Reviewer returned PASS.

## Behavior

- A new purchase credits household inventory in the same transaction as the checkbox update.
- kg/g, l/ml and piece aliases convert to the existing inventory unit. Incompatible units fail without changing either row.
- Items without a positive quantity ask for quantity and unit before purchase.
- A persisted server-owned marker prevents counting purchases twice when refreshing the plan. Existing checked rows are not retroactively credited.
- Undo reverses the recorded amount once. Missing, reduced, or incompatible stock prevents unsafe undo. This is a quantity safeguard, not lot-level consumption tracking.
- Deleting shopping history leaves physical stock intact; its private receipt is removed by FK cascade.
- Existing RLS stays in place. Receipt access is private, revoked from API roles; the security advisor's no-policy INFO on that private table is deliberate deny-by-default.

## Evidence

- Migration `20261019070204_sync_purchased_items_to_inventory.sql` applied to project `roaqvlxnzlzvhksxtqip`.
- `supabase/tests/shopping_inventory_sync.sql` executed on that database: PASS. Disposable fixtures rolled back, deferred FKs checked before rollback. Includes checked INSERT, conversion, retry, marker tampering, immutable purchase fields, undo, consumed-stock rollback, incompatible units, new manual ingredient, missing quantity and household isolation.
- 25 Node tests passed, including automatic purchase reconciliation and shared-link Pages base path regression.
- Lint: no errors, two existing Fast Refresh warnings. Build: passes, existing bundle-size warning.
- Local fixture browser: add without quantity → dialog; cancel leaves unchecked; zero rejected; positive quantity saves; undo returns to needed list. Phone-width viewport checked at 390 × 844.
- Android ARTEMIS was attempted; model response timeout prevented completing device QA. No Android end-to-end pass claimed.
- Independent reviewer inspected SQL and client changes and ran 17 relevant tests: PASS after correcting the initial shared-link base-path issue.

## Invitations

Sandra's membership invitation exists (2026-10-16), but membership insertion never sent an email. Custom SMTP is OFF and no invite Edge Function is deployed. This release does not send email or claim delivery.

Owners can share an existing pending invitation through the device share sheet, or clipboard when Web Share is unavailable. The link contains no access token, preserves `/SMP2/`, and does not bypass confirmed-email membership checks. Registration email still needs a working mail provider. Native share-sheet delivery was not verified in the embedded QA browser.

Supabase's default mail service only sends to organization team addresses (currently 2 messages/hour): https://supabase.com/docs/guides/auth/auth-smtp . Do not add household members to the Supabase admin team as a workaround. Resend preparation is paused because the user has no owned domain. No paid service, domain, or server was purchased.

## Remaining risks / next owner

- Release: merge reviewed PR, require CI, verify GitHub Pages deployment.
- Email: choose a provider the user can authorize; configure SMTP securely, deploy/test an owner-only email endpoint, then validate delivery. #7 remains open.
- Existing multi-request shopping generation uses a snapshot; this release does not serialize the whole generation flow with concurrent purchases.
- Existing leaked-password-protection warning remains unrelated to this migration.
