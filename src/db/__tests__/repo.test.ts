import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync } from 'node:sqlite';

import { makePayload } from '@/lib/backupData';
import { DEFAULT_SETTINGS } from '@/lib/types';

import {
  createCategory,
  deleteCategory,
  eraseEverything,
  exportAll,
  getCard,
  getSettings,
  importAll,
  listCardSummaries,
  listCategories,
  markUsed,
  saveCard,
  setSetting,
} from '../repo';
import { MIGRATIONS, STARTER_CATEGORIES } from '../schema';
import { getVersion } from '../store';

jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
}));

jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '',
  openDatabaseAsync: jest.fn(),
}));

function memoryDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  for (const m of MIGRATIONS) raw.exec(m);
  return {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      const stmt = raw.prepare(sql);
      return stmt.run(...(params as (string | number | null | Uint8Array)[]));
    },
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
      const stmt = raw.prepare(sql);
      return stmt.all(...(params as (string | number | null | Uint8Array)[])) as T[];
    },
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const stmt = raw.prepare(sql);
      const row = stmt.get(...(params as (string | number | null | Uint8Array)[])) as T | undefined;
      return row ?? null;
    },
  } as unknown as SQLiteDatabase;
}

const JPEG_FRONT = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
const JPEG_BACK = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7]).toString('base64');

describe('repo (real SQLite)', () => {
  it('resolves front thumbnail with fallback to back thumbnail for back-only cards', async () => {
    const db = memoryDb();
    const id = await saveCard(
      db,
      null,
      { title: 'Back only', notes: '', categoryId: null, pinned: false },
      { back: { full: JPEG_BACK, thumb: JPEG_BACK, width: 100, height: 60 } },
    );

    let list = await listCardSummaries(db);
    expect(list).toHaveLength(1);
    expect(list[0].thumb).toBe(JPEG_BACK);

    // Adding a front image takes priority over back.
    await saveCard(
      db,
      id,
      { title: 'Both sides', notes: '', categoryId: null, pinned: false },
      { front: { full: JPEG_FRONT, thumb: JPEG_FRONT, width: 100, height: 60 } },
    );
    list = await listCardSummaries(db);
    expect(list[0].thumb).toBe(JPEG_FRONT);

    // Removing front falls back to back again.
    await saveCard(db, id, { title: 'Back again', notes: '', categoryId: null, pinned: false }, { front: null });
    list = await listCardSummaries(db);
    expect(list[0].thumb).toBe(JPEG_BACK);
  });

  it('preserves NULL last_used_at during merge import and supports replace mode', async () => {
    const db = memoryDb();
    const catId = await createCategory(db, 'Loyalty', 'orange');
    const cardId = await saveCard(
      db,
      null,
      { title: 'Coffee', notes: 'local', categoryId: catId, pinned: false },
      {},
    );
    const exported = await exportAll(db);
    const payload = makePayload({ ...exported, appVersion: '0.2.0' });

    await importAll(db, payload, 'merge');
    const merged = await getCard(db, cardId);
    expect(merged?.lastUsedAt).toBeNull();
    expect(merged?.useCount).toBe(0);

    // Replace wipes cards not in the backup.
    const extraId = await saveCard(db, null, { title: 'Temporary', notes: '', categoryId: null, pinned: false }, {});
    expect(await getCard(db, extraId)).not.toBeNull();
    await importAll(db, payload, 'replace');
    expect(await getCard(db, extraId)).toBeNull();
    expect(await getCard(db, cardId)).not.toBeNull();
  });

  it('validates stored settings and ignores corrupt enum/number values', async () => {
    const db = memoryDb();
    await db.runAsync('INSERT INTO setting (key, value) VALUES (?, ?)', 'sortMode', JSON.stringify('invalid'));
    await db.runAsync('INSERT INTO setting (key, value) VALUES (?, ?)', 'lockAfterSeconds', JSON.stringify(-10));
    await setSetting(db, 'maxBrightness', false);

    const s = await getSettings(db);
    expect(s.sortMode).toBe(DEFAULT_SETTINGS.sortMode);
    expect(s.lockAfterSeconds).toBe(DEFAULT_SETTINGS.lockAfterSeconds);
    expect(s.maxBrightness).toBe(false);
  });

  it('eraseEverything wipes cards/settings and restores starter categories', async () => {
    const db = memoryDb();
    const catId = await createCategory(db, 'Custom', 'pink');
    await saveCard(db, null, { title: 'Secret', notes: '1234', categoryId: catId, pinned: true }, {});
    await setSetting(db, 'maxBrightness', false);

    await eraseEverything(db);

    expect(await listCardSummaries(db)).toEqual([]);
    expect((await listCategories(db)).map((c) => c.name)).toEqual(STARTER_CATEGORIES.map((c) => c.name));
    expect((await getSettings(db)).maxBrightness).toBe(DEFAULT_SETTINGS.maxBrightness);
  });

  it('bumps only the affected store scopes on writes', async () => {
    const db = memoryDb();
    const c0 = getVersion('cards');
    const k0 = getVersion('categories');
    const s0 = getVersion('settings');
    const i0 = getVersion('images');

    await setSetting(db, 'cropToCard', false);
    expect(getVersion('settings')).toBe(s0 + 1);
    expect(getVersion('cards')).toBe(c0);
    expect(getVersion('categories')).toBe(k0);
    expect(getVersion('images')).toBe(i0);

    const catId = await createCategory(db, 'Transit', 'teal');
    expect(getVersion('categories')).toBe(k0 + 1);
    expect(getVersion('cards')).toBe(c0);

    const cardId = await saveCard(db, null, { title: 'Opal', notes: '', categoryId: catId, pinned: false }, {});
    expect(getVersion('cards')).toBe(c0 + 1);
    expect(getVersion('images')).toBe(i0); // no image change

    await markUsed(db, cardId);
    expect(getVersion('cards')).toBe(c0 + 2);
    expect(getVersion('images')).toBe(i0);

    await deleteCategory(db, catId);
    expect(getVersion('categories')).toBe(k0 + 2);
    expect(getVersion('cards')).toBe(c0 + 3);
  });
});
