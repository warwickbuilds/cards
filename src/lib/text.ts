/** Lower-case, accent-free text for searching ("Café" matches "cafe"). */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Every word of the query must appear somewhere in the haystack. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fold(fields.filter(Boolean).join(' \u0000 '));
  return words.every((w) => hay.includes(w));
}

/** Trims and collapses inner whitespace; used for titles and category names. */
export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export const TITLE_MAX = 80;
export const NOTES_MAX = 4000;
export const CATEGORY_NAME_MAX = 40;

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
