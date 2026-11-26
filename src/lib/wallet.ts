/**
 * How the home screen arranges cards: pinned first, then one section per
 * category in the user's order, then cards without a category. Inactive
 * categories are left out unless the user asks to see them. Pure, so it is
 * unit tested.
 */

import { matchesQuery } from './text';
import type { CardSummary, Category, SortMode } from './types';

export const PINNED_ID = '__pinned';
export const UNCATEGORISED_ID = '__none';

export interface Section {
  id: string;
  title: string;
  color: string | null;
  inactive: boolean;
  cards: CardSummary[];
}

export function sortCards(cards: CardSummary[], mode: SortMode): CardSummary[] {
  const byTitle = (a: CardSummary, b: CardSummary) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
  const list = [...cards];
  if (mode === 'az') return list.sort(byTitle);
  if (mode === 'recent') return list.sort((a, b) => b.createdAt - a.createdAt || byTitle(a, b));
  // Most used: cards opened often and lately float up, so the one you need at
  // the checkout is usually first. Ties fall back to A–Z.
  return list.sort((a, b) => b.useCount - a.useCount || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || byTitle(a, b));
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export interface BuildOptions {
  sortMode: SortMode;
  showInactive: boolean;
  /** Show only this category (a category id, or UNCATEGORISED_ID). */
  categoryFilter?: string | null;
  query?: string;
}

export function buildSections(cards: CardSummary[], categories: Category[], opts: BuildOptions): Section[] {
  const cats = sortCategories(categories);
  const byId = new Map(cats.map((c) => [c.id, c]));
  const query = opts.query?.trim() ?? '';
  const searching = query.length > 0;

  const isVisible = (card: CardSummary) => {
    const cat = card.categoryId ? byId.get(card.categoryId) : undefined;
    // Searching finds cards in inactive categories too, so nothing is ever lost.
    if (!searching && cat && !cat.active && !opts.showInactive) return false;
    if (opts.categoryFilter) {
      const key = cat ? cat.id : UNCATEGORISED_ID;
      if (key !== opts.categoryFilter) return false;
    }
    if (searching && !matchesQuery(query, card.title, card.notes, cat?.name)) return false;
    return true;
  };

  const visible = sortCards(cards.filter(isVisible), opts.sortMode);
  const sections: Section[] = [];

  if (searching) {
    if (visible.length) sections.push({ id: 'results', title: 'Results', color: null, inactive: false, cards: visible });
    return sections;
  }

  if (!opts.categoryFilter) {
    const pinned = visible.filter((c) => c.pinned);
    if (pinned.length) sections.push({ id: PINNED_ID, title: 'Pinned', color: null, inactive: false, cards: pinned });
  }

  for (const cat of cats) {
    const inCat = visible.filter((c) => c.categoryId === cat.id);
    if (inCat.length) sections.push({ id: cat.id, title: cat.name, color: cat.color, inactive: !cat.active, cards: inCat });
  }
  const loose = visible.filter((c) => !c.categoryId || !byId.has(c.categoryId));
  if (loose.length) sections.push({ id: UNCATEGORISED_ID, title: 'No category', color: null, inactive: false, cards: loose });
  return sections;
}

/** Number of cards hidden because their category is switched off. */
export function hiddenCount(cards: CardSummary[], categories: Category[]): number {
  const inactive = new Set(categories.filter((c) => !c.active).map((c) => c.id));
  return cards.filter((c) => c.categoryId && inactive.has(c.categoryId)).length;
}

/** Chunks a list into rows of `n` for a grid. */
export function rows<T>(items: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}
