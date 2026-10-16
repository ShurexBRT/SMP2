Result: BLOCKED
Ticket: SMP-7 / GitHub #7
Role: Builder
Changed/inspected:
- Account invitation action invokes server function; pending entries have resend.
- Server verifies identity and active ownership by user_id under caller RLS.
- Plain invitation directs both new/existing users to normal Pages login.
- Prepared Resend adapter; actual existing provider/SMTP still unknown.
- Active/owner/linked memberships cannot be overwritten.
- Failed sends retain pending entry and display error, provider acceptance is explicit.
Validation:
- npm ci --ignore-scripts succeeded; npm test 35/35, lint 0 errors (2 existing warnings), production build passed.
- Tests include owner denial, unverified identity, CORS, pending retry, active/owner preservation, malformed input, provider failure and missing configuration.
- Existing test harness emits Vite websocket-port/build-cancel diagnostics but exits successfully; no browser/Deno/live proof is inferred.
- Live gateway, Deno adapter, browser email flow, RLS and receipt remain unverified.
Data/RLS risks:
- No schema/policy changes or service-role access.
- Existing production RLS/constraints need inspection after connector reconnection.
- Durable abuse/send quotas still required before release; provider dedup is limited.
Next owner/action:
- Reconnect SMP2 organization, inspect existing mail setup, configure adapter,
  complete release gates in supabase/functions/README.md and independent review.
