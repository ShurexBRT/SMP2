import { supabase } from '@/lib/supabase';
import type { Row } from '@/lib/data';
import { upsertIngredientByName } from '@/features/ingredients/api';
import { convertQuantity } from '@/lib/quantities';
import { allRows } from '@/lib/paginate';

export type InventoryItem = Row<'inventory_items'> & { ingredients: { name: string } | null };
export async function listInventory(householdId: string): Promise<InventoryItem[]> {
  const data = await allRows((from, to) =>
    supabase
      .from('inventory_items')
      .select('*, ingredients(name)')
      .eq('household_id', householdId)
      .order('updated_at', { ascending: false })
      .order('id')
      .range(from, to)
  );
  return (data ?? []) as unknown as InventoryItem[];
}
export async function saveInventoryItem(params: {
  householdId: string;
  id?: string;
  name: string;
  qty: number;
  unit: string;
  minQty: number | null;
  expiresAt: string | null;
}) {
  const { householdId, id, qty, unit, minQty, expiresAt } = params;
  if (!Number.isFinite(qty) || qty < 0 || !unit.trim())
    throw new Error('Proveri količinu i jedinicu mere.');
  if (id) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ qty, unit, min_qty: minQty, expires_at: expiresAt })
      .eq('household_id', householdId)
      .eq('id', id);
    if (error) throw error;
    return;
  }
  const ingredient = await upsertIngredientByName({
    householdId,
    name: params.name,
    defaultUnit: unit,
  });
  const { data: existing, error: readError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('ingredient_id', ingredient.id)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) {
    const converted = convertQuantity(qty, unit, existing.unit);
    if (converted == null)
      throw new Error(
        `Namirnica već postoji u jedinici „${existing.unit}“. Izmeni postojeću stavku.`
      );
    const { error } = await supabase
      .from('inventory_items')
      .update({
        qty: Number(existing.qty) + converted,
        min_qty: minQty == null ? existing.min_qty : convertQuantity(minQty, unit, existing.unit),
        // One row represents the combined stock: retain the earliest known expiry.
        expires_at:
          expiresAt && (!existing.expires_at || expiresAt < existing.expires_at)
            ? expiresAt
            : existing.expires_at,
      })
      .eq('household_id', householdId)
      .eq('id', existing.id)
      .eq('qty', existing.qty)
      .eq('updated_at', existing.updated_at)
      .select('id')
      .single();
    if (error)
      throw new Error(
        'Zaliha je u međuvremenu promenjena ili nije sačuvana. Osveži i pokušaj ponovo.'
      );
    return;
  }
  const { error } = await supabase.from('inventory_items').insert({
    household_id: householdId,
    ingredient_id: ingredient.id,
    qty,
    unit,
    min_qty: minQty,
    expires_at: expiresAt,
  });
  if (error) throw error;
}
export async function deleteInventoryItem(householdId: string, id: string) {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('household_id', householdId)
    .eq('id', id);
  if (error) throw error;
}
