import { supabase } from '@/lib/supabase';
import { allRows } from '@/lib/paginate';
import { normalizeName } from '@/lib/utils';
import { listRecipes } from './api';
import type { Database } from '@/lib/types';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Insert'];
const pendingNote =
  'Uvoz početnog recepta nije završen. Izaberi „Dodaj početne recepte“ da nastaviš.';

// Stable household-specific IDs make retries and simultaneous imports converge.
async function stableId(key: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  );
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function importStarterRecipes(params: {
  householdId: string;
  userId: string;
  isCurrent: () => boolean;
  onProgress: (completed: number, total: number) => void;
}) {
  const { householdId, userId } = params;
  const assertCurrent = async () => {
    if (!params.isCurrent())
      throw new Error('Nalog ili domaćinstvo je promenjeno. Pokreni dodavanje ponovo.');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!params.isCurrent() || data.session?.user.id !== userId)
      throw new Error('Prijava je promenjena. Pokreni dodavanje ponovo.');
  };
  await assertCurrent();
  const { default: collection } = await import('./starter-recipes.json');
  const currentRecipes = await listRecipes(householdId);
  const readIngredients = () =>
    allRows<Ingredient>(
      async (from, to) =>
        await supabase
          .from('ingredients')
          .select('*')
          .eq('household_id', householdId)
          .order('id')
          .range(from, to)
    );
  const catalogue = await readIngredients();
  const ingredientsByName = new Map(catalogue.map((i) => [normalizeName(i.name), i]));
  const missing = new Map<string, { household_id: string; name: string; default_unit: string }>();
  const work = [];
  let skipped = 0;
  for (const recipe of collection) {
    const id = await stableId(`smp-starter-v1:recipe:${householdId}:${recipe.name}`);
    const existing =
      currentRecipes.find((r) => r.id === id) ??
      currentRecipes.find((r) => normalizeName(r.name) === normalizeName(recipe.name));
    const expectedPending = `${pendingNote}${recipe.notes ? `\n\n${recipe.notes}` : ''}`;
    if (existing && (existing.id !== id || existing.notes !== expectedPending)) {
      skipped++;
      continue;
    }
    work.push({ recipe, id, existing });
    for (const ingredient of recipe.ingredients) {
      const key = normalizeName(ingredient.name);
      if (!ingredientsByName.has(key))
        missing.set(key, {
          household_id: householdId,
          name: ingredient.name,
          default_unit: ingredient.unit,
        });
    }
  }
  params.onProgress(skipped, collection.length);
  if (missing.size) {
    await assertCurrent();
    const { error } = await supabase.from('ingredients').upsert([...missing.values()], {
      onConflict: 'household_id,name',
      ignoreDuplicates: true,
    });
    if (error) throw error;
    await assertCurrent();
    for (const ingredient of await readIngredients())
      ingredientsByName.set(normalizeName(ingredient.name), ingredient);
  }

  let added = 0;
  for (const { recipe, id, existing } of work) {
    await assertCurrent();
    const { ingredients, ...metadata } = recipe;
    const incompleteNotes = `${pendingNote}${metadata.notes ? `\n\n${metadata.notes}` : ''}`;
    if (!existing) {
      const { error } = await supabase.from('recipes').insert({
        ...metadata,
        id,
        household_id: householdId,
        notes: incompleteNotes,
      });
      if (error && error.code !== '23505') throw error;
    }
    // A second device may have completed this recipe while our request was running.
    await assertCurrent();
    const latest = await supabase
      .from('recipes')
      .select('notes')
      .eq('household_id', householdId)
      .eq('id', id)
      .single();
    if (latest.error) throw latest.error;
    if (latest.data.notes !== incompleteNotes) {
      skipped++;
      params.onProgress(added + skipped, collection.length);
      continue;
    }
    const rows: RecipeIngredient[] = [];
    for (const ingredient of ingredients) {
      const resolved = ingredientsByName.get(normalizeName(ingredient.name));
      if (!resolved)
        throw new Error(`Namirnica nije sačuvana: ${ingredient.name}. Pokušaj ponovo.`);
      rows.push({
        id: await stableId(`smp-starter-v1:ingredient:${id}:${ingredient.name}`),
        household_id: householdId,
        recipe_id: id,
        ingredient_id: resolved.id,
        qty: ingredient.qty,
        unit: ingredient.unit,
        optional: ingredient.optional,
      });
    }
    await assertCurrent();
    const saved = await supabase.from('recipe_ingredients').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: true,
    });
    if (saved.error) throw saved.error;
    await assertCurrent();
    const completed = await supabase
      .from('recipes')
      .update({ notes: metadata.notes || null })
      .eq('household_id', householdId)
      .eq('id', id)
      .eq('notes', incompleteNotes)
      .select('id');
    if (completed.error) throw completed.error;
    if (!completed.data.length) {
      await assertCurrent();
      const check = await supabase
        .from('recipes')
        .select('notes')
        .eq('household_id', householdId)
        .eq('id', id)
        .single();
      if (check.error) throw check.error;
      if (check.data.notes === incompleteNotes)
        throw new Error('Recept još nije završen. Pokušaj dodavanje ponovo.');
    }
    added++;
    params.onProgress(added + skipped, collection.length);
  }
  return { added, skipped };
}
