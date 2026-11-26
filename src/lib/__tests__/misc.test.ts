import { canLock, EXTERNAL_GRACE_MS, lockAfterLabel, shouldRelock } from '../lockPolicy';
import { passphraseStrength } from '../passphrase';
import { cleanName, fold, matchesQuery } from '../text';

describe('shouldRelock', () => {
  const base = {
    enabled: true,
    deviceSecure: true,
    lockAfterSeconds: 60,
    backgroundedAt: 0,
    now: 61_000,
    externalStartedAt: null as number | null,
  };
  it('locks after the chosen time away', () => {
    expect(shouldRelock(base)).toBe(true);
    expect(shouldRelock({ ...base, now: 30_000 })).toBe(false);
    expect(shouldRelock({ ...base, lockAfterSeconds: 0, now: 1 })).toBe(true);
  });
  it('never locks when off, when the phone has no lock, or during an active picker/camera grace window', () => {
    expect(shouldRelock({ ...base, enabled: false })).toBe(false);
    expect(shouldRelock({ ...base, deviceSecure: false })).toBe(false);
    expect(shouldRelock({ ...base, externalStartedAt: 0, now: 61_000 })).toBe(false);
    expect(shouldRelock({ ...base, backgroundedAt: null })).toBe(false);
    expect(canLock(true, false)).toBe(false);
  });
  it('relocks once the external activity grace window expires', () => {
    expect(shouldRelock({ ...base, externalStartedAt: 0, now: EXTERNAL_GRACE_MS })).toBe(true);
    expect(shouldRelock({ ...base, externalStartedAt: 0, now: EXTERNAL_GRACE_MS - 1 })).toBe(false);
  });
  it('labels', () => {
    expect(lockAfterLabel(0)).toBe('Immediately');
    expect(lockAfterLabel(30)).toBe('After 30 seconds');
    expect(lockAfterLabel(60)).toBe('After 1 minute');
    expect(lockAfterLabel(300)).toBe('After 5 minutes');
  });
});

describe('passphraseStrength', () => {
  it('grades', () => {
    expect(passphraseStrength('short')).toBe('too-short');
    expect(passphraseStrength('aaaaaaaaaa')).toBe('weak');
    expect(passphraseStrength('abcdefgh')).toBe('weak');
    expect(passphraseStrength('Abcdefg1')).toBe('ok');
    expect(passphraseStrength('purple tiger window seven')).toBe('strong');
  });
});

describe('text', () => {
  it('folds accents and case', () => {
    expect(fold('  CAFÉ ')).toBe('cafe');
    expect(matchesQuery('cafe club', 'Café', 'Rewards club')).toBe(true);
    expect(matchesQuery('cafe gym', 'Café')).toBe(false);
    expect(matchesQuery('', 'anything')).toBe(true);
  });
  it('cleans names', () => {
    expect(cleanName('  Bank   card \n ')).toBe('Bank card');
  });
});
