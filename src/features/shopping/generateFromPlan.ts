import { supabase } from '@/lib/supabase';
import { getOrCreateShoppingList, listShoppingItems } from './api';
import { listInventory } from '@/features/inventory/api';
import { reconcileShopping, type Demand } from './calculate';
import { todayISO } from '@/lib/utils';
import type { Row } from '@/lib/data';
import { allRows } from '@/lib/paginate';

export async function generateShoppingFromWeek({
  householdId,
  weekStart,
  purchasedInInventoryIds = [],
}: {
  householdId: string;
  weekStart: string;
  purchasedInInventoryIds?: string[];
}) {
  // Read every input before writing. Merely viewing a week never creates a plan.
  const { data: plan, error: planError } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('household_id', householdId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (planError) throw planError;
  const items = plan
    ? await allRows((from, to) =>
        supabase
          .from('meal_plan_items')
          .select('*')
          .eq('household_id', householdId)
          .eq('meal_plan_id', plan.id)
          .order('id')
          .range(from, to)
      )
    : ([] as Row<'meal_plan_items'>[]);
  const recipeIds = [...new Set(items.map((x) => x.recipe_id))];
  const [recipeRows, ingredientRows, inventory] = await Promise.all([
    recipeIds.length
      ? allRows((from, to) =>
          supabase
            .from('recipes')
            .select('*')
            .eq('household_id', householdId)
            .in('id', recipeIds)
            .order('id')
            .range(from, to)
        )
      : Promise.resolve([] as Row<'recipes'>[]),
    recipeIds.length
      ? allRows((from, to) =>
          supabase
            .from('recipe_ingredients')
            .select('*')
            .eq('household_id', householdId)
            .in('recipe_id', recipeIds)
            .order('id')
            .range(from, to)
        )
      : Promise.resolve([] as Row<'recipe_ingredients'>[]),
    listInventory(householdId),
  ]);
  const recipes = new Map(recipeRows.map((r) => [r.id, r]));
  const ingredientIds = [...new Set(ingredientRows.map((x) => x.ingredient_id))];
  const catalogue: Row<'ingredients'>[] = [];
  for (let offset = 0; offset < ingredientIds.length; offset += 100) {
    const batch = ingredientIds.slice(offset, offset + 100);
    catalogue.push(
      ...(await allRows((from, to) =>
        supabase
          .from('ingredients')
          .select('*')
          .eq('household_id', householdId)
          .in('id', batch)
          .order('id')
          .range(from, to)
      ))
    );
  }
  const names = new Map(catalogue.map((x) => [x.id, x.name]));
  const demand: Demand[] = [];
  for (const item of items) {
    const recipe = recipes.get(item.recipe_id);
    if (!recipe || recipe.default_servings <= 0)
      throw new Error('Recept iz plana nije dostupan. Proveri plan pre osvežavanja liste.');
    const recipeIngredients = ingredientRows.filter((x) => x.recipe_id === recipe.id);
    if (!recipeIngredients.length)
      throw new Error(`Recept „${recipe.name}“ nema sastojke. Dopuni ga pre osvežavanja kupovine.`);
    for (const ingredient of recipeIngredients.filter((x) => !x.optional)) {
      const label = names.get(ingredient.ingredient_id);
      if (!label) throw new Error('Naziv sastojka nije dostupan. Osveži recepte i pokušaj ponovo.');
      demand.push({
        label,
        ingredientId: ingredient.ingredient_id,
        qty: (Number(ingredient.qty) * item.servings) / recipe.default_servings,
        unit: ingredient.unit,
        date: item.date,
      });
    }
  }
  const list = await getOrCreateShoppingList({ householdId, weekStart });
  const existing = await listShoppingItems({ householdId, shoppingListId: list.id });
  const changes = reconcileShopping(
    demand,
    inventory.map((x) => ({
      name: x.ingredients?.name ?? '',
      qty: Number(x.qty),
      unit: x.unit,
      expiresAt: x.expires_at,
    })),
    existing,
    todayISO(),
    purchasedInInventoryIds
  );
  const toPayload = (item: Demand) => ({
    label: item.label,
    qty: item.qty,
    unit: item.unit,
    ingredient_id: item.ingredientId,
  });
  // Non-destructive writes first; stale rows are removed only after those writes succeed.
  if (changes.inserts.length) {
    const { error } = await supabase.from('shopping_list_items').insert(
      changes.inserts.map((item) => ({
        ...toPayload(item),
        household_id: householdId,
        shopping_list_id: list.id,
        category: 'Ostalo',
        checked: false,
        source: 'plan' as const,
      }))
    );
    if (error) throw error;
  }
  for (const { id, item } of changes.updates) {
    const { error } = await supabase
      .from('shopping_list_items')
      .update(toPayload(item))
      .eq('household_id', householdId)
      .eq('shopping_list_id', list.id)
      .eq('source', 'plan')
      .eq('checked', false)
      .eq('id', id);
    if (error) throw error;
  }
  if (changes.deletes.length) {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('household_id', householdId)
      .eq('shopping_list_id', list.id)
      .eq('source', 'plan')
      .eq('checked', false)
      .in('id', changes.deletes);
    if (error) throw error;
  }
  return {
    shoppingListId: list.id,
    inserted: changes.inserts.length,
    updated: changes.updates.length,
    removed: changes.deletes.length,
  };
}
