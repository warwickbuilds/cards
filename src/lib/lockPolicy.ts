/** When the app should ask for the fingerprint, face or PIN again. */

export interface LockInput {
  enabled: boolean;
  /** Whether the phone has any screen lock or biometrics set up. */
  deviceSecure: boolean;
  lockAfterSeconds: number;
  /** When the app last went to the background, or null. */
  backgroundedAt: number | null;
  now: number;
  /** True while the app itself opened the camera or a file picker. */
  externalActivity: boolean;
}

export function canLock(enabled: boolean, deviceSecure: boolean): boolean {
  return enabled && deviceSecure;
}

export function shouldRelock(i: LockInput): boolean {
  if (!canLock(i.enabled, i.deviceSecure) || i.externalActivity || i.backgroundedAt == null) return false;
  return i.now - i.backgroundedAt >= i.lockAfterSeconds * 1000;
}

export function lockAfterLabel(seconds: number): string {
  if (seconds <= 0) return 'Immediately';
  if (seconds < 60) return `After ${seconds} seconds`;
  const m = Math.round(seconds / 60);
  return `After ${m} minute${m === 1 ? '' : 's'}`;
}
