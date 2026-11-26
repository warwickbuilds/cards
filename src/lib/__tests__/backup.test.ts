import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes as nodeRandom } from 'crypto';

import {
  BackupCryptoError,
  decryptBackup,
  encryptBackup,
  HEADER_BYTES,
  isBackupFile,
  MIN_ITERATIONS,
  readHeader,
  type Aead,
} from '../backupCrypto';
import { backupFileName, makePayload, parsePayload } from '../backupData';
import { utf8Decode, utf8Encode } from '../utf8';

const aead: Aead = {
  encrypt: async (k, n, p, a) => gcm(k, n, a).encrypt(p),
  decrypt: async (k, n, c, a) => gcm(k, n, a).decrypt(c),
};
const random = (n: number) => new Uint8Array(nodeRandom(n));
// Fewest iterations the reader accepts, so tests stay quick.
const ITER = MIN_ITERATIONS;

// A tiny fake JPEG (starts with FF D8 FF); not a real card photo.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]).toString('base64');

const sample = () =>
  makePayload({
    appVersion: '0.1.0',
    now: new Date('2026-01-02T03:04:05Z'),
    categories: [{ id: 'cat-1', name: 'Loyalty', color: 'orange', active: false, sortOrder: 0, createdAt: 1 }],
    cards: [
      {
        id: 'card-1',
        categoryId: 'cat-1',
        title: 'Café ☕ card',
        notes: 'Member since 2020',
        pinned: true,
        useCount: 3,
        lastUsedAt: 5,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    images: [{ cardId: 'card-1', side: 'front', full: JPEG, thumb: JPEG, width: 10, height: 6 }],
  });

describe('encrypted backup file', () => {
  it('round-trips with the right passphrase', async () => {
    const plain = utf8Encode(JSON.stringify(sample()));
    const file = await encryptBackup(plain, 'correct horse battery', aead, random, ITER);
    expect(isBackupFile(file)).toBe(true);
    expect(readHeader(file).iterations).toBe(ITER);
    const out = await decryptBackup(file, 'correct horse battery', aead);
    expect(parsePayload(utf8Decode(out))).toEqual(sample());
  });

  it('does not contain the plaintext', async () => {
    const file = await encryptBackup(utf8Encode('SECRET-NOTE-123'), 'passphrase!', aead, random, ITER);
    expect(Buffer.from(file).toString('latin1')).not.toContain('SECRET-NOTE');
  });

  it('rejects a wrong passphrase', async () => {
    const file = await encryptBackup(utf8Encode('{}'), 'right one', aead, random, ITER);
    await expect(decryptBackup(file, 'wrong one', aead)).rejects.toMatchObject({ kind: 'wrong-passphrase' });
  });

  it('rejects a tampered header or body', async () => {
    const file = await encryptBackup(utf8Encode('{"a":1}'), 'pass word', aead, random, ITER);
    const salt = file.slice();
    salt[20] ^= 1; // inside the salt
    await expect(decryptBackup(salt, 'pass word', aead)).rejects.toBeInstanceOf(BackupCryptoError);
    const body = file.slice();
    body[HEADER_BYTES + 1] ^= 1;
    await expect(decryptBackup(body, 'pass word', aead)).rejects.toBeInstanceOf(BackupCryptoError);
  });

  it('refuses files that are not backups, or too weak to be ours', async () => {
    expect(() => readHeader(utf8Encode('hello world, definitely not a backup file at all!!!'))).toThrow('isn’t a Cards backup');
    const file = await encryptBackup(utf8Encode('{}'), 'pass word', aead, random, ITER);
    const weak = file.slice();
    new DataView(weak.buffer).setUint32(10, 1000, false);
    expect(() => readHeader(weak)).toThrow(BackupCryptoError);
    const newer = file.slice();
    newer[8] = 99;
    expect(() => readHeader(newer)).toThrow('newer version');
  });

  it('gives the same key for the same passphrase typed differently (NFKC)', async () => {
    const file = await encryptBackup(utf8Encode('{}'), 'café passphrase', aead, random, ITER);
    await expect(decryptBackup(file, 'café passphrase', aead)).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe('parsePayload', () => {
  const json = (mut: (p: Record<string, any>) => void) => {
    const p = JSON.parse(JSON.stringify(sample()));
    mut(p);
    return JSON.stringify(p);
  };

  it('accepts a good payload', () => {
    expect(parsePayload(JSON.stringify(sample())).cards[0].title).toBe('Café ☕ card');
  });
  it('rejects other apps and newer formats', () => {
    expect(() => parsePayload(json((p) => (p.app = 'other')))).toThrow('isn’t a Cards backup');
    expect(() => parsePayload(json((p) => (p.format = 99)))).toThrow('newer version');
    expect(() => parsePayload('not json')).toThrow('damaged');
  });
  it('rejects bad ids, images and duplicates', () => {
    expect(() => parsePayload(json((p) => (p.cards[0].id = '../etc')))).toThrow('damaged');
    expect(() => parsePayload(json((p) => (p.images[0].full = 'PHN2Zz4=')))).toThrow('damaged'); // not a JPEG
    expect(() => parsePayload(json((p) => (p.images[0].cardId = 'missing')))).toThrow('damaged');
    expect(() => parsePayload(json((p) => p.images.push(p.images[0])))).toThrow('damaged');
    expect(() => parsePayload(json((p) => p.cards.push(p.cards[0])))).toThrow('damaged');
    expect(() => parsePayload(json((p) => (p.cards[0].title = '')))).toThrow('damaged');
  });
  it('drops links to categories that are not in the backup', () => {
    expect(parsePayload(json((p) => (p.cards[0].categoryId = 'nope'))).cards[0].categoryId).toBeNull();
  });
});

it('names backup files by date', () => {
  expect(backupFileName(new Date(2026, 10, 26))).toBe('cards-2026-11-26.cardsbackup');
});

describe('utf8', () => {
  it('round-trips without TextEncoder/TextDecoder too', () => {
    const s = 'Hello Café ☕ 𝄞 日本';
    const TE = global.TextEncoder;
    const TD = global.TextDecoder;
    expect(utf8Decode(utf8Encode(s))).toBe(s);
    // @ts-expect-error simulate an engine without them
    delete global.TextEncoder;
    // @ts-expect-error simulate an engine without them
    delete global.TextDecoder;
    try {
      const bytes = utf8Encode(s);
      expect(Buffer.from(bytes).toString('utf8')).toBe(s);
      expect(utf8Decode(bytes)).toBe(s);
    } finally {
      global.TextEncoder = TE;
      global.TextDecoder = TD;
    }
  });
});
