import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types";
import { getOrCreateShoppingList, clearPlanItemsFromList } from "@/features/shopping/api";

type PlanItemRow = Database["public"]["Tables"]["meal_plan_items"]["Row"];

export async function generateShoppingFromWeek(params: {
  householdId: string;
  weekStart: string; // YYYY-MM-DD
  overwrite: boolean; // delete existing plan items in list then insert
}): Promise<{ shoppingListId: string; inserted: number }> {
  const { householdId, weekStart, overwrite } = params;

  const list = await getOrCreateShoppingList({ householdId, weekStart });

  if (overwrite) {
    await clearPlanItemsFromList({ householdId, shoppingListId: list.id });
  }

  // 1) fetch plan items for the week
  const start = weekStart;
  const end = addDaysISO(weekStart, 7);

  const { data: planItems, error: planErr } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("household_id", householdId)
    .gte("date", start)
    .lt("date", end);

  if (planErr) throw planErr;

  const items = (planItems ?? []) as PlanItemRow[];
  if (!items.length) {
    return { shoppingListId: list.id, inserted: 0 };
  }

  // 2) fetch recipe ingredients for all recipe ids
  const recipeIds = Array.from(new Set(items.map((x) => x.recipe_id)));

  const { data: ri, error: riErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, ingredient_id, qty, unit, optional, ingredients(name, default_unit)")
    .eq("household_id", householdId)
    .in("recipe_id", recipeIds);

  if (riErr) throw riErr;

  // 3) aggregate by ingredient_name + unit
  const agg = new Map<string, { label: string; qty: number | null; unit: string | null; category: string }>();

  for (const row of (ri ?? []) as any[]) {
    if (row.optional) continue;

    const label = row.ingredients?.name ?? "—";
    const unit = (row.unit ?? row.ingredients?.default_unit ?? "").toString() || null;

    // servings scaling: recipes are per 1 serving by default in your import.
    // If later you set default_servings, we'll scale properly (next sprint).
    const qty = Number(row.qty ?? 0);

    const key = `${label.toLowerCase()}|${unit ?? ""}`;
    const prev = agg.get(key);
    if (!prev) {
      agg.set(key, { label, qty: isFinite(qty) ? qty : null, unit, category: "Ostalo" });
    } else {
      const a = prev.qty ?? 0;
      prev.qty = (isFinite(a) ? a : 0) + (isFinite(qty) ? qty : 0);
    }
  }

  const payload = Array.from(agg.values()).map((x) => ({
    household_id: householdId,
    shopping_list_id: list.id,
    ingredient_id: null,
    label: x.label,
    qty: x.qty,
    unit: x.unit,
    category: x.category,
    checked: false,
    source: "plan" as const,
  }));

  if (!payload.length) return { shoppingListId: list.id, inserted: 0 };

  const { error: insErr } = await supabase.from("shopping_list_items").insert(payload);
  if (insErr) throw insErr;

  return { shoppingListId: list.id, inserted: payload.length };
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}