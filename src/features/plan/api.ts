import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types";

type MealPlanRow = Database["public"]["Tables"]["meal_plans"]["Row"];
type MealPlanItemRow = Database["public"]["Tables"]["meal_plan_items"]["Row"];
type MealType = MealPlanItemRow["meal_type"];

export async function getOrCreateMealPlan(params: {
  householdId: string;
  weekStart: string; // YYYY-MM-DD
}): Promise<MealPlanRow> {
  const { householdId, weekStart } = params;

  // Try get existing
  const { data: existing, error: selErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("household_id", householdId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  // Create new
  const { data: created, error: insErr } = await supabase
    .from("meal_plans")
    .insert({ household_id: householdId, week_start: weekStart })
    .select("*")
    .single();

  if (insErr) throw insErr;
  return created;
}

export async function listMealPlanItems(params: {
  householdId: string;
  mealPlanId: string;
}): Promise<MealPlanItemRow[]> {
  const { householdId, mealPlanId } = params;

  const { data, error } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("household_id", householdId)
    .eq("meal_plan_id", mealPlanId)
    .order("date", { ascending: true });

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

  // If you have a unique constraint on (meal_plan_id, date, meal_type) you can use upsert safely.
  const { data, error } = await supabase
    .from("meal_plan_items")
    .upsert(
      {
        household_id: householdId,
        meal_plan_id: mealPlanId,
        date,
        meal_type: mealType,
        recipe_id: recipeId,
        servings,
      },
      { onConflict: "meal_plan_id,date,meal_type" }
    )
    .select("*")
    .single();

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
    .from("meal_plan_items")
    .delete()
    .eq("household_id", householdId)
    .eq("meal_plan_id", mealPlanId)
    .eq("date", date)
    .eq("meal_type", mealType);

  if (error) throw error;
}