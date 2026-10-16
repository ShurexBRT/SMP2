# Household invitation emails — SMP-7 (draft, not deployed)

`invite-member` now sends a plain-text household invitation through Resend.
The recipient signs in (or registers and verifies the invited email), then the
existing household claim flow applies. No login token, user creation or password
change is performed by sending an invitation. Existing accounts work the same way.

The function validates the caller with Auth, then reads/writes membership under
the caller JWT and existing RLS. It never needs a service-role key and never
upserts a pending invitation over an existing owner, linked or active membership.
The app can resend pending invitations. A mail failure preserves the invitation
and reports failure; provider acceptance is not claimed to prove inbox delivery.

## Required backend configuration

Before selecting the production delivery adapter, inspect the project's current
SMTP/mail configuration. Resend is a prepared adapter, not an assertion that the
owner already has a Resend account/domain or that it is configured.

Edge Function secrets (not VITE variables):

- `APP_URL=https://shurexbrt.github.io/SMP2/` — fixed HTTPS destination, trailing slash.
- `RESEND_API_KEY` — server-only sending key.
- `INVITE_FROM_EMAIL` — sender on a domain verified with the provider.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — standard Edge environment credentials.

Never paste privileged keys into chat, source, frontend settings or PRs.

Deploy only after the release gates below, using a CLI version whose help has
been checked: `supabase functions deploy invite-member --project-ref roaqvlxnzlzvhksxtqip`.
Keep JWT verification enabled and test OPTIONS preflight through the real gateway.
Frontend calls the standard function name with `supabase.functions.invoke`;
`VITE_INVITE_FUNCTION_URL` is not required.

## Release gates

Result: BLOCKED pending actual SMP2 project access, mail configuration and independent review.

1. Reauthorize the Supabase connector with access to the organization containing
   `roaqvlxnzlzvhksxtqip`. The current connection lists only Maylo and Forge.
2. Verify actual membership constraints/policies with an owner, another member,
   outsider and unconfirmed user. Confirmed recipient must be able to claim only
   their own pending email invitation, without changing role/household.
3. Configure and verify sender/provider. If an existing SMTP service is already
   configured, decide whether to use that adapter instead of introducing Resend.
4. Add a durable server send quota before release (per caller/household and
   recipient); current provider idempotency only deduplicates a single invitation
   in each fixed 10-minute bucket and is not an abuse prevention mechanism.
5. Deno type-check/deploy the real adapter and run browser QA at phone width.
   Fake gateway tests do not validate the Supabase query adapter or RLS.
6. Verify actual mail accepted and received, link to Pages login, new-user signup
   confirmation and existing-user login, claim, retry and provider failure.
   Test with a designated address; do not bulk resend live pending invitations.
7. Independent Reviewer approval required by AGENTS.md. Builder has not granted it.

No schema/policy changes, production deployment or emails sent by this draft.
