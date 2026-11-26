/**
 * The encrypted backup file ("*.cardsbackup").
 *
 *   offset  size  field
 *   0       8     magic "CARDSBAK"
 *   8       1     format version (1)
 *   9       1     key derivation: 1 = PBKDF2-HMAC-SHA256
 *   10      4     iterations, big-endian
 *   14      16    salt
 *   30      12    AES-GCM nonce
 *   42      ...   AES-256-GCM ciphertext followed by its 16-byte tag
 *
 * The 42-byte header is passed to AES-GCM as additional data, so changing any
 * of it (for example lowering the iteration count) makes decryption fail.
 * The plaintext is the UTF-8 JSON from backupData.ts.
 *
 * The cipher is passed in, so the app can use the phone's native AES
 * (expo-crypto) and the tests can use a pure-JS AES-GCM with the same output.
 */

import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { utf8Encode } from './utf8';

export const MAGIC = 'CARDSBAK';
export const FILE_VERSION = 1;
export const KDF_PBKDF2_SHA256 = 1;
/** Tuned so deriving the key takes a few seconds on a phone without native PBKDF2. */
export const DEFAULT_ITERATIONS = 150_000;
export const MIN_ITERATIONS = 50_000;
export const MAX_ITERATIONS = 5_000_000;
export const SALT_BYTES = 16;
export const NONCE_BYTES = 12;
export const TAG_BYTES = 16;
export const HEADER_BYTES = 8 + 1 + 1 + 4 + SALT_BYTES + NONCE_BYTES;
export const BACKUP_EXTENSION = 'cardsbackup';

export interface Aead {
  encrypt(key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
  /** Must throw if the tag doesn't match. */
  decrypt(key: Uint8Array, nonce: Uint8Array, ciphertextWithTag: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
}

export class BackupCryptoError extends Error {
  constructor(
    message: string,
    readonly kind: 'not-a-backup' | 'newer' | 'wrong-passphrase' | 'damaged',
  ) {
    super(message);
  }
}

export interface Header {
  version: number;
  kdf: number;
  iterations: number;
  salt: Uint8Array;
  nonce: Uint8Array;
}

export function encodeHeader(h: Header): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES);
  for (let i = 0; i < 8; i++) out[i] = MAGIC.charCodeAt(i);
  out[8] = h.version;
  out[9] = h.kdf;
  new DataView(out.buffer).setUint32(10, h.iterations, false);
  out.set(h.salt, 14);
  out.set(h.nonce, 14 + SALT_BYTES);
  return out;
}

export function isBackupFile(bytes: Uint8Array): boolean {
  if (bytes.length < HEADER_BYTES + TAG_BYTES) return false;
  for (let i = 0; i < 8; i++) if (bytes[i] !== MAGIC.charCodeAt(i)) return false;
  return true;
}

export function readHeader(bytes: Uint8Array): Header {
  if (!isBackupFile(bytes)) throw new BackupCryptoError('This file isn’t a Cards backup.', 'not-a-backup');
  const version = bytes[8];
  const kdf = bytes[9];
  if (version > FILE_VERSION || kdf !== KDF_PBKDF2_SHA256) {
    throw new BackupCryptoError('This backup was made by a newer version of Cards. Update the app, then import it.', 'newer');
  }
  const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(10, false);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new BackupCryptoError('The backup file is damaged and can’t be read.', 'damaged');
  }
  return {
    version,
    kdf,
    iterations,
    salt: bytes.slice(14, 14 + SALT_BYTES),
    nonce: bytes.slice(14 + SALT_BYTES, HEADER_BYTES),
  };
}

export async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  // NFKC so the same passphrase typed on another keyboard gives the same key.
  return pbkdf2Async(sha256, utf8Encode(passphrase.normalize('NFKC')), salt, { c: iterations, dkLen: 32, asyncTick: 25 });
}

export async function encryptBackup(
  plaintext: Uint8Array,
  passphrase: string,
  aead: Aead,
  random: (n: number) => Uint8Array,
  iterations = DEFAULT_ITERATIONS,
): Promise<Uint8Array> {
  const header: Header = {
    version: FILE_VERSION,
    kdf: KDF_PBKDF2_SHA256,
    iterations,
    salt: random(SALT_BYTES),
    nonce: random(NONCE_BYTES),
  };
  const headerBytes = encodeHeader(header);
  const key = await deriveKey(passphrase, header.salt, iterations);
  try {
    const sealed = await aead.encrypt(key, header.nonce, plaintext, headerBytes);
    const out = new Uint8Array(HEADER_BYTES + sealed.length);
    out.set(headerBytes, 0);
    out.set(sealed, HEADER_BYTES);
    return out;
  } finally {
    key.fill(0);
  }
}

export async function decryptBackup(file: Uint8Array, passphrase: string, aead: Aead): Promise<Uint8Array> {
  const header = readHeader(file);
  const key = await deriveKey(passphrase, header.salt, header.iterations);
  try {
    return await aead.decrypt(key, header.nonce, file.subarray(HEADER_BYTES), file.subarray(0, HEADER_BYTES));
  } catch {
    throw new BackupCryptoError('That passphrase doesn’t open this backup.', 'wrong-passphrase');
  } finally {
    key.fill(0);
  }
}
