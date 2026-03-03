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
  const { data, error } = await supabase.from("recipes").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateRecipe(householdId: string, id: string, patch: RecipeUpdate): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from("recipes")
    .update(patch)
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