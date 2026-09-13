# Forge agent runtime

Project key: `SMP`
Gateway: `https://yljhffprkprbgjdaarqi.supabase.co/functions/v1/agent-gateway`
Secret: `FORGE_AGENT_TOKEN`

Read `AGENTS.md` and `.forge/project.json` before work.

Standard loop: `next_ticket` -> `claim` -> work -> `handoff`.

Use `decision_request` when household behavior, planner semantics or product scope is unclear. Never bypass RLS/household isolation, expose service-role credentials, replace HashRouter without an explicit deployment plan, or store/print the raw agent token.

Gateway details and handoff schema are documented in the Forge repository under `docs/AGENT-GATEWAY.md`.