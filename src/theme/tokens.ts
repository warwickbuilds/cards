import type { TextStyle } from 'react-native';

export * from './colors';

/** 4-point spacing scale. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, card: 14, sheet: 24, pill: 999 } as const;

export const layout = {
  screenPadding: 16,
  gridGap: 12,
  minTap: 48,
} as const;

/** ID-1 card shape (credit cards, licences, loyalty cards): 85.6 × 53.98 mm. */
export const CARD_ASPECT = 85.6 / 53.98;

/** Respect the phone's text size setting up to 1.3×. */
export const MAX_FONT_SCALE = 1.3;

export const type = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '400' },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;
