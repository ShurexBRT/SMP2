import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { allRows } from '@/lib/paginate';

type ShoppingListRow = Database['public']['Tables']['shopping_lists']['Row'];
type ShoppingItemRow = Database['public']['Tables']['shopping_list_items']['Row'];

export async function getShoppingList(params: {
  householdId: string;
  weekStart: string;
}): Promise<ShoppingListRow | null> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', params.householdId)
    .eq('week_start', params.weekStart)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrCreateShoppingList(params: {
  householdId: string;
  weekStart: string;
}): Promise<ShoppingListRow> {
  const { data: existing, error: selErr } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', params.householdId)
    .eq('week_start', params.weekStart)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ household_id: params.householdId, week_start: params.weekStart, status: 'open' })
    .select('*')
    .single();

  if (error?.code === '23505') {
    const list = await getShoppingList(params);
    if (list) return list;
  }
  if (error) throw error;
  return data;
}

export async function listShoppingItems(params: {
  householdId: string;
  shoppingListId: string;
}): Promise<ShoppingItemRow[]> {
  const data = await allRows((from, to) =>
    supabase
      .from('shopping_list_items')
      .select('*')
      .eq('household_id', params.householdId)
      .eq('shopping_list_id', params.shoppingListId)
      .order('checked', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id')
      .range(from, to)
  );
  return data ?? [];
}

export async function toggleShoppingItem(params: {
  householdId: string;
  id: string;
  checked: boolean;
  qty?: number;
  unit?: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update({
      checked: params.checked,
      ...(params.qty != null ? { qty: params.qty } : {}),
      ...(params.unit ? { unit: params.unit.trim() } : {}),
    })
    .eq('household_id', params.householdId)
    .eq('id', params.id)
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Stavka nije sačuvana. Osveži listu i pokušaj ponovo.');
}

export async function addManualShoppingItem(params: {
  householdId: string;
  shoppingListId: string;
  label: string;
  qty?: number | null;
  unit?: string | null;
  category?: string;
}): Promise<void> {
  const { error } = await supabase.from('shopping_list_items').insert({
    household_id: params.householdId,
    shopping_list_id: params.shoppingListId,
    ingredient_id: null,
    label: params.label.trim(),
    qty: params.qty ?? null,
    unit: params.unit ?? null,
    category: params.category ?? 'Ostalo',
    checked: false,
    source: 'manual',
  });

  if (error) throw error;
}

export async function clearPlanItemsFromList(params: {
  householdId: string;
  shoppingListId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('household_id', params.householdId)
    .eq('shopping_list_id', params.shoppingListId)
    .eq('source', 'plan');

  if (error) throw error;
}

export async function deleteShoppingItem(householdId: string, id: string, checked: boolean) {
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('household_id', householdId)
    .eq('id', id)
    .eq('checked', checked)
    .select('id')
    .single();
  if (error) throw error;
}
