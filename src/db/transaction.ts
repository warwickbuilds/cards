/**
 * Transactions on the one encrypted connection.
 *
 * Don't use expo-sqlite's `withExclusiveTransactionAsync`: it opens a second
 * connection to the file, and that connection never gets the SQLCipher key,
 * so every write in it fails with "file is not a database" (the v0.1.0 launch
 * bug). Everything here runs on the connection that `openDatabase` keyed.
 *
 * Writes are queued one after another, so a write can never land inside
 * another write's transaction. Don't call `inTransaction` from inside a task:
 * the inner call would wait for the outer one forever.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

type Executor = Pick<SQLiteDatabase, 'execAsync'>;

let queue: Promise<unknown> = Promise.resolve();

/** Runs `task` once every earlier write has finished, and before any later one starts. */
export function exclusively<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

export function inTransaction<D extends Executor, T>(db: D, task: (tx: D) => Promise<T>): Promise<T> {
  return exclusively(async () => {
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      const result = await task(db);
      await db.execAsync('COMMIT');
      return result;
    } catch (e) {
      try {
        await db.execAsync('ROLLBACK');
      } catch {
        // SQLite may already have rolled back; keep the original error.
      }
      throw e;
    }
  });
}
