/**
 * Saving and opening backup files. Files are only written where the user
 * chooses (Android's folder picker) and only read from a file they pick;
 * nothing is shared or uploaded by the app.
 */

import Constants from 'expo-constants';
import { Directory, File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { exportAll } from '@/db/repo';

import { backupFileName, makePayload, parsePayload, type BackupPayload } from './backupData';
import { decryptBackup, encryptBackup, readHeader } from './backupCrypto';
import { nativeAead, randomBytes } from './nativeAead';
import { utf8Decode, utf8Encode } from './utf8';

export interface ExportResult {
  fileName: string;
  cards: number;
  categories: number;
}

/** Asks for a folder, then writes an encrypted backup there. Returns null if the user backs out. */
export async function exportBackup(
  db: SQLiteDatabase,
  passphrase: string,
  beforePicker?: () => void,
  afterPicker?: () => void,
): Promise<ExportResult | null> {
  let folder: Directory | null = null;
  beforePicker?.();
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch {
    return null; // Closed without choosing.
  } finally {
    afterPicker?.();
  }
  if (!folder) return null;

  const data = await exportAll(db);
  const payload = makePayload({ ...data, appVersion: Constants.expoConfig?.version ?? null });
  const sealed = await encryptBackup(utf8Encode(JSON.stringify(payload)), passphrase, nativeAead, randomBytes);
  const fileName = backupFileName();
  const target = folder.createFile(fileName, 'application/octet-stream');
  await target.write(sealed);
  return { fileName: target.name || fileName, cards: data.cards.length, categories: data.categories.length };
}

export interface PickedBackup {
  name: string;
  bytes: Uint8Array;
}

/** Lets the user choose a backup file and checks it looks like one. Returns null if cancelled. */
export async function pickBackupFile(beforePicker?: () => void, afterPicker?: () => void): Promise<PickedBackup | null> {
  beforePicker?.();
  let picked;
  try {
    picked = await File.pickFileAsync({ mimeTypes: ['application/octet-stream', '*/*'] });
  } finally {
    afterPicker?.();
  }
  if (picked.canceled || !picked.result) return null;
  const file = picked.result as File;
  const bytes = await file.bytes();
  readHeader(bytes); // Throws a plain-language error if it isn't a Cards backup.
  return { name: file.name, bytes };
}

export async function openBackup(bytes: Uint8Array, passphrase: string): Promise<BackupPayload> {
  const plain = await decryptBackup(bytes, passphrase, nativeAead);
  return parsePayload(utf8Decode(plain));
}
