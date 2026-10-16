import type { Database } from './types';

export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export const MEALS = [
  { key: 'breakfast', label: 'Doručak' },
  { key: 'lunch', label: 'Ručak' },
  { key: 'dinner', label: 'Večera' },
] as const;
export const mealLabel = (key: string) => MEALS.find((m) => m.key === key)?.label ?? key;
export const totalMinutes = (recipe: Row<'recipes'>) =>
  (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

export const formatQty = (qty: number | null | undefined) =>
  qty == null ? '' : new Intl.NumberFormat('sr-Latn-RS', { maximumFractionDigits: 2 }).format(qty);

export function parseQuantity(value: string, label = 'Količina', allowZero = true): number {
  const normalized = value.trim().replace(',', '.');
  const qty = normalized ? Number(normalized) : NaN;
  if (!Number.isFinite(qty) || qty < 0 || (!allowZero && qty === 0)) {
    throw new Error(`${label} mora biti ${allowZero ? 'nenegativan' : 'pozitivan'} broj.`);
  }
  return qty;
}
