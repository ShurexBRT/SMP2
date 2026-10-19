# Remove purchased history — GitHub #11

Result: PASS
Roles: Builder, QA, Release; independent Reviewer returned PASS.

## Change

Purchased plan and manual rows now have a confirmed remove-from-history action. Inventory is unchanged. Existing undo guards still reject debiting missing or consumed stock. An empty meal plan continues to preserve purchase history until the user removes it explicitly.

Deletion filters by household, item ID and expected checked state. Returning a single deleted row prevents silent success if another client changed or removed the item. The existing receipt FK cascade removes bookkeeping; no schema or RLS changes are required.

## Validation

- 25 existing Node tests pass; lint has only two existing Fast Refresh warnings; production build passes with the existing bundle-size warning.
- Extended `supabase/tests/shopping_inventory_sync.sql` passed on the real database, using disposable fixtures and ROLLBACK: removal with existing stock preserves quantity; missing-stock undo stays blocked but history deletion succeeds; expected-state guard preserves an unchecked item; private receipts cascade; deferred FK constraints are checked.
- Local browser: cancel preserves row; confirmed deletion removes purchased manual Kafa and planned Pirinač; inventory still contains Pirinač 0.5 kg afterward. Confirm dialog checked at 390 × 844.
- ARTEMIS exploration was attempted. Its service repeatedly returned 429 errors and did not complete the task; stopped it and ran device diagnostics successfully. No native Android flow pass is claimed. No new UI test script was authored.
- Independent Reviewer found no blocking issues. Copy clarification was incorporated.

## Data / release

Live read confirmed five historical purchased rows without inventory in the user's household. None were removed automatically. User data was not cleaned up; the user can choose which entries to remove after release. Ship the reviewed frontend through GitHub Pages; no database migration is needed.
