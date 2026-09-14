# Smart Meal Planner v2 Project Context

- ChatGPT Project: Smart Meal Planner v2
- Forge key: SMP
- Repository: ShurexBRT/SMP2
- Code truth: GitHub repository
- Work truth: Forge tickets
- Knowledge/product context: ChatGPT Project `Smart Meal Planner v2`
- Product direction: Defined
- Escalation: Agent -> Orchestrator -> PM -> Owner

## Product truth
Smart Meal Planner v2 is a React/TypeScript household meal-planning PWA with Supabase-backed shared household data, recipes, meal planning, inventory and shopping flows.

## Current infrastructure constraint
The connected Supabase Free organization already has two active projects: Maylo and Forge. SMP2 cannot simply consume a third active Free slot there. The repository also references an older Supabase project that is not visible in the currently connected organization. Backend recovery/export or hosting strategy must be resolved before destructive backend changes.

## Mandatory execution context
Agents must read `AGENTS.md`, `.forge/project.json`, `.forge/agents/<role>.md` and this file. Household scoping, RLS, auth/invite flow, HashRouter/GitHub Pages compatibility and data preservation are mandatory risk checks.

## Product decision rule
Do not mix SMP2 tables into Maylo or Forge databases. Do not replace the backend blindly. Backend migration/recovery requires a specific Forge ticket and PM/owner approval if data loss or paid infrastructure is involved.
