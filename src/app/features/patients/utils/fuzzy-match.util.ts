/** Lightweight fuzzy score for client-side result ranking (0–1). */
export function fuzzyScore(query: string, target: string): number {
  const q = (query ?? '').trim().toLowerCase();
  const t = (target ?? '').trim().toLowerCase();
  if (!q) return 1;
  if (!t) return 0;
  if (t.includes(q)) return 1;

  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi !== q.length) return 0;

  return 0.65 + Math.min(0.35, q.length / Math.max(t.length, 1));
}

export function rankByFuzzy<T>(query: string, items: T[], textFn: (item: T) => string): T[] {
  if (!(query ?? '').trim()) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(query, textFn(item)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
