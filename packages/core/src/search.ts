import drinksJson from "./drinks.json";
import type { CustomDrink, Drink } from "./types";

export const BUILT_IN_DRINKS: Drink[] = drinksJson as Drink[];

export interface SearchResult {
  id: string;
  name: string;
  mg: number;
  serving?: string;
  custom: boolean;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, capped early for speed. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      rowMin = Math.min(rowMin, cur[j] ?? 0);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j] ?? 0;
  }
  return prev[b.length] ?? max + 1;
}

/** Higher is better; 0 means no match. */
export function matchScore(query: string, name: string, aliases: string[] = []): number {
  const q = norm(query);
  if (!q) return 1;
  const candidates = [norm(name), ...aliases.map(norm)];
  let best = 0;
  for (const c of candidates) {
    if (c === q) best = Math.max(best, 100);
    else if (c.startsWith(q)) best = Math.max(best, 80);
    else if (c.includes(q)) best = Math.max(best, 60);
    else {
      // Every query word must match a word in the candidate, allowing small typos.
      const words = c.split(" ");
      const allMatch = q.split(" ").every((qw) =>
        words.some((w) => {
          if (w.startsWith(qw)) return true;
          const tolerance = qw.length >= 5 ? 2 : qw.length >= 3 ? 1 : 0;
          return tolerance > 0 && distance(qw, w.slice(0, Math.max(qw.length, 1)), tolerance) <= tolerance;
        }),
      );
      if (allMatch) best = Math.max(best, 40);
    }
  }
  return best;
}

/** Custom drinks first, then built-in, each by best match. Empty query lists everything. */
export function searchDrinks(query: string, builtIn: Drink[] = BUILT_IN_DRINKS, custom: CustomDrink[] = []): SearchResult[] {
  const scored = (items: SearchResult[], aliasesOf: (id: string) => string[]) =>
    items
      .map((d) => ({ d, score: matchScore(query, d.name, aliasesOf(d.id)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.d.name.localeCompare(b.d.name))
      .map((x) => x.d);

  const customResults = scored(
    custom.map((c) => ({ id: c.id, name: c.name, mg: c.mg, custom: true, ...(c.serving ? { serving: c.serving } : {}) })),
    () => [],
  );
  const aliasMap = new Map(builtIn.map((d) => [d.id, d.aliases]));
  const builtInResults = scored(
    builtIn.map((d) => ({ id: d.id, name: d.name, mg: d.mg, serving: d.serving, custom: false })),
    (id) => aliasMap.get(id) ?? [],
  );
  return [...customResults, ...builtInResults];
}
