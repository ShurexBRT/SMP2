# Stitch → SMP2 visual QA

Date: 2026-10-16. Scope: adaptation of the supplied visual direction to the existing, functioning React app; not a pixel clone or a production backend certification.

## Source visual truth

Both supplied ZIPs were inspected. Extracted sources are under:

`C:/Users/Admin/.codex/visualizations/2026/10/16/01a1436b-6c70-74c1-b107-9ecc86a67433/stitch-reference/`

- Mobile: `mobile/stitch_smart_meal_planner_ui_redesign/nedeljni_plan_obroka/screen.png` (335×1600 pixels).
- Recipes: `mobile/stitch_smart_meal_planner_ui_redesign/moji_recepti/screen.png` (502×1600 pixels).
- Desktop: `desktop/stitch_smart_meal_planner_ui_redesign/nedeljni_plan_obroka_desktop_1440px/screen.png` (1345×1600 pixels, despite the folder name).
- Tokens: `desktop/stitch_smart_meal_planner_ui_redesign/warm_culinary_minimalist/DESIGN.md`.

## Rendered implementation and normalization

URL: `http://localhost:5174/`, isolated in-memory fixtures; light theme, authenticated example household, current week with 13/21 planned meals and six recipes. Source dates, users, counts and some recipe names differ; these are expected dynamic content differences, not claimed visual matches.

Evidence directory:

`C:/Users/Admin/.codex/visualizations/2026/10/16/01a1436b-6c70-74c1-b107-9ecc86a67433/smp2-audit/`

- `16-plan-mobile-final-stage.png`: browser screenshot 1280×720, actual iframe 393×650 CSS px at x443.5/y20. Content-only crop `16-plan-mobile-final.png`, 393×650 pixels, approximately 1 screenshot pixel/CSS px; half-pixel crop rounded to x444.
- `13-recipes-mobile-final-stage.png`: same 393×650 content viewport. Content-only crop `13-mobile-final.png`.
- `15-plan-360-stage.png`: 360×650 CSS px iframe at x460/y20, content-only `15-plan-360.png`. Captured before the final reduction in meal-row height; no navigation overflow was observed.
- `11-plan-desktop-final.png`: 1265×712 rendered screenshot, body width 1265 CSS px, desktop seven-column layout. Screenshot density 1:1.
- `10-account-dark-fixed.png`: rendered dark account page after reload; theme persistence verified.

Source mobile images were resized proportionally to 393 px wide and their top 650 px compared to the implementation crop. These exports have differing native widths, so this normalization is approximate; it does not establish an original CSS density. Desktop source and implementation were each resized proportionally to 960 px wide and cropped to their top 540 px. Full long exports are not compared directly with a short browser viewport.

Both source and implementation were opened together in the following combined images:

- `16-plan-final-comparison.png`: final normalized mobile plan.
- `13-final-comparison.png`: normalized mobile recipes.
- `17-desktop-normalized-comparison.png`: desktop top viewport at the same comparison width.
- `18-plan-controls-comparison.png`: readable focused crop of typography, category labels, card padding and portion controls. Larger interactive targets are intentional.

## Findings and comparison history

1. P2, initial mobile plan (`04-plan-mobile-comparison.png`): duplicate page heading, excessive top spacing and short weekday names pushed core content down. Fixed by retaining the H1 accessibly, using the compact header on mobile, reducing spacing and showing full Serbian weekday names. Post-fix: `12-final-comparison.png`, then `16-plan-final-comparison.png` after further meal-row compaction.
2. P2, initial recipes (`06-recipes-mobile-comparison.png`): visible horizontal filter scrollbar reduced polish. Fixed by hiding the scrollbar while preserving horizontal scrolling and keyboard-focusable filter buttons. Post-fix: `13-final-comparison.png`.
3. P2, portion/remove controls: small adjacent targets conflicted on narrow meal cards. Fixed with 44 px portion buttons; mobile removal is a labeled action in the meal picker. The picker opens, Escape closes it, and focus returns to the initiating meal. Post-fix: `08-meal-picker-mobile-stage.png` and `18-plan-controls-comparison.png`.
4. P1, dark theme (`09-account-dark.png`): old body utility classes forced a light canvas and dark text. Removed those classes from `index.html`; semantic color tokens now control background/text. Post-fix: `10-account-dark-fixed.png`, opened and visually checked after reload.
5. P2, interim mobile density (`12-final-comparison.png`): larger touch targets made the first day unnecessarily tall. Kept 44 px controls and compacted the category/title layout. Post-fix: `16-plan-final-comparison.png`; all three first-day meals fit above the bottom navigation in this 393×650 state.

No remaining actionable P0/P1/P2 visual findings were observed in the compared states. This result does not cover every possible data length, browser, or production error state.

## Required fidelity surfaces

- **Fonts/typography:** Inter with system fallback, compact category labels, clear title/metadata hierarchy and wrapping instead of hiding long recipe names. Names/dates use Serbian Latin. Small text remains subordinate to actions. Different title casing and dynamic names are accepted adaptations.
- **Spacing/layout:** rounded 12–18 px controls/cards, restrained borders, consistent form spacing, seven desktop columns and stacked mobile days. Mobile navigation stays visible at 393 and 360 px; lower page content remains reachable by vertical scrolling. The source's tiny steppers were intentionally enlarged.
- **Colors/tokens:** warm `#fafaf7`, white surfaces, sage `#45634a`, soft `#f0f5ee`; semantic variables used consistently. Dark theme has separate foreground/background/border tokens and was checked visually after persistence/reload. Focus outline and reduced-motion support are present.
- **Image/assets:** no recipe photo field/storage exists in the MVP. Unsupported prototype photos and profile portraits were deliberately omitted under the user's instruction to use the design where applicable; no fabricated image availability. Existing Lucide UI icons are kept as standard interface icons. No low-quality generated substitute was introduced.
- **Copy/content:** real query results provide counts, recipes and membership. Fake stock percentages, sync guarantees, zero-waste counters and unsupported actions were omitted. Shopping explains that checking a purchase does not change inventory, and the reconciliation dialog explains already-entered purchases. Household copy explicitly says no invitation email is sent.

## Interaction and console checks

Manual browser checks on the local fixtures covered login error/success, meal selection, portion changes, search by ingredient, recipe creation including ingredients, edit/save/reopen, weekly shopping refresh and repeat, preserving manual/purchased rows, decimal stock, theme reload, picker Escape and focus restoration. Auth/invite negative eligibility also has pure unit checks; live isolation is not inferred from those.

The final desktop tab's console error query returned an empty list. The iframe inspection tab recorded three `MutationObserver.observe` errors without application URL/stack. The app source has no MutationObserver usage; origin was not conclusively established. No corresponding broken UI was observed, but these are retained as an environment diagnostic rather than claiming all console output was clean.

The ARTEMIS automated Android flow did not complete due to service/quota errors and timeout. Responsive browser checks are not labeled Android end-to-end verification. Live Supabase RLS, household acceptance, redirects and transactions remain release gates in `IMPLEMENTATION_HANDOFF.md`.

## Implementation checklist

- [x] Compare supplied source and rendered implementation together.
- [x] Iterate on heading density, scrolling, touch targets and dark contrast.
- [x] Open final full-view and focused comparison evidence.
- [x] Keep dynamic data and existing HashRouter architecture.
- [x] Run local functional checks and record limitations.
- [ ] Before production: real Supabase/RLS and two-user integration verification.

Follow-up P3: optimize route bundle size; add real images only with a separately designed data/storage flow. Neither is represented as implemented.

final result: passed
