/**
 * App lock and screen privacy.
 *
 * - Lock: on launch, and after the app has been in the background for the
 *   chosen time, the cards are covered until the fingerprint, face or phone
 *   PIN is given (Android's own prompt; the app never sees it).
 * - Screenshots: FLAG_SECURE blocks screenshots and screen recording, and
 *   blanks the app in the recent-apps switcher.
 *
 * The camera and file pickers send the app to the background; expectExternal()
 * grants a bounded grace window so returning from them doesn't lock mid-task,
 * and clearExternal() resets it if the picker never backgrounded the app.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useSettingsStatus } from '@/db/DataProvider';
import { canLock, shouldRelock } from '@/lib/lockPolicy';

interface Security {
  locked: boolean;
  deviceSecure: boolean;
  unlock: () => Promise<boolean>;
  /** Call immediately before launching the camera or a file picker. */
  expectExternal: () => void;
  /** Call in finally after an external activity returns to clear any unused flag. */
  clearExternal: () => void;
  /** Ask for the fingerprint/PIN without locking the app (e.g. to turn the lock on). */
  confirmIdentity: (reason: string) => Promise<boolean>;
}

const SecurityContext = createContext<Security | null>(null);

async function deviceHasLock(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { settings, loaded } = useSettingsStatus();
  const [deviceSecure, setDeviceSecure] = useState(true);
  const [locked, setLocked] = useState(true);
  const [deviceChecked, setDeviceChecked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const externalStartedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  // Screenshot blocking follows the setting.
  useEffect(() => {
    const tag = 'cards-privacy';
    if (settings.blockScreenshots) ScreenCapture.preventScreenCaptureAsync(tag).catch(() => {});
    else ScreenCapture.allowScreenCaptureAsync(tag).catch(() => {});
  }, [settings.blockScreenshots]);

  // First launch: find out if the phone can lock at all.
  useEffect(() => {
    deviceHasLock().then((secure) => {
      setDeviceSecure(secure);
      setDeviceChecked(true);
    });
  }, []);
  const checked = deviceChecked && loaded;

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (!authenticating.current) backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;
      const s = settingsRef.current;
      const relock = shouldRelock({
        enabled: s.lockEnabled,
        deviceSecure,
        lockAfterSeconds: s.lockAfterSeconds,
        backgroundedAt: backgroundedAt.current,
        now: Date.now(),
        externalStartedAt: externalStartedAt.current,
      });
      backgroundedAt.current = null;
      externalStartedAt.current = null;
      if (relock) setLocked(true);
      // Re-check in case the user removed their screen lock while away.
      deviceHasLock().then(setDeviceSecure);
    });
    return () => sub.remove();
  }, [deviceSecure]);

  const authenticate = useCallback(async (reason: string) => {
    if (authenticating.current) return false;
    authenticating.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        promptSubtitle: 'Use your fingerprint, face or screen lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });
      return res.success;
    } catch {
      return false;
    } finally {
      authenticating.current = false;
    }
  }, []);

  const unlock = useCallback(async () => {
    const ok = await authenticate('Unlock Cards');
    if (ok) setLocked(false);
    return ok;
  }, [authenticate]);

  const expectExternal = useCallback(() => {
    externalStartedAt.current = Date.now();
  }, []);

  const clearExternal = useCallback(() => {
    if (backgroundedAt.current === null) externalStartedAt.current = null;
  }, []);

  const confirmIdentity = useCallback(
    async (reason: string) => {
      const ok = await authenticate(reason);
      if (ok) setLocked(false);
      return ok;
    },
    [authenticate],
  );

  const isLocked = !checked || (locked && canLock(settings.lockEnabled, deviceSecure));

  const value = useMemo<Security>(
    () => ({
      locked: isLocked,
      deviceSecure,
      unlock,
      expectExternal,
      clearExternal,
      confirmIdentity,
    }),
    [isLocked, deviceSecure, unlock, expectExternal, clearExternal, confirmIdentity],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity(): Security {
  const s = useContext(SecurityContext);
  if (!s) throw new Error('useSecurity outside SecurityProvider');
  return s;
}
