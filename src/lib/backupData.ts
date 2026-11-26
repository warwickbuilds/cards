/**
 * What goes inside an encrypted backup, and the checks run on it before
 * anything on the phone is changed.
 */

import { CATEGORY_NAME_MAX, NOTES_MAX, TITLE_MAX } from './text';
import type { Card, CardImage, Category, Side } from './types';

export const BACKUP_APP = 'cards';
export const DATA_FORMAT = 1;

export interface BackupPayload {
  app: typeof BACKUP_APP;
  format: number;
  appVersion: string | null;
  exportedAt: string;
  categories: Category[];
  cards: Card[];
  images: CardImage[];
}

export function makePayload(input: {
  categories: Category[];
  cards: Card[];
  images: CardImage[];
  appVersion: string | null;
  now?: Date;
}): BackupPayload {
  return {
    app: BACKUP_APP,
    format: DATA_FORMAT,
    appVersion: input.appVersion,
    exportedAt: (input.now ?? new Date()).toISOString(),
    categories: input.categories,
    cards: input.cards,
    images: input.images,
  };
}

export class BackupDataError extends Error {}

const damaged = () => new BackupDataError('The backup file is damaged and can’t be read.');

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number, allowEmpty = true): string => {
  if (typeof v !== 'string' || v.length > max || (!allowEmpty && v.trim() === '')) throw damaged();
  return v;
};
const num = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw damaged();
  return v;
};
const id = (v: unknown): string => {
  const s = str(v, 64, false);
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw damaged();
  return s;
};
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** 15 MB of base64 per picture is far above anything the app makes. */
const MAX_IMAGE_B64 = 15 * 1024 * 1024;
const image = (v: unknown): string => {
  const s = str(v, MAX_IMAGE_B64, false);
  // Checking the whole string is slow on big images; the start and length are enough to catch junk.
  if (s.length % 4 !== 0 || !BASE64.test(s.slice(0, 256)) || !BASE64.test(s.slice(-256))) throw damaged();
  // JPEG files start with FF D8 FF, which is "/9j/" in base64.
  if (!s.startsWith('/9j/')) throw damaged();
  return s;
};

/** Parses and checks a backup. Throws BackupDataError with a plain message. */
export function parsePayload(json: string): BackupPayload {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw damaged();
  }
  if (!isObj(data) || data.app !== BACKUP_APP) throw new BackupDataError('This file isn’t a Cards backup.');
  if (typeof data.format !== 'number' || data.format > DATA_FORMAT) {
    throw new BackupDataError('This backup was made by a newer version of Cards. Update the app, then import it.');
  }
  if (!Array.isArray(data.categories) || !Array.isArray(data.cards) || !Array.isArray(data.images)) throw damaged();

  const categories: Category[] = data.categories.map((c) => {
    if (!isObj(c)) throw damaged();
    return {
      id: id(c.id),
      name: str(c.name, CATEGORY_NAME_MAX, false),
      color: str(c.color, 20),
      active: c.active !== false,
      sortOrder: num(c.sortOrder),
      createdAt: num(c.createdAt),
    };
  });
  const catIds = new Set(categories.map((c) => c.id));

  const cards: Card[] = data.cards.map((c) => {
    if (!isObj(c)) throw damaged();
    const categoryId = c.categoryId == null ? null : id(c.categoryId);
    return {
      id: id(c.id),
      categoryId: categoryId && catIds.has(categoryId) ? categoryId : null,
      title: str(c.title, TITLE_MAX, false),
      notes: str(c.notes ?? '', NOTES_MAX),
      pinned: c.pinned === true,
      useCount: Math.max(0, Math.floor(num(c.useCount ?? 0))),
      lastUsedAt: c.lastUsedAt == null ? null : num(c.lastUsedAt),
      createdAt: num(c.createdAt),
      updatedAt: num(c.updatedAt),
    };
  });
  const cardIds = new Set(cards.map((c) => c.id));

  const seen = new Set<string>();
  const images: CardImage[] = data.images.map((im) => {
    if (!isObj(im)) throw damaged();
    const side = im.side;
    if (side !== 'front' && side !== 'back') throw damaged();
    const cardId = id(im.cardId);
    if (!cardIds.has(cardId)) throw damaged();
    const key = `${cardId}:${side}`;
    if (seen.has(key)) throw damaged();
    seen.add(key);
    return {
      cardId,
      side: side as Side,
      full: image(im.full),
      thumb: image(im.thumb),
      width: num(im.width),
      height: num(im.height),
    };
  });

  if (new Set(categories.map((c) => c.id)).size !== categories.length) throw damaged();
  if (cardIds.size !== cards.length) throw damaged();

  return {
    app: BACKUP_APP,
    format: data.format,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : null,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    categories,
    cards,
    images,
  };
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `cards-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.cardsbackup`;
}
