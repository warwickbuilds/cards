/** Rules and a rough strength meter for backup passphrases. */

export const PASSPHRASE_MIN = 8;

export type Strength = 'too-short' | 'weak' | 'ok' | 'strong';

export function passphraseStrength(p: string): Strength {
  if (p.length < PASSPHRASE_MIN) return 'too-short';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  const words = p.trim().split(/\s+/).length;
  const unique = new Set(p).size;
  if (unique < 4) return 'weak';
  if (p.length >= 16 || (words >= 3 && p.length >= 14) || (p.length >= 12 && classes >= 3)) return 'strong';
  if (p.length >= 10 || classes >= 3) return 'ok';
  return 'weak';
}

export function strengthLabel(s: Strength): string {
  return { 'too-short': `At least ${PASSPHRASE_MIN} characters`, weak: 'Weak', ok: 'Okay', strong: 'Strong' }[s];
}
