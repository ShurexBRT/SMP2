import { normalizeName } from './utils';

const units: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  kom: { base: 'kom', factor: 1 },
  komad: { base: 'kom', factor: 1 },
  komada: { base: 'kom', factor: 1 },
};

export function baseQuantity(qty: number, unit: string) {
  const normalized = normalizeName(unit);
  const definition = units[normalized] ?? { base: normalized, factor: 1 };
  return { qty: qty * definition.factor, unit: definition.base };
}

export function convertQuantity(qty: number, from: string, to: string): number | null {
  const source = baseQuantity(qty, from);
  const target = baseQuantity(1, to);
  return source.unit === target.unit ? source.qty / target.qty : null;
}

export function ingredientKey(name: string, unit: string): string {
  return `${normalizeName(name)}|${baseQuantity(1, unit).unit}`;
}

export function roundQuantity(qty: number) {
  return Math.round((qty + Number.EPSILON) * 100) / 100;
}
