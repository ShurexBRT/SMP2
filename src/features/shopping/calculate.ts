import { baseQuantity, ingredientKey, roundQuantity } from '@/lib/quantities';

export type Demand = {
  label: string;
  ingredientId: string | null;
  qty: number;
  unit: string;
  date?: string;
};
export type Stock = { name: string; qty: number; unit: string; expiresAt?: string | null };
export type ExistingItem = {
  id: string;
  label: string;
  qty: number | null;
  unit: string | null;
  checked: boolean;
  source: string;
  ingredient_id: string | null;
};

// A refreshed plan replaces its own outstanding demand; manual and purchased rows are retained.
export function reconcileShopping(
  demand: Demand[],
  stock: Stock[],
  existing: ExistingItem[],
  today: string,
  purchasedInInventoryIds: string[] = []
) {
  if (
    demand.some((x) => !Number.isFinite(x.qty) || x.qty <= 0) ||
    stock.some((x) => !Number.isFinite(Number(x.qty)) || Number(x.qty) < 0)
  ) {
    throw new Error('Proveri količine sastojaka i zaliha pre osvežavanja kupovine.');
  }
  const totals = new Map<string, Demand>();
  const pools = stock
    .map((item) => ({ ...item, amount: baseQuantity(Number(item.qty), item.unit).qty }))
    .sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'));
  for (const item of [...demand].sort((a, b) => (a.date ?? today).localeCompare(b.date ?? today))) {
    if (!Number.isFinite(item.qty) || item.qty <= 0) continue;
    const amount = baseQuantity(item.qty, item.unit);
    const key = ingredientKey(item.label, amount.unit);
    let missing = amount.qty;
    const neededDate = item.date && item.date > today ? item.date : today;
    for (const available of pools) {
      if (
        ingredientKey(available.name, available.unit) !== key ||
        (available.expiresAt && available.expiresAt < neededDate)
      )
        continue;
      const allocated = Math.min(missing, Math.max(0, available.amount));
      missing -= allocated;
      available.amount -= allocated;
    }
    const previous = totals.get(key);
    totals.set(key, {
      label: item.label,
      ingredientId: item.ingredientId,
      qty: missing + (previous?.qty ?? 0),
      unit: amount.unit,
    });
  }
  for (const item of existing) {
    if (!item.checked || item.source !== 'plan' || purchasedInInventoryIds.includes(item.id))
      continue;
    const key = ingredientKey(item.label, item.unit ?? '');
    const needed = totals.get(key);
    if (needed)
      needed.qty = Math.max(
        0,
        needed.qty - Math.max(0, baseQuantity(Number(item.qty ?? 0), item.unit ?? '').qty)
      );
  }
  const remaining = new Map(
    existing.filter((x) => x.source === 'plan' && !x.checked).map((x) => [x.id, x])
  );
  const inserts: Demand[] = [];
  const updates: { id: string; item: Demand }[] = [];
  for (const item of totals.values()) {
    item.qty = roundQuantity(item.qty);
    if (item.qty <= 0) continue;
    const match = [...remaining.values()].find(
      (x) => ingredientKey(x.label, x.unit ?? '') === ingredientKey(item.label, item.unit)
    );
    if (match) {
      remaining.delete(match.id);
      if (
        Number(match.qty) !== item.qty ||
        match.unit !== item.unit ||
        match.ingredient_id !== item.ingredientId
      )
        updates.push({ id: match.id, item });
    } else inserts.push(item);
  }
  return { inserts, updates, deletes: [...remaining.keys()] };
}
