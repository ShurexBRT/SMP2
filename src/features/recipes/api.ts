import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type RecipeUpdate = Database["public"]["Tables"]["recipes"]["Update"];

export async function listRecipes(householdId: string): Promise<RecipeRow[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("household_id", householdId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecipe(householdId: string, id: string): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("household_id", householdId)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createRecipe(row: RecipeInsert): Promise<RecipeRow> {
  // Safety defaults (da ne šaljemo undefined gde ne treba)
  const payload: RecipeInsert = {
    ...row,
    steps: row.steps ?? [],
    tags: row.tags ?? [],
    prep_minutes: row.prep_minutes ?? null,
    cook_minutes: row.cook_minutes ?? null,
    notes: row.notes ?? null,
  };

  const { data, error } = await supabase.from("recipes").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateRecipe(
  householdId: string,
  id: string,
  patch: RecipeUpdate
): Promise<RecipeRow> {
  const payload: RecipeUpdate = {
    ...patch,
    // Normalize optional fields if provided as undefined
    ...(patch.prep_minutes === undefined ? {} : { prep_minutes: patch.prep_minutes }),
    ...(patch.cook_minutes === undefined ? {} : { cook_minutes: patch.cook_minutes }),
    ...(patch.notes === undefined ? {} : { notes: patch.notes }),
    ...(patch.tags === undefined ? {} : { tags: patch.tags }),
    ...(patch.steps === undefined ? {} : { steps: patch.steps }),
  };

  const { data, error } = await supabase
    .from("recipes")
    .update(payload)
    .eq("household_id", householdId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecipe(householdId: string, id: string): Promise<void> {
  const { error } = await supabase.from("recipes").delete().eq("household_id", householdId).eq("id", id);
  if (error) throw error;
}