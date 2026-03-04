import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types";

type RecipeIngRow = Database["public"]["Tables"]["recipe_ingredients"]["Row"];
type RecipeIngInsert = Database["public"]["Tables"]["recipe_ingredients"]["Insert"];

export async function listRecipeIngredients(params: {
  householdId: string;
  recipeId: string;
}): Promise<(RecipeIngRow & { ingredient_name: string })[]> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("*, ingredients(name)")
    .eq("household_id", params.householdId)
    .eq("recipe_id", params.recipeId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    ingredient_name: r.ingredients?.name ?? "—",
  }));
}

export async function addRecipeIngredient(params: {
  householdId: string;
  recipeId: string;
  ingredientId: string;
  qty: number;
  unit: string;
  optional: boolean;
}): Promise<void> {
  const row: RecipeIngInsert = {
    household_id: params.householdId,
    recipe_id: params.recipeId,
    ingredient_id: params.ingredientId,
    qty: params.qty,
    unit: params.unit,
    optional: params.optional,
  };

  const { error } = await supabase.from("recipe_ingredients").insert(row);
  if (error) throw error;
}

export async function updateRecipeIngredient(params: {
  householdId: string;
  id: string;
  qty: number;
  unit: string;
  optional: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("recipe_ingredients")
    .update({ qty: params.qty, unit: params.unit, optional: params.optional })
    .eq("household_id", params.householdId)
    .eq("id", params.id);

  if (error) throw error;
}

export async function deleteRecipeIngredient(params: { householdId: string; id: string }): Promise<void> {
  const { error } = await supabase.from("recipe_ingredients").delete().eq("household_id", params.householdId).eq("id", params.id);
  if (error) throw error;
}