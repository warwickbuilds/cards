/** Domain types shared by the database layer, screens and backups. */

export type Side = 'front' | 'back';

export interface Category {
  id: string;
  name: string;
  /** A key of CATEGORY_COLORS. */
  color: string;
  /** Inactive categories (and their cards) are hidden from the home screen. */
  active: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface Card {
  id: string;
  categoryId: string | null;
  title: string;
  notes: string;
  pinned: boolean;
  useCount: number;
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** A card as the home screen lists it: with its small front/back pictures. */
export interface CardSummary extends Card {
  frontThumb: string | null;
  backThumb: string | null;
}

export interface CardImage {
  cardId: string;
  side: Side;
  /** JPEG, base64 (no data: prefix). */
  full: string;
  /** Small JPEG for lists, base64. */
  thumb: string;
  width: number;
  height: number;
}

export type SortMode = 'used' | 'az' | 'recent';

export interface Settings {
  lockEnabled: boolean;
  /** Seconds in the background before the app locks again. 0 = straight away. */
  lockAfterSeconds: number;
  blockScreenshots: boolean;
  maxBrightness: boolean;
  sortMode: SortMode;
  cropToCard: boolean;
  showInactive: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lockEnabled: true,
  lockAfterSeconds: 60,
  blockScreenshots: true,
  maxBrightness: true,
  sortMode: 'used',
  cropToCard: true,
  showInactive: false,
};

export const LOCK_AFTER_CHOICES = [0, 30, 60, 300, 900] as const;

export function jpegUri(base64: string | null | undefined): string | null {
  return base64 ? `data:image/jpeg;base64,${base64}` : null;
}
