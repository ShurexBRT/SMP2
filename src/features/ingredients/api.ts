import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types";

type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"];
type IngredientInsert = Database["public"]["Tables"]["ingredients"]["Insert"];

export async function listIngredients(householdId: string): Promise<IngredientRow[]> {
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("household_id", householdId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertIngredientByName(params: {
  householdId: string;
  name: string;
  defaultUnit?: string;
}): Promise<IngredientRow> {
  const name = params.name.trim();
  if (!name) throw new Error("Ingredient name required");

  // try find existing by case-insensitive match
  const { data: existing, error: selErr } = await supabase
    .from("ingredients")
    .select("*")
    .eq("household_id", params.householdId)
    .ilike("name", name)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  const row: IngredientInsert = {
    household_id: params.householdId,
    name,
    default_unit: (params.defaultUnit ?? "kom").trim(),
  };

  const { data, error } = await supabase.from("ingredients").insert(row).select("*").single();
  if (error) throw error;
  return data;
}