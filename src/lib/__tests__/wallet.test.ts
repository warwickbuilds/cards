import type { CardSummary, Category } from '../types';
import { buildSections, hiddenCount, rows, sortCards, UNCATEGORISED_ID } from '../wallet';

const cat = (id: string, name: string, sortOrder: number, active = true): Category => ({
  id,
  name,
  color: 'blue',
  active,
  sortOrder,
  createdAt: 0,
});

let n = 0;
const card = (title: string, categoryId: string | null, extra: Partial<CardSummary> = {}): CardSummary => ({
  id: `c${++n}`,
  categoryId,
  title,
  notes: '',
  pinned: false,
  useCount: 0,
  lastUsedAt: null,
  createdAt: n,
  updatedAt: n,
  frontThumb: null,
  backThumb: null,
  ...extra,
});

const cats = [cat('bank', 'Bank', 0), cat('loyalty', 'Loyalty', 1), cat('travel', 'Travel', 2, false)];
const cards = [
  card('Visa', 'bank', { useCount: 5 }),
  card('Debit', 'bank', { useCount: 9, notes: 'everyday account' }),
  card('Coffee club', 'loyalty', { pinned: true }),
  card('Passport', 'travel'),
  card('Gym', null),
];
const base = { sortMode: 'used' as const, showInactive: false };

describe('buildSections', () => {
  it('puts pinned first, then categories in order, then cards without a category', () => {
    const s = buildSections(cards, cats, base);
    expect(s.map((x) => x.title)).toEqual(['Pinned', 'Bank', 'Loyalty', 'No category']);
    expect(s[1].cards.map((c) => c.title)).toEqual(['Debit', 'Visa']); // most used first
  });

  it('hides switched-off categories unless asked', () => {
    expect(buildSections(cards, cats, base).some((s) => s.id === 'travel')).toBe(false);
    const shown = buildSections(cards, cats, { ...base, showInactive: true });
    const travel = shown.find((s) => s.id === 'travel');
    expect(travel?.inactive).toBe(true);
    expect(hiddenCount(cards, cats)).toBe(1);
  });

  it('search finds cards in switched-off categories, by title, notes or category', () => {
    expect(buildSections(cards, cats, { ...base, query: 'passport' })[0].cards.map((c) => c.title)).toEqual(['Passport']);
    expect(buildSections(cards, cats, { ...base, query: 'EVERYDAY' })[0].cards.map((c) => c.title)).toEqual(['Debit']);
    expect(buildSections(cards, cats, { ...base, query: 'loyalty' })[0].cards.map((c) => c.title)).toEqual(['Coffee club']);
    expect(buildSections(cards, cats, { ...base, query: 'nothing here' })).toEqual([]);
  });

  it('filters to one category, without a pinned section', () => {
    const s = buildSections(cards, cats, { ...base, categoryFilter: 'loyalty' });
    expect(s.map((x) => x.title)).toEqual(['Loyalty']);
    expect(buildSections(cards, cats, { ...base, categoryFilter: UNCATEGORISED_ID })[0].cards[0].title).toBe('Gym');
  });

  it('treats a card whose category was deleted as uncategorised', () => {
    const s = buildSections([card('Orphan', 'gone')], cats, base);
    expect(s[0].id).toBe(UNCATEGORISED_ID);
  });
});

describe('sortCards', () => {
  it('sorts A to Z with numbers in order', () => {
    const list = [card('Card 10', null), card('card 2', null), card('Apple', null)];
    expect(sortCards(list, 'az').map((c) => c.title)).toEqual(['Apple', 'card 2', 'Card 10']);
  });
  it('sorts newest first', () => {
    const list = [card('Old', null, { createdAt: 1 }), card('New', null, { createdAt: 9 })];
    expect(sortCards(list, 'recent')[0].title).toBe('New');
  });
  it('breaks usage ties by last opened', () => {
    const list = [card('A', null, { useCount: 2, lastUsedAt: 1 }), card('B', null, { useCount: 2, lastUsedAt: 5 })];
    expect(sortCards(list, 'used')[0].title).toBe('B');
  });
});

it('rows splits into pairs', () => {
  expect(rows([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
});
