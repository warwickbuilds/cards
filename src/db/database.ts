/**
 * Opens the encrypted database.
 *
 * The file is encrypted with SQLCipher (AES-256). Its 256-bit key is made
 * from the phone's secure random generator on first launch and kept in
 * expo-secure-store, protected by the hardware-backed Android Keystore.
 * The key never leaves the phone and is not in backups; app data is excluded
 * from Android backups (allowBackup: false) so the database and its key are
 * never split up.
 */

import { getRandomBytes, randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS, STARTER_CATEGORIES } from './schema';
import { inTransaction } from './transaction';

export const DATABASE_NAME = 'cards.db';
const KEY_NAME = 'cards.db.key.v1';

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function existingDatabaseOnDisk(): boolean {
  try {
    if (typeof defaultDatabaseDirectory !== 'string' || !defaultDatabaseDirectory) return false;
    const f = new File(defaultDatabaseDirectory, DATABASE_NAME);
    return f.exists && f.size > 0;
  } catch {
    return false;
  }
}

async function databaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;
  if (existingDatabaseOnDisk()) {
    throw new Error('The encryption key for your cards is unavailable. Unlock your phone and open Cards again.');
  }
  const key = toHex(getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_NAME, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return key;
}

export async function seedStarterCategories(tx: Pick<SQLiteDatabase, 'runAsync'>) {
  const now = Date.now();
  let order = 0;
  for (const c of STARTER_CATEGORIES) {
    await tx.runAsync(
      'INSERT INTO category (id, name, color, active, sort_order, created_at) VALUES (?, ?, ?, 1, ?, ?)',
      randomUUID(),
      c.name,
      c.color,
      order++,
      now,
    );
  }
}

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await inTransaction(db, async (tx) => {
      await tx.execAsync(MIGRATIONS[v]);
      if (v === 0) await seedStarterCategories(tx);
      await tx.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

let opening: Promise<SQLiteDatabase> | null = null;

export function openDatabase(): Promise<SQLiteDatabase> {
  if (!opening) {
    opening = (async () => {
      const key = await databaseKey();
      const db = await openDatabaseAsync(DATABASE_NAME);
      // The key must be the first statement on the connection.
      await db.execAsync(`PRAGMA key = "x'${key}'"`);
      // Fails here, not later, if the key is wrong or SQLCipher is missing.
      await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
      await db.execAsync(
        'PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA temp_store = MEMORY;',
      );
      await migrate(db);
      return db;
    })();
    opening.catch(() => {
      opening = null;
    });
  }
  return opening;
}
