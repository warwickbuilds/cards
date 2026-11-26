/**
 * Colour tokens. Every screen reads colours through useTheme() so light and
 * dark mode stay in step. Category colours are a fixed, named palette so a
 * backup restored on another phone looks the same.
 */

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  overlay: string;
  shadow: string;
}

export const light: Palette = {
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF2',
  border: '#DFE2E8',
  text: '#111318',
  textMuted: '#5B6170',
  textFaint: '#8E94A2',
  accent: '#4F46E5',
  accentText: '#FFFFFF',
  accentSoft: '#E6E5FC',
  danger: '#D92D20',
  dangerSoft: '#FDE8E7',
  success: '#12B76A',
  overlay: 'rgba(10,12,16,0.5)',
  shadow: '#0B0D12',
};

export const dark: Palette = {
  bg: '#0B0C0F',
  surface: '#16181D',
  surfaceAlt: '#20232A',
  border: '#2A2E36',
  text: '#F2F3F5',
  textMuted: '#A2A8B5',
  textFaint: '#6C7280',
  accent: '#8B85FF',
  accentText: '#0B0C0F',
  accentSoft: '#26244A',
  danger: '#F97066',
  dangerSoft: '#3A1D1B',
  success: '#32D583',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

/** Category colours, by key. Keys are stored in the database and backups. */
export const CATEGORY_COLORS = {
  indigo: '#5B5BF0',
  blue: '#2E90FA',
  teal: '#0EA5A4',
  green: '#16A34A',
  lime: '#84CC16',
  amber: '#F59E0B',
  orange: '#F97316',
  red: '#EF4444',
  pink: '#EC4899',
  purple: '#A855F7',
  slate: '#64748B',
} as const;

export type CategoryColor = keyof typeof CATEGORY_COLORS;
export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS) as CategoryColor[];

export function categoryColor(key: string | null | undefined): string {
  return (key && (CATEGORY_COLORS as Record<string, string>)[key]) || CATEGORY_COLORS.slate;
}
