import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type MealPlanRow = Database['public']['Tables']['meal_plans']['Row'];
type MealPlanItemRow = Database['public']['Tables']['meal_plan_items']['Row'];
type MealType = MealPlanItemRow['meal_type'];

export async function getMealPlan(params: {
  householdId: string;
  weekStart: string;
}): Promise<MealPlanRow | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('household_id', params.householdId)
    .eq('week_start', params.weekStart)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrCreateMealPlan(params: {
  householdId: string;
  weekStart: string; // YYYY-MM-DD
}): Promise<MealPlanRow> {
  const { householdId, weekStart } = params;

  // Try get existing
  const { data: existing, error: selErr } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('household_id', householdId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  // Create new
  const { data: created, error: insErr } = await supabase
    .from('meal_plans')
    .insert({ household_id: householdId, week_start: weekStart })
    .select('*')
    .single();

  if (insErr?.code === '23505') {
    const plan = await getMealPlan(params);
    if (plan) return plan;
  }
  if (insErr) throw insErr;
  return created;
}

export async function listMealPlanItems(params: {
  householdId: string;
  mealPlanId: string;
}): Promise<MealPlanItemRow[]> {
  const { householdId, mealPlanId } = params;

  const { data, error } = await supabase
    .from('meal_plan_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('meal_plan_id', mealPlanId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertMealPlanItem(params: {
  householdId: string;
  mealPlanId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  recipeId: string;
  servings: number;
}): Promise<MealPlanItemRow> {
  const { householdId, mealPlanId, date, mealType, recipeId, servings } = params;

  if (!Number.isInteger(servings) || servings < 1 || servings > 100)
    throw new Error('Broj porcija mora biti od 1 do 100.');
  const lookup = await supabase
    .from('meal_plan_items')
    .select('id')
    .eq('household_id', householdId)
    .eq('meal_plan_id', mealPlanId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .limit(2);
  if (lookup.error) throw lookup.error;
  if ((lookup.data?.length ?? 0) > 1)
    throw new Error('Ovaj termin ima više obroka. Potrebno je proveriti podatke pre izmene.');
  const existingId = lookup.data?.[0]?.id;
  const payload = {
    household_id: householdId,
    meal_plan_id: mealPlanId,
    date,
    meal_type: mealType,
    recipe_id: recipeId,
    servings,
  };
  const { data, error } = existingId
    ? await supabase
        .from('meal_plan_items')
        .update({ recipe_id: recipeId, servings })
        .eq('household_id', householdId)
        .eq('id', existingId)
        .select('*')
        .single()
    : await supabase.from('meal_plan_items').insert(payload).select('*').single();

  if (error) throw error;
  return data;
}

export async function deleteMealPlanItem(params: {
  householdId: string;
  mealPlanId: string;
  date: string;
  mealType: MealType;
}): Promise<void> {
  const { householdId, mealPlanId, date, mealType } = params;

  const { error } = await supabase
    .from('meal_plan_items')
    .delete()
    .eq('household_id', householdId)
    .eq('meal_plan_id', mealPlanId)
    .eq('date', date)
    .eq('meal_type', mealType);

  if (error) throw error;
}
