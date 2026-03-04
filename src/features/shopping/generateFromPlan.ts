import { supabase } from "@/lib/supabase";
import { getOrCreateShoppingList, clearPlanItemsFromList } from "@/features/shopping/api";
import { getOrCreateMealPlan, listMealPlanItems } from "@/features/plan/api";
import { listRecipeIngredients } from "@/features/recipes/ingredientsApi";
import { getRecipe } from "@/features/recipes/api";

export async function generateShoppingFromWeek(params: {
  householdId: string;
  weekStart: string; // YYYY-MM-DD
  overwrite: boolean; // delete existing plan items in list then insert
}): Promise<{ shoppingListId: string; inserted: number }> {
  const { householdId, weekStart, overwrite } = params;

  // ensure meal_plan exists
  const plan = await getOrCreateMealPlan({ householdId, weekStart });
  const items = await listMealPlanItems({ householdId, mealPlanId: plan.id });

  const list = await getOrCreateShoppingList({ householdId, weekStart });

  if (overwrite) {
    await clearPlanItemsFromList({ householdId, shoppingListId: list.id });
  }

  // Existing items (used for append mode so we don't duplicate rows)
  const { data: existingItems, error: exErr } = await supabase
    .from("shopping_list_items")
    .select("id, label, unit, qty, checked, source")
    .eq("household_id", householdId)
    .eq("shopping_list_id", list.id);

  if (exErr) throw exErr;

  const existingMap = new Map<
    string,
    { id: string; qty: number | null; unit: string | null; checked: boolean; source: string; label: string }
  >();

  for (const r of existingItems ?? []) {
    const label = (r as any).label as string;
    const unit = ((r as any).unit ?? "").toString() || null;
    const key = `${label.toLowerCase()}|${unit ?? ""}`;
    existingMap.set(key, {
      id: (r as any).id,
      qty: (r as any).qty ?? null,
      unit,
      checked: !!(r as any).checked,
      source: (r as any).source,
      label,
    });
  }

  // Aggregate needed ingredients from plan
  const agg = new Map<string, { label: string; unit: string | null; qty: number }>();

  for (const it of items) {
    const recipe = await getRecipe(householdId, it.recipe_id);
    const rIngs = await listRecipeIngredients({ householdId, recipeId: recipe.id });

    for (const ri of rIngs) {
      // qty scaled by servings ratio
      const ratio = (it.servings ?? 1) / (recipe.default_servings ?? 1);
      const qty = Number(ri.qty || 0) * ratio;

      const label = ri.ingredient_name;
      const unit = ri.unit ?? null;
      const key = `${label.toLowerCase()}|${unit ?? ""}`;

      const prev = agg.get(key);
      if (!prev) agg.set(key, { label, unit, qty });
      else agg.set(key, { ...prev, qty: prev.qty + qty });
    }
  }

  const payload = Array.from(agg.values()).map((x) => ({
    household_id: householdId,
    shopping_list_id: list.id,
    ingredient_id: null,
    label: x.label,
    qty: Number.isFinite(x.qty) ? Math.round(x.qty * 100) / 100 : null,
    unit: x.unit,
    category: "General",
    checked: false,
    source: "plan" as const,
  }));

  if (!payload.length) return { shoppingListId: list.id, inserted: 0 };

  // Merge behavior:
  // - overwrite=true already cleared old plan items, so this becomes mostly inserts.
  // - overwrite=false merges quantities if an item already exists.
  const toInsert: typeof payload = [];
  const toUpdate: { id: string; qty: number | null }[] = [];

  for (const p of payload) {
    const unit = (p.unit ?? "").toString() || null;
    const key = `${p.label.toLowerCase()}|${unit ?? ""}`;
    const ex = existingMap.get(key);

    if (!ex) {
      toInsert.push(p);
      continue;
    }

    const a = typeof ex.qty === "number" && isFinite(ex.qty) ? ex.qty : 0;
    const b = typeof p.qty === "number" && isFinite(p.qty) ? p.qty : 0;
    const next = a + b;

    toUpdate.push({ id: ex.id, qty: next });
  }

  if (toInsert.length) {
    const { error: insErr } = await supabase.from("shopping_list_items").insert(toInsert);
    if (insErr) throw insErr;
  }

  for (const u of toUpdate) {
    const { error } = await supabase
      .from("shopping_list_items")
      .update({ qty: u.qty })
      .eq("household_id", householdId)
      .eq("id", u.id);
    if (error) throw error;
  }

  return { shoppingListId: list.id, inserted: toInsert.length };
}