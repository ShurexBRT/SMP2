# Smart Meal Planner v2 agent team

Repository-local execution team: Planner -> Builder -> Reviewer -> QA -> Runtime -> Release.

Product truth: household meal-planning PWA with shared Supabase-backed recipes, planner, inventory and shopping flows. Household isolation and RLS are hard boundaries.

All agents read `AGENTS.md`, `.forge/project.json`, `.forge/agent-api.md`, and the Forge ticket first. Product ambiguity becomes a Decision Request.

Supabase note for 2026-09-13: the owner's current Supabase Free organization already has two active projects (`maylo`, `forge`). A third active project for SMP2 cannot be assumed available without an upgrade or pausing/moving a project. Treat backend migration as a planning constraint, not an excuse to mix SMP2 into Maylo/Forge databases.
