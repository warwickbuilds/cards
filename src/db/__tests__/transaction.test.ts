import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { inTransaction } from '../transaction';

function fakeDb() {
  const log: string[] = [];
  return {
    log,
    execAsync: async (sql: string) => {
      log.push(sql);
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('inTransaction', () => {
  it('commits on success and returns the result', async () => {
    const db = fakeDb();
    const out = await inTransaction(db, async (tx) => {
      await tx.execAsync('WRITE');
      return 7;
    });
    expect(out).toBe(7);
    expect(db.log).toEqual(['BEGIN IMMEDIATE', 'WRITE', 'COMMIT']);
  });

  it('rolls back and rethrows on failure, then keeps working', async () => {
    const db = fakeDb();
    await expect(
      inTransaction(db, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await inTransaction(db, async (tx) => tx.execAsync('AFTER'));
    expect(db.log).toEqual(['BEGIN IMMEDIATE', 'ROLLBACK', 'BEGIN IMMEDIATE', 'AFTER', 'COMMIT']);
  });

  it('runs writes one after another, never overlapping', async () => {
    const db = fakeDb();
    const a = inTransaction(db, async (tx) => {
      await tick();
      await tx.execAsync('A');
    });
    const b = inTransaction(db, async (tx) => tx.execAsync('B'));
    await Promise.all([a, b]);
    expect(db.log).toEqual(['BEGIN IMMEDIATE', 'A', 'COMMIT', 'BEGIN IMMEDIATE', 'B', 'COMMIT']);
  });
});

// withExclusiveTransactionAsync opens a second connection without the SQLCipher key.
it('nothing in src uses a second, unkeyed connection', () => {
  const root = join(__dirname, '..', '..');
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(name)) {
        const src = readFileSync(p, 'utf8');
        if (/withExclusiveTransaction|useNewConnection/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))) offenders.push(p);
      }
    }
  };
  walk(root);
  expect(offenders).toEqual([]);
});
