import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export function startOfWeekISO(d: Date): string {
  // Monday as start of week
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

// Calendar dates are not instants: keep arithmetic in UTC to avoid local DST/UTC shifts.
export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('sr-Latn-RS', {
    ...options,
    timeZone: 'UTC',
  });
}

export function weekLabel(iso: string): string {
  return `${formatDate(iso)} – ${formatDate(addDaysISO(iso, 6))}`;
}

export function validWeek(value: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) {
      return addDaysISO(value, -((date.getUTCDay() + 6) % 7));
    }
  }
  return startOfWeekISO(new Date());
}

export function normalizeName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sr-Latn-RS');
}

export function errorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : (error as { message?: string } | null)?.message;
  if (!message) return 'Nešto nije uspelo. Pokušaj ponovo.';
  if (/failed to fetch|network|fetch failed/i.test(message))
    return 'Veza nije dostupna. Proveri internet i pokušaj ponovo.';
  if (/invalid login credentials/i.test(message)) return 'Email ili lozinka nisu ispravni.';
  if (/email not confirmed/i.test(message)) return 'Potvrdi email adresu pre prijave.';
  if (/23503|foreign key|still referenced/i.test(message))
    return 'Ovaj recept je u planu obroka. Prvo ga ukloni iz plana, pa pokušaj ponovo.';
  if (/row.level security|permission denied/i.test(message))
    return 'Nemaš dozvolu za ovu izmenu. Proveri članstvo u domaćinstvu.';
  return message;
}
