type BrasilApiHoliday = { date: string; name: string; type: string };

const cache = new Map<number, Set<string>>();

export async function getNationalHolidaySet(year: number): Promise<Set<string>> {
  const cached = cache.get(year);
  if (cached) return cached;

  const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
    // server-side fetch; allow caching for a day
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    // fallback: no holidays
    const empty = new Set<string>();
    cache.set(year, empty);
    return empty;
  }

  const data = (await res.json()) as BrasilApiHoliday[];
  const set = new Set<string>();
  for (const h of data) {
    if (h?.date) set.add(h.date);
  }
  cache.set(year, set);
  return set;
}

export async function isNationalHoliday(dateKey: string): Promise<boolean> {
  const y = Number(dateKey.slice(0, 4));
  if (!Number.isFinite(y)) return false;
  const set = await getNationalHolidaySet(y);
  return set.has(dateKey);
}
