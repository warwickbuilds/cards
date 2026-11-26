/** When the app should ask for the fingerprint, face or PIN again. */

/** Max time an external picker/camera flow can suppress relocking. */
export const EXTERNAL_GRACE_MS = 5 * 60 * 1000;

export interface LockInput {
  enabled: boolean;
  /** Whether the phone has any screen lock or biometrics set up. */
  deviceSecure: boolean;
  lockAfterSeconds: number;
  /** When the app last went to the background, or null. */
  backgroundedAt: number | null;
  now: number;
  /** Timestamp when the app opened the camera or a file picker, or null. */
  externalStartedAt: number | null;
  /** Override for tests; defaults to EXTERNAL_GRACE_MS. */
  externalGraceMs?: number;
}

export function canLock(enabled: boolean, deviceSecure: boolean): boolean {
  return enabled && deviceSecure;
}

export function shouldRelock(i: LockInput): boolean {
  if (!canLock(i.enabled, i.deviceSecure) || i.backgroundedAt == null) return false;
  const grace = i.externalGraceMs ?? EXTERNAL_GRACE_MS;
  if (i.externalStartedAt != null && i.now - i.externalStartedAt < grace) return false;
  return i.now - i.backgroundedAt >= i.lockAfterSeconds * 1000;
}

export function lockAfterLabel(seconds: number): string {
  if (seconds <= 0) return 'Immediately';
  if (seconds < 60) return `After ${seconds} seconds`;
  const m = Math.round(seconds / 60);
  return `After ${m} minute${m === 1 ? '' : 's'}`;
}
