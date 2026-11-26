/**
 * Reads and writes. Every write calls changed() on the affected scopes so
 * only relevant screens re-read. Pictures are stored inside the encrypted
 * database (not as loose files), so they share its encryption and a card is
 * always saved whole.
 */

import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { BackupPayload } from '@/lib/backupData';
import { cleanName } from '@/lib/text';
import {
  DEFAULT_SETTINGS,
  type Card,
  type CardImage,
  type CardSummary,
  type Category,
  type Settings,
  type Side,
  type SortMode,
} from '@/lib/types';

import { seedStarterCategories } from './database';
import { changed } from './store';
import { exclusively, inTransaction } from './transaction';

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  active: number;
  sort_order: number;
  created_at: number;
}
interface CardRow {
  id: string;
  category_id: string | null;
  title: string;
  notes: string;
  pinned: number;
  use_count: number;
  last_used_at: number | null;
  created_at: number;
  updated_at: number;
}
interface ImageRow {
  card_id: string;
  side: Side;
  full: string;
  thumb: string;
  width: number;
  height: number;
}

const VALID_SORT_MODES = new Set<SortMode>(['used', 'az', 'recent']);

const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  name: r.name,
  color: r.color,
  active: r.active === 1,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});
const toCard = (r: CardRow): Card => ({
  id: r.id,
  categoryId: r.category_id,
  title: r.title,
  notes: r.notes,
  pinned: r.pinned === 1,
  useCount: r.use_count,
  lastUsedAt: r.last_used_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toImage = (r: ImageRow): CardImage => ({
  cardId: r.card_id,
  side: r.side,
  full: r.full,
  thumb: r.thumb,
  width: r.width,
  height: r.height,
});

// ---------- Reads ----------

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM category ORDER BY sort_order, name');
  return rows.map(toCategory);
}

export async function listCardSummaries(db: SQLiteDatabase): Promise<CardSummary[]> {
  const rows = await db.getAllAsync<CardRow & { thumb: string | null }>(
    `SELECT c.*,
       COALESCE(
         (SELECT thumb FROM card_image WHERE card_id = c.id AND side = 'front'),
         (SELECT thumb FROM card_image WHERE card_id = c.id AND side = 'back')
       ) AS thumb
     FROM card c`,
  );
  return rows.map((r) => ({ ...toCard(r), thumb: r.thumb }));
}

export async function getCard(db: SQLiteDatabase, id: string): Promise<Card | null> {
  const row = await db.getFirstAsync<CardRow>('SELECT * FROM card WHERE id = ?', id);
  return row ? toCard(row) : null;
}

export async function getCardImages(db: SQLiteDatabase, id: string): Promise<Partial<Record<Side, CardImage>>> {
  const rows = await db.getAllAsync<ImageRow>('SELECT * FROM card_image WHERE card_id = ?', id);
  const out: Partial<Record<Side, CardImage>> = {};
  for (const r of rows) out[r.side] = toImage(r);
  return out;
}

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM setting');
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    try {
      const v = JSON.parse(r.value);
      if (r.key === 'sortMode') {
        if (typeof v === 'string' && VALID_SORT_MODES.has(v as SortMode)) s.sortMode = v as SortMode;
        continue;
      }
      if (r.key === 'lockAfterSeconds') {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) s.lockAfterSeconds = v;
        continue;
      }
      if (typeof v === typeof (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[r.key]) {
        (s as unknown as Record<string, unknown>)[r.key] = v;
      }
    } catch {
      // Ignore a broken value; the default stands.
    }
  }
  return s;
}

// ---------- Writes ----------

export async function setSetting<K extends keyof Settings>(db: SQLiteDatabase, key: K, value: Settings[K]) {
  await inTransaction(db, (tx) =>
    tx.runAsync(
      'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value),
    ),
  );
  changed('settings');
}

export interface CardInput {
  title: string;
  notes: string;
  categoryId: string | null;
  pinned: boolean;
}

/** New pictures to save; `null` removes that side, `undefined` leaves it alone. */
export type ImageChanges = Partial<Record<Side, Omit<CardImage, 'cardId' | 'side'> | null>>;

export async function saveCard(db: SQLiteDatabase, id: string | null, input: CardInput, images: ImageChanges): Promise<string> {
  const now = Date.now();
  const cardId = id ?? randomUUID();
  const hasImageChange = images.front !== undefined || images.back !== undefined;
  await inTransaction(db, async (tx) => {
    if (id) {
      await tx.runAsync(
        'UPDATE card SET title = ?, notes = ?, category_id = ?, pinned = ?, updated_at = ? WHERE id = ?',
        cleanName(input.title),
        input.notes.trim(),
        input.categoryId,
        input.pinned ? 1 : 0,
        now,
        id,
      );
    } else {
      await tx.runAsync(
        'INSERT INTO card (id, category_id, title, notes, pinned, use_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        cardId,
        input.categoryId,
        cleanName(input.title),
        input.notes.trim(),
        input.pinned ? 1 : 0,
        now,
        now,
      );
    }
    for (const side of ['front', 'back'] as const) {
      const change = images[side];
      if (change === undefined) continue;
      await tx.runAsync('DELETE FROM card_image WHERE card_id = ? AND side = ?', cardId, side);
      if (change) {
        await tx.runAsync(
          'INSERT INTO card_image (card_id, side, full, thumb, width, height) VALUES (?, ?, ?, ?, ?, ?)',
          cardId,
          side,
          change.full,
          change.thumb,
          change.width,
          change.height,
        );
      }
    }
  });
  if (hasImageChange) changed('cards', 'images');
  else changed('cards');
  return cardId;
}

export async function deleteCard(db: SQLiteDatabase, id: string) {
  await inTransaction(db, (tx) => tx.runAsync('DELETE FROM card WHERE id = ?', id));
  changed('cards', 'images');
}

export async function setPinned(db: SQLiteDatabase, id: string, pinned: boolean) {
  await inTransaction(db, (tx) => tx.runAsync('UPDATE card SET pinned = ? WHERE id = ?', pinned ? 1 : 0, id));
  changed('cards');
}

/** Counts an opening, so "Most used" sorting puts everyday cards first. */
export async function markUsed(db: SQLiteDatabase, id: string) {
  await inTransaction(db, (tx) =>
    tx.runAsync('UPDATE card SET use_count = use_count + 1, last_used_at = ? WHERE id = ?', Date.now(), id),
  );
  changed('cards');
}

export async function createCategory(db: SQLiteDatabase, name: string, color: string): Promise<string> {
  const id = randomUUID();
  await inTransaction(db, async (tx) => {
    const row = await tx.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM category');
    await tx.runAsync(
      'INSERT INTO category (id, name, color, active, sort_order, created_at) VALUES (?, ?, ?, 1, ?, ?)',
      id,
      cleanName(name),
      color,
      (row?.m ?? -1) + 1,
      Date.now(),
    );
  });
  changed('categories');
  return id;
}

export async function updateCategory(db: SQLiteDatabase, id: string, patch: { name?: string; color?: string; active?: boolean }) {
  const updated = await inTransaction(db, async (tx) => {
    const cur = await tx.getFirstAsync<CategoryRow>('SELECT * FROM category WHERE id = ?', id);
    if (!cur) return false;
    await tx.runAsync(
      'UPDATE category SET name = ?, color = ?, active = ? WHERE id = ?',
      patch.name != null ? cleanName(patch.name) : cur.name,
      patch.color ?? cur.color,
      patch.active == null ? cur.active : patch.active ? 1 : 0,
      id,
    );
    return true;
  });
  if (!updated) return;
  changed('categories');
}

/** Saves a new order: ids from first to last. */
export async function reorderCategories(db: SQLiteDatabase, ids: string[]) {
  await inTransaction(db, async (tx) => {
    for (let i = 0; i < ids.length; i++) await tx.runAsync('UPDATE category SET sort_order = ? WHERE id = ?', i, ids[i]);
  });
  changed('categories');
}

/** Deletes a category. Its cards are kept and become "No category". */
export async function deleteCategory(db: SQLiteDatabase, id: string) {
  await inTransaction(db, (tx) => tx.runAsync('DELETE FROM category WHERE id = ?', id));
  changed('categories', 'cards');
}

// ---------- Backup ----------

export async function exportAll(db: SQLiteDatabase): Promise<Pick<BackupPayload, 'categories' | 'cards' | 'images'>> {
  const categories = await listCategories(db);
  const cards = (await db.getAllAsync<CardRow>('SELECT * FROM card')).map(toCard);
  const images = (await db.getAllAsync<ImageRow>('SELECT * FROM card_image')).map(toImage);
  return { categories, cards, images };
}

export type ImportMode = 'merge' | 'replace';

/**
 * Brings a checked backup in, in one transaction: either everything lands or
 * nothing changes. "merge" keeps what is on the phone and adds or updates
 * cards from the backup (matched by id); "replace" wipes first.
 */
export async function importAll(db: SQLiteDatabase, data: BackupPayload, mode: ImportMode) {
  await inTransaction(db, async (tx) => {
    if (mode === 'replace') {
      await tx.execAsync('DELETE FROM card_image; DELETE FROM card; DELETE FROM category;');
    }
    for (const c of data.categories) {
      await tx.runAsync(
        `INSERT INTO category (id, name, color, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, active = excluded.active, sort_order = excluded.sort_order`,
        c.id,
        c.name,
        c.color,
        c.active ? 1 : 0,
        c.sortOrder,
        c.createdAt,
      );
    }
    for (const c of data.cards) {
      await tx.runAsync(
        `INSERT INTO card (id, category_id, title, notes, pinned, use_count, last_used_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, title = excluded.title, notes = excluded.notes,
           pinned = excluded.pinned, use_count = MAX(card.use_count, excluded.use_count),
           last_used_at = NULLIF(MAX(COALESCE(card.last_used_at, 0), COALESCE(excluded.last_used_at, 0)), 0),
           updated_at = excluded.updated_at`,
        c.id,
        c.categoryId,
        c.title,
        c.notes,
        c.pinned ? 1 : 0,
        c.useCount,
        c.lastUsedAt,
        c.createdAt,
        c.updatedAt,
      );
      // A card's pictures come from the backup as a set.
      await tx.runAsync('DELETE FROM card_image WHERE card_id = ?', c.id);
    }
    for (const im of data.images) {
      await tx.runAsync(
        'INSERT INTO card_image (card_id, side, full, thumb, width, height) VALUES (?, ?, ?, ?, ?, ?)',
        im.cardId,
        im.side,
        im.full,
        im.thumb,
        im.width,
        im.height,
      );
    }
  });
  changed('cards', 'categories', 'images');
}

/** Deletes every card, picture and custom category, resets settings, and restores starter categories. */
export async function eraseEverything(db: SQLiteDatabase) {
  await inTransaction(db, async (tx) => {
    await tx.execAsync('DELETE FROM card_image; DELETE FROM card; DELETE FROM category; DELETE FROM setting;');
    await seedStarterCategories(tx);
  });
  await exclusively(() => db.execAsync('VACUUM'));
  changed();
}
